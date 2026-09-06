import './style.css';
import { deleteDemoState, emptyState, loadState, saveState, validImport } from './db';
import { advanceIfReady, currentStreak, progression } from './progression';
import { BLOCK_LABELS, STAGES, type AppState, type BlockType, type RoutineBlock } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const PRODUCT = 'no-ai-language-path';
const PRODUCT_NAME = 'No-AI Language Path';
const ORIGIN = 'https://no-ai-language-path.sociobot.in';
const BILLING = 'https://api.sociobot.in/api/v1/products';
const LICENSE_KEY = `sb_license:${PRODUCT}`;
const VERDICT_KEY = `sb_license_verdict:${PRODUCT}`;
const BUILD_ID = '1.1.0';

let state: AppState = emptyState();
let storageAvailable = true;
let message = '';
let routeAnnouncement = '';
let isPlus = false;
let demoMode = location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
let editBlock: RoutineBlock | 'new' | null = null;
let dialogReturnSelector = '';
let focusNextHeading = false;
let timer: number | null = null;
let session: { index: number; remaining: number; elapsed: number; running: boolean; completed: string[] } | null = null;

const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]!));

function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function route() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  return path === '/demo' ? '/' : path;
}

function href(path: string) {
  if (!demoMode) return path;
  return path === '/' ? '/demo' : `${path}?demo=1`;
}

const routeMeta: Record<string, { title: string; description: string }> = {
  '/': { title: 'No-AI Language Path — Build a study routine', description: 'Build and follow a private language study routine with clear rules, timers, local history, and offline access.' },
  '/session': { title: 'Study session — No-AI Language Path', description: 'Follow each block in your private language study routine.' },
  '/complete': { title: 'Session complete — No-AI Language Path', description: 'Review your completed language study session and progression.' },
  '/history': { title: 'History — No-AI Language Path', description: 'Review completed language study sessions stored in this browser.' },
  '/rules': { title: 'Progression rules — No-AI Language Path', description: 'Inspect and change the rule that advances your language routine.' },
  '/data': { title: 'Your data — No-AI Language Path', description: 'Export, import, or erase your local language routine and history.' },
  '/plus': { title: 'Plus — No-AI Language Path', description: 'See the one-time price and extra history and print features.' },
  '/privacy': { title: 'Privacy — No-AI Language Path', description: 'Read how local study data and optional license data are handled.' },
  '/terms': { title: 'Terms — No-AI Language Path', description: 'Read the terms for the free routine builder and optional Plus license.' }
};

function setMeta() {
  const current = routeMeta[route()] ?? { title: 'Page not found — No-AI Language Path', description: 'This page does not exist. Return to the language routine builder.' };
  const title = demoMode && route() === '/' ? `Demo — ${PRODUCT_NAME}` : current.title;
  const canonicalPath = demoMode && route() === '/' ? '/demo' : route();
  document.title = title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = current.description;
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')!.content = title;
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')!.content = current.description;
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')!.content = `${ORIGIN}${canonicalPath}`;
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')!.content = title;
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')!.content = current.description;
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = `${ORIGIN}${canonicalPath}`;
}

function navigate(path: string) {
  if (path === '/demo' && !demoMode) {
    location.assign('/demo');
    return;
  }
  history.pushState({}, '', href(path));
  focusNextHeading = true;
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  render();
}

async function persist(next = state, notice = demoMode ? 'Sample updated.' : 'Saved on this device.') {
  state = { ...next, updatedAt: new Date().toISOString() };
  try {
    await saveState(state, demoMode);
    message = notice;
  } catch {
    storageAvailable = false;
    message = demoMode ? 'Could not update this sample.' : 'Could not save on this device. Export your routine before closing this tab.';
  }
  render();
}

function header() {
  const path = route();
  const nav = [['/', demoMode ? 'Demo' : 'Routine'], ['/history', 'History'], ['/rules', 'Rules'], ['/data', 'Data']];
  return `
    <header class="site-header">
      <a class="brand" href="${href('/')}" data-link aria-label="No-AI Language Path home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span>No-AI Language Path</span>
      </a>
      <nav aria-label="Main navigation">${nav.map(([pathName, label]) => `<a href="${href(pathName)}" data-link ${path === pathName ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
      <span class="local-badge"><span aria-hidden="true">●</span> Local only</span>
    </header>`;
}

function footer() {
  return `<footer>
    <p><strong>Build and follow a private language study routine.</strong></p>
    <nav class="footer-links" aria-label="Footer navigation"><a href="${href('/privacy')}" data-link>Privacy</a><a href="${href('/terms')}" data-link>Terms</a><a href="${href('/plus')}" data-link>Plus</a></nav>
    <p class="fine">Built by Param Factory · Version ${BUILD_ID}</p>
    <p class="fine">The original hero artwork was generated for this product, then reviewed and optimized.</p>
  </footer>`;
}

function demoBanner() {
  if (!demoMode) return '';
  return `<aside class="demo-banner" aria-label="Demo controls"><strong>Demo — sample data, nothing is saved</strong><div><button type="button" data-reset-demo>Reset demo</button><button type="button" data-start-real>Start for real</button></div></aside>`;
}

function shell(content: string) {
  setMeta();
  const offline = navigator.onLine ? '' : `<div class="status offline" role="status"><strong>Offline:</strong> this page and your saved routine still work. External source links need a connection.</div>`;
  const storage = storageAvailable ? '' : `<div class="status error" role="alert">Browser storage is unavailable. Changes last only in this tab. Export your data now.</div>`;
  app.innerHTML = `${demoBanner()}${header()}${offline}${storage}<main id="main" tabindex="-1">${content}</main>${footer()}<div class="live" aria-live="polite">${esc(message)}</div><div class="live" aria-live="polite">${esc(routeAnnouncement)}</div><div id="update-toast" class="toast" hidden role="status">An update is ready. <button type="button" data-reload>Reload app</button></div>`;
  bindCommon();
  const heading = document.querySelector<HTMLHeadingElement>('main h1');
  if (heading) heading.tabIndex = -1;
  if (focusNextHeading && heading) {
    focusNextHeading = false;
    routeAnnouncement = document.title;
    requestAnimationFrame(() => heading.focus());
  }
}

function bindCommon() {
  document.querySelectorAll<HTMLAnchorElement>('[data-link]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.pathname);
  }));
  document.querySelector<HTMLButtonElement>('[data-reload]')?.addEventListener('click', () => location.reload());
  document.querySelector<HTMLButtonElement>('[data-reset-demo]')?.addEventListener('click', async () => {
    session = null;
    stopTimer();
    await persist(sampleState(), 'Sample restored.');
    if (route() !== '/') navigate('/');
  });
  document.querySelector<HTMLButtonElement>('[data-start-real]')?.addEventListener('click', async () => {
    await deleteDemoState();
    location.assign('/');
  });
}

function totalMinutes() {
  return state.blocks.reduce((sum, block) => sum + block.minutes, 0);
}

function ruleSentence() {
  const p = progression(state);
  if (state.stage === STAGES.length - 1) return 'Sustain is the final stage. Keep or change the rule when it no longer helps.';
  return `Complete ${p.remaining} more ${p.remaining === 1 ? 'session' : 'sessions'} to move from ${STAGES[state.stage]} to ${STAGES[state.stage + 1]}. Only complete sessions count.`;
}

function heroActions() {
  if (demoMode) {
    return `<div class="hero-actions"><button class="button primary" type="button" data-start>Start the sample session</button><p>Runs the four sample blocks. You can mark each one complete.</p></div>`;
  }
  return `<div class="hero-actions"><a class="button primary" href="/demo" data-link>Try it with sample data</a><p>Opens a filled four-block Spanish routine. Your current data stays unchanged.</p></div><button class="text-button" type="button" data-hero-add>Add your first block instead</button>`;
}

function home() {
  const blocks = state.blocks.length ? `
    <ol class="block-list" aria-label="Routine blocks">${state.blocks.map((block, index) => blockRow(block, index)).join('')}</ol>
    <div class="path-actions"><button class="button secondary" type="button" data-add-block>Add a block</button><button class="button primary" type="button" data-start>Start ${totalMinutes()}-minute session <span aria-hidden="true">→</span></button></div>` : emptyRoutine();
  shell(`
    <section class="intro">
      <div><p class="eyebrow">Private language routine</p><h1>Build a private language study routine</h1>
      <p class="lede">For language learners who use their own material and want a clear daily plan without generated lessons.</p>
      ${heroActions()}
      <ul class="trust" aria-label="Product facts"><li>Works offline after your first visit</li><li>No model calls or tracking</li><li>Free core; Plus costs $12 once</li></ul></div>
      <figure class="hero-art"><picture><source media="(max-width: 700px)" srcset="/assets/hero-960.webp"><img src="/assets/hero-1440.webp" width="1440" height="960" alt="Collage showing listening, reading, speaking, recall, and a timer" fetchpriority="high" decoding="async"></picture></figure>
    </section>
    <section class="workbench" aria-labelledby="routine-heading">
      <div class="section-head"><div><p class="kicker">Your routine${state.language ? ` · ${esc(state.language)}` : ''}</p><h2 id="routine-heading">${esc(state.routineName)}</h2></div>
      ${state.blocks.length ? `<div class="summary"><strong>${totalMinutes()} min</strong><span>${state.blocks.length} blocks</span></div>` : ''}</div>
      ${blocks}
      <details class="path-settings"><summary>Name this routine</summary><form class="inline-form" data-path-form><label>Routine name<input name="routineName" value="${esc(state.routineName)}" maxlength="60" required></label><label>Language <span>(optional)</span><input name="language" value="${esc(state.language)}" maxlength="40" placeholder="For example, Spanish"></label><button class="button secondary" type="submit" aria-label="Save routine details">Save details</button></form></details>
    </section>
    ${state.blocks.length ? progressStrip() : ''}
    ${landingSections()}
    ${editBlock ? blockDialog() : ''}
  `);
  bindHome();
}

function landingSections() {
  return `<section class="landing-section" aria-labelledby="how-heading"><p class="kicker">How it works</p><h2 id="how-heading">Build, study, and review</h2><ol class="how-list"><li><strong>Choose each block.</strong><span>Add your own listening, reading, speaking, and recall work.</span></li><li><strong>Follow the timer.</strong><span>Complete each block in the order you set.</span></li><li><strong>Check the rule.</strong><span>Advance after your chosen number of complete sessions.</span></li></ol></section>
    <section class="landing-section limits" aria-labelledby="limits-heading"><p class="kicker">Privacy and limits</p><h2 id="limits-heading">Your material stays under your control</h2><p>The app stores routines and history in this browser. It does not generate lessons, choose difficulty, or promise fluency.</p><p>Source links stay local until you choose to open them. Files are never uploaded.</p></section>
    <section class="landing-section paid-tier" aria-labelledby="paid-heading"><div><p class="kicker">Optional Plus license</p><h2 id="paid-heading">Add longer history and print sheets</h2><p>Keep the routine builder, timer, rules, offline use, and export free. Plus costs $12 once.</p><a class="button secondary" href="${href('/plus')}" data-link>See Plus details</a></div><div class="price-stamp" aria-label="$12 one-time price"><span>$12</span><small>once</small></div></section>`;
}

function emptyRoutine() {
  return `<div class="empty-state"><div class="empty-stamp" aria-hidden="true">4×</div><div><h3>No blocks yet</h3><p>Add one block, or start with listening, reading, speaking, and recall.</p><div class="button-row"><button class="button primary" type="button" data-starter>Add the 20-minute starter</button><button class="button secondary" type="button" data-empty-add>Add one block</button></div></div></div>`;
}

function blockRow(block: RoutineBlock, index: number) {
  return `<li class="block block-${block.type}"><span class="block-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="block-copy"><p class="block-type">${BLOCK_LABELS[block.type]}</p><h3>${esc(block.title)}</h3><p>${esc(block.instruction)}</p>${block.source ? `<a href="${esc(block.source)}" target="_blank" rel="noreferrer">Open source <span class="sr-only">in a new tab</span> ↗</a>` : ''}</div><div class="block-meta"><strong>${block.minutes}<span> min</span></strong><div class="row-buttons"><button type="button" data-move="up" data-id="${block.id}" aria-label="Move ${esc(block.title)} earlier" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move="down" data-id="${block.id}" aria-label="Move ${esc(block.title)} later" ${index === state.blocks.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-edit="${block.id}">Edit<span class="sr-only"> ${esc(block.title)}</span></button></div></div></li>`;
}

function progressStrip() {
  const p = progression(state);
  return `<section class="rule-strip" aria-labelledby="progress-heading"><div><p class="kicker">Progression rule</p><h2 id="progress-heading">Stage ${state.stage + 1}: ${STAGES[state.stage]}</h2><p>${ruleSentence()}</p></div><div class="punches" aria-label="${p.completed} of ${p.required} sessions complete">${Array.from({ length: p.required }, (_, index) => `<span class="${index < p.completed ? 'filled' : ''}" aria-hidden="true"></span>`).join('')}<strong>${p.completed}/${p.required}</strong></div><a class="text-link" href="${href('/rules')}" data-link>Inspect or change the rule →</a></section>`;
}

function blockDialog() {
  const isNew = editBlock === 'new';
  const block: RoutineBlock = isNew ? { id: '', type: 'listen', title: '', instruction: '', minutes: 5, source: '' } : editBlock as RoutineBlock;
  return `<dialog class="paper-dialog" aria-labelledby="dialog-title"><form method="dialog" data-block-form><div class="dialog-head"><div><p class="kicker">Routine block</p><h2 id="dialog-title">${isNew ? 'Add a study block' : 'Edit this block'}</h2></div><button type="button" class="icon-button" data-close aria-label="Close dialog">×</button></div><label>Mode<select name="type"><option value="listen" ${block.type === 'listen' ? 'selected' : ''}>Listen</option><option value="read" ${block.type === 'read' ? 'selected' : ''}>Read</option><option value="speak" ${block.type === 'speak' ? 'selected' : ''}>Speak</option><option value="recall" ${block.type === 'recall' ? 'selected' : ''}>Recall</option></select></label><label>Short title<input name="title" value="${esc(block.title)}" maxlength="60" required autocomplete="off"></label><label>What will you do?<textarea name="instruction" maxlength="180" required rows="3">${esc(block.instruction)}</textarea></label><div class="field-pair"><label>Minutes<input name="minutes" type="number" min="1" max="90" step="1" value="${block.minutes}" required></label><label>Source link <span>(optional)</span><input name="source" type="url" value="${esc(block.source ?? '')}" placeholder="https://example.org"></label></div><p class="field-note">Links stay in this browser. Files are never uploaded.</p><p class="form-error" role="alert"></p><div class="dialog-actions">${isNew ? '' : '<button class="button danger-button" type="button" data-delete>Delete block</button>'}<button class="button secondary" type="button" data-close>Cancel</button><button class="button primary" type="submit">${isNew ? 'Add block' : 'Save block'}</button></div></form></dialog>`;
}

function starterBlocks(): RoutineBlock[] {
  return [
    { id: uid(), type: 'listen', title: 'Listen twice', instruction: 'Play a short familiar clip once for meaning, then once for detail.', minutes: 5 },
    { id: uid(), type: 'read', title: 'Read one passage', instruction: 'Read a short passage. Mark up to three useful phrases.', minutes: 5 },
    { id: uid(), type: 'speak', title: 'Retell it aloud', instruction: 'Without looking, say what you understood. Note any gaps.', minutes: 5 },
    { id: uid(), type: 'recall', title: 'Recall three phrases', instruction: 'Write three phrases from memory, then check the source.', minutes: 5 }
  ];
}

function sampleState(): AppState {
  const now = new Date();
  const blocks = [
    { id: 'sample-listen', type: 'listen' as const, title: 'Listen to a short news clip', instruction: 'Play a two-minute Spanish news clip twice. Note three words you hear.', minutes: 6 },
    { id: 'sample-read', type: 'read' as const, title: 'Read the matching summary', instruction: 'Read the short summary. Mark two phrases that explain the main event.', minutes: 5 },
    { id: 'sample-speak', type: 'speak' as const, title: 'Retell the news aloud', instruction: 'Give a one-minute summary without reading. Repeat once with your notes.', minutes: 5 },
    { id: 'sample-recall', type: 'recall' as const, title: 'Recall useful phrases', instruction: 'Write three marked phrases from memory. Check and correct them.', minutes: 4 }
  ];
  const completedAt = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  return { version: 1, language: 'Spanish', routineName: 'Spanish news practice', blocks, history: [
    { id: 'sample-session-1', completedAt: completedAt(2), durationSeconds: 1_080, blockIds: blocks.map((block) => block.id), stage: 0 },
    { id: 'sample-session-2', completedAt: completedAt(1), durationSeconds: 1_140, blockIds: blocks.map((block) => block.id), stage: 0 }
  ], sessionsPerStage: 3, stage: 0, createdAt: completedAt(3), updatedAt: now.toISOString() };
}

function openBlockEditor(value: RoutineBlock | 'new', returnSelector: string) {
  editBlock = value;
  dialogReturnSelector = returnSelector;
  render();
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>('dialog input')?.focus());
}

function closeBlockEditor(returnSelector = dialogReturnSelector) {
  editBlock = null;
  render();
  requestAnimationFrame(() => document.querySelector<HTMLElement>(returnSelector)?.focus());
}

function bindHome() {
  document.querySelector('[data-starter]')?.addEventListener('click', () => persist({ ...state, blocks: starterBlocks() }, 'Starter added. Every block can be changed.'));
  document.querySelector('[data-hero-add]')?.addEventListener('click', () => openBlockEditor('new', '[data-hero-add]'));
  document.querySelector('[data-empty-add]')?.addEventListener('click', () => openBlockEditor('new', '[data-empty-add]'));
  document.querySelector('[data-add-block]')?.addEventListener('click', () => openBlockEditor('new', '[data-add-block]'));
  document.querySelectorAll('[data-start]').forEach((button) => button.addEventListener('click', startSession));
  document.querySelectorAll<HTMLElement>('[data-edit]').forEach((button) => button.addEventListener('click', () => openBlockEditor(state.blocks.find((block) => block.id === button.dataset.edit) ?? 'new', `[data-edit="${button.dataset.edit}"]`)));
  document.querySelectorAll<HTMLElement>('[data-move]').forEach((button) => button.addEventListener('click', () => moveBlock(button.dataset.id!, button.dataset.move === 'up' ? -1 : 1)));
  const dialog = document.querySelector<HTMLDialogElement>('dialog');
  dialog?.showModal();
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeBlockEditor()));
  dialog?.addEventListener('cancel', (event) => { event.preventDefault(); closeBlockEditor(); });
  document.querySelector<HTMLFormElement>('[data-block-form]')?.addEventListener('submit', saveBlock);
  document.querySelector('[data-delete]')?.addEventListener('click', deleteBlock);
  document.querySelector<HTMLFormElement>('[data-path-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    persist({ ...state, routineName: String(data.get('routineName')).trim(), language: String(data.get('language')).trim() }, 'Routine details saved.');
  });
}

function moveBlock(id: string, delta: number) {
  const blocks = [...state.blocks];
  const from = blocks.findIndex((block) => block.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= blocks.length) return;
  [blocks[from], blocks[to]] = [blocks[to], blocks[from]];
  persist({ ...state, blocks }, 'Block order saved.');
}

async function saveBlock(event: Event) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const minutes = Number(data.get('minutes'));
  const source = String(data.get('source') ?? '').trim();
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 90) {
    form.querySelector('.form-error')!.textContent = 'Choose a whole number from 1 to 90 minutes.';
    return;
  }
  if (source) {
    try { if (!['http:', 'https:'].includes(new URL(source).protocol)) throw new Error('scheme'); }
    catch { form.querySelector('.form-error')!.textContent = 'Use a complete link beginning with https:// or http://.'; return; }
  }
  const wasNew = editBlock === 'new';
  const next: RoutineBlock = { id: wasNew ? uid() : (editBlock as RoutineBlock).id, type: data.get('type') as BlockType, title: String(data.get('title')).trim(), instruction: String(data.get('instruction')).trim(), minutes, ...(source ? { source } : {}) };
  const blocks = wasNew ? [...state.blocks, next] : state.blocks.map((block) => block.id === next.id ? next : block);
  editBlock = null;
  await persist({ ...state, blocks }, wasNew ? 'Block added.' : 'Block saved.');
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-edit="${next.id}"]`)?.focus());
}

async function deleteBlock() {
  if (editBlock === 'new' || !editBlock) return;
  if (!confirm(`Delete “${editBlock.title}” from this routine?`)) return;
  const deletedId = editBlock.id;
  const blocks = state.blocks.filter((block) => block.id !== deletedId);
  editBlock = null;
  await persist({ ...state, blocks }, 'Block deleted.');
  requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-add-block], [data-empty-add]')?.focus());
}

function startSession() {
  if (!state.blocks.length) return;
  const first = state.blocks[0];
  session = { index: 0, remaining: first.minutes * 60, elapsed: 0, running: false, completed: [] };
  navigate('/session');
}

function sessionPage() {
  if (!session || !state.blocks.length) { history.replaceState({}, '', href('/')); home(); return; }
  const block = state.blocks[session.index];
  const mins = Math.floor(session.remaining / 60);
  const secs = session.remaining % 60;
  const total = block.minutes * 60;
  shell(`<section class="session-screen"><div class="session-top"><div><p class="eyebrow">Block ${session.index + 1} of ${state.blocks.length} · ${BLOCK_LABELS[block.type]}</p><h1>${esc(block.title)}</h1></div><button class="button quiet" type="button" data-exit>Leave session</button></div><div class="session-body"><div class="timer" aria-label="${mins} minutes ${secs} seconds remaining"><div><time datetime="PT${session.remaining}S">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</time><span>${session.running ? 'Counting down' : session.remaining === 0 ? 'Time is up' : 'Ready when you are'}</span><progress class="sr-only" max="${total}" value="${total - session.remaining}">${total - session.remaining} seconds complete</progress></div></div><div class="session-instruction"><p class="kicker">Instructions</p><p>${esc(block.instruction)}</p>${block.source ? `<a class="button secondary" href="${esc(block.source)}" target="_blank" rel="noreferrer">Open source <span class="sr-only">in a new tab</span> ↗</a>` : '<p class="fine">Use material on your device, or work from memory.</p>'}</div></div><div class="session-controls"><button class="button secondary" type="button" data-timer>${session.running ? 'Pause timer' : session.remaining === 0 ? 'Restart timer' : 'Start timer'}</button><button class="button primary" type="button" data-done>${session.index === state.blocks.length - 1 ? 'Finish session' : 'Mark done and continue'} →</button></div><ol class="session-steps" aria-label="Session progress">${state.blocks.map((item, index) => `<li class="${index < session!.index ? 'done' : index === session!.index ? 'current' : ''}"><span>${index < session!.index ? '✓' : index + 1}</span>${BLOCK_LABELS[item.type]}</li>`).join('')}</ol></section>`);
  document.querySelector('[data-exit]')?.addEventListener('click', () => { if (confirm('Leave this session? Finished blocks will not be recorded.')) { stopTimer(); session = null; navigate('/'); } });
  document.querySelector('[data-timer]')?.addEventListener('click', toggleTimer);
  document.querySelector('[data-done]')?.addEventListener('click', completeBlock);
}

function toggleTimer() {
  if (!session) return;
  if (session.remaining === 0) session.remaining = state.blocks[session.index].minutes * 60;
  session.running = !session.running;
  if (session.running) {
    timer = window.setInterval(() => {
      if (!session) return;
      session.remaining = Math.max(0, session.remaining - 1);
      session.elapsed += 1;
      if (session.remaining === 0) { stopTimer(); message = 'Time is up. Finish when you are ready.'; }
      sessionPage();
    }, 1000);
  } else stopTimer();
  sessionPage();
}

function stopTimer() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  if (session) session.running = false;
}

async function completeBlock() {
  if (!session) return;
  stopTimer();
  const block = state.blocks[session.index];
  session.completed.push(block.id);
  if (session.index < state.blocks.length - 1) {
    session.index += 1;
    session.remaining = state.blocks[session.index].minutes * 60;
    message = `${block.title} marked complete.`;
    sessionPage();
    return;
  }
  const record = { id: uid(), completedAt: new Date().toISOString(), durationSeconds: session.elapsed, blockIds: [...session.completed], stage: state.stage };
  const before = state.stage;
  state = advanceIfReady({ ...state, history: [...state.history, record] });
  session = null;
  await persist(state, state.stage > before ? `Session saved. Stage ${state.stage + 1} is now available.` : demoMode ? 'Sample session complete.' : 'Session saved on this device.');
  navigate('/complete');
}

function completePage() {
  const latest = state.history.at(-1);
  shell(`<section class="completion"><div class="completion-stamp" aria-hidden="true">DONE</div><p class="eyebrow">Session recorded ${demoMode ? 'in the sample' : 'in this browser'}</p><h1>Session complete</h1><p class="lede">${latest ? `${latest.blockIds.length} blocks finished` : 'Session finished'}${latest?.durationSeconds ? ` · ${Math.ceil(latest.durationSeconds / 60)} active timer min` : ''}.</p>${progressStrip()}<div class="button-row"><a class="button primary" href="${href('/')}" data-link>Return to your routine</a><a class="button secondary" href="${href('/history')}" data-link>Review history</a></div></section>`);
}

function historyPage() {
  const ninetyDaysAgo = Date.now() - 90 * 86_400_000;
  const sorted = [...state.history].reverse();
  const recent = isPlus ? sorted.filter((item) => new Date(item.completedAt).getTime() >= ninetyDaysAgo) : sorted.slice(0, 14);
  const streak = currentStreak(state.history);
  shell(`<section class="page-head"><p class="eyebrow">Stored ${demoMode ? 'in this sample' : 'in this browser'}</p><h1>Review completed sessions</h1><p class="lede">Each row records a complete routine. Scores and automatic ratings are not added.</p></section><section class="stats" aria-label="Study summary"><div><strong>${state.history.length}</strong><span>sessions</span></div><div><strong>${streak}</strong><span>day streak</span></div><div><strong>${state.history.reduce((sum, item) => sum + item.blockIds.length, 0)}</strong><span>blocks finished</span></div></section><section aria-labelledby="log-heading"><div class="section-head"><div><p class="kicker">Completion history</p><h2 id="log-heading">Session log</h2></div>${isPlus ? '<button class="button secondary" type="button" data-print>Print study sheet</button>' : ''}</div>${recent.length ? `<ol class="history-list">${recent.map((item) => `<li><time datetime="${item.completedAt}"><strong>${new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(item.completedAt))}</strong><span>${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(item.completedAt))}</span></time><span>Stage ${item.stage + 1} · ${item.blockIds.length} blocks</span><span>${item.durationSeconds ? `${Math.ceil(item.durationSeconds / 60)} timer min` : 'Untimed'}</span></li>`).join('')}</ol>` : `<div class="plain-empty"><h3>No completed sessions</h3><p>Finish a routine to add its date, block count, and timer minutes here.</p><a class="button primary" href="${href('/')}" data-link>Build or start a routine</a></div>`}${!isPlus && state.history.length > 14 ? `<aside class="plus-note"><strong>${state.history.length - 14} older sessions remain in your export.</strong><p>Plus shows sessions from the last 90 days.</p><a href="${href('/plus')}" data-link>See Plus details →</a></aside>` : ''}</section>`);
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
}

function rulesPage() {
  const p = progression(state);
  shell(`<section class="page-head"><p class="eyebrow">One rule you can change</p><h1>Set the progression rule</h1><p class="lede">Choose how many complete sessions move the routine to its next stage.</p></section><section class="rule-card"><div class="rule-number">${state.stage + 1}</div><div><p class="kicker">Current stage</p><h2>${STAGES[state.stage]}</h2><p>${ruleSentence()}</p><div class="formula"><span>Completed here <strong>${p.completed}</strong></span><span aria-hidden="true">÷</span><span>Required <strong>${p.required}</strong></span></div></div></section><section class="settings-section" aria-labelledby="rule-settings"><h2 id="rule-settings">Choose the session count</h2><p>Changing this count does not edit your completion history.</p><form data-rule-form class="inline-form"><label>Sessions per stage<input type="number" name="threshold" min="1" max="30" step="1" value="${state.sessionsPerStage}" aria-describedby="rule-error" required></label><button class="button primary" type="submit">Save rule</button></form><p class="form-error" id="rule-error" role="alert"></p><details><summary>Read the three stage descriptions</summary><ol><li><strong>Settle in:</strong> make the routine easy to repeat.</li><li><strong>Build range:</strong> vary sources or difficulty yourself.</li><li><strong>Sustain:</strong> keep the useful structure and edit it when needed.</li></ol><p>The app does not alter difficulty, select content, or claim this routine produces fluency.</p></details></section>`);
  document.querySelector<HTMLFormElement>('[data-rule-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const threshold = Number(new FormData(form).get('threshold'));
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 30) { document.querySelector<HTMLElement>('#rule-error')!.textContent = 'Choose a whole number from 1 to 30.'; return; }
    await persist(advanceIfReady({ ...state, sessionsPerStage: threshold }), 'Progression rule saved.');
  });
}

function dataPage() {
  shell(`<section class="page-head"><p class="eyebrow">Local data controls</p><h1>Back up or move your data</h1><p class="lede">Routine details, source links, rules, and history are stored in this browser.</p></section><section class="data-grid"><div><h2>Export all data</h2><p>Download one JSON file containing the routine, rules, and complete history.</p><button class="button primary" type="button" data-export>Download JSON backup</button></div><div><h2>Import a backup</h2><p>Import checks the file, then asks before replacing current data.</p><label class="file-button">Choose JSON file<input type="file" accept="application/json,.json" data-import></label><p class="form-error" data-import-error role="alert"></p></div></section><section class="danger-zone"><h2>${demoMode ? 'Reset the sample' : 'Erase local data'}</h2><p>${demoMode ? 'Restore the original four blocks and two completed sessions.' : 'Erase the routine and history from this browser. Export first if you need a backup.'}</p><button class="button danger-button" type="button" data-reset>${demoMode ? 'Reset demo' : 'Erase routine and history'}</button></section>`);
  document.querySelector('[data-export]')?.addEventListener('click', exportData);
  document.querySelector<HTMLInputElement>('[data-import]')?.addEventListener('change', importData);
  document.querySelector('[data-reset]')?.addEventListener('click', () => {
    if (demoMode) { persist(sampleState(), 'Sample restored.'); return; }
    if (confirm('Erase your routine, rule, and all session history from this browser?')) persist(emptyState(), 'Routine and history erased.');
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `language-routine-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  message = 'Backup downloaded.';
  render();
}

async function importData(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const error = document.querySelector<HTMLElement>('[data-import-error]')!;
  try {
    if (!input.files?.[0]) return;
    const parsed: unknown = JSON.parse(await input.files[0].text());
    if (!validImport(parsed)) throw new Error('wrong shape');
    if (!confirm(`Replace current data with “${parsed.routineName}” and ${parsed.history.length} history records?`)) { input.value = ''; return; }
    await persist(parsed, 'Backup imported.');
    navigate('/');
  } catch {
    error.textContent = 'This is not a valid routine backup. Your current data was not changed.';
    input.value = '';
  }
}

function plusPage() {
  shell(`<section class="plus-hero"><div><p class="eyebrow">One-time purchase</p><h1>Add longer history and print sheets</h1><p class="lede">The routine builder, timer, rules, offline use, and export remain free. Plus costs $12 once.</p><ul class="check-list"><li>Sessions from the last 90 days</li><li>Printable study sheets</li><li>License restore on your own devices</li></ul>${isPlus ? `<div class="unlocked"><strong>Plus is active on this device.</strong><p>The paid history and print controls are available.</p></div>` : `<div class="billing-pending" role="status"><strong>Checkout is not available yet.</strong><p>Product registration is pending. The free features continue to work.</p></div>`}</div><div class="price-stamp" aria-label="$12 one-time price"><span>$12</span><small>once</small></div></section><section class="restore" aria-labelledby="restore-heading"><h2 id="restore-heading">Restore a purchase</h2><p>Paste the license token from your receipt on another device.</p><form data-license-form class="inline-form"><label>License token<input name="license" autocomplete="off" spellcheck="false" required></label><button class="button secondary" type="submit">Verify license</button></form><p class="form-error" data-license-error role="alert"></p></section><p class="legal-line">A purchase uses Sociobot and Dodo as the merchant of record. Refunds revoke the license.</p><p class="legal-line">Read the <a href="${href('/terms')}" data-link>terms</a> and <a href="${href('/privacy')}" data-link>privacy notice</a>.</p>`);
  document.querySelector<HTMLFormElement>('[data-license-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget as HTMLFormElement).get('license')).trim();
    localStorage.setItem(LICENSE_KEY, token);
    const valid = await verifyLicense(token, true);
    if (valid) { isPlus = true; message = 'Plus is active on this device.'; render(); }
  });
}

async function verifyLicense(token: string, force = false): Promise<boolean> {
  const error = document.querySelector<HTMLElement>('[data-license-error]');
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as { valid: boolean; checkedAt: number } | null;
    if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return cached.valid;
    const response = await fetch(`${BILLING}/${PRODUCT}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('service');
    const result = await response.json() as { valid: boolean; reason: string };
    localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() }));
    if (!result.valid) { isPlus = false; if (error) error.textContent = 'This license is not active. Check the token and try again.'; }
    return result.valid;
  } catch {
    if (error) error.textContent = 'License verification is unavailable. Check your connection and try again.';
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as { valid?: boolean } | null;
    return Boolean(cached?.valid);
  }
}

function privacyPage() {
  shell(`<article class="legal"><p class="eyebrow">Effective September 6, 2026</p><h1>Privacy for your study data</h1><p class="lede">Study data stays in your browser. The app makes no model calls and runs no analytics or tracking.</p><h2>Data on your device</h2><p>Your routine, source links, rules, and history use IndexedDB on this device.</p><p>They are not sent to us. You can export or erase them from the Data page.</p><h2>Demo data</h2><p>The demo uses a separate IndexedDB database named <code>demo:no-ai-language-path</code>.</p><p>It never reads or changes your real routine. Leaving the demo deletes its sample database.</p><h2>Network requests</h2><p>Installing and updating requests static files from this site.</p><p>License verification sends only the pasted token to the Sociobot billing service.</p><h2>Your sources</h2><p>Source links stay local until you open them. Opening a link contacts that site.</p><p>This product has no file upload feature.</p><h2>Contact and changes</h2><p>Report a privacy question in the <a href="https://github.com/B-Divyesh/sf-no-ai-language-path/issues" target="_blank" rel="noreferrer">public issue tracker <span class="sr-only">on GitHub</span> ↗</a>.</p><p>Because there is no account, we cannot recover deleted data.</p></article>`);
}

function termsPage() {
  shell(`<article class="legal"><p class="eyebrow">Effective September 6, 2026</p><h1>Terms for using this app</h1><p class="lede">No-AI Language Path plans and times study. It is not a teacher or a promise of fluency.</p><h2>Using the app</h2><p>You are responsible for your study sources and their licenses.</p><p>The app comes without guarantees for learning results, data recovery, or uninterrupted availability. Export backups you need.</p><h2>Plus purchase</h2><p>Plus is a $12 one-time license for the features listed on the Plus page.</p><p>Sociobot and Dodo handle checkout and refunds. A refunded or invalid license stops paid access.</p><p>Accessibility, offline routine use, and complete data export remain free.</p><h2>Fair use and changes</h2><p>Do not interfere with the site or license verification.</p><p>We may change features while keeping exported data readable.</p></article>`);
}

function notFound() {
  shell(`<section class="completion"><p class="eyebrow">Error 404</p><h1>Page not found</h1><p>The requested page is not part of this app.</p><a class="button primary" href="${href('/')}" data-link>Return to the routine builder</a></section>`);
}

function render() {
  const pages: Record<string, () => void> = { '/': home, '/session': sessionPage, '/complete': completePage, '/history': historyPage, '/rules': rulesPage, '/data': dataPage, '/plus': plusPage, '/privacy': privacyPage, '/terms': termsPage };
  (pages[route()] ?? notFound)();
}

async function initLicense() {
  const params = new URLSearchParams(location.search);
  const returned = params.get('license');
  if (returned) {
    localStorage.setItem(LICENSE_KEY, returned);
    params.delete('license');
    history.replaceState({}, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  }
  const token = localStorage.getItem(LICENSE_KEY);
  const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as { valid: boolean } | null;
  const previous = isPlus;
  isPlus = Boolean(token && cached?.valid);
  if (isPlus !== previous) render();
  if (token) {
    const valid = await verifyLicense(token);
    if (valid !== isPlus) { isPlus = valid; render(); }
  }
}

async function init() {
  try {
    state = await loadState(demoMode);
    if (demoMode && !state.blocks.length) { state = sampleState(); await saveState(state, true); }
  } catch {
    storageAvailable = false;
    state = demoMode ? sampleState() : emptyState();
  }
  render();
  initLicense();
  document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    const main = document.querySelector<HTMLElement>('#main');
    main?.focus();
    main?.scrollIntoView();
  });
  window.addEventListener('popstate', () => {
    demoMode = location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
    focusNextHeading = true;
    window.scrollTo(0, 0);
    render();
  });
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }
      const toast = document.querySelector<HTMLElement>('#update-toast');
      if (toast) toast.hidden = false;
    });
  }
}

init();
