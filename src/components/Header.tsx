import type { ExecutionMode, ExamSession } from '../types';
import { formatClock } from '../lib/exam';
import Icon from './Icons';

interface HeaderProps {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  completed: number;
  total: number;
  available: number;
  onResetSession: () => void;
  onClearProgress: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  exam: ExamSession;
  remaining: number;
  flaggedCount: number;
  onStartExam: () => void;
  onRequestFinish: () => void;
  onShowSummary: () => void;
}

export default function Header({
  mode,
  onModeChange,
  completed,
  total,
  available,
  onResetSession,
  onClearProgress,
  sidebarOpen,
  onToggleSidebar,
  exam,
  remaining,
  flaggedCount,
  onStartExam,
  onRequestFinish,
  onShowSummary,
}: HeaderProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const elapsedPercent =
    exam.durationMs > 0 ? ((exam.durationMs - remaining) / exam.durationMs) * 100 : 0;
  const warning = exam.status === 'active' && remaining <= 10 * 60 * 1000;

  return (
    <header className="app-header">
      <div className="app-header__bar">
        <div className="brand">
          <button
            type="button"
            className="icon-button sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Hide question list' : 'Show question list'}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? 'Hide question list' : 'Show question list'}
          >
            <Icon name={sidebarOpen ? 'close' : 'menu'} />
          </button>
          <span className="brand__mark" aria-hidden="true">
            <Icon name={exam.status === 'active' ? 'clock' : 'terminal'} size={20} />
          </span>
          <div className="brand__text">
            <p className="brand__eyebrow">
              {exam.status === 'active' ? 'Timed attempt in progress' : 'Exam simulation'}
            </p>
            <h1>{exam.status === 'active' ? 'CKAD Exam' : 'CKAD Practice Lab'}</h1>
          </div>
        </div>

        {exam.status === 'active' ? (
          <div className={`exam-timer${warning ? ' is-warning' : ''}`}>
            <div className="exam-timer__meta">
              <span>
                <Icon name="clock" size={13} /> Time remaining
              </span>
              <span>
                {flaggedCount} flagged · {exam.visited.length}/{total} visited
              </span>
            </div>
            <div
              className="exam-timer__clock"
              role="timer"
              aria-label={`Time remaining ${formatClock(remaining)}`}
            >
              {formatClock(remaining)}
            </div>
            <div className="progress-track progress-track--exam" aria-hidden="true">
              <span style={{ width: `${elapsedPercent}%` }} />
            </div>
          </div>
        ) : exam.status === 'finished' ? (
          <div className="exam-finished">
            <Icon name="award" size={18} />
            <div>
              <strong>Attempt submitted</strong>
              <span>Results and solutions are ready to review.</span>
            </div>
            <button type="button" className="button button--primary button--small" onClick={onShowSummary}>
              View results
            </button>
          </div>
        ) : (
          <div className="header-progress" aria-live="polite">
            <div className="header-progress__meta">
              <span>
                <strong>{completed}</strong> of {total} tasks complete
              </span>
              <span>{available} available</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Practice progress"
              aria-valuenow={completed}
              aria-valuemin={0}
              aria-valuemax={total}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        <div className="header-tools">
          <span className="sandbox-badge" role="note">
            <Icon name="shield" size={14} />
            {exam.status === 'active' ? 'SIMULATED EXAM' : 'SIMULATED · NO REAL SSH'}
          </span>

          {exam.status === 'idle' && (
            <>
              <fieldset className="mode-switch">
                <legend className="sr-only">Execution mode</legend>
                <label className={mode === 'offline' ? 'mode-option is-active' : 'mode-option'}>
                  <input
                    type="radio"
                    name="execution-mode"
                    value="offline"
                    checked={mode === 'offline'}
                    onChange={() => onModeChange('offline')}
                  />
                  <span>Offline</span>
                </label>
                <label className={mode === 'online' ? 'mode-option is-active' : 'mode-option'}>
                  <input
                    type="radio"
                    name="execution-mode"
                    value="online"
                    checked={mode === 'online'}
                    onChange={() => onModeChange('online')}
                  />
                  <span>Online</span>
                </label>
              </fieldset>

              <div className="header-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={onResetSession}
                  aria-label="Reset session"
                  title="Reset session"
                >
                  <Icon name="reset" />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={onClearProgress}
                  aria-label="Clear saved progress"
                  title="Clear saved progress"
                >
                  <Icon name="trash" />
                </button>
                <button type="button" className="button button--primary" onClick={onStartExam}>
                  <Icon name="play" size={14} />
                  Start exam
                </button>
              </div>
            </>
          )}

          {exam.status === 'active' && (
            <div className="header-actions">
              <button
                type="button"
                className="button"
                onClick={onToggleSidebar}
                aria-expanded={sidebarOpen}
              >
                <Icon name="grid" size={14} />
                Question grid
              </button>
              <button type="button" className="button button--danger" onClick={onRequestFinish}>
                <Icon name="stop" size={13} />
                Finish exam
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="mode-explanation">
        <Icon name={exam.status === 'active' ? 'clock' : 'sparkle'} size={14} />
        {exam.status === 'active'
          ? 'Exam mode: the two-hour clock is running, solutions and checks are locked, and your work is saved locally.'
          : exam.status === 'finished'
            ? 'The attempt is closed. Review results, or return to practice to reveal solutions and verify your work.'
            : mode === 'offline'
              ? 'Offline: start on the local host and connect with the simulated ssh command.'
              : 'Online: start already connected to the mock instance. Both modes are local simulations.'}
      </p>
    </header>
  );
}
