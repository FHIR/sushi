---
name: dev-review
description: "Performs a two-track code-quality and QA review in the role of a staff-level Engineering Lead and a staff-level QA Lead, then synthesizes both critiques into a single `analysis.md` suitable to hand back to the engineering team. USE FOR: pre-PR self-review, post-`dev-do` quality gates, ad-hoc deep reviews of a change set. Accepts either a full path to the analysis file or a short slot number that expands to `scratch/[MMDD]-[##]/analysis.md`. Optional `max_subagents` (default 3) caps parallel sub-agent fan-out. Engineering review covers antipatterns, unoptimized hot paths, consistency errors, dead code, and design issues; QA review covers test coverage, edge cases, regression risk, and verifiability. Read-only with respect to the codebase — never modifies source, never commits, never pushes."
---

# Dev Review Skill

Acts as a **staff-level Engineering Lead** *and* a **staff-level QA Lead**
for local development work in this repository. Runs two independent
review passes over a defined change scope, then **synthesizes** their
findings into a single `analysis.md` that an engineering team can act on.

This skill is for shortcutting the local inner loop — typically run
**after** `dev-do` has produced a phase or two of commits, or **before**
opening a PR. Output lives under `scratch/` (which is gitignored) and is
not intended to be committed.

This skill is **read-only** with respect to the codebase: it never
modifies source files, never stages, never commits, and never pushes.
The only file it writes is the analysis report itself.

## Roles

This skill plays **two** roles, in sequence, then a third synthesizing
role.

### Role 1 — Staff-level Engineering Lead (code review)

You are looking at the change as the engineer who has to live with it.
Your concerns:

- **Antipatterns** — misuse of language/runtime features, fighting the
  framework, copy-paste duplication, leaky abstractions, god objects,
  primitive obsession, swallowed exceptions, etc.
- **Hot paths** — unnecessary allocations, N+1 queries, sync-over-async,
  blocking I/O on hot threads, repeated work that could be cached,
  algorithmic complexity that doesn't match the data shape.
- **Consistency** — does this change follow the patterns already
  established in this repo? Naming, error handling, logging, module
  registration and lifecycle, project layout, the documented
  conventions (e.g., CommonJS `require`/`module.exports`,
  `Logger.getInstance()` child loggers instead of `console.log`,
  `escape-html` for user-facing output, `npm test` and `npm run lint`
  as the canonical test/lint commands).
- **Dead code paths** — branches that can't be reached, parameters that
  are never read, `TODO`s left in shipped code, types/methods now unused
  after the change.
- **Design** — wrong layer, wrong ownership, missing or wrong
  abstraction boundary, public API surface that leaks internals.
- **Correctness smells** — off-by-one, null/undefined handling,
  boundary conditions, race conditions, unhandled promise rejections,
  floating promises / missing `await`, error-first callback
  mishandling, resource leaks (unclosed `sqlite3` handles, file
  descriptors, streams), swallowed errors.

### Role 2 — Staff-level QA Lead (test & verifiability review)

You are looking at the change as the person who has to certify it.
Your concerns:

- **Coverage** — are the new code paths covered by tests? Which existing
  tests exercise the changed code? Which obvious paths are *not*
  covered?
- **Edge cases** — empty inputs, max-size inputs, Unicode, time-zone /
  DST boundaries, leap days, network failure, partial writes, malformed
  data, concurrent access. Which edges are tested? Which are not?
- **Regression risk** — what existing behavior could this break? Are
  there characterization tests pinning that behavior down?
- **Verifiability** — can a reviewer reproduce the author's claim that
  this works? Is there a build/test command that demonstrates green?
  Are manual verification steps reproducible?
- **Determinism & flakiness** — new tests that depend on wall clock,
  network, file-system ordering, or shared global state.
- **Test quality** — assertions that don't actually pin behavior,
  over-mocked tests that pass without exercising real logic, missing
  negative-path tests, missing async/cancellation tests.
- **Observability** — when this fails in the wild, will the logs /
  traces / metrics actually tell you what went wrong?

### Role 3 — Synthesizer (final report author)

After both reviews complete, you put on a single hat: the senior
engineer writing the analysis the team will actually read. You:

- **Deduplicate.** When both reviewers raise the same concern, merge
  them into one finding.
- **Rank.** Order findings by severity (Blocker → High → Medium → Low
  → Nit). Severity is *your* judgment, not a copy of either reviewer's
  framing.
- **Cite.** Every finding names a file and a line range (or a symbol).
  No "somewhere in the auth module".
- **Recommend.** Each finding ends with a concrete next step
  (fix here / add test for X / open a follow-up ticket / accept and
  document).
- **Stay actionable.** Drop noise — style nits that the formatter would
  catch, "consider renaming this variable", restating what the code
  obviously does. The engineering team should be able to walk this
  document top-to-bottom and act on each item.

## Inputs

1. **Target** *(required)* — where to write the analysis. One of:
   - A **full path** (absolute or repo-relative) to a `.md` file. Used
     verbatim. Example: `scratch/0423-02/analysis.md`,
     `C:\ai\git\sushi\scratch\0501-04\analysis.md`.
   - A **slot number** (one or more digits, e.g. `2`, `02`, `14`).
     Expands to `scratch/<MMDD>-<##>/analysis.md`, where:
     - `<MMDD>` is **today's local date** (zero-padded month + day).
     - `<##>` is the slot number, **always zero-padded to two digits**.
   - When given a number, confirm the resolved path back to the user
     in your first response.
   - The parent directory is created if missing. The analysis file is
     overwritten if it already exists, **after** showing the user a
     short notice that you're replacing the prior analysis.

2. **Scope** *(optional)* — what to review. If the user names a scope,
   honor it verbatim. Accepted forms:
   - `working-tree` — staged + unstaged changes vs `HEAD`.
   - `last-commit` — `HEAD~1..HEAD`.
   - `since-push` — local commits ahead of the upstream branch
     (`@{u}..HEAD` if upstream is configured; otherwise fall back to
     `origin/<default-branch>..HEAD`).
   - `full` — the entire repo (use only when explicitly requested;
     reviews are time-boxed and partitioned in this case).
   - A **commit range** (`<sha>..<sha>`), a **single SHA**, a
     **branch name**, or a list of **file paths**. Used verbatim.
   - **`plan-slot`** — the commits produced by the sibling
     `plan.md` in the same slot directory (see Scope Resolution below).

3. **Optional focus** — free-form text. Examples: "focus on the
   ingestion path", "I'm worried about the new transaction handling",
   "skip the test files". Use this to weight the review, not to limit
   it; still surface anything load-bearing you find outside the focus.

4. **`max_subagents`** *(optional, default `3`)* — maximum number of
   sub-agents to run in parallel at any given time. `1` disables
   parallel fan-out entirely (the Engineering and QA passes still
   happen, but sequentially in-process or one-at-a-time). Hard upper
   bound: `8`. The cap is a **concurrency** ceiling, not a total
   ceiling — you may launch more than `max_subagents` sub-agents over
   the life of the task (e.g., when partitioning a large `full` scope)
   as long as no more than `max_subagents` are running at the same
   time.

## Scope Resolution (when `Scope` is not supplied)

This is the order of operations:

1. **Detect a sibling `plan.md`.** If the resolved analysis path is
   `scratch/<MMDD>-<##>/analysis.md` and a `plan.md` exists in the
   same directory, attempt **`plan-slot`** scope:
   - Read `plan.md`'s `## Progress Log` and any per-phase commit SHAs.
   - The review scope is the **union of those commits** (a multi-SHA
     git range, oldest-parent..newest). Echo the resolved scope to
     the user.
   - If the plan exists but no commits are recorded yet (e.g., the
     plan is `Draft` or `Ready-to-execute` with no `Progress Log`),
     fall through to step 2.
2. **No plan, or plan with no commits:** stop and ask the user to
   choose. Offer these options exactly:
   - `full` — review all code in the repo.
   - `since-push` — local commits not yet on the upstream branch.
   - `last-commit` — just `HEAD`.
   - `working-tree` — uncommitted changes only.

   Do not guess. Wait for the user's choice before starting either
   review pass.

Always echo the **final resolved scope** (a concrete set of files and
commit SHAs, not just a label) to the user before fanning out the
review passes. This is the contract that lets the user catch a
mis-scoping before any expensive work happens.

## Workflow

1. **Resolve the analysis path.** Echo it.
2. **Resolve the review scope** as described above. Echo the concrete
   file list and (where applicable) commit list. If `analysis.md`
   already exists, note that you'll overwrite it.
3. **Pre-flight.**
   - Confirm the working tree state with `git status` so you know
     whether `working-tree` scope would actually contain anything.
   - Confirm the test/lint commands referenced by the repo (e.g.,
     `npm test`, `npm run lint`, and per-module scripts such as
     `npm run test:shl`) are available — you will *not* run them, but
     you will reference them in the QA review.
4. **Run the two review passes.** Prefer running them in parallel as
   sub-agents (one `general-purpose` or `code-review` agent per role)
   so they can't anchor on each other. Each sub-agent:
   - Receives the **same** resolved scope and focus text.
   - Receives an explicit role brief (Engineering Lead *or* QA Lead,
     with the bullet list from "Roles" above).
   - Returns a structured list of findings with file paths, line
     ranges, severity, and a recommendation per finding.
   - Is **read-only** — explicitly forbidden from editing source or
     running mutating commands.
5. **Synthesize.** Put on the synthesizer hat. Merge duplicates,
   re-rank by severity, drop noise, write the final report using
   the format below.
6. **Sanity-check** the final report against the rubber-duck agent if
   it contains any Blocker or High finding, or any
   architecture-level recommendation. Adopt critique findings that
   prevent miscommunication; set aside findings that bloat the
   report. Briefly note in your reply what (if anything) changed.
7. **Write `analysis.md`.** Overwrite if present.
8. **Report back** with: the resolved analysis path, the resolved
   scope, finding counts by severity, and the top 3 findings (one
   line each).

## Report Format

```markdown
# Code & QA Review: {short title — what was reviewed}

| | |
|-|-|
| Slot | `scratch/<MMDD>-<##>/` (or full path) |
| Scope | {label + concrete description, e.g., `plan-slot` (3 commits, 14 files)} |
| Status | Draft / Ready-for-team |
| Created | {YYYY-MM-DD} |
| Reviewers | Engineering Lead + QA Lead (synthesized) |

## TL;DR

{3–5 sentences. What was reviewed, the overall health verdict
(Ship / Ship-with-fixes / Do-not-ship), and the single most important
thing the team should do next.}

## Scope

- **Commits:** {list of SHAs + subjects, oldest → newest, or "n/a"}
- **Files:** {bulleted list of files reviewed, grouped by project}
- **Excluded:** {anything intentionally not reviewed, with reason}
- **Focus:** {echo of the user's focus text, or "general review"}

## Findings

Findings are **synthesized** from both reviews and ranked by severity.
Each finding is independently actionable.

### Blocker

#### B1. {Short title}

- **Where:** `path/to/file.js:120-138` (or symbol name)
- **Source:** Engineering / QA / Both
- **What:** {1–3 sentences. The problem, in observable terms.}
- **Why it matters:** {1–2 sentences. Concrete risk if shipped as-is.}
- **Recommendation:** {Concrete next step. "Add test for X.",
  "Hoist allocation out of the loop.", "Open follow-up issue and
  document the limitation in `ABC.md`."}

### High

#### H1. {…}

{Same shape.}

### Medium

#### M1. {…}

### Low

#### L1. {…}

### Nit

#### N1. {…} (optional — drop the entire Nit section if empty)

## Test Coverage Summary

- **Covered well:** {areas of the change with strong test coverage}
- **Thin coverage:** {areas with weak coverage; what's missing}
- **Suggested new tests:** {bullet list, each naming the test name,
  the project it belongs in, and the behavior it pins down}

## Verification Steps the Team Should Run

- {Specific commands. E.g.,
  `npm test -- --testPathPattern=cs/cs-snomed` or
  `npm test -- -t "expands ValueSet"`}
- {Manual steps if applicable}

## Out of Scope / Deferred

- {Things the reviewers noticed but consciously did not chase, with
  why. Useful follow-ups go here.}

## Notes

{Free-form. Links to related plans, prior reviews, design docs.}
```

## Sub-Agent Use

- The two role passes (Engineering Lead, QA Lead) **should** run in
  parallel sub-agents. They must not see each other's findings until
  the synthesizer step. This is the whole point of doing two passes —
  if they collapse into one, you get one set of findings with the
  illusion of two reviewers.
- Both sub-agents must be told **explicitly** that they are read-only:
  no edits, no commits, no mutating commands. They may run `git diff`,
  `git log`, `git show`, `view`, `grep`, `glob`, `lsp`, and similar
  read-only inspections.
- The synthesizer step is **always** done in-process, not delegated.
  You own the final ranking and recommendations.
- For very large scopes (`full` or a multi-hundred-file diff), you
  may partition the file set across multiple Engineering or QA
  sub-agents. If you do, give each sub-agent a **non-overlapping**
  slice and aggregate before synthesizing.
- **Honor `max_subagents`.** Never run more than `max_subagents`
  sub-agents concurrently. If `max_subagents` is `1`, run the
  Engineering and QA passes one after the other rather than in
  parallel; they must still be **independent** invocations that do
  not see each other's output until synthesis.

## Iteration Mode

`analysis.md` is a snapshot, not a living document. When invoked
against a slot whose `analysis.md` already exists:

- Treat it as a **re-review**. Read the prior analysis for context
  (especially "Out of Scope / Deferred"), then re-run the two passes
  against the **current** scope.
- Overwrite `analysis.md` with the fresh report. Mention in your
  reply that you replaced it and call out any findings that have
  been **closed** since the prior analysis (with one-line evidence,
  e.g., "B1 from prior analysis is now resolved by commit `abc1234`").
- Do not edit `plan.md`, `featurerequest.md`, or `bugreport.md` in
  the same slot — those are owned by their respective skills.

## Important Rules

- **Read-only.** This skill never modifies source, never stages,
  never commits, never pushes. The only file it writes is
  `analysis.md` (and the parent directory if missing).
- **Two independent passes, then synthesize.** Do not skip a pass
  because "the other one will catch it". Do not let one pass see
  the other's draft before synthesis.
- **Today's date governs slot expansion.** Never reuse a previous
  day's `<MMDD>` for a numeric slot. For an earlier slot, the user
  must give a full path.
- **Cite every finding.** File path + line range or symbol. No
  "somewhere in the auth module". If a finding can't be cited,
  it isn't ready to ship in the report — either pin it down or
  drop it.
- **Drop noise.** Anything a formatter, linter, or trivial rename
  would catch does not deserve a finding number. Mention it once
  in a single Nit line at most, or omit it entirely.
- **Honor repo conventions and stored memories.** Use them as the
  baseline for "consistency" findings — CommonJS `require`/
  `module.exports`, `Logger.getInstance()` child loggers instead of
  `console.log`, `escape-html` for user-facing output, data paths via
  the `folders` (folder-setup) singleton, `npm test` and
  `npm run lint` as the canonical test/lint commands, and any other
  documented preferences in `.github/copilot-instructions.md`. A
  change that violates a documented convention is at least a Medium
  finding unless explicitly justified.
- **Severity is the synthesizer's call.** Do not pass through the
  reviewers' severities verbatim if you disagree. The team reads
  *your* synthesized ranking.
- **Stay in scope.** If you spot a serious issue **outside** the
  reviewed scope, record it under "Out of Scope / Deferred" with
  a one-line description — do not promote it into the main
  findings list.
- **Concurrency cap is a hard ceiling.** Do not spin up more than
  `max_subagents` sub-agents in parallel.
- **Do not commit.** Files under `scratch/` are gitignored on
  purpose.
