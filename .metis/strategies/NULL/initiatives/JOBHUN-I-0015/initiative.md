---
id: terminology-alignment-project
level: initiative
title: "Terminology alignment + project alias index in the apply flow"
short_code: "JOBHUN-I-0015"
created_at: 2026-08-05T00:33:38.568006+00:00
updated_at: 2026-08-05T04:01:35.904059+00:00
parent: JOBHUN-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/active"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: terminology-alignment-project
---

# No-LLM tailoring pivot + terminology alignment + project alias index Initiative

## Context **[REQUIRED]**

The `resume-intelligence` plugin (marketplace `resume-kit`) has both **grown new capabilities**
and **removed one** since job-hunter's tailoring stack (JOBHUN-I-0011 … I-0014) was built.
Inspection of the installed **v0.3.0** plugin drives this initiative's scope.

**The load-bearing change: `align-resume` (`resume_align`, the LLM auto-rewrite) is DISABLED /
not surfaced in v0.3.0.** job-hunter's [[tailor-resume]] pipeline (I-0013) is built *around* it —
Step 8 "Align" calls `align-resume`, and the edit-classifier's entire job is to diff
`align-resume`'s opaque `aligned_resume` into typed edits. That front-end no longer exists.
resume-kit now steers all truthful tailoring through the **no-LLM** path: `inject-keywords`
(surface missing-but-true keywords) + `update-terminology` (mirror the employer's exact wording
for an alias the resume already satisfies). **Per Daniel's decision (2026-08-04), this initiative
pivots the pipeline's content-editing engine to that no-LLM path** — removing the `align-resume`
dependency rather than treating it as still-callable. See
[Plugin-reality reconciliation](#plugin-reality-reconciliation--resume-kit-v030-findings-added-2026-08-04).

The two capabilities that motivated the original scope remain, and are still not wired in:

1. **Deterministic terminology alignment** — `resume_suggest_terminology` (analyze) and
   `resume_align_terminology` (apply one, truth-gated). When a resume already demonstrates a
   job's required skill but under a *different surface form* (an "alias hit" — resume says
   "k8s", the JD asks for "Kubernetes"), these tools mirror the employer's exact wording. This
   is a **truthful** surface swap for a skill the candidate genuinely has, and it lifts ATS
   keyword-match without inventing anything. A JD keyword with **no** match at all remains a
   GAP and is never rewritten in.
2. **A project alias index** — every deterministic scoring capability (`resume_check_ats`,
   `resume_check_job_match`, `resume_identify_gaps`, and both terminology tools) now accepts an
   optional `alias_file`. The engine UNIONs a project-local synonym file over its packaged seed
   lexicon, so a learned synonym is matched on the next run **deterministically, with no LLM**.
   resume-kit ships a truth-gated growth-loop skill (`manage-synonyms`) that proposes → truth-
   gates → asks the user → appends justified entries to that file, and a review-loop skill
   (`update-terminology`) that presents mirror suggestions per section for accept/skip.

The user's target apply flow is: convert the base resume to JSON for the resume tools → check
the resume against the JD → ask about missing skills → **inject missing-but-true keywords
(no-LLM, truth-gated) → check the terminology of the resume's "misses" against words that mean
the same but are not string matches → add newly-confirmed equivalents to the index** → apply the
surviving edits → export the tailored PDF. The scoring/gap/evidence/truth/rescore/export scaffold
already exists in the [[tailor-resume]] pipeline (JOBHUN-I-0013); this initiative (a) **replaces
the `align-resume` content-editing front-end with the no-LLM `inject-keywords` + `update-terminology`
edit sources**, (b) adds the terminology-mirroring step and the alias-index growth, and (c)
threads the alias file through the deterministic calls so the learned index actually counts.

Approved scope decisions (from brainstorming with Daniel + the 2026-08-04 pivot call):
- **Pivot content editing to the no-LLM path** — remove the `align-resume` dependency; drive
  edits from `inject-keywords` (missing-but-true keywords) and `update-terminology` (wording
  mirrors). The edit-classifier stops diffing an opaque rewrite and instead receives already-
  discrete typed edits from those two tools.
- **Wire into the existing flow only** — no new user-facing job-hunter skills.
- **Project-local alias file, delegate writes to resume-kit** — the index lives inside the
  job-hunter working folder; resume-kit's `manage-synonyms` skill is its only writer.
- **Extract per job (no persistent JSON cache)** — but extract once per job and reuse the
  `ResumeDocument` across every tool call in that job's pipeline.
- **Alias index lives inside the working folder** (per-working-folder learning), not a single
  shared global file.
- **Synonym growth runs only in interactive / review-after review modes** (it requires user
  confirmation); `automatic` review mode skips growth (it may still apply already-known aliases
  via scoring, since those need no confirmation).

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- **Pivot the content-editing engine off `align-resume`.** Replace Step 8 "Align" + the
  align-diff front-end of the edit-classifier with two deterministic, no-LLM edit sources:
  `inject-keywords` (surface missing-but-true keywords → `skill_add` / `bullet_add` edits) and
  `update-terminology` (mirror employer wording → `term_swap` edits). Both feed the *existing*
  freedom ladder, `review_mode` presentation, truth gate, `edit_prefs` learning, rescore gate,
  and export unchanged. Document that the no-LLM path generates a narrower edit-type set (no
  free-form `bullet_rewrite` / `entry_rewrite` / `summary_rewrite`); the ladder/schema keep those
  types for forward-compat but they are simply not produced now.
- Add a **project alias index** to the job-hunter working folder
  (`<working_dir>/resume-kit/config.json` pointer + `<working_dir>/resume-kit/learning/synonyms.json`)
  and thread its path as `alias_file` through every `alias_file`-aware deterministic resume-kit
  call in the pipeline: `check-resume-ats` (keyword-aware ATS), `check-resume-job-match`,
  `identify-resume-gaps`, and `resume_suggest_terminology` (the `update-terminology` analyze
  step). NOT `check-ats-structure` (structure-only, no alias) or the extract tools.
- Add a **terminology-mirroring step** to the [[tailor-resume]] pipeline that calls
  `update-terminology`'s tools (`resume_suggest_terminology` analyze + `resume_align_terminology`
  apply) and feeds the resulting mirrors through job-hunter's existing edit-classifier as
  `term_swap` edits — so they remain bound by the freedom ladder, `review_mode`, the truth gate,
  and `edit_prefs` learning.
- Add an **index-growth step** that, in interactive / review-after modes, dispatches a subagent
  to resume-kit's `manage-synonyms` skill with the current run's candidate `(missing keyword,
  resume term it may equal)` pairs, then re-scores with the alias file so freshly-confirmed
  synonyms lift the deterministic match on the same run.
- **Convert the base resume to JSON once per job** via the agent-driven `resume-to-json` skill
  (subagent, no provider) → `ResumeDocument`, and reuse it across match / gaps / terminology /
  inject / export for that job. Use `job-to-json` for the posting. (Not the raw `resume_extract` /
  `job_description_extract` tools — decision 2026-08-04.)
- Update the reference/contract docs (`references/resume-kit.md`,
  `references/data-contract.md`, the tailor-resume references) so the capability map, the alias-
  index state, the single-writer rule, and the terminology step are the documented source of
  truth.
- Surface terminology outcomes (term-swaps applied, synonyms grown) in the apply orchestrators'
  run summaries.
- Keep `npm run check` green and the plugin version bumped.

**Non-Goals:**
- No new user-facing job-hunter skills (no job-hunter "manage synonyms" skill — growth is
  delegated to resume-kit's existing one).
- **No job-hunter-side LLM rewrite to replace `align-resume`.** We do not vendor or reimplement
  content generation; we consume resume-kit's no-LLM `inject-keywords` + `update-terminology`.
  Free-form bullet/summary rewriting is out of scope until/unless resume-kit re-surfaces an
  auto-rewrite path (a future initiative).
- No changes to the freedom ladder edit-type *taxonomy/schema*, the review-mode semantics, the
  truth invariant, or the single-status-writer / rotation contracts. (The freedom ladder keeps
  all edit types; the no-LLM path merely produces a subset of them.)
- No persistent resume-JSON cache (extract per job by decision).
- No reimplementation of terminology or synonym logic inside job-hunter — job-hunter calls the
  resume-kit tools/skills; it does not vendor their behavior.
- No changes to search, email-status, or non-tailoring apply behavior.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: The tailoring pipeline MUST maintain a project alias index in the working folder
    at `<working_dir>/resume-kit/learning/synonyms.json`, with a `<working_dir>/resume-kit/config.json`
    whose `alias_file` key points at it. job-hunter MUST create the valid empty shell
    (`{"version":1,"aliases":{},"justifications":{}}`) + config pointer if absent; it MUST NOT
    otherwise write `synonyms.json`.
  - REQ-002: Every `alias_file`-aware deterministic call in the pipeline MUST pass `alias_file`
    = the project index path, so learned synonyms are honored: `check-resume-ats` (keyword-aware
    ATS), `check-resume-job-match`, `identify-resume-gaps`, and `resume_suggest_terminology`
    (the `update-terminology` analyze step). `check-ats-structure` (structure-only) and the
    extract tools take no `alias_file` and MUST NOT be passed one.
  - REQ-002b: The pipeline MUST NOT depend on `align-resume` / `resume_align`. Content edits are
    produced by `inject-keywords` (missing-but-true keywords → `skill_add` / `bullet_add`) and
    `update-terminology` (wording mirrors → `term_swap`), each emitted as discrete typed edits
    that enter the existing edit-classifier directly (no opaque-rewrite diffing). The
    `PROVIDER_NOT_CONFIGURED` degrade path for the align step is removed; the whole content path
    is now no-LLM.
  - REQ-003: The pipeline MUST run a terminology-mirroring step that calls
    `resume_suggest_terminology` then applies accepted mirrors via `resume_align_terminology`,
    with each mirror classified as a `term_swap` edit and subjected to the existing freedom
    ceiling, `review_mode` presentation, truth gate, and `edit_prefs` learning. `term_swap`
    edits above the freedom ceiling MUST be dropped; the truth gate is the backstop regardless
    of acceptance.
  - REQ-004: The pipeline MUST run an index-growth step ONLY in `interactive` / `review-after`
    review modes: dispatch a subagent to resume-kit's `manage-synonyms` skill with the
    candidate `(missing keyword, resume term)` pairs; append happens only on explicit user
    confirmation inside that skill. In `automatic` review mode this step MUST be skipped. After
    a growth step confirms new aliases, the pipeline MUST re-score match/gaps with the alias
    file so the new synonyms count on the same run.
  - REQ-005: Terminology mirroring MUST NEVER turn an absent skill into a claimed one — a JD
    keyword with no match is a gap and is surfaced via `identify-resume-gaps`, never rewritten
    in. Synonym growth MUST be truth-gated (delegated to `manage-synonyms`, which enforces
    this) and MUST never alias distinct skills (React ≉ Vue) or broaden scope.
  - REQ-006: The base resume MUST be converted to a `ResumeDocument` once per job via the
    agent-driven `resume-to-json` skill (best dispatched as a subagent), NOT the raw
    `resume_extract` tool, and the result reused across the job's subsequent tool calls rather
    than re-converted per call. (Decision 2026-08-04: prefer the agent-driven, no-provider skill
    over the raw extract tool, consistent with the no-LLM pivot; likewise use `job-to-json` for
    the job posting.)
  - REQ-007: `resume_export` returns artifact bytes (base64 over MCP); the pipeline MUST decode
    and write them to `<working_dir>/resume/tailored/<job-id>.<ext>` as today. No behavior
    change to the tailored-output location or the envelope.
  - REQ-008: The apply orchestrators' run summaries MUST report per-job terminology outcomes
    (term-swaps applied and any synonyms grown), alongside the existing tailoring outcome.
  - REQ-009: The pipeline MUST run a keyword-injection step (`inject-keywords`) that, from the
    injectable gaps (Step 5) and the confirmed `skills` (Step 6 vetting), emits `skill_add` /
    `bullet_add` edits for keywords the candidate genuinely has. Each emitted edit is subject to
    the same freedom ceiling, `review_mode`, truth gate, and `edit_prefs` learning as any other
    edit. A keyword the user has not confirmed (unknown/disclaimed skill) is never injected;
    a non-injectable gap is surfaced, never fabricated. `inject-keywords` is agent-driven (no
    MCP tool) and is best dispatched as a subagent per resume-kit's guidance.
- **Non-Functional Requirements:**
  - NFR-001: No terminology/synonym logic is duplicated in job-hunter — it calls resume-kit
    tools (`suggest`/`align` terminology) and delegates index writes to resume-kit's
    `manage-synonyms` skill.
  - NFR-002: Defensive posture is preserved — a terminology or growth failure for one job
    degrades to skipping that step (attach the base or the align-only tailoring) with a noted
    reason; it never aborts the run and never fabricates.
  - NFR-003: Where this initiative and a schema disagree, the schema wins; `resume-prefs.json`
    stays valid and `term_swap` remains a recognized `edit_prefs` edit type (verify the enum;
    add it only if genuinely missing, following the schema-change rules).
  - NFR-004: `npm run check` stays green; every edited skill validates; the plugin version is
    bumped.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Resume already has the skill under a different name
- **Actor:** the job seeker running `apply-to-jobs` / `interactive-apply` with tailoring on.
- **Scenario:** the JD requires "Kubernetes"; the resume says "k8s". `check-resume-job-match`
  reports it as an alias hit; the terminology step proposes mirroring "k8s" → "Kubernetes".
  In interactive mode the user accepts; the swap is truth-gated and applied as a `term_swap`.
- **Expected Outcome:** the tailored resume mirrors the employer's exact wording, the keyword-
  match delta is reported, nothing untrue is added, and the base variant id is still what
  `record-application` records.

### Use Case 2: A genuine synonym the seed lexicon didn't know
- **Actor:** the job seeker in interactive / review-after mode.
- **Scenario:** the JD asks for "NetSuite"; the resume shows "SuiteCommerce" work that is the
  same platform capability. `identify-resume-gaps` marks "NetSuite" missing. The growth step
  dispatches `manage-synonyms`, which proposes the alias, truth-gates it, and asks the user;
  on "yes" it appends `{"NetSuite": ["SuiteCommerce"]}` to the project index.
- **Expected Outcome:** the re-scored match now counts NetSuite; the synonym persists for
  future runs in this working folder; the user confirmed it; nothing was grown silently.

### Use Case 3: Automatic run — no confirmation opportunity
- **Actor:** the job seeker running `apply-to-jobs` in an automated run with tailoring review
  mode `automatic`.
- **Scenario:** terminology mirrors are still applied if their `term_swap` type is within the
  freedom ceiling and learned as high-acceptance (truth-gated regardless); the growth step is
  **skipped** because it needs confirmation.
- **Expected Outcome:** known aliases lift the score and known-good mirrors apply unattended;
  no unconfirmed synonym is ever written; the run never pauses for terminology.

### Use Case 4: A real gap, not a terminology miss
- **Actor:** the job seeker.
- **Scenario:** the JD requires "Terraform"; neither the resume nor the master shows any IaC
  experience. `suggest-terminology` produces no mirror (no alias hit); `manage-synonyms`
  proposes nothing (nothing plausibly matches).
- **Expected Outcome:** "Terraform" stays a surfaced, non-injectable gap; it is never aliased
  or rewritten in; the truth invariant holds.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
The change is additive and localized to the tailoring subsystem. job-hunter continues to own
orchestration, review modes, the freedom ladder, and learning; resume-kit owns scoring,
terminology, and synonym-index writes. The integration seam is: (a) a project `alias_file`
threaded through resume-kit's deterministic scoring surface, (b) two new pipeline steps that
call resume-kit (terminology tools directly; `manage-synonyms` via subagent), and (c) the
existing edit-classifier absorbing `term_swap` edits.

### Sequence Diagrams
Per job, within [[tailor-resume]]: extract-once → ATS-fix (unchanged) → match-gate (alias_file)
→ identify-gaps (alias_file) → skills-vetting (unchanged) → build-evidence → **grow-index**
(interactive/review only: manage-synonyms subagent → re-score with alias_file) → **inject-keywords**
(missing-but-true → `skill_add`/`bullet_add` edits) → **mirror-wording** (`resume_suggest_terminology`
→ `term_swap` edits → `resume_align_terminology` per accepted) → classify/gate-by-freedom/order-by-
learning → truth-check → apply → rescore → rescore-gate → export → learn.

The key structural change vs. I-0013: the old **Step 8 (align-resume) → Step 9 (diff the opaque
rewrite)** pair is deleted. `inject-keywords` and `update-terminology` now emit *already-discrete
typed edits*, so the edit-classifier's role shifts from "diff aligned-vs-base" to "receive typed
edits and apply the freedom/learning/truth rules to them." Everything from truth-check onward
(Steps 10–14 in I-0013) is unchanged.

### Deployment Diagrams
No infra. New on-disk state is confined to `<working_dir>/resume-kit/` inside the user's
working folder. resume-kit remains an external plugin dependency detected via its MCP namespace
(`references/resume-kit.md`), unchanged by this initiative.

## Detailed Design **[REQUIRED]**

**Alias index bootstrap.** The [[tailor-resume]] worker (and, defensively, the apply
orchestrators' tailoring gate) ensures `<working_dir>/resume-kit/config.json` exists with
`{"alias_file": "learning/synonyms.json", ...}` and that `learning/synonyms.json` exists as the
valid empty shell. job-hunter writes ONLY the shell + pointer; all subsequent appends are
resume-kit's `manage-synonyms` (single-writer). This is documented in
`references/data-contract.md` (new "resume-kit alias index" state) and
`references/resume-kit.md` (new "Project alias index" section).

**resume-kit.md capability map.** Add rows for `suggest-terminology` /
`resume_suggest_terminology` and `align-terminology` / `resume_align_terminology`; add a
"Delegable resume-kit skills" note for `manage-synonyms` and `align-terminology` (run in a
subagent); document that every deterministic scoring tool takes `alias_file`; note
`resume_export` returns base64 bytes to decode + write.

**tailoring-pipeline.md changes.** This is the largest doc change and defines the new pipeline.
- Add "Step 2b — extract once" (the ResumeDocument reused across the job).
- Thread `alias_file` on the scoring calls (match, keyword-ATS, identify-gaps, suggest-terminology).
- **Delete Step 8 (Align / `align-resume`) and rewrite Step 9** so the classifier no longer diffs
  an opaque rewrite. Remove the `PROVIDER_NOT_CONFIGURED` align degrade branch.
- **New Step 6a — grow the project index (interactive / review-after only).** Collect candidate
  `(missing keyword, resume term)` pairs from the gaps/match output; dispatch `manage-synonyms`
  in a subagent with those candidates + the `resume-kit/config.json` path; on confirmed appends,
  re-run `check-resume-job-match` / `identify-resume-gaps` with `alias_file` so new synonyms
  count. Skipped entirely in `automatic` mode.
- **New Step 8a — inject missing-but-true keywords.** Dispatch `inject-keywords` (subagent) with
  the injectable gaps and the confirmed `skills`; it emits `skill_add` / `bullet_add` edits for
  keywords the candidate genuinely has. Never injects unknown/disclaimed skills.
- **New Step 8b — mirror employer wording.** Call `resume_suggest_terminology` (with `alias_file`);
  each suggestion is a `term_swap` edit; for each surviving accepted mirror call
  `resume_align_terminology` (truth-gated by the engine regardless). Applied swaps join
  `changes_applied` as `{ "type": "term_swap", "detail": "k8s → Kubernetes" }`.
- Steps 8a/8b both feed **Step 9 (classify/gate-by-freedom/order-by-learning)** as discrete typed
  edits; the truth check (Step 10), apply+rescore (Step 11), rescore gate (Step 12), export
  (Step 13), and learning (Step 14) are unchanged.

**edit-classifier.md.** Rewrite the "Input to the classifier" + "Diffing aligned vs. base"
sections: the classifier no longer diffs `align-resume`'s `aligned_resume`. It now receives
**already-typed edits** from `inject-keywords` (`skill_add` / `bullet_add`) and
`update-terminology` (`term_swap`), and applies the same freedom-ceiling / learned-ordering /
truth rules to them. Note the reduced generated edit-set (no `bullet_rewrite` / `entry_rewrite` /
`summary_rewrite` / free-form `reorder` without an LLM rewrite) while the schema/ladder retain
all types for forward-compat.

**Orchestrators.** `apply-to-jobs` and `interactive-apply` need only summary changes — report
term-swaps applied and synonyms grown per job — plus ensuring the tailoring gate bootstraps the
alias index. No change to run-mode composition, submit gates, or rotation.

## Alternatives Considered **[REQUIRED]**

- **Keep depending on `align-resume` (treat it as callable-if-provider-configured).** The
  `resume_align` MCP tool still exists; only the skill is unsurfaced. Rejected (Daniel, 2026-08-04)
  — building on a path resume-kit explicitly disabled invites silent breakage and contradicts the
  plugin's stated no-LLM truthful-tailoring direction. We pivot to the supported path.
- **Spin the align replacement into a separate initiative, keep this one to terminology only.**
  Rejected — the terminology step and the align removal both live in the same pipeline steps
  (8/9); splitting them would force two passes over the same files and leave the pipeline
  referencing a dead `align-resume` step in between. One coherent pivot is cleaner.
- **Build a job-hunter-side LLM rewrite to replace `align-resume`.** Rejected — out of scope and
  against the "don't vendor resume-kit behavior" principle; `inject-keywords` + `update-terminology`
  cover truthful tailoring with no provider. Free-form rewriting can return as a future initiative
  if resume-kit re-surfaces an auto-rewrite path.
- **Delegate terminology mirroring wholesale to resume-kit's `update-terminology` skill (its own
  accept/skip loop).** Rejected for the mirroring edits: job-hunter's freedom ladder,
  `review_mode`, and `edit_prefs` learning are load-bearing invariants, and `update-terminology`'s
  standalone loop would bypass them (and its "default skip" clashes with automatic mode). We use
  the underlying MCP tools and route mirrors through job-hunter's classifier instead. We DO
  delegate index *writes* to `manage-synonyms` (its truth-gate + prunable-file conventions are
  the right home, and it matches the approved "delegate writes" decision).
- **A single shared global alias index across all working folders.** Rejected per the approved
  decision — per-working-folder learning keeps a working folder's synonyms scoped to its
  resumes/domain and avoids cross-contaminating unrelated job hunts. (A future initiative could
  add an opt-in shared file.)
- **Persistently cache the extracted resume JSON per variant.** Rejected per the approved
  "extract per job" decision — avoids a new cache-invalidation surface (base edits, ATS-fix
  replacement). We still extract once per job and reuse within the job for efficiency.
- **Grow synonyms in automatic mode too.** Rejected — appends require truthful human
  confirmation; growing unattended would either fabricate or stall an unattended run. Automatic
  mode still benefits from already-known aliases via `alias_file` scoring.
- **Add a job-hunter "manage synonyms" skill.** Rejected — out of the approved scope; resume-kit
  already ships the growth loop, and duplicating it would drift.

## Plugin-reality reconciliation — resume-kit v0.3.0 findings **[ADDED 2026-08-04]**

After inspecting the actually-installed plugin (`resume-intelligence` v0.3.0), several
premises in this initiative and in `references/resume-kit.md` needed correction. The
capability map in `references/resume-kit.md` has been updated to match reality. Open
items for this initiative:

1. **`align-resume` (`resume_align`) is DISABLED / not surfaced in v0.3.0.** This is the
   biggest divergence. The current [[tailor-resume]] pipeline (I-0013) is built *around*
   `align-resume` as its central LLM rewrite step (SKILL.md Step 8 "Align"; the
   edit-classifier diffs `align-resume`'s `aligned_resume` into typed edits). resume-kit
   now steers truthful tailoring through the **no-LLM** `inject-keywords` +
   `update-terminology` path. → **Requires a directional decision** (see below) before
   this initiative's pipeline changes are valid. This initiative's own sequence still
   lists an "align" step, which must be revised.
2. **Skill/tool name corrections.** Reality vs. this doc's earlier names:
   - ATS: two distinct tools — `check-ats-structure` / `resume_check_ats_structure`
     (structure-only, **no** `alias_file`) and `check-resume-ats` / `resume_check_ats`
     (keyword-aware, **takes** `alias_file`). REQ-002's "check-resume-ats … MUST pass
     alias_file" applies only to the keyword-aware tool, not structure.
   - Terminology is one skill, `update-terminology`, wrapping both MCP tools
     (`resume_suggest_terminology` analyze / `resume_align_terminology` apply). There is
     no separate `suggest-terminology` / `align-terminology` skill; this initiative's
     references to those as skills should read `update-terminology`.
   - `alias_file` is honored by: `resume_check_ats`, `resume_check_job_match`,
     `resume_identify_gaps`, and `resume_suggest_terminology` (analyze). NOT by
     `resume_check_ats_structure` or the extract tools.
3. **New capability not yet reflected in scope: `inject-keywords`** (truth-gated,
   agent-driven surfacing of missing-but-true keywords, no MCP tool). With `align-resume`
   gone, `inject-keywords` is resume-kit's intended path for adding a genuinely-held
   keyword the resume was missing — a role the pipeline previously delegated to
   `align-resume`. May need its own pipeline step / edit type alongside `term_swap`.
4. **Extract tools** (`resume_extract`, `job_description_extract`) remain callable but are
   no longer surfaced as skills; resume-kit prefers agent-driven `resume-to-json` /
   `job-to-json`. **Resolved (2026-08-04): use the agent-driven `resume-to-json` / `job-to-json`
   skills, NOT the raw extract tools** — consistent with the no-LLM pivot (no provider needed).
   REQ-006 updated accordingly.

## Implementation Plan **[REQUIRED]**

Human-in-the-loop: task decomposition pending Daniel's approval of THIS revised (post-pivot)
design. Revised decomposition — **6 tasks** (the pivot enlarges the pipeline/SKILL work enough to
split the design docs from the align-removal). Each task carries a Recommended Agent per the
model+effort rubric:

1. **Docs/contract foundation.** Update `references/resume-kit.md` — already done in-session for
   the capability map + alias-index section; this task finishes it (delegable-skills note,
   export-bytes note) and updates `references/data-contract.md` (the `<working_dir>/resume-kit/`
   alias-index state + single-writer rule). *Recommended Agent: opus + medium* — load-bearing
   reference substrate every downstream task cites.
2. **Pipeline design docs — the pivot.** Rewrite `skills/tailor-resume/references/tailoring-pipeline.md`:
   extract-once, alias_file threading, **delete Step 8 align + rewrite Step 9**, add Step 6a
   grow-index, Step 8a inject-keywords, Step 8b mirror-wording, and remove the align degrade
   branch. Rewrite `edit-classifier.md` input/diff sections for typed-edits-from-tools (drop the
   opaque-rewrite framing) and note the reduced generated edit-set.
   *Recommended Agent: opus + high* — this defines the new pipeline behavior downstream wiring must
   match exactly, and getting the align-removal right is load-bearing.
3. **tailor-resume SKILL wiring.** Update `skills/tailor-resume/SKILL.md` procedure + the
   files-read/writes + call-contract notes: remove the `align-resume` step, add extract-once, the
   alias index, and the grow-index / inject-keywords / mirror-wording steps; scrub the SKILL's
   `align-resume` references (SKILL.md:26, :165). Verify `term_swap` / `skill_add` / `bullet_add`
   in the resume-prefs schema (add per schema-change rules only if missing).
   *Recommended Agent: opus + high* — integrates the new no-LLM engine into the worker under
   existing invariants; upgraded from medium because it now carries the align-removal.
4. **Purge lingering `align-resume` references + degrade rules.** Sweep `degree-of-freedom.md`,
   `tailoring-pipeline.md` degrade section, and any other reference for `align-resume` /
   `resume_align` / `PROVIDER_NOT_CONFIGURED`-on-align wording so no doc still implies an align
   step exists. *Recommended Agent: sonnet + medium* — mechanical sweep, but must be exhaustive.
5. **Orchestrator summaries + alias-index bootstrap.** Update `apply-to-jobs` and
   `interactive-apply` to bootstrap the alias index in the tailoring gate and surface
   terminology + injection outcomes in run summaries; update their read/write file lists.
   *Recommended Agent: sonnet + medium* — mechanical, follows the pipeline design.
6. **Docs, version bump, validation.** Update `README.md`, `AGENTS.md`, bump the plugin version,
   run `npm run check` green. *Recommended Agent: sonnet + medium* — mechanical closeout.

`blocked_by`: none (builds on completed I-0011 … I-0014).