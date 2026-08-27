import './style.css';
import { emptyState, loadState, saveState, validImport } from './db';
import { advanceIfReady, currentStreak, progression } from './progression';
import { BLOCK_LABELS, STAGES, type AppState, type BlockType, type RoutineBlock } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const PRODUCT = 'no-ai-language-path';
const BILLING = 'https://api.sociobot.in/api/v1/products';
const LICENSE_KEY = `sb_license:${PRODUCT}`;
const VERDICT_KEY = `sb_license_verdict:${PRODUCT}`;

let state: AppState = emptyState();
let storageAvailable = true;
let message = '';
let isPlus = false;
let editBlock: RoutineBlock | 'new' | null = null;
let timer: number | null = null;
let session: { index: number; remaining: number; elapsed: number; running: boolean; completed: string[] } | null = null;

const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]!));

function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function route() {
  return location.pathname.replace(/\/$/, '') || '/';
}

function navigate(path: string) {
  history.pushState({}, '', path);
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  render();
}

async function persist(next = state, notice = 'Saved on this device.') {
  state = { ...next, updatedAt: new Date().toISOString() };
  try {
    await saveState(state);
    message = notice;
  } catch {
    storageAvailable = false;
    message = 'Could not save on this device. Export your path before closing this tab.';
  }
  render();
}

function header() {
  const path = route();
  const nav = [
    ['/', 'Path'], ['/history', 'History'], ['/rules', 'Rules'], ['/data', 'Your data'], ['/plus', isPlus ? 'Plus ✓' : 'Plus']
  ];
  return `
    <header class="site-header">
      <a class="brand" href="/" data-link aria-label="No-AI Language Path home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span>No-AI Language Path</span>
      </a>
      <nav aria-label="Main navigation">${nav.map(([href, label]) => `<a href="${href}" data-link ${path === href ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
      <span class="local-badge"><span aria-hidden="true">●</span> Local only</span>
    </header>`;
}

function footer() {
  return `<footer>
    <p><strong>No model calls. No telemetry.</strong> Your routine, links, and history stay in this browser.</p>
    <p><a href="/privacy" data-link>Privacy</a> · <a href="/terms" data-link>Terms</a> · <a href="/plus" data-link>One-time Plus unlock</a></p>
    <p class="fine">Hero artwork was generated for this product with the factory image model, then reviewed and optimized.</p>
  </footer>`;
}

function shell(content: string) {
  const offline = navigator.onLine ? '' : `<div class="status offline" role="status"><strong>Offline:</strong> everything on this path still works. External source links wait for a connection.</div>`;
  const storage = storageAvailable ? '' : `<div class="status error" role="alert">Browser storage is unavailable. Changes last only in this tab; export your data now.</div>`;
  app.innerHTML = `${header()}${offline}${storage}<main id="main" tabindex="-1">${content}</main>${footer()}<div class="live" aria-live="polite">${esc(message)}</div><div id="update-toast" class="toast" hidden role="status">A fresh version is ready. <button type="button" data-reload>Reload</button></div>`;
  bindCommon();
}

function bindCommon() {
  document.querySelectorAll<HTMLAnchorElement>('[data-link]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault(); navigate(link.pathname);
  }));
  document.querySelector<HTMLButtonElement>('[data-reload]')?.addEventListener('click', () => location.reload());
}

function totalMinutes() {
  return state.blocks.reduce((sum, block) => sum + block.minutes, 0);
}

function ruleSentence() {
  const p = progression(state);
  if (state.stage === STAGES.length - 1) return `Sustain has no hidden next level. Keep, revise, or reset this rule whenever it stops serving you.`;
  return `Complete ${p.remaining} more ${p.remaining === 1 ? 'session' : 'sessions'} to move from ${STAGES[state.stage]} to ${STAGES[state.stage + 1]}. Only fully finished sessions count.`;
}

function home() {
  const blocks = state.blocks.length ? `
    <ol class="block-list" aria-label="Routine blocks">${state.blocks.map((block, index) => blockRow(block, index)).join('')}</ol>
    <div class="path-actions"><button class="button secondary" type="button" data-add-block>+ Add a block</button><button class="button primary" type="button" data-start>Start ${totalMinutes()}-minute session <span aria-hidden="true">→</span></button></div>` : emptyRoutine();
  const hero = !state.blocks.length ? `<section class="hero-art" aria-label="A tactile collage of the four study modes">
      <picture><source media="(max-width: 700px)" srcset="/assets/hero-960.webp"><img src="/assets/hero-1440.webp" width="1440" height="960" alt="Risograph collage of a cassette player, reading sheet, speaking card, recall tickets, and mechanical timer" fetchpriority="high" decoding="async"></picture>
    </section>` : '';
  shell(`
    <section class="intro ${state.blocks.length ? 'compact' : ''}">
      <div><p class="eyebrow">A routine you can explain</p><h1>Study by your rules.</h1>
      <p class="lede">Compose a repeatable path through listening, reading, speaking, and recall. It works offline and never sends your words to a model.</p>
      <div class="trust"><span>No AI</span><span>No account</span><span>Export anytime</span></div></div>${hero}
    </section>
    <section class="workbench" aria-labelledby="path-heading">
      <div class="section-head"><div><p class="kicker">Your workbench${state.language ? ` · ${esc(state.language)}` : ''}</p><h2 id="path-heading">${esc(state.routineName)}</h2></div>
      ${state.blocks.length ? `<div class="summary"><strong>${totalMinutes()} min</strong><span>${state.blocks.length} blocks</span></div>` : ''}</div>
      ${blocks}
      <details class="path-settings"><summary>Name this path</summary><form class="inline-form" data-path-form><label>Path name<input name="routineName" value="${esc(state.routineName)}" maxlength="60" required></label><label>Language <span>(optional)</span><input name="language" value="${esc(state.language)}" maxlength="40" placeholder="e.g. Japanese"></label><button class="button secondary" type="submit">Save details</button></form></details>
    </section>
    ${state.blocks.length ? progressStrip() : ''}
    ${editBlock ? blockDialog() : ''}
  `);
  bindHome();
}

function emptyRoutine() {
  return `<div class="empty-state">
    <div class="empty-stamp" aria-hidden="true">4×</div>
    <div><h3>Your path is blank on purpose.</h3><p>Start with a balanced 20-minute routine, then change every word and minute. Or add one block at a time.</p>
    <div class="button-row"><button class="button primary" type="button" data-starter>Use the 20-minute starter</button><button class="button secondary" type="button" data-add-block>Add one block</button></div></div>
  </div>`;
}

function blockRow(block: RoutineBlock, index: number) {
  return `<li class="block block-${block.type}">
    <span class="block-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
    <div class="block-copy"><p class="block-type">${BLOCK_LABELS[block.type]}</p><h3>${esc(block.title)}</h3><p>${esc(block.instruction)}</p>${block.source ? `<a href="${esc(block.source)}" target="_blank" rel="noreferrer">Open private source <span class="sr-only">in a new tab</span> ↗</a>` : ''}</div>
    <div class="block-meta"><strong>${block.minutes}<span> min</span></strong><div class="row-buttons"><button type="button" data-move="up" data-id="${block.id}" aria-label="Move ${esc(block.title)} earlier" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move="down" data-id="${block.id}" aria-label="Move ${esc(block.title)} later" ${index === state.blocks.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-edit="${block.id}">Edit<span class="sr-only"> ${esc(block.title)}</span></button></div></div>
  </li>`;
}

function progressStrip() {
  const p = progression(state);
  return `<section class="rule-strip" aria-labelledby="progress-heading">
    <div><p class="kicker">Visible progression rule</p><h2 id="progress-heading">Stage ${state.stage + 1}: ${STAGES[state.stage]}</h2><p>${ruleSentence()}</p></div>
    <div class="punches" aria-label="${p.completed} of ${p.required} sessions complete">${Array.from({ length: p.required }, (_, index) => `<span class="${index < p.completed ? 'filled' : ''}" aria-hidden="true"></span>`).join('')}<strong>${p.completed}/${p.required}</strong></div>
    <a class="text-link" href="/rules" data-link>Inspect or change the rule →</a>
  </section>`;
}

function blockDialog() {
  const isNew = editBlock === 'new';
  const block: RoutineBlock = isNew ? { id: '', type: 'listen', title: '', instruction: '', minutes: 5, source: '' } : editBlock as RoutineBlock;
  return `<dialog class="paper-dialog" aria-labelledby="dialog-title"><form method="dialog" data-block-form>
    <div class="dialog-head"><div><p class="kicker">Routine block</p><h2 id="dialog-title">${isNew ? 'Add a study block' : 'Edit this block'}</h2></div><button type="button" class="icon-button" data-close aria-label="Close dialog">×</button></div>
    <label>Mode<select name="type"><option value="listen" ${block.type === 'listen' ? 'selected' : ''}>Listen</option><option value="read" ${block.type === 'read' ? 'selected' : ''}>Read</option><option value="speak" ${block.type === 'speak' ? 'selected' : ''}>Speak</option><option value="recall" ${block.type === 'recall' ? 'selected' : ''}>Recall</option></select></label>
    <label>Short title<input name="title" value="${esc(block.title)}" maxlength="60" required autocomplete="off"></label>
    <label>What will you do?<textarea name="instruction" maxlength="180" required rows="3">${esc(block.instruction)}</textarea></label>
    <div class="field-pair"><label>Minutes<input name="minutes" type="number" min="1" max="90" step="1" value="${block.minutes}" required></label><label>Source link <span>(optional)</span><input name="source" type="url" value="${esc(block.source ?? '')}" placeholder="https://…"></label></div>
    <p class="field-note">Links are stored only on this device. Files are never uploaded.</p><p class="form-error" role="alert"></p>
    <div class="dialog-actions">${isNew ? '' : '<button class="button danger-button" type="button" data-delete>Delete block</button>'}<button class="button secondary" type="button" data-close>Cancel</button><button class="button primary" type="submit">${isNew ? 'Add block' : 'Save block'}</button></div>
  </form></dialog>`;
}

function starterBlocks(): RoutineBlock[] {
  return [
    { id: uid(), type: 'listen', title: 'Listen once, then again', instruction: 'Play a short familiar clip once for meaning, then once for detail.', minutes: 5 },
    { id: uid(), type: 'read', title: 'Read with a pencil', instruction: 'Read one short passage. Mark up to three phrases worth keeping.', minutes: 5 },
    { id: uid(), type: 'speak', title: 'Retell aloud', instruction: 'Without looking, say what you understood. Gaps are useful evidence.', minutes: 5 },
    { id: uid(), type: 'recall', title: 'Recall three phrases', instruction: 'Write three useful phrases from memory, then check the source.', minutes: 5 }
  ];
}

function bindHome() {
  document.querySelector('[data-starter]')?.addEventListener('click', () => persist({ ...state, blocks: starterBlocks() }, 'Starter added. Every block remains editable.'));
  document.querySelectorAll('[data-add-block]').forEach((button) => button.addEventListener('click', () => { editBlock = 'new'; render(); setTimeout(() => document.querySelector<HTMLInputElement>('dialog input')?.focus()); }));
  document.querySelector('[data-start]')?.addEventListener('click', startSession);
  document.querySelectorAll<HTMLElement>('[data-edit]').forEach((button) => button.addEventListener('click', () => { editBlock = state.blocks.find((block) => block.id === button.dataset.edit) ?? null; render(); setTimeout(() => document.querySelector<HTMLInputElement>('dialog input')?.focus()); }));
  document.querySelectorAll<HTMLElement>('[data-move]').forEach((button) => button.addEventListener('click', () => moveBlock(button.dataset.id!, button.dataset.move === 'up' ? -1 : 1)));
  const dialog = document.querySelector<HTMLDialogElement>('dialog');
  dialog?.showModal();
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => { editBlock = null; render(); }));
  dialog?.addEventListener('cancel', (event) => { event.preventDefault(); editBlock = null; render(); });
  document.querySelector<HTMLFormElement>('[data-block-form]')?.addEventListener('submit', saveBlock);
  document.querySelector('[data-delete]')?.addEventListener('click', deleteBlock);
  document.querySelector<HTMLFormElement>('[data-path-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    persist({ ...state, routineName: String(data.get('routineName')).trim(), language: String(data.get('language')).trim() }, 'Path details saved.');
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

function saveBlock(event: Event) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const minutes = Number(data.get('minutes'));
  const source = String(data.get('source') ?? '').trim();
  if (source) {
    try { if (!['http:', 'https:'].includes(new URL(source).protocol)) throw new Error('scheme'); } catch { form.querySelector('.form-error')!.textContent = 'Use a complete link beginning with https:// or http://.'; return; }
  }
  const wasNew = editBlock === 'new';
  const next: RoutineBlock = {
    id: wasNew ? uid() : (editBlock as RoutineBlock).id,
    type: data.get('type') as BlockType,
    title: String(data.get('title')).trim(), instruction: String(data.get('instruction')).trim(), minutes,
    ...(source ? { source } : {})
  };
  const blocks = wasNew ? [...state.blocks, next] : state.blocks.map((block) => block.id === next.id ? next : block);
  editBlock = null;
  persist({ ...state, blocks }, wasNew ? 'Block added.' : 'Block saved.');
}

function deleteBlock() {
  if (editBlock === 'new' || !editBlock) return;
  if (!confirm(`Delete “${editBlock.title}” from this routine?`)) return;
  const id = editBlock.id;
  const blocks = state.blocks.filter((block) => block.id !== id);
  editBlock = null; persist({ ...state, blocks }, 'Block deleted.');
}

function startSession() {
  if (!state.blocks.length) return;
  const first = state.blocks[0];
  session = { index: 0, remaining: first.minutes * 60, elapsed: 0, running: false, completed: [] };
  navigate('/session');
}

function sessionPage() {
  if (!session || !state.blocks.length) { navigate('/'); return; }
  const block = state.blocks[session.index];
  const mins = Math.floor(session.remaining / 60);
  const secs = session.remaining % 60;
  const pct = Math.max(0, 100 - (session.remaining / (block.minutes * 60) * 100));
  shell(`<section class="session-screen">
    <div class="session-top"><div><p class="eyebrow">Block ${session.index + 1} of ${state.blocks.length} · ${BLOCK_LABELS[block.type]}</p><h1>${esc(block.title)}</h1></div><button class="button quiet" type="button" data-exit>Leave session</button></div>
    <div class="session-body">
      <div class="timer" style="--progress:${pct * 3.6}deg" aria-label="${mins} minutes ${secs} seconds remaining"><div><time datetime="PT${session.remaining}S">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</time><span>${session.running ? 'Counting down' : session.remaining === 0 ? 'Time is up' : 'Ready when you are'}</span></div></div>
      <div class="session-instruction"><p class="kicker">Your instruction</p><p>${esc(block.instruction)}</p>${block.source ? `<a class="button secondary" href="${esc(block.source)}" target="_blank" rel="noreferrer">Open source ↗</a>` : '<p class="fine">Use a source already on your device, or work from memory.</p>'}</div>
    </div>
    <div class="session-controls"><button class="button secondary" type="button" data-timer>${session.running ? 'Pause timer' : session.remaining === 0 ? 'Restart timer' : 'Start timer'}</button><button class="button primary" type="button" data-done>${session.index === state.blocks.length - 1 ? 'Finish session' : 'Mark done & next'} →</button></div>
    <ol class="session-steps" aria-label="Session progress">${state.blocks.map((item, index) => `<li class="${index < session!.index ? 'done' : index === session!.index ? 'current' : ''}"><span>${index < session!.index ? '✓' : index + 1}</span>${BLOCK_LABELS[item.type]}</li>`).join('')}</ol>
  </section>`);
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
      session.remaining = Math.max(0, session.remaining - 1); session.elapsed += 1;
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
    message = `${block.title} marked done.`; sessionPage();
    return;
  }
  const record = { id: uid(), completedAt: new Date().toISOString(), durationSeconds: session.elapsed, blockIds: [...session.completed], stage: state.stage };
  const before = state.stage;
  state = advanceIfReady({ ...state, history: [...state.history, record] });
  session = null;
  await persist(state, state.stage > before ? `Session saved. You advanced to ${STAGES[state.stage]}.` : 'Session saved on this device.');
  navigate('/complete');
}

function completePage() {
  const latest = state.history.at(-1);
  shell(`<section class="completion">
    <div class="completion-stamp" aria-hidden="true">DONE</div><p class="eyebrow">Session recorded locally</p><h1>You kept the path.</h1>
    <p class="lede">${latest ? `${latest.blockIds.length} blocks finished` : 'Session finished'}${latest?.durationSeconds ? ` · ${Math.ceil(latest.durationSeconds / 60)} active timer min` : ''}. Nothing was sent anywhere.</p>
    ${progressStrip()}
    <div class="button-row"><a class="button primary" href="/" data-link>Back to your path</a><a class="button secondary" href="/history" data-link>See history</a></div>
  </section>`);
}

function historyPage() {
  const limit = isPlus ? 90 : 14;
  const recent = [...state.history].reverse().slice(0, limit);
  const streak = currentStreak(state.history);
  shell(`<section class="page-head"><p class="eyebrow">Marks you made, not scores we invented</p><h1>Your history</h1><p class="lede">A plain record of fully completed sessions. It never leaves this device.</p></section>
    <section class="stats" aria-label="Study summary"><div><strong>${state.history.length}</strong><span>sessions</span></div><div><strong>${streak}</strong><span>day streak</span></div><div><strong>${state.history.reduce((sum, item) => sum + item.blockIds.length, 0)}</strong><span>blocks finished</span></div></section>
    <section aria-labelledby="log-heading"><div class="section-head"><div><p class="kicker">Local record</p><h2 id="log-heading">Session log</h2></div>${isPlus ? '<button class="button secondary" type="button" data-print>Print study sheet</button>' : ''}</div>
    ${recent.length ? `<ol class="history-list">${recent.map((item) => `<li><time datetime="${item.completedAt}"><strong>${new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(item.completedAt))}</strong><span>${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(item.completedAt))}</span></time><span>Stage ${item.stage + 1} · ${item.blockIds.length} blocks</span><span>${item.durationSeconds ? `${Math.ceil(item.durationSeconds / 60)} timer min` : 'Untimed'}</span></li>`).join('')}</ol>` : `<div class="plain-empty"><h3>No marks yet.</h3><p>Finish a routine once and its date, blocks, and timer minutes will appear here.</p><a class="button primary" href="/" data-link>Build or start a path</a></div>`}
    ${!isPlus && state.history.length > limit ? `<aside class="plus-note"><strong>${state.history.length - limit} older sessions are safely stored.</strong><p>Plus shows the full 90-day view. Export always includes everything, even on the free path.</p><a href="/plus" data-link>See the one-time unlock →</a></aside>` : ''}</section>`);
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
}

function rulesPage() {
  const p = progression(state);
  shell(`<section class="page-head"><p class="eyebrow">Nothing under the floorboards</p><h1>Your progression rule</h1><p class="lede">This is the whole algorithm. Change it whenever your life changes.</p></section>
    <section class="rule-card"><div class="rule-number">${state.stage + 1}</div><div><p class="kicker">Current stage</p><h2>${STAGES[state.stage]}</h2><p>${ruleSentence()}</p><div class="formula"><span>Finished here <strong>${p.completed}</strong></span><span aria-hidden="true">÷</span><span>Required <strong>${p.required}</strong></span></div></div></section>
    <section class="settings-section" aria-labelledby="rule-settings"><h2 id="rule-settings">Set the threshold</h2><p>Choose how many complete sessions advance a stage. Changing it never rewrites your history.</p>
      <form data-rule-form class="inline-form"><label>Sessions per stage<input type="number" name="threshold" min="1" max="30" value="${state.sessionsPerStage}" required></label><button class="button primary" type="submit">Save rule</button></form>
      <details><summary>What each stage means</summary><ol><li><strong>Settle in:</strong> make the routine easy to repeat.</li><li><strong>Build range:</strong> slowly vary sources or difficulty yourself.</li><li><strong>Sustain:</strong> keep the useful structure; edit when it gets stale.</li></ol><p>The app does not alter difficulty, select content, or claim this routine produces fluency.</p></details>
    </section>`);
  document.querySelector<HTMLFormElement>('[data-rule-form]')?.addEventListener('submit', (event) => { event.preventDefault(); const threshold = Number(new FormData(event.currentTarget as HTMLFormElement).get('threshold')); persist(advanceIfReady({ ...state, sessionsPerStage: threshold }), 'Progression rule saved.'); });
}

function dataPage() {
  shell(`<section class="page-head"><p class="eyebrow">Portable by default</p><h1>Your data</h1><p class="lede">Routine details, source links, and session history live in this browser’s IndexedDB. Export a readable JSON backup at any time.</p></section>
    <section class="data-grid"><div><h2>Export everything</h2><p>Download one file containing your routine, rules, and complete history. Core data export is always free.</p><button class="button primary" type="button" data-export>Download JSON backup</button></div>
    <div><h2>Import a backup</h2><p>Import replaces the path currently on this device after you confirm.</p><label class="file-button">Choose JSON file<input type="file" accept="application/json,.json" data-import></label><p class="form-error" data-import-error role="alert"></p></div></section>
    <section class="danger-zone"><h2>Start over</h2><p>Erase the routine and history from this browser. Export first if you might want them again.</p><button class="button danger-button" type="button" data-reset>Erase local path</button></section>`);
  document.querySelector('[data-export]')?.addEventListener('click', exportData);
  document.querySelector<HTMLInputElement>('[data-import]')?.addEventListener('change', importData);
  document.querySelector('[data-reset]')?.addEventListener('click', () => { if (confirm('Erase your routine, rule, and all session history from this browser? This cannot be undone without an export.')) persist(emptyState(), 'Local path erased.'); });
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `language-path-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); message = 'Backup downloaded.'; render();
}

async function importData(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const error = document.querySelector<HTMLElement>('[data-import-error]')!;
  try {
    const parsed: unknown = JSON.parse(await input.files![0].text());
    if (!validImport(parsed)) throw new Error('wrong shape');
    if (!confirm(`Replace this device’s current path with “${parsed.routineName}” and ${parsed.history.length} history records?`)) { input.value = ''; return; }
    await persist(parsed, 'Backup imported and saved locally.'); navigate('/');
  } catch { error.textContent = 'That file is not a valid Language Path JSON backup. Your current data was not changed.'; }
}

function plusPage() {
  shell(`<section class="plus-hero"><div><p class="eyebrow">One purchase, no subscription</p><h1>Keep the free path. Own the extras.</h1><p class="lede">The complete routine builder, timer, rules, offline use, and data export are free. A $12 one-time Plus license adds a 90-day history view and printable study sheets.</p>
    <ul class="check-list"><li>90-day detailed history</li><li>Printable session record</li><li>Use the license on your own devices</li></ul>
    ${isPlus ? `<div class="unlocked"><strong>Plus is active on this device.</strong><p>Thank you for funding durable, private software.</p></div>` : `<a class="button primary" href="${BILLING}/${PRODUCT}/checkout">Buy Plus once — $12</a><p class="fine">Secure hosted checkout by Sociobot / Dodo, the merchant of record. Refunds are handled there and revoke the license.</p>`}
    </div><div class="price-stamp" aria-hidden="true"><span>$12</span><small>once</small></div></section>
    <section class="restore" aria-labelledby="restore-heading"><h2 id="restore-heading">Restore a purchase</h2><p>Paste the license token from your receipt to unlock this browser.</p><form data-license-form class="inline-form"><label>License token<input name="license" autocomplete="off" spellcheck="false" required></label><button class="button secondary" type="submit">Verify license</button></form><p class="form-error" data-license-error role="alert"></p></section>
    <p class="legal-line">Purchasing means you agree to the <a href="/terms" data-link>terms</a>. See how checkout and license data are handled in the <a href="/privacy" data-link>privacy notice</a>.</p>`);
  document.querySelector<HTMLFormElement>('[data-license-form]')?.addEventListener('submit', async (event) => { event.preventDefault(); const token = String(new FormData(event.currentTarget as HTMLFormElement).get('license')).trim(); localStorage.setItem(LICENSE_KEY, token); const valid = await verifyLicense(token, true); if (valid) { isPlus = true; message = 'Plus unlocked on this device.'; render(); } });
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
    if (!result.valid) { isPlus = false; if (error) error.textContent = 'This license is no longer active. Check the token or purchase a new license.'; }
    return result.valid;
  } catch {
    if (error) error.textContent = 'License verification is unavailable. Check your connection and try again; the free path still works.';
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as { valid?: boolean } | null;
    return Boolean(cached?.valid);
  }
}

function privacyPage() {
  shell(`<article class="legal"><p class="eyebrow">Effective August 27, 2026</p><h1>Privacy</h1><p class="lede">The short version: your study data stays in your browser. We make no model calls and run no analytics or tracking.</p>
    <h2>Data on your device</h2><p>Your routine, source links, progression settings, and history are stored in IndexedDB on this device. They are not transmitted to us. Export and deletion are under Your data.</p>
    <h2>Network requests</h2><p>Installing or updating the app requests static files from this site. If you buy Plus, the hosted Sociobot / Dodo checkout receives the information needed for purchase. Pasting a license sends that token to Sociobot’s verification endpoint. We store the token and a daily cached verdict in your browser.</p>
    <h2>Your sources</h2><p>Links you add remain local. Opening one contacts that destination under its own privacy policy. This product never uploads files or their contents.</p>
    <h2>Contact and changes</h2><p>Questions can be sent through the product’s repository issue tracker. Material changes will be dated on this page. Because there is no account, we cannot recover a deleted local path.</p></article>`);
}

function termsPage() {
  shell(`<article class="legal"><p class="eyebrow">Effective August 27, 2026</p><h1>Terms</h1><p class="lede">No-AI Language Path is a planning and timing utility, not a teacher or a promise of fluency.</p>
    <h2>Using the app</h2><p>You are responsible for your study sources and for respecting their licenses. The app is provided “as is” without a guarantee of learning outcomes, data recovery, or uninterrupted availability. Export backups you care about.</p>
    <h2>Plus purchase</h2><p>Plus is a $12 one-time license for the listed features in this version. Sociobot / Dodo is the merchant of record and handles checkout and refunds. A refunded or invalid license is revoked automatically. Accessibility, safety, offline routine use, and core data export remain free.</p>
    <h2>Fair use and changes</h2><p>Do not interfere with the service or license verification. We may improve or retire features while preserving honest access to exported data. These terms do not limit rights that cannot legally be limited.</p></article>`);
}

function notFound() {
  shell(`<section class="completion"><p class="eyebrow">Page not found</p><h1>This slip fell off the desk.</h1><p>The page you asked for is not part of this path.</p><a class="button primary" href="/" data-link>Return to your path</a></section>`);
}

function render() {
  const pages: Record<string, () => void> = { '/': home, '/session': sessionPage, '/complete': completePage, '/history': historyPage, '/rules': rulesPage, '/data': dataPage, '/plus': plusPage, '/privacy': privacyPage, '/terms': termsPage };
  (pages[route()] ?? notFound)();
}

async function initLicense() {
  const params = new URLSearchParams(location.search);
  const returned = params.get('license');
  if (returned) { localStorage.setItem(LICENSE_KEY, returned); params.delete('license'); history.replaceState({}, '', `${location.pathname}${params.size ? `?${params}` : ''}`); }
  const token = localStorage.getItem(LICENSE_KEY);
  const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as { valid: boolean } | null;
  isPlus = Boolean(token && cached?.valid);
  if (token) { const valid = await verifyLicense(token); if (valid !== isPlus) { isPlus = valid; render(); } }
}

async function init() {
  try { state = await loadState(); } catch { storageAvailable = false; state = emptyState(); }
  render();
  initLicense();
  window.addEventListener('popstate', render);
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.addEventListener('controllerchange', () => { const toast = document.querySelector<HTMLElement>('#update-toast'); if (toast) toast.hidden = false; });
    navigator.serviceWorker.register('/sw.js').catch(() => { /* the web app remains functional */ });
  }
}

init();
