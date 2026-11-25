import type { ExamSession, ProgressMap } from '../types';

const PROGRESS_KEY = 'ckad-practice:progress:v1';
const EXAM_KEY = 'ckad-practice:exam:v1';

export function loadProgress(): ProgressMap {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as ProgressMap;
  } catch {
    return {};
  }
}

export function saveProgress(progress: ProgressMap): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be disabled; the app remains usable in-memory.
  }
}

export function loadExamSession(fallback: ExamSession): ExamSession {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(EXAM_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback;
    const candidate = parsed as Partial<ExamSession>;
    if (!['idle', 'active', 'finished'].includes(candidate.status ?? '')) return fallback;
    if (typeof candidate.durationMs !== 'number' || candidate.durationMs <= 0) return fallback;
    return {
      status: candidate.status as ExamSession['status'],
      startedAt: typeof candidate.startedAt === 'number' ? candidate.startedAt : null,
      finishedAt: typeof candidate.finishedAt === 'number' ? candidate.finishedAt : null,
      durationMs: candidate.durationMs,
      flagged: Array.isArray(candidate.flagged) ? candidate.flagged.filter(isString) : [],
      visited: Array.isArray(candidate.visited) ? candidate.visited.filter(isString) : [],
      currentId: typeof candidate.currentId === 'string' ? candidate.currentId : fallback.currentId,
    };
  } catch {
    return fallback;
  }
}

export function saveExamSession(session: ExamSession): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(EXAM_KEY, JSON.stringify(session));
  } catch {
    // Storage can be disabled; the exam continues in memory.
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
