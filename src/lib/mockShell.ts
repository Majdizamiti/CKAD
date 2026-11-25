import type { Question, QuestionProgress, ResourceRef } from '../types';

export interface ShellState {
  host: string | null;
  cwd: string;
  files: Record<string, string>;
  resources: ResourceRef[];
  history: string[];
  solved: boolean;
}

export interface ShellResponse {
  state: ShellState;
  output: string;
  clear: boolean;
  event?: 'connected' | 'disconnected' | 'file-written';
}

interface Resolution {
  output: string;
  error?: boolean;
  event?: ShellResponse['event'];
  files?: Record<string, string>;
  removeFiles?: string[];
}

const KIND_ALIASES: Record<string, string> = {
  po: 'Pod',
  pod: 'Pod',
  pods: 'Pod',
  deploy: 'Deployment',
  deployment: 'Deployment',
  deployments: 'Deployment',
  svc: 'Service',
  service: 'Service',
  services: 'Service',
  ns: 'Namespace',
  namespace: 'Namespace',
  namespaces: 'Namespace',
  job: 'Job',
  jobs: 'Job',
  pv: 'PersistentVolume',
  pvc: 'PersistentVolumeClaim',
  cm: 'ConfigMap',
  configmaps: 'ConfigMap',
  sa: 'ServiceAccount',
  secret: 'Secret',
  secrets: 'Secret',
  sc: 'StorageClass',
  netpol: 'NetworkPolicy',
  node: 'Node',
  nodes: 'Node',
};

function ensureNewline(text: string): string {
  return text.length === 0 || text.endsWith('\n') ? text : `${text}\n`;
}

/** Collapse horizontal whitespace but preserve newlines in heredoc-style commands. */
function normalize(command: string): string {
  return command.trim().replace(/[ \t]+/g, ' ');
}

/** Exact, whitespace-normalized or heredoc-prefix lookup of a fixture key. */
function lookup<T>(record: Record<string, T>, command: string): T | undefined {
  if (command in record) return record[command];

  const target = normalize(command);
  for (const [key, value] of Object.entries(record)) {
    if (normalize(key) === target) return value;
  }
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalize(key);
    if (normalizedKey.startsWith(`${target}\n`) || normalizedKey.startsWith(`${target} <<`)) {
      return value;
    }
  }
  return undefined;
}

function resourceKey(resource: ResourceRef): string {
  return `${resource.kind.toLowerCase()}|${resource.namespace ?? ''}|${resource.name}`;
}

/** Identity match ignores labels/annotations because those are what effects add or change. */
function sameIdentity(actual: ResourceRef, expected: ResourceRef): boolean {
  return (
    actual.kind.toLowerCase() === expected.kind.toLowerCase() &&
    (expected.namespace === undefined || actual.namespace === expected.namespace) &&
    (expected.name === undefined || actual.name === expected.name)
  );
}

/** Finds a top-level > or >> outside quotes; returns null for a quoted `>` inside JSON/YAML. */
function findRedirect(
  command: string,
): { command: string; operator: '>' | '>>'; target: string } | null {
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character !== '>') continue;

    const operator = command[index + 1] === '>' ? '>>' : '>';
    const target = command
      .slice(index + (operator === '>>' ? 2 : 1))
      .trim();
    if (!target || /\s/.test(target)) return null;
    return { command: command.slice(0, index).trim(), operator, target };
  }

  return null;
}

function resourceMatches(actual: ResourceRef, expected: ResourceRef): boolean {
  if (actual.kind.toLowerCase() !== expected.kind.toLowerCase()) return false;
  if (expected.namespace && actual.namespace !== expected.namespace) return false;
  if (expected.name && actual.name !== expected.name) return false;

  for (const [key, value] of Object.entries(expected.labels ?? {})) {
    if (actual.labels?.[key] !== value) return false;
  }
  for (const [key, value] of Object.entries(expected.annotations ?? {})) {
    if (actual.annotations?.[key] !== value) return false;
  }
  return true;
}

export function resourceSatisfied(resources: ResourceRef[], expected: ResourceRef): boolean {
  return resources.some((resource) => resourceMatches(resource, expected));
}

function isSolved(
  question: Question,
  files: Record<string, string>,
  resources: ResourceRef[],
): boolean {
  const filesOk = question.expected.artifacts.every(
    (artifact) => files[artifact.path] === artifact.content,
  );
  const resourcesOk = (question.expected.resources ?? []).every((expected) =>
    resources.some((actual) => resourceMatches(actual, expected)),
  );
  return filesOk && resourcesOk;
}

function stepOutput(question: Question, exact: string, fallback: string): string {
  return question.commands.find((step) => step.exact === exact)?.expectedStdout ?? fallback;
}

function applyEffects(question: Question, command: string, state: ShellState): ShellState {
  const effect = lookup(question.mock.effects ?? {}, command);
  if (!effect) return state;

  let resources = [...state.resources];

  if (effect.removeResources?.length) {
    resources = resources.filter(
      (resource) => !effect.removeResources!.some((expected) => sameIdentity(resource, expected)),
    );
  }

  for (const added of effect.addResources ?? []) {
    resources = [...resources.filter((resource) => resourceKey(resource) !== resourceKey(added)), {
      ...added,
    }];
  }

  for (const update of effect.updateResources ?? []) {
    resources = resources.map((resource) =>
      sameIdentity(resource, update)
        ? {
            ...resource,
            labels: { ...(resource.labels ?? {}), ...(update.labels ?? {}) },
            annotations: { ...(resource.annotations ?? {}), ...(update.annotations ?? {}) },
          }
        : resource,
    );
  }

  const files = { ...state.files, ...(effect.files ?? {}) };
  return { ...state, files, resources };
}

function withResolutionFiles(state: ShellState, resolution: Resolution): ShellState {
  if (!resolution.files && !resolution.removeFiles) return state;
  const files = { ...state.files, ...(resolution.files ?? {}) };
  for (const path of resolution.removeFiles ?? []) delete files[path];
  return { ...state, files };
}

export function createInitialState(
  question: Question,
  online: boolean,
  saved?: QuestionProgress,
): ShellState {
  const files = { ...(saved?.files ?? question.mock.initialFiles ?? {}) };
  const resources = (saved?.resources ?? question.mock.initialResources ?? []).map((item) => ({
    ...item,
  }));
  const host = saved?.host !== undefined ? saved.host : online ? question.instance.host : null;

  return {
    host,
    cwd: '~',
    files,
    resources,
    history: [...(saved?.history ?? [])],
    solved: isSolved(question, files, resources),
  };
}

export function promptFor(state: ShellState, question: Question): string {
  return state.host ? `${state.host}:~$ ` : `${question.instance.localPrompt} `;
}

function genericKubectl(args: string[], state: ShellState): Resolution {
  const first = args[0] ?? '';
  const namespaceIndex = args.indexOf('-n');
  const namespace = namespaceIndex >= 0 ? args[namespaceIndex + 1] : undefined;

  if (first === 'get') {
    const target = args[1] ?? '';
    const kind = KIND_ALIASES[target] ?? target;
    const matches = state.resources.filter(
      (resource) =>
        (kind === 'all' || resource.kind.toLowerCase() === kind.toLowerCase()) &&
        (!namespace || resource.namespace === namespace),
    );

    if (matches.length === 0) {
      return {
        output: namespace ? `No resources found in ${namespace} namespace.\n` : 'No resources found.\n',
      };
    }

    const nameWidth = Math.max(16, ...matches.map((item) => item.name.length + 2));
    const header = `NAME${' '.repeat(nameWidth - 4)}NAMESPACE`;
    const rows = matches.map(
      (item) => `${item.name}${' '.repeat(nameWidth - item.name.length)}${item.namespace ?? '-'}`,
    );
    return { output: `${[header, ...rows].join('\n')}\n(simulated cluster state)\n` };
  }

  if (first === 'describe') {
    const name = args.filter((arg) => !arg.startsWith('-')).pop() ?? 'resource';
    return {
      output: `Name: ${name}\nNamespace: ${namespace ?? 'default'}\nStatus: Active\n\n(simulated description)\n`,
    };
  }

  if (first === 'logs') {
    return { output: `(simulated logs for ${args.join(' ') || 'pod'})\n` };
  }

  if (first === 'explain') {
    return { output: `Kind: ${args[0] ?? 'resource'}\nDescription: simulated Kubernetes reference entry.\n` };
  }

  return { output: `Simulated kubectl ${first} command succeeded.\n` };
}

function resolveCommand(command: string, question: Question, state: ShellState): Resolution {
  const [name, ...args] = command.split(' ');

  switch (name) {
    case 'pwd':
      return { output: `${state.host ? '/root' : '/home/student'}\n` };

    case 'whoami':
      return { output: `${state.host ? 'root' : 'student'}\n` };

    case 'echo': {
      const rest = command.slice(4).trim();
      if (
        rest.length > 1 &&
        ((rest.startsWith("'") && rest.endsWith("'")) ||
          (rest.startsWith('"') && rest.endsWith('"')))
      ) {
        return { output: ensureNewline(rest.slice(1, -1)) };
      }
      return { output: ensureNewline(args.join(' ')) };
    }

    case 'touch': {
      const files: Record<string, string> = {};
      for (const path of args) files[path] = state.files[path] ?? '';
      return { output: '', event: 'file-written', files };
    }

    case 'mkdir':
      return { output: '' };

    case 'cd': {
      const separator = command.indexOf('&&');
      if (separator >= 0) {
        return resolveCommand(command.slice(separator + 2).trim(), question, state);
      }
      return { output: '' };
    }

    case 'vi':
    case 'vim':
    case 'nano':
    case 'sed':
    case 'grep':
    case 'kill':
      return { output: '' };

    case 'rm': {
      if (args.length === 0) return { output: 'rm: missing operand\n', error: true };
      return { output: '', event: 'file-written', removeFiles: args };
    }

    case 'cp': {
      if (args.length < 2) return { output: 'cp: missing destination file operand\n', error: true };
      const [source, destination] = args;
      if (!(source in state.files)) {
        return { output: `cp: cannot stat '${source}': No such file or directory\n`, error: true };
      }
      return { output: '', event: 'file-written', files: { [destination]: state.files[source] } };
    }

    case 'cat': {
      if (args.length !== 1) {
        return { output: 'cat: missing file operand\n', error: true };
      }
      const path = args[0];
      if (!(path in state.files)) {
        return { output: `cat: ${path}: No such file or directory\n`, error: true };
      }
      return { output: ensureNewline(state.files[path]) };
    }

    case 'ls': {
      const paths = Object.keys(state.files).sort();
      if (args.length === 0) {
        return { output: paths.length ? `${paths.join('  ')}\n` : '\n' };
      }
      const path = args[0];
      if (path in state.files) {
        return { output: `${path}\n` };
      }
      return { output: `ls: cannot access '${path}': No such file or directory\n`, error: true };
    }

    case 'ssh': {
      const target = args[0];
      if (!target) {
        return { output: 'usage: ssh <hostname>\n', error: true };
      }
      if (target !== question.instance.host) {
        return {
          output: `ssh: Could not resolve hostname ${target}\nHint: this task uses ${question.instance.host}.\n`,
          error: true,
        };
      }
      if (state.host === target) {
        return { output: `Already connected to ${target}.\n` };
      }
      return {
        output: ensureNewline(stepOutput(question, `ssh ${target}`, `Connected to ${target}.\n`)),
        event: 'connected',
      };
    }

    case 'exit':
    case 'logout': {
      if (!state.host) return { output: 'No active instance session.\n' };
      return { output: `Connection to ${state.host} closed.\n`, event: 'disconnected' };
    }

    case 'kubectl': {
      if (!state.host) {
        return {
          output: `bash: kubectl: command not found\nHint: connect to the instance first: ssh ${question.instance.host}\n`,
          error: true,
        };
      }
      const fixture = lookup(question.mock.commandOutputs, command);
      if (fixture !== undefined) return { output: ensureNewline(fixture) };
      return genericKubectl(args, state);
    }

    case 'helm':
    case 'docker':
    case 'podman':
    case 'curl':
    case 'wget': {
      const fixture = lookup(question.mock.commandOutputs, command);
      if (fixture !== undefined) return { output: ensureNewline(fixture) };
      return { output: `Simulated ${name} command: ${command}\n` };
    }

    case 'sudo': {
      if (args.length === 0) return { output: 'usage: sudo <command>\n', error: true };
      return resolveCommand(args.join(' '), question, state);
    }

    default:
      return { output: `bash: ${name}: command not found\n`, error: true };
  }
}

/** Executes one command against in-memory state. Never touches the network or host filesystem. */
export function executeCommand(
  rawInput: string,
  question: Question,
  state: ShellState,
): ShellResponse {
  const input = rawInput.trim();
  const history = input ? [...state.history, input] : state.history;

  if (!input) {
    return { state: { ...state, history }, output: '', clear: false };
  }

  const command = normalize(input);

  if (command === 'clear') {
    return { state: { ...state, history }, output: '', clear: true };
  }

  if (command === 'help') {
    return {
      state: { ...state, history, solved: isSolved(question, state.files, state.resources) },
      clear: false,
      output: [
        'Simulated shell — no real SSH, cluster, Docker or Podman is contacted.',
        '',
        '  ssh <host>                 connect to the practice instance',
        '  kubectl <args>             mocked kubectl command',
        '  helm | docker | podman     mocked tooling commands',
        '  cat <path>                 read a file',
        '  cat > <path> <<EOF         write a file with a heredoc (end with EOF)',
        '  <command> > <path>         redirect stdout to a file',
        '  <command> >> <path>        append stdout to a file',
        '  pwd, whoami, echo, clear, exit, help',
        '',
      ].join('\n'),
    };
  }

  const redirect = findRedirect(command);

  if (redirect) {
    const { operator, target } = redirect;
    const left = normalize(redirect.command);
    // Fixtures may be keyed by the full command (including redirection) or just its left side.
    const fixture = lookup(question.mock.commandOutputs, command);
    const resolution =
      fixture !== undefined
        ? { output: ensureNewline(fixture) }
        : resolveCommand(left, question, state);

    if (resolution.error) {
      return {
        state: { ...state, history, solved: isSolved(question, state.files, state.resources) },
        output: resolution.output,
        clear: false,
      };
    }

    const previous = state.files[target] ?? '';
    const content = operator === '>>' ? previous + resolution.output : resolution.output;
    const withFile = withResolutionFiles(
      { ...state, files: { ...state.files, [target]: content } },
      resolution,
    );
    const next = applyEffects(question, left, withFile);

    return {
      state: {
        ...next,
        history,
        solved: isSolved(question, next.files, next.resources),
      },
      output: '',
      clear: false,
      event: 'file-written',
    };
  }

  const resolution = resolveCommand(command, question, state);
  let nextState = { ...state };

  if (resolution.event === 'connected') {
    nextState = { ...nextState, host: question.instance.host };
  } else if (resolution.event === 'disconnected') {
    nextState = { ...nextState, host: null };
  }

  nextState = applyEffects(question, command, withResolutionFiles(nextState, resolution));

  return {
    state: {
      ...nextState,
      history,
      solved: isSolved(question, nextState.files, nextState.resources),
    },
    output: resolution.output,
    clear: false,
    event: resolution.event,
  };
}

/** Used by the terminal when a heredoc block is completed. */
export function writeVirtualFile(
  path: string,
  content: string,
  question: Question,
  state: ShellState,
): ShellResponse {
  const files = { ...state.files, [path]: content };
  return {
    state: {
      ...state,
      files,
      solved: isSolved(question, files, state.resources),
    },
    output: '',
    clear: false,
    event: 'file-written',
  };
}
