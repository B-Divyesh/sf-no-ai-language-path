import { describe, expect, it } from 'vitest';
import { emptyState, validImport } from '../src/db';

function validState() {
  const state = emptyState();
  return {
    ...state,
    routineName: 'Spanish news practice',
    blocks: [{ id: 'one', type: 'listen' as const, title: 'Listen', instruction: 'Play one short clip.', minutes: 5 }],
    history: [{ id: 'record', completedAt: state.createdAt, durationSeconds: 30, blockIds: ['one'], stage: 0 }]
  };
}

describe('backup validation', () => {
  it('accepts a complete version-one backup', () => {
    expect(validImport(validState())).toBe(true);
  });

  it.each([
    ['fractional rule', { sessionsPerStage: 1.5 }],
    ['fractional stage', { stage: 1.5 }],
    ['out-of-range stage', { stage: 3 }],
    ['fractional block length', { blocks: [{ ...validState().blocks[0], minutes: 1.5 }] }],
    ['invalid history stage', { history: [{ ...validState().history[0], stage: -1 }] }],
    ['invalid source scheme', { blocks: [{ ...validState().blocks[0], source: 'ftp://example.org/file' }] }]
  ])('rejects %s', (_name, change) => {
    expect(validImport({ ...validState(), ...change })).toBe(false);
  });
});
