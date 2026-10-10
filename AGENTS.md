# AGENTS.md — SUSHI Codebase Guide

Canonical, machine-readable conventions for automated agents working in **SUSHI**.

**Precedence.** This file is authoritative for commands, conventions, and invariants an agent must follow. [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`BEST-PRACTICES.md`](BEST-PRACTICES.md) are authoritative for contribution process and coding rationale; [`README.md`](README.md) is authoritative for user-facing behavior and configuration reference. Look there for the "why". If this file contradicts the repository itself, the repository wins — fix this file.

## What this project is

SUSHI ("SUSHI Unshortens Short Hand Inputs") is a TypeScript CLI compiler and library that converts FHIR Shorthand (FSH) source files into FHIR R4/R4B/R5 JSON artifacts (StructureDefinitions, CodeSystems, ValueSets, Instances, etc.) for use in FHIR Implementation Guides (IGs).

The public npm package is `fsh-sushi`. The CLI binary is `sushi`. There is also a programmatic API (`fshToFhir`) exported from `src/run/FshToFhir.ts`.

## Repository layout

```
src/
  app.ts                  CLI entry point (commander-based)
  index.ts                Public library exports
  fshtypes/               FSH AST node classes (Profile, Extension, Instance, etc.)
    rules/                Rule classes (CardRule, AssignmentRule, BindingRule, etc.)
  import/                 FSH parser (ANTLR4-generated) + config loading
  export/                 FHIR JSON exporters (one per artifact type)
  fhirdefs/               FHIR definition loader and cache
  fhirtypes/              TypeScript models for FHIR types (StructureDefinition, ElementDefinition, etc.)
  ig/                     ImplementationGuide (IG) exporter
  run/                    fshToFhir() programmatic API
  utils/                  Logging, fishing, path utilities, processing helpers
antlr/                    ANTLR4 grammar files (.g4) and Gradle build
test/                     Jest tests mirroring src/ structure
  testhelpers/            Shared test utilities (loggerSpy, TestFisher, getTestFHIRDefinitions)
regression/               Regression test runner against real-world IG repos
dist/                     Compiled output (do not edit)
```

## Key commands

| Command | What it does |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run full Jest test suite |
| `npm run lint` | Run ESLint + `tsc` |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run prettier` | Check formatting |
| `npm run prettier:fix` | Auto-fix formatting |
| `npm run check` | `test` + `lint` + `prettier` (pre-PR gate) |
| `npm run regression` | Run regression tests against real-world IGs |

Always run `npm run check` before submitting a PR.

Note that `npm run lint` runs a full emitting `tsc` before ESLint, so it writes `dist/`. `npm run lint:fix` uses `tsc --noEmit` and does not.

### Running a subset of tests

The runner is **Jest** (`jest.config.js`, `testMatch: **/test/**/*.test.(ts|js)`). Prefer the smallest command that covers the change; escalate to the full suite only when the focused run indicates you need to.

```
npm test                                          # full suite
npm test -- test/fshtypes/rules/CardRule.test.ts  # scoped: one file or path
npm test -- <path> -t "<test name substring>"     # focused: one describe/it
```

Everything after `--` is passed through to Jest, so `-t`, `--testPathPattern`, and `--watch` all work. Coverage is collected on every run unless `CI=true` is set in the environment; set it to speed up focused runs.

## Toolchain pins

- **Node 22** — pinned in `.nvmrc` (`22`) and `.tool-versions` (`nodejs 22.21.1`). That is the development version; several dependencies are deliberately held back so SUSHI still runs on **Node 18** (see "Dependency constraints").
- **TypeScript**, configured in `tsconfig.json`: `target` ES2018, `module` **commonjs**, `lib` ES2020 + DOM, `outDir` `dist`, `declaration` and `sourceMap` on, `esModuleInterop` on, `resolveJsonModule` on. Only `src/**/*` is included.
- **Strictness is partial and deliberate**: `noImplicitAny` is on; `strict` and `strictNullChecks` are **off**. Do not turn them on as a drive-by change. `test/tsconfig.json` extends the root config and adds `strictNullChecks: false`, `noEmit: true`, `types: ["jest", "node"]`.
- Warnings are **not** errors, but `npm run lint` runs `tsc` first, so any type error fails lint.

## Run

SUSHI is a CLI whose entry point is `dist/app.js` (`bin.sushi`); the library entry is `dist/index.js`. Build first, then run:

```
npm run build
node dist/app.js <path-to-fsh-project> -o <output-dir>
```

To run without building:

```
npx ts-node src/app.ts <path-to-fsh-project> -o <output-dir>
```

## Architecture: the compile pipeline

FSH source → **import** → **tank** → **export** → FHIR JSON

1. **Import** (`src/import/FSHImporter.ts`): ANTLR4-generated parser visits FSH grammar, populating `FSHDocument` objects with typed FSH entities and rules. Multiple documents are collected into an `FSHTank`.

2. **Tank** (`src/import/FSHTank.ts`): an in-memory store of all parsed FSH definitions. Implements the `Fishable` interface — anything that can be "fished" for by name/id/url.

3. **Export** (`src/export/`): exporter classes read from the tank and produce FHIR JSON. Resolution order via `MasterFisher`: local package output first → tank → external `FHIRDefinitions`.

4. **FHIRDefinitions** (`src/fhirdefs/`): loads and caches FHIR core packages from disk or the FHIR registry.

5. **IG Export** (`src/ig/IGExporter.ts`): assembles all artifacts into an IG project directory.

## Core concepts

- **Fishable / fishing**: the uniform interface for resolving FHIR artifacts by name, id, or canonical URL. `MasterFisher` aggregates `FSHTank`, `FHIRDefinitions`, and the in-progress `Package`.
- **FSH types** (`src/fshtypes/`): typed AST nodes for each FSH keyword (Profile, Extension, Instance, Invariant, RuleSet, etc.).
- **Rules** (`src/fshtypes/rules/`): each rule class corresponds to a FSH rule syntax (e.g., `CardRule` for `N..M`, `AssignmentRule` for `= value`, `BindingRule` for `from ValueSet`).
- **ElementDefinition** (`src/fhirtypes/ElementDefinition.ts`): the largest and most complex class in the codebase. Handles path navigation, slicing, type constraints, pattern/fixed value assignment, etc.
- **StructureDefinitionExporter** (`src/export/StructureDefinitionExporter.ts`): the most complex exporter; handles Profiles, Extensions, Logicals, and Resources.

## Testing patterns

Tests live in `test/` and mirror `src/`. The test framework is **Jest** with `ts-jest`.

### Common test helpers (`test/testhelpers/`)

- `getTestFHIRDefinitions(includeR4, ...paths)` — load FHIR definitions from `test/testhelpers/testdefs/`; pass `true` for R4, or use `testDefsPath('r4-definitions')` / `testDefsPath('r5-definitions')`.
- `TestFisher` — a `MasterFisher` wrapper suitable for tests; takes `(FSHTank, FHIRDefinitions, Package)`.
- `loggerSpy` — captures log output; call `loggerSpy.reset()` in `beforeEach` and assert with `loggerSpy.getMessageAtIndex(...)` or `loggerSpy.getAllMessages(...)`.
- `importSingleText(fsh, filename)` — parse a single FSH string into a `FSHDocument`.
- `minimalConfig` (`test/utils/minimalConfig.ts`) — a minimal `Configuration` object for tests.

### Typical exporter test setup

```typescript
beforeAll(async () => {
  defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
});
beforeEach(() => {
  loggerSpy.reset();
  doc = new FSHDocument('fileName');
  const input = new FSHTank([doc], minimalConfig);
  pkg = new Package(input.config);
  const fisher = new TestFisher(input, defs, pkg);
  exporter = new StructureDefinitionExporter(input, pkg, fisher);
});
```

## Adding new features

- **New FSH syntax**: add grammar to `antlr/src/main/antlr4/FSH.g4`, regenerate with `npm run build:grammar` (requires Java/Gradle), add an AST node in `src/fshtypes/`, update `FSHImporter.ts` visitor, update the relevant exporter.
- **New rule type**: add a class under `src/fshtypes/rules/`, export from `src/fshtypes/rules/index.ts`, handle it in the relevant exporter and in `AllowedRules.ts`.
- **New exporter**: follow the pattern of existing exporters; implement the `Fishable` interface if needed; integrate into `exportFHIR.ts`.

## Dependency constraints

Several packages are intentionally held back from major upgrades (see `DEPENDENCY-NOTES.md`):

- `chalk`, `https-proxy-agent`, `junk`, `title-case` — held at major versions that use CommonJS (not ESM), because SUSHI uses `"module": "commonjs"`.
- `html-minifier-terser` — held at v5; v6 made APIs async which would require pervasive refactoring.
- `commander`, `del-cli`, `ini` — held back to maintain Node 18 support.

Do **not** bump these without reading `DEPENDENCY-NOTES.md` and understanding the constraint.

## Code style

- TypeScript with `noImplicitAny`; strict null checks are **not** enabled.
- ESLint + Prettier enforce formatting. Run `npm run lint:fix && npm run prettier:fix` after changes.
- Prefer self-explanatory code; add comments only for non-obvious constraints or workarounds.
- Do not use ESM-only packages (the build target is CommonJS).
- Formatting is defined by `.prettierrc`: single quotes, no trailing commas, `printWidth` 100, `tabWidth` 2, `arrowParens: "avoid"`, `endOfLine: "auto"`. It is enforced by `npm run prettier`, not by the build.
- Match the surrounding file. Consistency with neighbouring code beats any general preference.

### Architectural invariants

These are decisions, not preferences. Violating one is a review Blocker.

- **CommonJS only.** `tsconfig.json` sets `"module": "commonjs"`, so an ESM-only dependency breaks the build and the published package. This is why the packages in "Dependency constraints" are pinned; read `DEPENDENCY-NOTES.md` before touching any of them.
- **Node 18 must keep working at runtime**, even though development is on Node 22. Do not adopt APIs or dependencies that require a newer runtime floor.
- **Generated parser code is not hand-edited.** `src/import/generated/` comes from the ANTLR grammar in `antlr/src/main/antlr4/FSH.g4` via `npm run build:grammar` (requires Java/Gradle). Change the grammar, regenerate — never patch the output. It is excluded from coverage for the same reason.
- **`dist/` is build output.** Never edit it; it is regenerated by `npm run build` and deleted by `del-cli` at the start of every build.
- **Fishing is the lookup mechanism.** Resolve artifacts through the `Fishable` interface / `MasterFisher` rather than reaching into `FSHTank` or `FHIRDefinitions` directly.

## FHIR/FSH domain knowledge

- FSH supports FHIR R4, R4B, and R5. Version-specific handling lives in `src/utils/FHIRVersionUtils.ts` and `src/fhirdefs/R5DefsForR4/`.
- FHIR canonical URLs uniquely identify artifacts; `valid-url` is used to validate them.
- "Slicing" is a core FHIR concept for constraining arrays of elements; its complexity is concentrated in `ElementDefinition.ts` and `StructureDefinitionExporter.ts`.
- The `Fishable` interface (`src/utils/Fishable.ts`) and its `Type` enum are the primary lookup mechanism throughout the codebase.

## Commit conventions

**SUSHI does not use conventional commits.** Do not write `feat(scope): …` or `fix(scope): …` here — it does not match the history and will look out of place.

- **Subject**: imperative, sentence case, no type prefix, target ≤ 72 characters. Real examples from `master`: `Fix processing of slices on choice elements`, `Replace extract zip`, `Make copyrightYear and releaseLabel optional`.
- **Do not hand-append `(#NNNN)`.** PRs are squash-merged and GitHub appends the PR number to the subject automatically. Local phase commits carry a bare subject.
- **Trailers**: `Co-authored-by: Name <email>` is used in this repository and should be included when applicable, after a blank line at the end of the message.
- One logical change per commit.
- Agents **do not push** and **do not open pull requests** unless the user explicitly asks. See "Agent guardrails".

## Agent guardrails

- Read this file before proposing any build, test, or lint command. **Never invent a command.** If something you need is not documented here, say so rather than guessing.
- Prefer the smallest targeted verification that covers the change; escalate to the full suite only when the targeted run indicates it is needed. The full suite is large — use the scoped and focused forms above.
- Do not add new linting, building, or testing tooling without being asked.
- **Do not hand-edit generated or build output**: `src/import/generated/` (regenerate via `npm run build:grammar`) and `dist/` (regenerate via `npm run build`).
- **Do not bump a pinned dependency** listed under "Dependency constraints" without reading `DEPENDENCY-NOTES.md` and stating why the constraint no longer applies.
- Do not enable `strict` or `strictNullChecks` as a side effect of another change; that is a project-wide decision with a large blast radius.
- Regression tests (`npm run regression`) hit real-world IG repositories over the network and are slow. Run them only when asked or when the change plausibly affects IG output.

