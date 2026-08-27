import { describe, expect, it } from 'vitest';
import { advanceIfReady, currentStreak, progression } from '../src/progression';
import { emptyState } from '../src/db';
import type { SessionRecord } from '../src/types';

const record = (date: string, stage = 0): SessionRecord => ({
  id: date, completedAt: `${date}T10:00:00.000Z`, durationSeconds: 600, blockIds: ['a'], stage
});

describe('transparent progression', () => {
  it('counts only sessions completed in the current stage', () => {
    const state = { ...emptyState(), history: [record('2026-08-24'), record('2026-08-25'), record('2026-08-26', 1)] };
    expect(progression(state)).toMatchObject({ completed: 2, required: 3, remaining: 1 });
  });

  it('advances after the configured number, and only then', () => {
    const state = { ...emptyState(), history: [record('2026-08-24'), record('2026-08-25'), record('2026-08-26')] };
    expect(advanceIfReady(state).stage).toBe(1);
  });

  it('calculates a consecutive-day streak', () => {
    const history = [record('2026-08-25'), record('2026-08-26'), record('2026-08-27')];
    expect(currentStreak(history, new Date('2026-08-27T22:00:00Z'))).toBe(3);
  });
});
