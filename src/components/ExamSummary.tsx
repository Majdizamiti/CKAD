import type { ExamSession, ProgressMap, Question } from '../types';
import { elapsedMs, formatClock } from '../lib/exam';
import Icon from './Icons';

interface ExamSummaryProps {
  session: ExamSession;
  questions: Question[];
  progress: ProgressMap;
  now: number;
  onGoToQuestion: (id: string) => void;
  onReviewFlagged: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export default function ExamSummary({
  session,
  questions,
  progress,
  now,
  onGoToQuestion,
  onReviewFlagged,
  onRestart,
  onExit,
}: ExamSummaryProps) {
  const answered = questions.filter((question) => progress[question.id]?.completed).length;
  const flagged = questions.filter((question) => session.flagged.includes(question.id));
  const visited = session.visited.length;
  const used = elapsedMs(session, now);

  return (
    <div className="modal-backdrop">
      <div
        className="modal modal--summary"
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title"
      >
        <div className="modal__header">
          <span className="modal__icon modal__icon--primary">
            <Icon name="award" size={20} />
          </span>
          <div>
            <p className="eyebrow eyebrow--dark">Attempt complete</p>
            <h2 id="summary-title">Exam submitted</h2>
            <p>
              Your simulated work is saved. Solutions and verification tools are available again in
              practice mode.
            </p>
          </div>
        </div>

        <div className="summary-stats">
          <div className="stat-card">
            <span>Time used</span>
            <strong>{formatClock(used)}</strong>
          </div>
          <div className="stat-card">
            <span>Tasks answered</span>
            <strong>
              {answered} <small>/ {questions.length}</small>
            </strong>
          </div>
          <div className="stat-card">
            <span>Flagged</span>
            <strong>{flagged.length}</strong>
          </div>
          <div className="stat-card">
            <span>Visited</span>
            <strong>{visited}</strong>
          </div>
        </div>

        <div className="summary-list-head">
          <h3>Question review</h3>
          <button
            type="button"
            className="button button--small"
            onClick={onReviewFlagged}
            disabled={flagged.length === 0}
          >
            <Icon name="flag" size={13} />
            Review flagged
          </button>
        </div>

        <ol className="summary-list">
          {questions.map((question) => {
            const done = progress[question.id]?.completed ?? false;
            const isFlagged = session.flagged.includes(question.id);
            return (
              <li key={question.id} className={`summary-row${isFlagged ? ' is-flagged' : ''}`}>
                <button type="button" onClick={() => onGoToQuestion(question.id)}>
                  <span className="summary-row__number">{question.number}</span>
                  <span className="summary-row__title">{question.title}</span>
                  <span className={`summary-row__status${done ? ' is-done' : ''}`}>
                    <Icon name={done ? 'check' : 'clock'} size={12} />
                    {done ? 'Answered' : 'Not answered'}
                  </span>
                  {isFlagged && (
                    <span className="summary-row__flag" aria-label="Flagged for review">
                      <Icon name="flag" size={13} />
                    </span>
                  )}
                  <Icon name="arrow-right" size={14} />
                </button>
              </li>
            );
          })}
        </ol>

        <div className="modal__actions">
          <button type="button" className="button" onClick={onExit}>
            Return to practice
          </button>
          <button type="button" className="button button--primary" onClick={onRestart}>
            <Icon name="play" size={14} />
            Start new attempt
          </button>
        </div>
      </div>
    </div>
  );
}
