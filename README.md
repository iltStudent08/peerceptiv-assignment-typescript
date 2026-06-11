# peerceptiv-assignment-typescript

An interactive counter web application built with **Vite** and **TypeScript**. The project demonstrates a clean separation of concerns across three layers — types, state management, and DOM rendering — with no external runtime dependencies.

**Live demo:** https://iltstudent08.github.io/peerceptiv-assignment-typescript/

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Codebase Walkthrough](#codebase-walkthrough)
   - [Entry Point — `src/main.ts`](#entry-point--srcmaints)
   - [Types — `src/types/counter.ts`](#types--srctypescounterts)
   - [State Management — `src/utils/counterStore.ts`](#state-management--srcutilscounterstorts)
   - [DOM Layer — `src/dom/counterView.ts`](#dom-layer--srcdomcounterviewts)
   - [Styles — `src/style.css`](#styles--srcstylesscss)
4. [Configuration](#configuration)
   - [`tsconfig.json`](#tsconfigjson)
   - [`vite.config.ts`](#viteconfigts)
5. [Deployment](#deployment)
6. [Scripts](#scripts)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build

# Preview the production build locally
npm run preview
```

---

## Project Structure

```
peerceptiv-assignment-typescript/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: builds and deploys to GitHub Pages
├── public/
│   ├── favicon.svg             # Browser tab icon
│   └── icons.svg               # SVG icon sprite
├── src/
│   ├── main.ts                 # Application entry point
│   ├── style.css               # Global styles
│   ├── assets/                 # Static images (hero, logos)
│   ├── types/
│   │   └── counter.ts          # TypeScript interfaces and type aliases
│   ├── utils/
│   │   └── counterStore.ts     # Pure state management logic
│   └── dom/
│       └── counterView.ts      # DOM rendering and event wiring
├── index.html                  # Vite HTML entry (references src/main.ts)
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript compiler options
└── package.json                # Scripts and dev dependencies
```

---

## Codebase Walkthrough

### Entry Point — `src/main.ts`

```
src/main.ts
```

This is the first file executed by the browser. It:

1. **Imports `style.css`** — Vite processes this import and injects the styles into the page at build time.
2. **Locates the root element** — queries for `<div id="app">` from `index.html`. If it does not exist, a descriptive error is thrown immediately rather than letting the app silently fail.
3. **Mounts the counter** — passes the root element to `mountCounterApp()`, which takes full ownership of that DOM node.

Keeping the entry point this thin means all business logic stays testable and reusable in isolation.

---

### Types — `src/types/counter.ts`

All shared TypeScript types live here. Nothing is ever imported at runtime from this file — every import uses `import type`, so the types are erased at compile time and have zero bundle cost.

| Export | Kind | Purpose |
|---|---|---|
| `CounterBounds` | `interface` | Optional `min` and `max` numeric constraints for the counter value. |
| `CounterState` | `interface` | The full runtime state: `value` (current number), `step` (how much each action changes it), `label` (display name), and optional `bounds`. |
| `CounterAction` | `type` | A union of the three valid action strings: `'increment'`, `'decrement'`, `'reset'`. Keeps button logic type-safe. |
| `CounterConfig` | `type` | The public API for configuring a counter. Built from `CounterState` using TypeScript utility types: all fields except `value` are made optional via `Partial<Omit<...>>`, and an `initialValue` field is added. |

The use of `Partial<Omit<CounterState, 'value'>>` in `CounterConfig` is deliberate — callers set an _initial_ value (`initialValue`), while `value` itself is managed internally by the store.

---

### State Management — `src/utils/counterStore.ts`

This module contains all state logic and has **no knowledge of the DOM**. It exports a single factory function:

#### `createCounterStore(config?)`

Creates and returns a self-contained counter store object with two methods:

| Method | Signature | Description |
|---|---|---|
| `getState()` | `() => CounterState` | Returns a **shallow copy** of the current state. Returning a copy prevents external callers from mutating internal state directly. |
| `transition(action, ...stepOverride?)` | `(CounterAction, ...number[]) => CounterState` | Applies an action and returns the updated state copy. An optional `stepOverride` allows bypassing the default step value for a single transition. |

#### Internal helpers

**`clampValue(value, bounds?)`**
Ensures the counter never goes outside its configured `min`/`max`. Uses `Number.NEGATIVE_INFINITY` and `Number.POSITIVE_INFINITY` as defaults so that unconstrained counters work correctly without special-casing.

**`createInitialState(config)`**
Builds the first `CounterState` from a `CounterConfig`. Destructures config with defaults (`step = 1`, `label = 'Counter'`, `initialValue = 0`) and immediately clamps the initial value against any provided bounds.

#### State transitions

The `transition` function computes `nextValue` using a ternary chain:
- `'reset'` → always `0`
- `'increment'` → `state.value + step`
- `'decrement'` → `state.value - step`

The result is clamped before being stored. State is updated immutably (`{ ...state, value: clampedValue }`) so any previous reference to `getState()` is unaffected.

---

### DOM Layer — `src/dom/counterView.ts`

This module bridges the pure state logic and the browser. It exports one function:

#### `mountCounterApp(root)`

Takes an `HTMLElement` and does the following:

1. **Renders the initial HTML** — sets `root.innerHTML` with a `<main>` block containing:
   - An `<h1>` heading.
   - A `#counter-description` paragraph for state metadata.
   - A `#counter-value` paragraph for the large displayed number.
   - A `.controls` div containing one `<button>` per action, generated dynamically by iterating over `actionLabels`.

2. **Queries rendered elements** — retrieves the description, value, and button nodes. Throws if any are missing, catching template regressions early.

3. **Creates the store** — instantiates a `CounterStore` with a step of `1`, an initial value of `0`, and bounds clamped to `[-10, 10]`.

4. **`render(state)`** — a local function that syncs the DOM to a given `CounterState`. It updates `#counter-value` with the numeric value and `#counter-description` with a human-readable summary produced by `describeState()`.

5. **Calls `render` once** on startup to populate the UI immediately without waiting for user interaction.

6. **Attaches click listeners** — iterates over all `[data-action]` buttons. On click, reads `button.dataset.action`, validates it is a known `CounterAction` via the `isCounterAction` type guard, then calls `store.transition(action)` and passes the returned state to `render`.

#### Helper functions

**`actionLabels`** — a `Record<CounterAction, string>` mapping each action key to its button label. Using a `Record` type ensures all three actions always have a label and adding a new action without a label causes a compile error.

**`isCounterAction(value)`** — a TypeScript type guard (`value is CounterAction`) that narrows a plain string to `CounterAction`. This prevents any unknown `data-action` attribute from accidentally being dispatched to the store.

**`describeState(state)`** — formats a `CounterState` into a readable summary string (e.g. `Counter (value: 3 • step: 1 • min: -10 • max: 10)`). Uses `Object.entries` to avoid repetitive key-value formatting.

---

### Styles — `src/style.css`

Global CSS imported directly in `main.ts`. Highlights:

| Selector | Role |
|---|---|
| `:root` | Sets the base font stack (`Inter`, system fallbacks) and colour palette (dark text on light grey background). |
| `#app` | Full-viewport grid with `place-items: center` to vertically and horizontally centre the counter card on any screen size. |
| `.counter-app` | The white card: `min(420px, 100%)` width keeps it responsive on small screens, with a subtle box shadow and rounded corners. |
| `.counter-value` | Large (`3rem`) bold text for the current number. |
| `.controls` | Flex row with a gap, centred, for the action buttons. |
| `.counter-button` | Indigo-tinted button with a border; hover state deepens the background for visual feedback. |

---

## Configuration

### `tsconfig.json`

The TypeScript compiler is configured in **bundler mode** (Vite handles transpilation; `tsc` is used only for type-checking):

| Option | Value | Why |
|---|---|---|
| `target` | `es2023` | Outputs modern JS; no need for down-levelling since Vite targets modern browsers. |
| `moduleResolution` | `bundler` | Matches Vite's resolution algorithm (supports bare specifiers, `.ts` extensions in imports). |
| `allowImportingTsExtensions` | `true` | Allows `import './foo.ts'` — required when `noEmit` is true and Vite owns bundling. |
| `verbatimModuleSyntax` | `true` | Enforces `import type` for type-only imports, making it explicit what ships to the bundle. |
| `noEmit` | `true` | `tsc` only type-checks; it never writes `.js` files (Vite does that). |
| `strict` | `true` | Enables all strict checks: `strictNullChecks`, `noImplicitAny`, etc. |
| `noUnusedLocals` / `noUnusedParameters` | `true` | Flags dead code at compile time. |
| `erasableSyntaxOnly` | `true` | Disallows TypeScript features that cannot be stripped by simple erasure (e.g. `const enum`, `namespace`). |

### `vite.config.ts`

```ts
export default defineConfig({
  base: '/peerceptiv-assignment-typescript/',
})
```

`base` sets the public URL prefix for all assets in the production build. This is required for GitHub Pages project sites, where the app is served from a subdirectory rather than the domain root.

---

## Deployment

The project deploys automatically to **GitHub Pages** via the `.github/workflows/deploy.yml` workflow:

1. Triggered on every push to `main`.
2. Installs dependencies with `npm install`.
3. Runs `npm run build` (type-check → Vite bundle → `dist/`).
4. Uploads the `dist/` folder as a Pages artifact and deploys it.

To enable this in your own fork, go to **Settings → Pages** in the GitHub repository and set the **Source** to **GitHub Actions**.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server at `http://localhost:5173` with HMR. |
| `npm run build` | Runs `tsc` (type-check only) then `vite build` to produce an optimised `dist/`. |
| `npm run preview` | Serves the `dist/` folder locally to verify the production build before deploying. |
