import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { ExecutionMode, Question } from '../types';
import { resourceSatisfied, type ShellState } from '../lib/mockShell';
import TerminalPane from './TerminalPane';
import Icon, { type IconName } from './Icons';

interface QuestionPanelProps {
  question: Question;
  shellState: ShellState;
  initialState: ShellState;
  mode: ExecutionMode;
  resetToken: number;
  onStateChange: (state: ShellState) => void;
  onHeredocComplete: (prefix: string, content: string, state: ShellState) => ShellState;
  examActive: boolean;
  flagged: boolean;
  onToggleFlag: () => void;
  onPrevious: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

type TabId = 'task' | 'verify' | 'solution' | 'notes';

const tabs: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'task', label: 'Task', icon: 'book' },
  { id: 'verify', label: 'Verify', icon: 'check' },
  { id: 'solution', label: 'Solution', icon: 'terminal' },
  { id: 'notes', label: 'Notes', icon: 'sparkle' },
];

/** Renders `backticked` fragments of authored text as inline code. */
function inlineCode(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export default function QuestionPanel({
  question,
  shellState,
  initialState,
  mode,
  resetToken,
  onStateChange,
  onHeredocComplete,
  examActive,
  flagged,
  onToggleFlag,
  onPrevious,
  onNext,
  isFirst,
  isLast,
}: QuestionPanelProps) {
  const [tab, setTab] = useState<TabId>('task');
  const [showExpected, setShowExpected] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visibleTabs = examActive ? tabs.filter((item) => item.id === 'task') : tabs;

  const checks = [
    {
      label: `Session opened on ${question.instance.host}`,
      met: shellState.host === question.instance.host,
    },
    ...question.expected.artifacts.map((artifact) => ({
      label: `${artifact.path} exists`,
      met: artifact.path in shellState.files,
    })),
    ...question.expected.artifacts.map((artifact) => ({
      label: `Content saved to ${artifact.path.split('/').pop()}`,
      met: shellState.files[artifact.path] === artifact.content,
    })),
    ...(question.expected.resources ?? []).map((resource) => ({
      label: `${resource.kind} ${resource.name}${
        resource.namespace ? ` in ${resource.namespace}` : ''
      } present`,
      met: resourceSatisfied(shellState.resources, resource),
    })),
    { label: 'No real cluster or external service was touched', met: true },
  ];
  const allChecksMet = checks.every((check) => check.met);

  const selectTab = (next: TabId) => {
    if ((next === 'solution' || next === 'notes') && !showSolution) setShowSolution(true);
    setTab(next);
  };

  const toggleSolution = () => {
    if (showSolution) {
      setShowSolution(false);
      setShowExpected(false);
      if (tab === 'solution' || tab === 'notes') setTab('task');
    } else {
      setTab('solution');
      setShowSolution(true);
    }
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + step + visibleTabs.length) % visibleTabs.length;
    selectTab(visibleTabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard access can be denied; the text remains selectable.
    }
  };

  const expectedPanel = (
    <>
      {question.expected.artifacts.length > 0 && (
        <>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setShowExpected((value) => !value)}
            aria-expanded={showExpected}
          >
            <Icon name={showExpected ? 'eye-off' : 'eye'} size={14} />
            {showExpected ? 'Hide' : 'Reveal'} expected file content
          </button>
          {showExpected &&
            question.expected.artifacts.map((artifact) => (
              <div key={artifact.path} className="expected-block">
                <h4>{artifact.path}</h4>
                <pre className="expected-output">{artifact.content}</pre>
              </div>
            ))}
        </>
      )}
    </>
  );

  return (
    <article className="question-panel" aria-labelledby="question-title">
      <section className="task-hero">
        <div className="task-hero__eyebrow">
          <span className="eyebrow">Task {question.number} of 22</span>
          <span className={`difficulty difficulty--${question.difficulty.toLowerCase()}`}>
            {question.difficulty}
          </span>
          {examActive ? (
            <span className="result-status" role="status">
              <Icon name="clock" size={13} />
              Exam question
            </span>
          ) : (
            <span className={`result-status${allChecksMet ? ' is-success' : ''}`} role="status" aria-live="polite">
              <Icon name={allChecksMet ? 'check' : 'sparkle'} size={13} />
              {allChecksMet ? 'Task complete' : 'In progress'}
            </span>
          )}
        </div>
        <h2 id="question-title">{question.title}</h2>
        <p className="task-hero__description">{inlineCode(question.description)}</p>
        {examActive ? (
          <button
            type="button"
            className={`button ${flagged ? 'button--flagged' : 'button--ghost-light'}`}
            onClick={onToggleFlag}
            aria-pressed={flagged}
          >
            <Icon name="flag" size={15} />
            {flagged ? 'Flagged for review' : 'Flag for review'}
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={toggleSolution} aria-expanded={showSolution}>
            <Icon name={showSolution ? 'eye-off' : 'eye'} size={15} />
            {showSolution ? 'Hide solution' : 'Reveal solution'}
          </button>
        )}
      </section>

      <div className="fact-strip">
        <div className="fact-strip__item">
          <span className="fact-strip__label">Host</span>
          <code>{question.instance.host}</code>
        </div>
        <div className="fact-strip__item">
          <span className="fact-strip__label">Connect</span>
          <code>{question.instance.sshCommand}</code>
          <button
            type="button"
            className="icon-button icon-button--small"
            onClick={() => copy(question.instance.sshCommand, 'ssh')}
            aria-label="Copy SSH command"
            title="Copy SSH command"
          >
            <Icon name="copy" size={13} />
          </button>
          {copied === 'ssh' && <span className="copied">Copied</span>}
        </div>
        {examActive ? (
          <div className="fact-strip__item">
            <span className="fact-strip__label">Review</span>
            <span className={flagged ? 'flagged-text' : ''}>
              {flagged ? 'Flagged for review' : 'Not flagged'}
            </span>
          </div>
        ) : (
          <div className="fact-strip__item">
            <span className="fact-strip__label">Task sheet</span>
            <span>Task + instruction</span>
          </div>
        )}
        <div className="fact-strip__item">
          <span className="fact-strip__label">Mode</span>
          <span>{mode === 'offline' ? 'Offline · connect via ssh' : 'Online · connected'}</span>
        </div>
      </div>

      <div className="workspace">
        <section className="workspace__panel" aria-label="Task details">
          <div
            className="tabs"
            role="tablist"
            aria-label="Task views"
            onKeyDown={(event) =>
              onTabKeyDown(event, Math.max(0, visibleTabs.findIndex((item) => item.id === tab)))
            }
          >
            {visibleTabs.map((item, index) => {
              const locked = (item.id === 'solution' || item.id === 'notes') && !showSolution;
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}-${question.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`panel-${item.id}-${question.id}`}
                  tabIndex={tab === item.id ? 0 : -1}
                  className={`tab${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => selectTab(item.id)}
                >
                  <Icon name={locked ? 'lock' : item.icon} size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="workspace__panel-body">
            {tab === 'task' && (
              <div role="tabpanel" id={`panel-task-${question.id}`} aria-labelledby={`tab-task-${question.id}`}>
                <div className={`docs-card${examActive ? ' docs-card--exam' : ''}`}>
                  <div className="docs-card__top">
                    <div className="docs-card__label">
                      {examActive ? 'Task statement' : 'Documentation'}
                    </div>
                    <span className="docs-card__title">{question.documentation.heading}</span>
                  </div>
                  <p>{inlineCode(question.documentation.task)}</p>

                  <div className="docs-card__instruction">
                    <h4>Instruction</h4>
                    <p>{inlineCode(question.documentation.instruction)}</p>
                  </div>

                  {question.documentation.template && (
                    <div className="docs-card__template">
                      <div className="docs-card__template-head">
                        <h4>File template</h4>
                        <code>{question.documentation.template.path}</code>
                        <button
                          type="button"
                          className="icon-button icon-button--small"
                          onClick={() =>
                            copy(question.documentation.template?.content ?? '', 'template')
                          }
                          aria-label="Copy file template"
                          title="Copy file template"
                        >
                          <Icon name={copied === 'template' ? 'check' : 'copy'} size={13} />
                        </button>
                        {copied === 'template' && <span className="copied">Copied</span>}
                      </div>
                      <pre>{question.documentation.template.content}</pre>
                    </div>
                  )}
                </div>

                <section className="info-card constraints-card" aria-labelledby={`constraints-${question.id}`}>
                  <h3 id={`constraints-${question.id}`}>Environment constraints</h3>
                  <ul className="constraint-list">
                    {question.instance.environmentConstraints.map((constraint) => (
                      <li key={constraint}>{inlineCode(constraint)}</li>
                    ))}
                  </ul>
                </section>
              </div>
            )}

            {tab === 'verify' && (
              <div role="tabpanel" id={`panel-verify-${question.id}`} aria-labelledby={`tab-verify-${question.id}`}>
                <section className="info-card">
                  <div className="section-heading">
                    <h3>Checklist</h3>
                    <span className="section-heading__meta">
                      {checks.filter((check) => check.met).length}/{checks.length}
                    </span>
                  </div>
                  <ul className="checklist">
                    {checks.map((check) => (
                      <li key={check.label} className={check.met ? 'is-met' : ''}>
                        <span className="check-icon" aria-hidden="true">
                          <Icon name={check.met ? 'check' : 'lock'} size={12} />
                        </span>
                        {check.label}
                      </li>
                    ))}
                  </ul>

                  <h4>Session CLI history</h4>
                  {shellState.history.length === 0 ? (
                    <p className="muted">No commands run yet.</p>
                  ) : (
                    <ol className="history-list">
                      {shellState.history.map((entry, index) => (
                        <li key={`${entry}-${index}`}>
                          <code>{entry}</code>
                        </li>
                      ))}
                    </ol>
                  )}

                  <h4>Verify with</h4>
                  <ul className="constraint-list">
                    {question.expected.verificationCommands.map((command) => (
                      <li key={command}>
                        <code>{command}</code>
                      </li>
                    ))}
                  </ul>
                  {expectedPanel}
                </section>
              </div>
            )}

            {tab === 'solution' && (
              <div role="tabpanel" id={`panel-solution-${question.id}`} aria-labelledby={`tab-solution-${question.id}`}>
                <section className="info-card">
                  <div className="section-heading">
                    <h3>Command sequence</h3>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={toggleSolution}
                    >
                      <Icon name="eye-off" size={13} /> Hide
                    </button>
                  </div>
                  {showSolution ? (
                    <ol className="command-list">
                      {question.commands.map((step) => (
                        <li key={step.exact}>
                          <div className="command-list__top">
                            <code className="command-list__code">{step.exact}</code>
                            <button
                              type="button"
                              className="icon-button icon-button--small"
                              onClick={() => copy(step.exact, step.exact)}
                              aria-label="Copy command"
                              title="Copy command"
                            >
                              <Icon name="copy" size={13} />
                            </button>
                            {copied === step.exact && <span className="copied">Copied</span>}
                          </div>
                          <p>{step.purpose}</p>
                          <p className="command-list__stdout">
                            <span>Expected stdout:</span>{' '}
                            {step.expectedStdout ? (
                              <code>{step.expectedStdout}</code>
                            ) : (
                              <em>none (output redirected to a file)</em>
                            )}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="solution-locked">
                      Reveal the solution to see the exact commands.
                    </p>
                  )}
                </section>
              </div>
            )}

            {tab === 'notes' && (
              <div role="tabpanel" id={`panel-notes-${question.id}`} aria-labelledby={`tab-notes-${question.id}`}>
                <section className="info-card">
                  <h3>Rationale &amp; reference notes</h3>
                  {showSolution ? (
                    <>
                      <p>{inlineCode(question.rationale)}</p>
                      <h4>Reference notes</h4>
                      <ul className="constraint-list">
                        {question.referenceNotes.map((note) => (
                          <li key={note}>{inlineCode(note)}</li>
                        ))}
                      </ul>
                      <p className="muted">
                        The checker reads the simulated filesystem only. It never inspects a real cluster.
                      </p>
                    </>
                  ) : (
                    <p className="solution-locked">Reveal the solution to read the rationale.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </section>

        <section className="workspace__terminal" aria-label="Simulated terminal">
          <div className="terminal-heading">
            <div>
              <Icon name="terminal" size={16} />
              <h3>Terminal</h3>
            </div>
            <span className={`connection-pill${shellState.host ? ' is-connected' : ''}`}>
              <span aria-hidden="true" />
              {shellState.host ? `Connected · ${shellState.host}` : 'Local sandbox'}
            </span>
          </div>
          <TerminalPane
            question={question}
            online={mode === 'online'}
            resetToken={resetToken}
            initialState={initialState}
            onStateChange={onStateChange}
            onHeredocComplete={onHeredocComplete}
          />
        </section>
      </div>

      {examActive && (
        <nav className="exam-navigation" aria-label="Exam question navigation">
          <button
            type="button"
            className="button"
            onClick={onPrevious}
            disabled={isFirst}
          >
            <Icon name="arrow-left" size={14} />
            Previous
          </button>
          <div className="exam-navigation__meta">
            <strong>Question {question.number} of 22</strong>
            <span>Use the question grid to jump or flag an item for review.</span>
          </div>
          <button type="button" className="button button--primary" onClick={onNext} disabled={isLast}>
            Next
            <Icon name="arrow-right" size={14} />
          </button>
        </nav>
      )}
    </article>
  );
}
