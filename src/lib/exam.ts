import type { ExamSession } from '../types';

/** The official CKAD exam is a two-hour, timed, open-book session. */
export const EXAM_DURATION_MS = 2 * 60 * 60 * 1000;

export function createExamSession(firstQuestionId = ''): ExamSession {
  return {
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    durationMs: EXAM_DURATION_MS,
    flagged: [],
    visited: [],
    currentId: firstQuestionId,
  };
}

export function startExamSession(now: number, firstQuestionId: string): ExamSession {
  return {
    ...createExamSession(),
    status: 'active',
    startedAt: now,
    visited: [firstQuestionId],
    currentId: firstQuestionId,
  };
}

/** Milliseconds left in the attempt, clamped at zero. */
export function remainingMs(session: ExamSession, now: number): number {
  if (session.startedAt === null) return session.durationMs;
  return Math.max(0, session.durationMs - (now - session.startedAt));
}

export function elapsedMs(session: ExamSession, now: number): number {
  return Math.max(0, session.durationMs - remainingMs(session, now));
}

export function examExpired(session: ExamSession, now: number): boolean {
  return session.status === 'active' && remainingMs(session, now) === 0;
}

/** Format as HH:MM:SS, like the countdown in a proctored exam console. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function toggleId(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}
