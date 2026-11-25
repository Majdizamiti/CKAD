import { describe, expect, it } from 'vitest';
import {
  EXAM_DURATION_MS,
  createExamSession,
  examExpired,
  formatClock,
  remainingMs,
  startExamSession,
  toggleId,
} from './exam';

describe('exam helpers', () => {
  it('creates an idle two-hour session', () => {
    const session = createExamSession('first');
    expect(session.status).toBe('idle');
    expect(session.durationMs).toBe(EXAM_DURATION_MS);
    expect(session.startedAt).toBeNull();
    expect(session.currentId).toBe('first');
    expect(session.flagged).toEqual([]);
    expect(session.visited).toEqual([]);
  });

  it('starts an attempt at the first question', () => {
    const session = startExamSession(1000, 'q1');
    expect(session.status).toBe('active');
    expect(session.startedAt).toBe(1000);
    expect(session.currentId).toBe('q1');
    expect(session.visited).toEqual(['q1']);
  });

  it('counts down and clamps the remaining time', () => {
    const session = startExamSession(1000, 'q1');
    expect(remainingMs(session, 1000 + 60_000)).toBe(EXAM_DURATION_MS - 60_000);
    expect(remainingMs(session, 1000 + EXAM_DURATION_MS + 5_000)).toBe(0);
    expect(examExpired(session, 1000 + EXAM_DURATION_MS)).toBe(true);
  });

  it('formats the countdown like a proctored exam timer', () => {
    expect(formatClock(EXAM_DURATION_MS)).toBe('02:00:00');
    expect(formatClock(9 * 60_000 + 5_000)).toBe('00:09:05');
    expect(formatClock(0)).toBe('00:00:00');
  });

  it('toggles review flags without duplicates', () => {
    expect(toggleId([], 'q7')).toEqual(['q7']);
    expect(toggleId(['q7'], 'q7')).toEqual([]);
    expect(toggleId(['q1'], 'q7')).toEqual(['q1', 'q7']);
  });
});
