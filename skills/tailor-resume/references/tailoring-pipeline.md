# Tailoring pipeline

This reference defines the ordered pipeline the [`tailor-resume`](../SKILL.md)
worker runs for one `{ resume variant, job }` pair: the sequence of resume-kit
capabilities, the score gates, the once-per-variant structural fix, the
skills-vetting question flow, the review modes, the best-effort fallback, and the
defensive/degrade rules.

All resume-kit capability names (`resume-to-json`, `job-to-json`,
`check-ats-structure`, `check-resume-ats`, `check-resume-job-match`,
`identify-resume-gaps`, `build-candidate-evidence`, `inject-keywords`,
`update-terminology`, `manage-synonyms`, `validate-resume-truth`, `export-resume`,
and the rest) are cited
from [`../../../references/resume-kit.md`](../../../references/resume-kit.md) and
its [capability map](../../../references/resume-kit.md#capability-map); they are
not restated here. The freedom ceiling comes from
[`degree-of-freedom.md`](./degree-of-freedom.md); the diff-to-typed-edit mechanics
and tally rules come from [`edit-classifier.md`](./edit-classifier.md). State
shapes come from
[`../../../references/data-contract.md`](../../../references/data-contract.md) and
the [schemas](../../../schemas/); where this document and a schema disagree, the
schema wins.

## Call contract

The worker is invoked with
`{ working_dir, resume_variant_id, job, freedom (0–10), review_mode }` and returns
the envelope defined in the [SKILL.md](../SKILL.md#call-contract). This reference
describes what happens between those two.

## The ordered pipeline

Run these steps in order. Any step may short-circuit to a terminal outcome as
noted; a resume-kit error degrades per
[Defensive / degrade rules](#defensive--degrade-rules). The content path is
no-LLM end to end (no `align-resume`).

### Step 1 — Resume-kit gate

Probe the resume-kit dependency per
[`resume-kit.md` detection](../../../references/resume-kit.md#detection). If it is
absent, emit the exact
[guided-install hand-off](../../../references/resume-kit.md#guided-install--stop)
and stop with no partial state. This is a **blocking** gate (REQ-002).

### Step 2 — Resolve the base variant file

Resolve the working folder from `config.json` and locate the base resume file for
`resume_variant_id` under `<working_dir>/resume/`. This variant id is what the
worker returns as `resume_used` (rotation-consistent for the caller), even when a
tailored file is produced.

### Step 2b — Convert once per job

Convert the base resume to a `ResumeDocument` JSON **once per job** by dispatching
the agent-driven `resume-to-json` skill as a subagent (not the raw `resume_extract`
tool — no LLM provider is required), and convert the job posting to a
`JobDescription` JSON via `job-to-json`. Reuse both across every subsequent call in
this job's pipeline (match, gaps, terminology, inject, export), rather than
re-converting per call (REQ-006). The whole content path from here is **no-LLM**.

Also ensure the project alias index exists before the alias-aware calls run:
`<working_dir>/resume-kit/config.json` (with `alias_file` → `learning/synonyms.json`)
and the empty-shell `<working_dir>/resume-kit/learning/synonyms.json`
(`{"version":1,"aliases":{},"justifications":{}}`) are created if absent. job-hunter
writes ONLY the shell + pointer; `manage-synonyms` is the sole content writer
(REQ-001; see [`data-contract.md`](../../../references/data-contract.md#resume-kit-alias-index)).
`<alias_file>` below refers to this resolved path.

### Step 3 — Once-per-variant structural fix

If `resume-prefs.json.variants[<resume_variant_id>].ats_fixed` is already `true`,
skip this step entirely (REQ-003). Otherwise, run it at most once for this variant:

1. Using the Step 2b `ResumeDocument`, run `check-ats-structure` for structural
   document issues (parse/format problems that hurt ATS legibility). This is a
   structure-only, job-independent check and takes **no** `alias_file`.
2. If structural issues exist, produce a corrected artifact via `export-resume`
   and **show the user** the proposed structural fix.
3. Replace the **base variant** only with explicit user confirmation, via the
   [`update-resumes`](../../update-resumes/SKILL.md) skill (the single writer of
   base variant files). Without confirmation, do not replace the base; proceed
   with the unfixed base.
4. On a confirmed replace, retest with `check-ats-structure`, then set
   `variants[<resume_variant_id>].ats_fixed = true` in `resume-prefs.json` so this
   never runs again for that variant.

If there are no structural issues, still set `ats_fixed = true` (the one-time check
is done). At freedom 0 this structural step may still run (it is not a content
edit), but no content edits follow.

### Step 4 — Match-gate (skip if already strong)

Run `check-resume-job-match` (with `alias_file = <alias_file>`, REQ-002) on the base
resume against the job to get an `0–100`
score; this is `original_score`. If `original_score >= 90`, **skip tailoring** and
return `skipped-strong` with `resume_used = resume_variant_id`, no `tailored_path`,
`final_score = original_score`, empty `changes_applied`, and no user interaction
(REQ-004, REQ-010). Otherwise continue.

At freedom 0, return without proposing edits (resolve to base) — record the
`original_score`; outcome is `skipped-strong` when `>= 90`, otherwise a declined /
no-edit return with `resume_used` = base and no tailored file.

### Step 5 — Identify gaps

Run `identify-resume-gaps` (with `alias_file = <alias_file>`, REQ-002) with the base
as the tailored input, the master resume
as the full source, and the job. It returns injectable keyword gaps (candidates to
add) and non-injectable gaps (things genuinely missing that must not be
fabricated).

### Step 6 — Vet injectable keywords

For each injectable keyword that implies a **skill**, check it against
`resume-prefs.json.skills` and `disclaimed_skills` (REQ-005):

- Already in `skills` → claimable; it may be injected (subject to the ladder).
- Already in `disclaimed_skills` → never inject it and never ask again.
- Unknown (in neither list) → ask the user plainly: **"Do you have <X>
  experience?"**
  - **yes** → append `<X>` to `skills`; it becomes claimable.
  - **no** → append `<X>` to `disclaimed_skills`; it is never injected and never
    re-asked.

Keywords the user has not confirmed as skills are never injected. This vetting is
the only user interaction the worker performs that is independent of review mode —
it protects the "never claim an unconfirmed skill" invariant.

### Step 6a — Grow the project alias index (interactive / review-after only)

Runs **only** in `interactive` / `review-after` review modes; **skipped entirely in
`automatic`** (it needs user confirmation) (REQ-004). Collect the candidate
`(missing keyword, resume term it may equal)` pairs from the Step 4/5 match and gap
output, then **dispatch a subagent to resume-kit's `manage-synonyms` skill** with
those candidates and the `<working_dir>/resume-kit/config.json` path.
`manage-synonyms` proposes → truth-gates → asks the user → appends only
user-confirmed, justified entries to `learning/synonyms.json` (it is the single
writer; see [`resume-kit.md`](../../../references/resume-kit.md#terminology-mirroring--the-alias-index)).

If any synonym was confirmed and appended, **re-run `check-resume-job-match` and
`identify-resume-gaps` with `alias_file = <alias_file>`** so the freshly-confirmed
synonyms lift the deterministic match and shrink the gap set on this same run. If no
synonym is confirmed (or the user declines), continue with the existing scores. This
step never fabricates: distinct skills are never aliased and scope is never broadened
(REQ-005) — `manage-synonyms` enforces that.

### Step 7 — Build candidate evidence

Run `build-candidate-evidence` from the **master resume plus the confirmed
`skills`** to produce the evidence records that the keyword-injection step (8a) and
the truth check (Step 10) are constrained by. Disclaimed skills are not evidence.

### Step 8a — Inject missing-but-true keywords

Dispatch resume-kit's `inject-keywords` skill as a subagent with the injectable gaps
(Step 5, possibly re-scored in Step 6a) and the confirmed `skills` (Step 6), plus the
Step 7 evidence. It emits discrete typed edits — `skill_add` (add a confirmed skill
to the skills list) and `bullet_add` (weave a genuinely-held keyword into an existing
bullet) — for keywords the candidate genuinely has (REQ-009). It **never** injects an
unknown or disclaimed skill, and a non-injectable gap is left surfaced, never
fabricated (REQ-005). These edits are candidates only; they are governed by Step 9.

### Step 8b — Mirror employer wording

Call `resume_suggest_terminology` (with `alias_file = <alias_file>`) via resume-kit's
`update-terminology` capability. Each suggestion is an alias hit — a JD keyword the
resume already satisfies under a different surface form — and becomes a `term_swap`
candidate edit (`k8s → Kubernetes`) (REQ-003). For each `term_swap` that survives
Step 9 gating and is accepted, apply it with `resume_align_terminology` (the engine
truth-gates the swap regardless of acceptance). A JD keyword with **no** match is a
gap (Step 5), never a mirror — it is never rewritten in (REQ-005). Applied swaps join
`changes_applied` as `{ "type": "term_swap", "detail": "k8s → Kubernetes" }`.

### Step 9 — Classify, gate by freedom, order/auto-apply by prefs

Steps 8a and 8b emit **already-typed** candidate edits (`skill_add`, `bullet_add`,
`term_swap`); the classifier no longer diffs an opaque rewrite (see
[`edit-classifier.md`](./edit-classifier.md)). Take the union of those candidate
edits and, in order:

1. **Drop** every edit above the freedom ceiling
   ([`degree-of-freedom.md`](./degree-of-freedom.md)) and every edit violating an
   invariant (fabrication, unconfirmed/disclaimed skill, new employment entry).
2. **Order** the survivors and decide auto-apply vs. defer using the learned
   `edit_prefs` tallies and the `review_mode`, per
   [`edit-classifier.md`](./edit-classifier.md#learned-preference-ordering-and-auto-applydefer).

### Step 10 — Truth check

Run `validate-resume-truth` on every candidate edit against the Step 7 evidence
(REQ-007). Drop any edit reported unsupported or contradicted — it is never
shipped, regardless of freedom or acceptance history. An `accept-with-edits`
result from review is re-validated the same way before it ships.

### Step 11 — Apply and rescore

Apply the surviving, permitted, truth-passing edits to the base to build the
tailored resume, then rerun `check-resume-job-match` (with `alias_file = <alias_file>`)
on the tailored result to get `final_score` (REQ-008).

### Step 12 — Rescore gate

- `final_score >= 80` **AND** `final_score > original_score` → `tailored-pass`.
- Otherwise → `tailored-best-effort`: **ask the user** whether to use the tailored
  resume anyway or fall back to the base. The worker never silently ships a
  sub-target tailoring. See [Best-effort fallback](#best-effort-fallback).

### Step 13 — Export

Write the tailored resume via `export-resume` to
`<working_dir>/resume/tailored/<job-id>.<ext>` (REQ-011). This is the only tailored
output location. The worker never writes `jobs.json` / `jobs.md`.

### Step 14 — Learning updates and return

Persist learning to `resume-prefs.json`: the `edit_prefs` tally updates from any
human decisions (per
[`edit-classifier.md`](./edit-classifier.md#mapping-a-decision-to-a-tally-update)),
plus any `skills` / `disclaimed_skills` / `variants[...].ats_fixed` changes made
earlier. Then return the envelope with `learning_updated` reflecting what changed.

## Score gates (summary)

- **Pre-tailor:** `original_score >= 90` ⇒ `skipped-strong` (Step 4).
- **Post-tailor:** `final_score >= 80` AND `> original_score` ⇒ `tailored-pass`;
  else `tailored-best-effort` (Step 12).

## Best-effort fallback

When the rescore gate is not met, the outcome is `tailored-best-effort`:

- In an **interactive** or **review-after** review mode, ask the user whether to
  use the tailored resume (returning `tailored_path` to it) or fall back to the
  base (no `tailored_path`; `resume_used` is the base variant).
- In **automatic** review mode there is no one to ask, so **fall back to the base**
  — return `tailored-best-effort` with no `tailored_path` and the base as
  `resume_used`. Automatic mode never silently ships a sub-target resume.

Either way, `final_score` records the tailored score reached, so the caller sees
how close it got.

## Review modes

The `review_mode` is the worker's own and is **independent of the caller's apply
run mode** — the worker never submits and never consults the run mode (REQ-010).

- **interactive** — present permitted, truth-passing changes one at a time for
  accept / accept-with-edits / reject (see
  [`edit-classifier.md`](./edit-classifier.md#presenting-a-change-in-each-review-mode)).
- **review-after** — auto-apply the permitted, truth-passing, high-acceptance
  changes, then one final diff pass.
- **automatic** — apply permitted, truth-passing, high-acceptance changes
  unattended within all bounds; defer poor-acceptance types; fall back to base if
  the rescore gate is not met.

**No edits ⇒ no pause (REQ-010).** `interactive` and `review-after` surface a pause
**only** when there is at least one permitted, truth-passing change to present. A
`skipped-strong` result (Step 4) and an empty post-gating edit set both return with
**no** user interaction. The skills-vetting question in Step 6 is the sole
mode-independent interaction, and it only fires when an injectable keyword implies
an unknown skill.

## Defensive / degrade rules

The worker is defensive; it never fabricates a resume to recover from a failure:

- **resume-kit dependency absent** → guided-install hand-off and stop (Step 1).
- **A resume-kit call errors** (any deterministic capability fails unexpectedly) →
  report the failure clearly and fall back to using the **base resume as-is** for
  this job (no tailored file, `resume_used` = base); never ship a partial or
  guessed tailoring.
- **A terminology or index-growth step fails for one job** → skip that step with a
  noted reason (attach the base, or ship the inject-only tailoring) and continue;
  never abort the run and never fabricate (NFR-002).
- **The content path is fully no-LLM.** There is no `align-resume` step and no
  `PROVIDER_NOT_CONFIGURED` degrade branch: `resume-to-json` / `job-to-json`,
  scoring, gaps, evidence, inject-keywords, terminology, truth, and export all run
  without a provider. If a future LLM path is reintroduced, its degrade rule would
  be added here.
- **Any user-facing ask is declined / the user stops** → return with the base as
  `resume_used` and no tailored file; record whatever learning was legitimately
  gathered.

## Files this reference governs

- **Reads:** `<working_dir>/config.json` (discovery), `<working_dir>/resume/` (the
  base variant), `<working_dir>/resume-prefs.json` (skills, disclaimed, variant
  flags, tallies), `<working_dir>/resume-kit/config.json` +
  `<working_dir>/resume-kit/learning/synonyms.json` (the project alias index, as
  `alias_file`), `<working_dir>/job-focus.md` (advisory), the job object passed
  in, and the resume-kit capabilities.
- **Writes:** `<working_dir>/resume-prefs.json` (skills / disclaimed_skills /
  `variants[...].ats_fixed` / `edit_prefs`),
  `<working_dir>/resume/tailored/<job-id>.<ext>`, and — only to bootstrap them if
  absent — the empty-shell `<working_dir>/resume-kit/learning/synonyms.json` +
  `resume-kit/config.json` pointer (never its content; `manage-synonyms` is the
  sole content writer); and — only on a confirmed structural replace — the base
  variant via [`update-resumes`](../../update-resumes/SKILL.md).
- **Never writes:** `jobs.json` / `jobs.md` (REQ-011), and no `config.json` writes
  (the rotation pointer stays the caller's concern).
