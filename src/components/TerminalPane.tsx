import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { IDisposable } from '@xterm/xterm';
import type { Question } from '../types';
import { executeCommand, promptFor, type ShellState } from '../lib/mockShell';

/** Mirrors bash: Enter continues a command while a quote is still open. */
function hasOpenQuote(text: string): boolean {
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (const character of text) {
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
    if (character === "'" || character === '"') quote = character;
  }

  return quote !== null;
}

interface TerminalPaneProps {
  question: Question;
  online: boolean;
  resetToken: number;
  initialState: ShellState;
  onStateChange: (state: ShellState) => void;
  onHeredocComplete: (prefix: string, content: string, state: ShellState) => ShellState;
}

export default function TerminalPane({
  question,
  online,
  resetToken,
  initialState,
  onStateChange,
  onHeredocComplete,
}: TerminalPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ShellState>(initialState);
  const lineRef = useRef('');
  const historyIndexRef = useRef(-1);
  const heredocRef = useRef<{ prefix: string; delimiter: string; lines: string[] } | null>(null);
  const callbackRef = useRef(onStateChange);
  const heredocCallbackRef = useRef(onHeredocComplete);
  callbackRef.current = onStateChange;
  heredocCallbackRef.current = onHeredocComplete;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let term: Terminal | undefined;
    let observer: ResizeObserver | undefined;
    let subscription: IDisposable | undefined;
    let cancelled = false;

    // Defer construction so React StrictMode's synchronous mount/unmount/mount
    // cycle cannot dispose a terminal that still has queued render callbacks.
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;

      term = new Terminal({
        cursorBlink: true,
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.35,
        scrollback: 1000,
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#58a6ff',
          black: '#0d1117',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#e6edf3',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(host);
      fitAddon.fit();

      stateRef.current = initialState;
      lineRef.current = '';
      historyIndexRef.current = -1;
      heredocRef.current = null;

      const writePrompt = () => {
        if (term) term.write(promptFor(stateRef.current, question));
      };
      const writeOutput = (text: string) => {
        if (!term || !text) return;
        let normalized = text.replace(/\r?\n/g, '\r\n');
        if (!normalized.endsWith('\r\n')) normalized += '\r\n';
        term.write(normalized);
      };

      term.writeln('CKAD Practice Lab — simulated shell');
      term.writeln('No real SSH connection or Kubernetes cluster is contacted.');
      term.writeln('Type "help" to list available commands.');
      term.writeln('');
      writePrompt();
      callbackRef.current(stateRef.current);

      const redrawLine = () => {
        if (term) {
          term.write(`\x1b[2K\r${promptFor(stateRef.current, question)}${lineRef.current}`);
        }
      };

      subscription = term.onData((data) => {
        if (!term) return;

        if (data === '\r') {
          const input = lineRef.current;
          term.write('\r\n');
          lineRef.current = '';
          historyIndexRef.current = -1;

          const activeHeredoc = heredocRef.current;
          if (activeHeredoc) {
            if (input.trim() === activeHeredoc.delimiter) {
              const content = activeHeredoc.lines.length
                ? `${activeHeredoc.lines.join('\n')}\n`
                : '';
              heredocRef.current = null;
              term.write('\r\n');
              // The terminal owns session state for the lifetime of a tab. Keep it in sync
              // with the heredoc's effects so later commands cannot overwrite them.
              stateRef.current = heredocCallbackRef.current(
                activeHeredoc.prefix,
                content,
                stateRef.current,
              );
              writePrompt();
            } else {
              activeHeredoc.lines.push(input);
              term.write('> ');
            }
            return;
          }

          const heredocStart = input.trim().match(
            /^(.+?)\s*<<-?\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_][\w]*))$/,
          );
          if (heredocStart) {
            heredocRef.current = {
              prefix: input.trim(),
              delimiter: heredocStart[2] ?? heredocStart[3] ?? heredocStart[4] ?? 'EOF',
              lines: [],
            };
            term.write('> ');
            return;
          }

          if (hasOpenQuote(input)) {
            lineRef.current = `${input}\n`;
            term.write('> ');
            return;
          }

          const response = executeCommand(input, question, stateRef.current);
          if (response.clear) {
            term.clear();
            term.write('\x1b[H');
          } else {
            writeOutput(response.output);
          }

          stateRef.current = response.state;
          callbackRef.current(response.state);
          writePrompt();
          return;
        }

        if (data === '\u007f') {
          if (lineRef.current.length > 0) {
            lineRef.current = lineRef.current.slice(0, -1);
            term.write('\b \b');
          }
          return;
        }

        if (data === '\u0003') {
          heredocRef.current = null;
          term.write('^C\r\n');
          lineRef.current = '';
          historyIndexRef.current = -1;
          writePrompt();
          return;
        }

        if (data === '\u000c') {
          term.clear();
          term.write('\x1b[H');
          writePrompt();
          term.write(lineRef.current);
          return;
        }

        if (data === '\u001b[A' || data === '\u001b[B') {
          const history = stateRef.current.history;
          if (history.length === 0) return;

          if (data === '\u001b[A') {
            historyIndexRef.current =
              historyIndexRef.current === -1
                ? history.length - 1
                : Math.max(0, historyIndexRef.current - 1);
          } else if (historyIndexRef.current === -1) {
            lineRef.current = '';
            redrawLine();
            return;
          } else {
            historyIndexRef.current = Math.min(history.length - 1, historyIndexRef.current + 1);
          }

          lineRef.current = history[historyIndexRef.current] ?? '';
          redrawLine();
          return;
        }

        if (data >= ' ') {
          lineRef.current += data;
          term.write(data);
        }
      });

      observer = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch {
          // The element can be hidden during a layout change.
        }
      });
      observer.observe(host);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      subscription?.dispose();
      term?.dispose();
    };
  }, [question, online, resetToken]);

  return (
    <div className="terminal-frame">
      <div className="terminal-titlebar" aria-hidden="true">
        <span className="terminal-dot terminal-dot--red" />
        <span className="terminal-dot terminal-dot--amber" />
        <span className="terminal-dot terminal-dot--green" />
        <span className="terminal-title">
          simulated@ckad-lab — {online ? 'online (mock instance)' : 'offline (local sandbox)'}
        </span>
      </div>
      <div
        className="terminal-host"
        ref={hostRef}
        role="region"
        aria-label={`Simulated terminal for ${question.instance.host}`}
      />
      <p className="terminal-hint">
        Click the terminal to focus. Use <kbd>↑</kbd>/<kbd>↓</kbd> for history,{' '}
        <kbd>Ctrl</kbd>+<kbd>C</kbd> to cancel, <kbd>clear</kbd> to reset the view. Write YAML with{' '}
        <code>cat &gt; file.yaml &lt;&lt;EOF</code>.
      </p>
    </div>
  );
}
