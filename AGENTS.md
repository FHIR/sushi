# AGENTS.md — SUSHI Codebase Guide

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

## FHIR/FSH domain knowledge

- FSH supports FHIR R4, R4B, and R5. Version-specific handling lives in `src/utils/FHIRVersionUtils.ts` and `src/fhirdefs/R5DefsForR4/`.
- FHIR canonical URLs uniquely identify artifacts; `valid-url` is used to validate them.
- "Slicing" is a core FHIR concept for constraining arrays of elements; its complexity is concentrated in `ElementDefinition.ts` and `StructureDefinitionExporter.ts`.
- The `Fishable` interface (`src/utils/Fishable.ts`) and its `Type` enum are the primary lookup mechanism throughout the codebase.
