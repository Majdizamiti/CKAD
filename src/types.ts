/** How the practice session is presented. Both modes are fully simulated. */
export type ExecutionMode = 'offline' | 'online';

export interface InstanceInfo {
  /** Host name used in the exam task, e.g. ckad5601. */
  host: string;
  /** Exact SSH command printed in the task, e.g. ssh ckad5601. */
  sshCommand: string;
  /** Prompt shown before connecting to the instance. */
  localPrompt: string;
  /** Environment constraints displayed in the task panel. */
  environmentConstraints: string[];
}

export interface CommandStep {
  /** The exact command sequence supplied by the task. */
  exact: string;
  /** Why this command is used. */
  purpose: string;
  /** stdout produced by this exact command (may be empty when redirected). */
  expectedStdout: string;
}

export interface ExpectedArtifact {
  path: string;
  description: string;
  /** Exact file content used by the checker and the mock filesystem. */
  content: string;
}

/** A resource in the mock cluster. labels/annotations are checked as subsets. */
export interface ResourceRef {
  kind: string;
  namespace?: string;
  name: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ExpectedResult {
  stdout: string;
  artifacts: ExpectedArtifact[];
  resources?: ResourceRef[];
  verificationCommands: string[];
}

/** A starting YAML file shown in the task sheet with TODO fields to complete. */
export interface DocumentationTemplate {
  path: string;
  content: string;
}

/** Plain-text task documentation, in the style of an exam task sheet. */
export interface ExamDocumentation {
  heading: string;
  task: string;
  /** Short instruction for the task; backticked fragments render as inline code. */
  instruction: string;
  /** Present when the task requires filling in or creating a YAML manifest. */
  template?: DocumentationTemplate;
}

/** State changes triggered by an exact command in the mock environment. */
export interface MockEffect {
  files?: Record<string, string>;
  addResources?: ResourceRef[];
  removeResources?: ResourceRef[];
  updateResources?: ResourceRef[];
}

/** Fixture data consumed by the local mock shell. No network or real cluster. */
export interface QuestionMock {
  /** stdout keyed by a normalized command string. */
  commandOutputs: Record<string, string>;
  /** Files pre-seeded in the mock filesystem. */
  initialFiles?: Record<string, string>;
  /** Resources pre-seeded in the mock cluster. */
  initialResources?: ResourceRef[];
  /** Side effects keyed by an exact command string. */
  effects?: Record<string, MockEffect>;
}

export interface Question {
  id: string;
  number: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  instance: InstanceInfo;
  commands: CommandStep[];
  expected: ExpectedResult;
  successCriteria: string[];
  rationale: string;
  referenceNotes: string[];
  documentation: ExamDocumentation;
  mock: QuestionMock;
}

export interface QuestionProgress {
  completed: boolean;
  completedAt?: string;
  history: string[];
  /** Saved simulated filesystem so a reload resumes the same session. */
  files?: Record<string, string>;
  /** Saved connection state so the checklist stays consistent after reload. */
  host?: string | null;
  /** Saved mock cluster state. */
  resources?: ResourceRef[];
}

export type ProgressMap = Record<string, QuestionProgress>;

/** Lifecycle of a timed CKAD exam attempt. */
export type ExamStatus = 'idle' | 'active' | 'finished';

/** A timed attempt. Timestamps are epoch milliseconds so a reload can resume it. */
export interface ExamSession {
  status: ExamStatus;
  startedAt: number | null;
  finishedAt: number | null;
  /** 2 hours, matching the official CKAD exam. */
  durationMs: number;
  /** Question ids marked for review. */
  flagged: string[];
  /** Question ids the learner has opened in this attempt. */
  visited: string[];
  /** Question the learner was viewing when the attempt was saved. */
  currentId: string;
}
