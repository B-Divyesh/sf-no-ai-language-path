import type { AppState, SessionRecord } from './types';

export function sessionsInStage(history: SessionRecord[], stage: number): number {
  return history.filter((session) => session.stage === stage).length;
}

export function progression(state: AppState) {
  const completed = sessionsInStage(state.history, state.stage);
  const required = state.sessionsPerStage;
  const remaining = Math.max(0, required - completed);
  return { completed, required, remaining, advances: completed >= required && state.stage < 2 };
}

export function advanceIfReady(state: AppState): AppState {
  const progress = progression(state);
  if (!progress.advances) return state;
  return { ...state, stage: state.stage + 1, updatedAt: new Date().toISOString() };
}

export function currentStreak(history: SessionRecord[], today = new Date()): number {
  if (!history.length) return 0;
  const days = new Set(history.map((item) => item.completedAt.slice(0, 10)));
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!days.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
