import { useState } from 'react';
import type { ProgressMap, Question } from '../types';
import Icon from './Icons';

interface QuestionListProps {
  questions: Question[];
  activeId: string;
  progress: ProgressMap;
  onSelect: (id: string) => void;
  examActive: boolean;
  flagged: string[];
  visited: string[];
  onFlag: (id: string) => void;
}

type DifficultyFilter = 'all' | Question['difficulty'];
const filters: DifficultyFilter[] = ['all', 'Easy', 'Medium', 'Hard'];

export default function QuestionList({
  questions,
  activeId,
  progress,
  onSelect,
  examActive,
  flagged,
  visited,
  onFlag,
}: QuestionListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DifficultyFilter>('all');

  const normalizedQuery = query.trim().toLowerCase();
  const visible = questions.filter((question) => {
    if (examActive) return true;
    const matchesDifficulty = filter === 'all' || question.difficulty === filter;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      question.title.toLowerCase().includes(normalizedQuery) ||
      question.instance.host.toLowerCase().includes(normalizedQuery) ||
      String(question.number) === normalizedQuery;
    return matchesDifficulty && matchesQuery;
  });

  const completed = questions.filter((question) => progress[question.id]?.completed).length;
  const flaggedCount = questions.filter((question) => flagged.includes(question.id)).length;

  return (
    <nav className={`question-list${examActive ? ' is-exam' : ''}`} aria-label="Question navigation">
      <div className="sidebar-head">
        <div className="sidebar-head__title">
          <h2>{examActive ? 'Questions' : 'Tasks'}</h2>
          <span className="sidebar-count">
            {examActive
              ? `${visited.length}/${questions.length} seen`
              : `${completed}/${questions.length}`}
          </span>
        </div>

        {examActive ? (
          <>
            <div className="question-palette" role="group" aria-label="Question palette">
              {questions.map((question) => {
                const done = progress[question.id]?.completed ?? false;
                const isFlagged = flagged.includes(question.id);
                const isVisited = visited.includes(question.id);
                const classes = [
                  'palette-cell',
                  question.id === activeId ? 'is-current' : '',
                  done ? 'is-done' : '',
                  !done && isVisited ? 'is-visited' : '',
                  isFlagged ? 'is-flagged' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    key={question.id}
                    type="button"
                    className={classes}
                    onClick={() => onSelect(question.id)}
                    aria-current={question.id === activeId ? 'step' : undefined}
                    aria-label={`Question ${question.number}${isFlagged ? ', flagged' : ''}${done ? ', answered' : ''}`}
                  >
                    {question.number}
                    {isFlagged && (
                      <span className="palette-cell__flag" aria-hidden="true">
                        <Icon name="flag" size={9} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="palette-legend" aria-label="Palette legend">
              <span><i className="legend-dot is-current" /> Current</span>
              <span><i className="legend-dot is-done" /> Answered</span>
              <span><i className="legend-dot is-flagged" /> Flagged ({flaggedCount})</span>
            </div>
          </>
        ) : (
          <>
            <label className="search-field">
              <Icon name="search" size={15} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, host or number"
                aria-label="Search tasks"
              />
            </label>
            <div className="filter-chips" role="group" aria-label="Filter tasks by difficulty">
              {filters.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`filter-chip${filter === option ? ' is-selected' : ''}`}
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                >
                  {option === 'all' ? 'All' : option}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">No tasks match that search.</p>
      ) : (
        <ol className="task-list">
          {visible.map((question) => {
            const done = progress[question.id]?.completed ?? false;
            const isFlagged = flagged.includes(question.id);
            const isVisited = visited.includes(question.id);
            return (
              <li key={question.id}>
                <div className={`task-row${isFlagged ? ' is-flagged' : ''}`}>
                  <button
                    type="button"
                    className={[
                      'task-item',
                      question.id === activeId ? 'is-active' : '',
                      examActive && isVisited && !done ? 'is-visited' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onSelect(question.id)}
                    aria-current={question.id === activeId ? 'step' : undefined}
                  >
                    <span
                      className={[
                        'task-item__status',
                        done ? 'is-done' : '',
                        examActive && isVisited ? 'is-visited' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-hidden="true"
                    >
                      {done ? <Icon name="check" size={13} /> : question.number}
                    </span>
                    <span className="task-item__body">
                      <span className="task-item__title">{question.title}</span>
                      <span className="task-item__meta">
                        <span className={`difficulty difficulty--${question.difficulty.toLowerCase()}`}>
                          {question.difficulty}
                        </span>
                        <span className="task-item__host">{question.instance.host}</span>
                      </span>
                    </span>
                  </button>
                  {examActive && (
                    <button
                      type="button"
                      className={`flag-button${isFlagged ? ' is-active' : ''}`}
                      onClick={() => onFlag(question.id)}
                      aria-pressed={isFlagged}
                      aria-label={`${isFlagged ? 'Remove flag from' : 'Flag'} question ${question.number} for review`}
                      title={isFlagged ? 'Remove review flag' : 'Flag for review'}
                    >
                      <Icon name="flag" size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
