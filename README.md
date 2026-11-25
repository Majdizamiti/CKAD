# CKAD Practice Lab

A sandboxed, exam-style CKAD practice interface with all 22 task simulations. It renders task
instructions, instance details, an embedded simulated terminal, verification, progress tracking and
exam-style documentation.

> **Safety:** No real SSH, PTY, Kubernetes API, container registry or network call is performed.
> Every command is matched against local fixtures and an in-memory filesystem / mock cluster.

## Confirmed stack

| Concern | Choice | Reason |
| --- | --- | --- |
| Frontend | React 18 + TypeScript + Vite 6 | Fast SPA, no server runtime, offline-friendly, typed question model. |
| Terminal | `@xterm/xterm` + `@xterm/addon-fit` with a local mock shell engine | Authentic terminal UX while command execution stays fully in-browser. |
| Data | Typed JSON in `src/data/` + interfaces in `src/types.ts` | Easy to author and review 22 tasks; compile-time validation of shapes. |
| Persistence | `localStorage` key `ckad-practice:progress:v1` | Per-browser progress, CLI history and simulated session state (mock files, resources, connection). |
| Testing | Vitest for the shell engine; `tsc --noEmit` + Vite build for type/bundle checks | Fast, deterministic unit tests of command behaviour and all 22 solution paths. |

### Alternatives considered

- **Next.js** – useful later if grading or content is moved server-side; unnecessary for a local simulator.
- **Custom React terminal** – lighter and simpler, but less authentic than xterm.js for CLI practice.
- **YAML / TS modules for content** – YAML is more readable for long docs blocks, TS modules give stronger typing; JSON was chosen for tooling neutrality.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # mock shell, content and exam-helper tests (38 tests)
npm run build    # type-check + production bundle in dist/
npm run preview  # serve the production build
```

## Deploy to GitHub Pages

The site is published from the production bundle in `dist/`, never from the source `index.html`.
`.github/workflows/deploy.yml` runs on every push to `main`: it installs dependencies, runs the tests,
builds with `VITE_BASE=/CKAD/`, and deploys the result with the official GitHub Pages actions.

One-time repository setup:

1. Go to **Settings → Pages → Build and deployment**.
2. Set **Source** to **GitHub Actions** (not "Deploy from a branch").
3. Push to `main`, or run the **Deploy to GitHub Pages** workflow manually.

The deployed URL is `https://majdizamiti.github.io/CKAD/`. Local `npm run dev` / `npm run preview`
remain at `/`; only the Pages build uses the `/CKAD/` base. If a custom domain is added later, change
`VITE_BASE` in the workflow back to `/` and add the domain's `CNAME` file.

## Offline vs online mode

Both modes are simulated; the distinction is presentational and behavioural, never network-related.

| Mode | Prompt on start | Behaviour |
| --- | --- | --- |
| **Offline · local sandbox** | `student@localhost:~$` | The learner must run `ssh <host>` to open the simulated session. `kubectl` before connecting returns a hint. |
| **Online · mock instance** | `<host>:~$` | The session starts connected to the task's instance. Still backed by the same fixtures, initialResources and virtual filesystem. |

A persistent `SIMULATED · NO REAL SSH` badge is always visible. A future real-SSH bridge would
require an explicit opt-in flag plus a server-side broker; neither exists here.

## What the interface renders for every task

1. **Header** — compact sticky top bar with brand, gradient `n/22` progress bar, sandbox badge,
   offline/online toggle, reset/clear icon actions, a mode explanation and a **Start exam** button.
   During an attempt this becomes a two-hour countdown with flag/visit counts and **Finish exam**.
2. **Sidebar** — collapsible task rail with live search (title, host or number), difficulty filters
   (All / Easy / Medium / Hard), completion ticks and host labels. Hidden by default on narrow screens.
   In exam mode it switches to a question palette with flags and review markers.
3. **Task panel** — gradient task hero with a status pill, a quick-facts strip (host, SSH command with
   copy button, task-sheet label, mode) and four keyboard-accessible tabs. The terminal stays visible
   beside the details on desktop:
   - Plain-text exam task sheet: a `Task` statement followed by a single `Instruction`, authored in
     the style of the real exam, with no external or official Kubernetes documentation links.
   - Every task has a **File template** block showing the starting file or worksheet with `TODO`
     fields to fill in (for example, `/opt/course/3/job.yaml` for the Neptune Job), with a one-click
     copy button.
   - Internal-code formatting for all command and file-path fragments in the instruction.
   - Environment constraints in their own card beneath the task sheet.
   - **Solution hidden by default**: a **Reveal solution** / **Hide solution** control unlocks the
     **Solution** tab (exact commands with one-click copy, expected stdout) and the **Notes** tab
     (rationale and reference notes). Expected file content stays behind a second reveal in **Verify**.
   - **Tabs**: `Task` (documentation), `Verify` (checklist, CLI history, `Verify with` commands),
     `Solution` and `Notes` (locked until revealed). Arrow keys move between tabs.
   - xterm.js terminal in a macOS-style frame with connection pill and usage hint; simulated prompt,
     command history, heredoc YAML writing and Ctrl+C.
   - Verification checklist (files **and** mock cluster resources) with an `n/m` progress count.
4. On success the badge becomes **Task complete**, the sidebar marks the task done, and progress,
   CLI history, mock files, cluster resources and connection state are saved to `localStorage`.
   Reloading resumes the same session; **Reset session** starts clean.

Question 1 example: `ssh ckad5601` → `kubectl get namespaces > /opt/course/1/namespaces` →
`cat /opt/course/1/namespaces`, producing the four-namespace table.

## Exam mode

**Start exam** opens a proctored-style attempt that is closer to the real CKAD experience:

- **Two-hour countdown** (`HH:MM:SS`) that turns red in the last 10 minutes, keeps running after a
  reload, and submits the attempt automatically at zero.
- **Connected mock instances** — the attempt starts in online mode, like the exam terminal, but is
  still entirely simulated.
- **Task-only view** — the panel shows the plain-text task statement, its instruction and the
  environment constraints. Verification checks, solutions, notes and completion feedback are hidden
  until the attempt is submitted; there are no external documentation links in either mode.
- **Question palette** — a 22-cell grid shows the current, visited, answered and flagged questions.
  Every row also has a flag button; flags persist across reloads.
- **Previous / Next navigation** plus direct palette jumps. The current question is saved, so a
  reload resumes where you left off.
- **Finish flow** — a confirmation dialog locks the attempt, stops the timer and opens a results
  screen with time used, answered/flagged/visited counts and a reviewable list of all 22 tasks.
- **Return to practice** restores the full study UI; **Start new attempt** clears progress and begins
  again. Nothing is graded by a server: the checker only reads the local simulated filesystem.

The exam session is stored separately at `localStorage` key `ckad-practice:exam:v1`.

## Mock shell capabilities

- Connection: `ssh <host>`, `exit` / `logout`, with `kubectl` blocked before connecting in offline mode.
- Kubernetes: fixture-backed `kubectl get` / `describe` / `logs` / `explain`, plus generic resource listing from mock state.
- Tooling: fixture-backed `helm`, `docker`, `podman`, `curl`, `wget`; `sudo` and `cd … && …` unwrapping.
- Files: `>` / `>>` redirection, `cat > file <<EOF` heredocs, multi-line quoted commands, `cat`, `ls`, `touch`, `cp`, `rm`, `mkdir`, `echo`, `pwd`, `whoami`.
- Effects: commands can create, update or delete mock cluster resources and write files. Resource
  checkers compare kind, namespace, name and required labels/annotations as subsets.
- Navigation: arrow-key history, `clear`, `help`, Ctrl+C, and persisted history across reloads.

## Phased roadmap

### Phase 1 — MVP

- [x] Vite/React/TypeScript scaffold, xterm.js integration, typed JSON model.
- [x] Question 1 end-to-end: docs, instance, exact commands, simulated terminal, verification, rationale.
- [x] Mock shell with redirection, filesystem, connection state and history.
- [x] localStorage progress, offline/online modes, reset controls, a11y and responsive layout.

### Phase 2 — Complete question bank

- [x] Authored all 21 remaining question objects with exact commands, fixtures, expected stdout, artifacts, resources and docs blocks.
- [x] Expanded the engine for `kubectl` resources, `helm` / `docker` / `podman` / `curl`, heredocs, multi-line commands and per-command effects.
- [x] Generic checkers for file content and mock resource state (labels/annotations), replacing the single-artifact check.
- [x] All 22 tasks unlocked and individually resumable; every task has a persisted session.
- [x] A test that runs every task's displayed command sequence and asserts success.
- [ ] Optional schema validation (Zod/JSON Schema) in CI for content authoring.
- [ ] Per-task timer and hint gating.

### Phase 3 — Exam fidelity

- [x] Exam timer, question navigation grid, flag-for-review, and a finish/summary screen.
- [ ] Randomised starting namespace/context per attempt; multiple accepted command variants.
- [x] Focus mode matching the official UI (single task statement, constraints, terminal).
- [ ] Export/import attempt reports as JSON for review.

### Phase 4 — Deployment and polish

- [ ] Static hosting (S3 + CloudFront, Netlify, GitHub Pages or similar). Build with `npm run build`, publish `dist/`.
- [ ] Content security policy, no external runtime dependencies, pinned lockfile.
- [ ] Cross-browser and screen-reader verification, mobile layout review.
- [ ] Optional, explicitly gated real-cluster mode behind an authenticated broker — never enabled by default.

## Testing plan

| Layer | What is tested | How |
| --- | --- | --- |
| Unit | Mock shell resolution, redirection, exact file writes, pre-connect guard, unknown commands, heredoc writes | `npm test` (Vitest, `src/lib/mockShell.test.ts`) |
| Unit | Exam session creation, countdown/clamping, expiry, clock formatting and review flags | `npm test` (Vitest, `src/lib/exam.test.ts`) |
| Content | Every task's 22 command sequences reach success, with correct files and resources; plain-text task, instruction and TODO file template exist for all tasks, with no external links | `npm test` |
| Type | Question data matches interfaces; no unused code | `npx tsc --noEmit` via `npm run build` |
| Build | Production bundle succeeds with split React/terminal chunks | `npm run build` |
| Manual UI | Terminal focus, history keys, mode toggle, reset, persistence across reload, responsive breakpoints, exam start/flag/navigate/finish flow | Browser checklist at 1280px, 768px and 375px |
| Accessibility | Keyboard-only navigation, visible focus, `aria-live` status, labelled controls, contrast | Keyboard walkthrough + screen-reader spot check |

## Project structure

```text
src/
  App.tsx                       state, progress, mode, layout
  types.ts                      question and progress interfaces
  data/questions.json           question 1
  data/questions/q02-08.json    questions 2–8
  data/questions/q09-15.json    questions 9–15
  data/questions/q16-22.json    questions 16–22
  lib/questions.ts              typed loader for all 22 tasks
  lib/mockShell.ts              sandboxed command engine, virtual filesystem and mock cluster
  lib/storage.ts                localStorage persistence
  lib/mockShell.test.ts         engine + content tests
  components/
    Header.tsx                  mode toggle, progress, reset actions
    QuestionList.tsx            22-task navigation / progress tracker
    QuestionPanel.tsx           docs, instance, commands, verification, notes
    TerminalPane.tsx            xterm.js host and input handling
  styles.css                    responsive theme
```
