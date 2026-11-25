import { useEffect, useState } from 'react';
import Header from './components/Header';
import QuestionList from './components/QuestionList';
import QuestionPanel from './components/QuestionPanel';
import ConfirmDialog from './components/ConfirmDialog';
import ExamSummary from './components/ExamSummary';
import {
  createInitialState,
  executeCommand,
  writeVirtualFile,
  type ShellState,
} from './lib/mockShell';
import {
  createExamSession,
  examExpired,
  remainingMs,
  startExamSession,
  toggleId,
} from './lib/exam';
import { questions } from './lib/questions';
import { loadExamSession, loadProgress, saveExamSession, saveProgress } from './lib/storage';
import type { ExecutionMode, ExamSession, ProgressMap } from './types';

const firstQuestion = questions[0];

export default function App() {
  const [mode, setMode] = useState<ExecutionMode>('offline');
  const [exam, setExam] = useState<ExamSession>(() =>
    loadExamSession(createExamSession(firstQuestion.id)),
  );
  const [activeId, setActiveId] = useState(() =>
    exam.status === 'idle' ? firstQuestion.id : exam.currentId || firstQuestion.id,
  );
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());
  const [shellState, setShellState] = useState<ShellState>(() =>
    createInitialState(
      questions.find((item) => item.id === activeId) ?? firstQuestion,
      false,
      progress[activeId],
    ),
  );
  const [resetToken, setResetToken] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 960,
  );
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState<'start' | 'finish' | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const question = questions.find((item) => item.id === activeId) ?? firstQuestion;
  const completedCount = questions.filter((item) => progress[item.id]?.completed).length;
  const remaining = remainingMs(exam, now);
  const examActive = exam.status === 'active';
  const activeIndex = questions.findIndex((item) => item.id === activeId);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    saveExamSession(exam);
  }, [exam]);

  useEffect(() => {
    if (exam.status !== 'active') return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [exam.status]);

  useEffect(() => {
    if (!examExpired(exam, now)) return;
    setExam((previous) =>
      previous.status === 'active'
        ? { ...previous, status: 'finished', finishedAt: Date.now() }
        : previous,
    );
    setNow(Date.now());
    setSummaryOpen(true);
  }, [exam, now]);

  useEffect(() => {
    if (!examActive || exam.visited.includes(question.id)) return;
    setExam((previous) => ({ ...previous, visited: [...previous.visited, question.id] }));
  }, [examActive, exam.visited, question.id]);

  const resetSession = (nextMode: ExecutionMode) => {
    setShellState(createInitialState(question, nextMode === 'online'));
    setResetToken((token) => token + 1);
  };

  const handleModeChange = (nextMode: ExecutionMode) => {
    setMode(nextMode);
    resetSession(nextMode);
  };

  const handleSelect = (id: string) => {
    if (id === activeId) return;
    const selected = questions.find((item) => item.id === id);
    if (!selected) return;

    setActiveId(id);
    setShellState(createInitialState(selected, examActive || mode === 'online', progress[id]));
    setResetToken((token) => token + 1);
    setExam((previous) => (previous.status === 'active' ? { ...previous, currentId: id } : previous));
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const handleStateChange = (next: ShellState) => {
    setShellState(next);
    setProgress((previous) => {
      const existing = previous[question.id];
      const completed = existing?.completed || next.solved;
      return {
        ...previous,
        [question.id]: {
          completed,
          ...(completed
            ? { completedAt: existing?.completedAt ?? new Date().toISOString() }
            : {}),
          history: next.history,
          files: next.files,
          host: next.host,
          resources: next.resources,
        },
      };
    });
  };

  const handleHeredocComplete = (
    prefix: string,
    content: string,
    state: ShellState,
  ): ShellState => {
    const fileMatch = prefix.match(/^(?:cat|tee)\s*>\s*(\S+)/);
    // Effects are keyed by the full heredoc command, so pass the body too; using only the
    // prefix would match the first heredoc effect for every heredoc in a question.
    const response = fileMatch
      ? writeVirtualFile(fileMatch[1], content, question, state)
      : executeCommand(`${prefix}\n${content}`, question, state);
    handleStateChange(response.state);
    return response.state;
  };

  const startExam = () => {
    const startedAt = Date.now();
    setProgress({});
    setMode('online');
    setActiveId(firstQuestion.id);
    setShellState(createInitialState(firstQuestion, true));
    setResetToken((token) => token + 1);
    setExam(startExamSession(startedAt, firstQuestion.id));
    setNow(startedAt);
    setConfirm(null);
    setSummaryOpen(false);
    setSidebarOpen(true);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const finishExam = () => {
    setExam((previous) =>
      previous.status === 'active'
        ? { ...previous, status: 'finished', finishedAt: Date.now() }
        : previous,
    );
    setNow(Date.now());
    setConfirm(null);
    setSummaryOpen(true);
  };

  const exitExam = () => {
    setExam(createExamSession(firstQuestion.id));
    setSummaryOpen(false);
    setActiveId(firstQuestion.id);
  };

  const toggleFlag = (id: string) => {
    setExam((previous) => ({ ...previous, flagged: toggleId(previous.flagged, id) }));
  };

  const goToQuestion = (id: string) => {
    setSummaryOpen(false);
    if (id === activeId) return;
    handleSelect(id);
  };

  const reviewFlagged = () => {
    const flagged = questions.find((item) => exam.flagged.includes(item.id));
    if (flagged) goToQuestion(flagged.id);
  };

  const previousQuestion = questions[activeIndex - 1];
  const nextQuestion = questions[activeIndex + 1];

  return (
    <div className="app-shell">
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        completed={completedCount}
        total={questions.length}
        available={questions.length}
        onResetSession={() => resetSession(mode)}
        onClearProgress={() => setProgress({})}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        exam={exam}
        remaining={remaining}
        flaggedCount={exam.flagged.length}
        onStartExam={() => setConfirm('start')}
        onRequestFinish={() => setConfirm('finish')}
        onShowSummary={() => setSummaryOpen(true)}
      />

      <div className={`app-body${sidebarOpen ? '' : ' is-sidebar-closed'}`}>
        <aside className="sidebar" aria-label="Practice sidebar">
          <QuestionList
            questions={questions}
            activeId={activeId}
            progress={progress}
            onSelect={handleSelect}
            examActive={examActive}
            flagged={exam.flagged}
            visited={exam.visited}
            onFlag={toggleFlag}
          />
          <section className="exam-note" aria-labelledby="exam-note-heading">
            <h2 id="exam-note-heading">{examActive ? 'Exam rules' : 'Exam-style rules'}</h2>
            <ul>
              {examActive ? (
                <>
                  <li>The two-hour clock keeps running, including after a reload.</li>
                  <li>Flag any question to revisit it before you submit.</li>
                  <li>Solutions and verification checks unlock after submission.</li>
                  <li>This is a local simulation; no real cluster is contacted.</li>
                </>
              ) : (
                <>
                  <li>Read the task, then run the exact commands you would use in the exam.</li>
                  <li>Only the resulting simulated filesystem is graded.</li>
                  <li>Progress is stored in this browser only (localStorage).</li>
                </>
              )}
            </ul>
          </section>
        </aside>

        <main className="main-content">
          <QuestionPanel
            key={`${question.id}-${exam.status}`}
            question={question}
            shellState={shellState}
            mode={mode}
            resetToken={resetToken}
            initialState={shellState}
            onStateChange={handleStateChange}
            onHeredocComplete={handleHeredocComplete}
            examActive={examActive}
            flagged={exam.flagged.includes(question.id)}
            onToggleFlag={() => toggleFlag(question.id)}
            onPrevious={() => previousQuestion && goToQuestion(previousQuestion.id)}
            onNext={() => nextQuestion && goToQuestion(nextQuestion.id)}
            isFirst={activeIndex <= 0}
            isLast={activeIndex === questions.length - 1}
          />
        </main>
      </div>

      <footer className="app-footer">
        <p>
          CKAD Practice Lab is a training simulator. It does not connect to Kubernetes, SSH, or
          any external service.
        </p>
      </footer>

      {confirm === 'start' && (
        <ConfirmDialog
          title="Start the timed exam?"
          description={`You have two hours for ${questions.length} tasks. Starting a new attempt clears the saved practice progress and opens the mock instances in connected mode.`}
          confirmLabel="Start 2-hour exam"
          onConfirm={startExam}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === 'finish' && (
        <ConfirmDialog
          title="Submit this attempt?"
          description="The timer stops and the results screen opens. You can still review your work afterward, but the clock will no longer be running."
          confirmLabel="Submit exam"
          cancelLabel="Keep working"
          tone="danger"
          onConfirm={finishExam}
          onCancel={() => setConfirm(null)}
        />
      )}

      {summaryOpen && exam.status === 'finished' && (
        <ExamSummary
          session={exam}
          questions={questions}
          progress={progress}
          now={now}
          onGoToQuestion={goToQuestion}
          onReviewFlagged={reviewFlagged}
          onRestart={startExam}
          onExit={exitExam}
        />
      )}
    </div>
  );
}
