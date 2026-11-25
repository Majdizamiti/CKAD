import { describe, expect, it } from 'vitest';
import { createInitialState, executeCommand, writeVirtualFile } from './mockShell';
import { questions } from './questions';

const question = questions[0];
const target = question.expected.artifacts[0].path;

describe('mock shell', () => {
  it('has all 22 tasks', () => {
    expect(questions).toHaveLength(22);
    expect(questions.map((item) => item.number)).toEqual(
      Array.from({ length: 22 }, (_, index) => index + 1),
    );
  });

  it('connects with the exact ssh command and reports the expected stdout', () => {
    const first = executeCommand('ssh ckad5601', question, createInitialState(question, false));
    expect(first.event).toBe('connected');
    expect(first.state.host).toBe('ckad5601');
    expect(first.output).toContain('Last login:');
  });

  it('refuses kubectl before connecting to the instance', () => {
    const result = executeCommand('kubectl get namespaces', question, createInitialState(question, false));
    expect(result.output).toContain('command not found');
    expect(result.output).toContain('ssh ckad5601');
  });

  it('writes the exact artifact and marks the task solved', () => {
    let state = createInitialState(question, true);
    state = executeCommand('kubectl get namespaces > /opt/course/1/namespaces', question, state).state;
    expect(state.files[target]).toBe(question.expected.artifacts[0].content);
    expect(state.solved).toBe(true);
  });

  it('verifies the artifact with cat', () => {
    let state = createInitialState(question, true);
    state = executeCommand('kubectl get ns > /opt/course/1/namespaces', question, state).state;
    const result = executeCommand(`cat ${target}`, question, state);
    expect(result.output).toBe(question.expected.artifacts[0].content);
  });

  it('does not write a file for an unknown command', () => {
    const state = createInitialState(question, true);
    const result = executeCommand('foobar > /opt/course/1/namespaces', question, state);
    expect(result.output).toContain('command not found');
    expect(result.state.files[target]).toBeUndefined();
    expect(result.state.solved).toBe(false);
  });

  it('writes a heredoc into the virtual filesystem', () => {
    const state = createInitialState(questions[11], true);
    const next = writeVirtualFile('/tmp/example.yaml', 'key: value\n', questions[11], state);
    expect(next.state.files['/tmp/example.yaml']).toBe('key: value\n');
  });

  it('matches indented heredoc effects when the terminal passes prefix and body', () => {
    const item = questions.find((entry) => entry.number === 13)!;
    let state = createInitialState(item, true);

    // The terminal closes a heredoc by passing "<prefix>\n<body>" (without the sentinel).
    for (const step of item.commands) {
      const command = step.exact.includes('\n')
        ? step.exact.replace(/\nEOF$/, '')
        : step.exact;
      state = executeCommand(command, item, state).state;
    }

    expect(state.solved).toBe(true);
    expect(
      (item.expected.resources ?? []).every((expected) =>
        state.resources.some((actual) =>
          actual.kind.toLowerCase() === expected.kind.toLowerCase() &&
          actual.name === expected.name &&
          (!expected.namespace || actual.namespace === expected.namespace),
        ),
      ),
    ).toBe(true);
  });
});

describe('task documentation', () => {
  it('gives every task a plain-text task and instruction with no external links', () => {
    for (const item of questions) {
      const docs = item.documentation;
      expect(docs.heading.length).toBeGreaterThan(0);
      expect(docs.task.length).toBeGreaterThan(20);
      expect(docs.instruction.length).toBeGreaterThan(20);
      const combined = `${docs.task} ${docs.instruction}`;
      expect(combined).not.toMatch(/https?:\/\//);
      expect(combined).not.toMatch(/kubernetes\.io/i);
    }
  });

  it('includes a concrete command or path in every instruction', () => {
    for (const item of questions) {
      expect(item.documentation.instruction).toContain('`');
    }
  });

  it('provides a TODO file template for every task', () => {
    const withTemplates = questions.filter((item) => item.documentation.template);
    expect(withTemplates.length).toBe(questions.length);
    for (const item of withTemplates) {
      const template = item.documentation.template!;
      expect(template.path.length).toBeGreaterThan(0);
      expect(template.content).toContain('TODO');
      expect(item.documentation.instruction).toContain('template below');
    }

    const job = questions.find((item) => item.number === 3)!;
    expect(job.documentation.template!.path).toBe('/opt/course/3/job.yaml');
    expect(job.documentation.template!.content).toContain('apiVersion: batch/v1');
    expect(job.documentation.template!.content).toContain('completions: TODO');
    expect(job.documentation.template!.content).toContain('parallelism: TODO');
  });
});

describe('every displayed command sequence', () => {
  for (const item of questions) {
    it(`question ${item.number} (${item.id}) reaches success`, () => {
      let state = createInitialState(item, false);

      for (const step of item.commands) {
        state = executeCommand(step.exact, item, state).state;
      }

      expect(
        {
          solved: state.solved,
          missingFiles: item.expected.artifacts
            .filter((artifact) => state.files[artifact.path] !== artifact.content)
            .map((artifact) => artifact.path),
          missingResources: (item.expected.resources ?? [])
            .filter(
              (expected) =>
                !state.resources.some(
                  (actual) =>
                    actual.kind.toLowerCase() === expected.kind.toLowerCase() &&
                    actual.name === expected.name &&
                    (!expected.namespace || actual.namespace === expected.namespace),
                ),
            )
            .map((resource) => `${resource.kind}/${resource.name}`),
        },
        `Q${item.number}: ${item.commands.map((step) => step.exact.split('\n')[0]).join(' | ')}`,
      ).toMatchObject({ solved: true, missingFiles: [], missingResources: [] });
    });
  }
});
