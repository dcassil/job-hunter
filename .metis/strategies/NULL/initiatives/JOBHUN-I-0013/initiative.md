---
id: tailor-resume-worker-skill-ats-fix
level: initiative
title: "tailor-resume worker skill (ATS fix, match-gate, evidence-constrained align, review modes, learning)"
short_code: "JOBHUN-I-0013"
created_at: 2026-08-04T18:00:14.078274+00:00
updated_at: 2026-08-04T18:54:43.228688+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0011, JOBHUN-I-0012]
archived: false

tags:
  - "#initiative"
  - "#phase/active"


exit_criteria_met: false
estimated_complexity: L
strategy_id: NULL
initiative_id: tailor-resume-worker-skill-ats-fix
---

# tailor-resume worker skill Initiative

## Context **[REQUIRED]**

This is the heart of the feature. Today the apply skills attach a rotation-selected resume
as-is; nothing tailors it to the specific job. We are adding a new **worker skill**,
`tailor-resume`, invoked one-job-at-a-time by the apply orchestrators (wiring is
JOBHUN-I-0014), that turns resume-kit's capabilities into a controlled, truthful,
learning tailoring pipeline.

The skill must honor job-hunter's existing invariants — human-in-control, never fabricate,
schema-exact writes — and add resume-specific ones: it never claims a skill the user has not
confirmed, every shipped change survives `validate-resume-truth`, and the user's chosen
**degree of freedom (0–10)** and **review mode** (interactive / review-after / automatic)
strictly bound what it does. It reads and updates the learning substrate from JOBHUN-I-0012
and depends on the resume-kit gate from JOBHUN-I-0011.

It is a *worker*: it does not open the browser, does not submit, and never writes
`jobs.json`. It returns to its caller either "resume already strong — use base as-is" or a
path to a tailored resume file (plus the record of what changed and the updated learning
state).

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Add `skills/tailor-resume/SKILL.md`: a non-interactive-by-default worker (interactivity is
  governed by the review mode passed in) that, for one `{resume variant, job}` pair, runs the
  approved pipeline and returns a result envelope.
- Implement the **degree-of-freedom ladder (0–10)** as a mapping from the freedom number to
  the permitted subset of the JOBHUN-I-0012 edit-type enum (cumulative), with hard
  invariants at every level (no fabrication, no unvetted skills, must pass truth validation).
- Implement the **three review modes**: interactive (approve each edit), review-after (apply
  permitted edits, one final diff pass), automatic (apply unattended within all bounds, ship
  only if it hits target else fall back to base).
- Implement the **match-score gates** (resume-kit 0–100 job-match score): already `>= 90`
  ⇒ skip tailoring (strong match); after tailoring require `>= 80` AND strictly greater than
  the original to declare a strong pass, else report best-effort and ask.
- Implement the **once-per-variant structural fix**: on first use of a variant, run
  extract/ATS checks; if structural doc issues exist, fix once via `export-resume`, show the
  user, and only replace the base variant (through `update-resumes`) with explicit
  confirmation; record `ats_fixed` in `resume-prefs.json`.
- Implement **skills vetting**: gap-analysis injectable keywords are checked against
  `resume-prefs.json.skills`; an implied skill that is unknown triggers a "do you have X?"
  question; yes ⇒ add to `skills` (claimable), no ⇒ add to `disclaimed_skills` (never
  claimed, never re-asked).
- Implement **learning updates**: every edit decision updates the matching `edit_prefs`
  tally; future runs use tallies to order proposals and, in review-after/automatic modes, to
  auto-apply high-acceptance types and defer/flag poor-acceptance types even within the
  freedom ceiling.
- Emit tailored files to `resume/tailored/<job-id>.<ext>` and return them; keep
  `resume_used` as the base variant id for the caller (rotation-consistent), noting it was
  tailored.
- Add `skills/tailor-resume/references/` docs as needed for the ladder, the edit-classifier,
  and the pipeline, so the SKILL.md stays focused.

**Non-Goals:**
- No browser interaction, no form-filling, no submission — the caller (I-0014) owns those.
- No writes to `jobs.json` / `jobs.md` (only `record-application` ever does), and no writes
  to `config.json` beyond nothing (rotation pointer stays the caller's concern).
- No per-run prompting for tailor y/n / freedom / mode — the caller collects those and passes
  them in (I-0014).
- No changes to the resume-prefs schema (owned by I-0012) or the resume-kit gate (I-0011);
  this initiative consumes both.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: `tailor-resume` MUST accept `{ working_dir, resume_variant_id, job, freedom
    (0–10), review_mode }` and return an envelope: `{ outcome: "skipped-strong" |
    "tailored-pass" | "tailored-best-effort" | "declined" , tailored_path?, resume_used
    (base variant id), original_score, final_score, changes_applied[], learning_updated }`.
  - REQ-002: It MUST gate on the resume-kit dependency per `references/resume-kit.md`
    (JOBHUN-I-0011) and stop with the guided-install hand-off if absent.
  - REQ-003: Structural fix MUST run at most once per variant: skip if
    `resume-prefs.json.variants[<id>].ats_fixed` is true; otherwise fix, confirm-before-
    replace, retest, and set `ats_fixed`.
  - REQ-004: If `check-resume-job-match` on the base scores `>= 90`, it MUST skip tailoring
    and return `skipped-strong`.
  - REQ-005: Injectable keywords MUST be vetted against `skills`; unknown implied skills MUST
    be asked of the user; a `no` MUST prevent that keyword from ever being injected and be
    recorded in `disclaimed_skills`.
  - REQ-006: The freedom number MUST map to a permitted edit-type subset per the ladder;
    proposed edits above the ceiling MUST be dropped before any apply or review.
  - REQ-007: Every shipped change MUST pass `validate-resume-truth` against the evidence
    built from the master resume + confirmed skills; unsupported/contradicted changes MUST be
    dropped, never shipped.
  - REQ-008: After tailoring, `check-resume-job-match` MUST be rerun; `>= 80` AND `>
    original` ⇒ `tailored-pass`; otherwise `tailored-best-effort` and the user is asked
    whether to use the tailored resume anyway or fall back to base.
  - REQ-009: Each edit decision (accept / accept-with-edits / reject) MUST update the
    matching `edit_prefs` tally; in review-after/automatic modes, tallies MUST inform which
    permitted edit-types auto-apply vs defer.
  - REQ-010: Review modes MUST behave exactly as specified (interactive per-edit;
    review-after single final pass; automatic unattended within bounds with fallback).
    Crucially, `interactive` and `review-after` MUST surface a pause ONLY when there are
    permitted, truth-passing edits to present: a `skipped-strong` result (score `>= 90`) and
    an empty post-gating edit set MUST return with no user interaction. This "no edits ⇒ no
    pause" guarantee is what lets a caller compose an interactive review mode under an `auto`
    apply run without interrupting jobs that need no changes (see JOBHUN-I-0014 REQ-005). The
    worker's review mode is independent of the caller's apply run mode — `tailor-resume` never
    submits and never consults the run mode.
  - REQ-011: Tailored output MUST be written to `resume/tailored/<job-id>.<ext>` via
    `export-resume`; the skill MUST NOT touch `jobs.json` / `jobs.md`.
- **Non-Functional Requirements:**
  - NFR-001: All resume-kit capability names come from `references/resume-kit.md`; the edit
    taxonomy and prefs shape come from the I-0012 schema — neither is restated here.
  - NFR-002: The skill is defensive: a resume-kit call that errors, or a `PROVIDER_NOT_
    CONFIGURED` result on an LLM path (`align-resume`), degrades to a clear message and a
    safe fallback (use base as-is), never a fabricated resume.
  - NFR-003: Deterministic capabilities (match, ATS, gaps, evidence, truth, compare, export)
    are used wherever possible so most of the pipeline works even without an LLM provider;
    only `align-resume` (and `extract-*`) need a provider, and their absence degrades
    gracefully.
  - NFR-004: `npm run check` stays green; the new skill validates and registers.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Already-strong resume
- **Actor:** the apply orchestrator, per job.
- **Scenario:** base resume scores 92 against the job.
- **Expected Outcome:** `skipped-strong`; the caller applies with the base resume; the user
  is told it was already a strong match.

### Use Case 2: Interactive tailoring at freedom 5
- **Actor:** the job seeker, interactive mode, freedom 5.
- **Scenario:** gap analysis surfaces two injectable known skills, three term swaps, and one
  single-sentence rewrite (all `<= 5` on the ladder). Each is presented one at a time; the
  user accepts the skills and swaps, edits the sentence rewrite. A keyword implying "Kafka"
  (unknown) prompts "do you have Kafka experience?" — the user says no, so it is disclaimed
  and never injected. The result resces to 84 (> original 61).
- **Expected Outcome:** `tailored-pass`; tailored file written; `edit_prefs` updated
  (`skill_add.accepted += 2`, `term_swap.accepted += 3`, `bullet_rewrite.accepted_with_edits
  += 1`); `disclaimed_skills` gains "Kafka".

### Use Case 3: Automatic mode with learned preferences
- **Actor:** the job seeker, automatic mode, freedom 8.
- **Scenario:** history shows `entry_rewrite` is almost always rejected but `term_swap` and
  `skill_add` almost always accepted. Even though freedom 8 permits entry rewrites, the skill
  auto-applies the swaps/skill-adds/bullet rewrites and defers the one proposed entry rewrite
  (flagged for a later human pass). It rescores to 81 (> original).
- **Expected Outcome:** `tailored-pass`; unattended; the deferred entry rewrite is reported,
  not shipped.

### Use Case 4: Best-effort fallback
- **Actor:** the job seeker.
- **Scenario:** after all permitted, truthful edits the resume only reaches 74.
- **Expected Outcome:** `tailored-best-effort`; the user is asked whether to apply the
  tailored (74) resume or fall back to the base — the skill never silently ships a
  sub-target resume.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
`tailor-resume` is a pure worker orchestrating resume-kit capabilities in a fixed pipeline,
reading/writing only `resume-prefs.json`, the `resume/` variant files, and
`resume/tailored/` outputs. It exposes a single call contract (REQ-001) and contains three
internal components: the **degree-of-freedom ladder** (freedom → permitted edit-types), the
**edit classifier** (diff aligned-vs-base → typed change list), and the **review driver**
(applies mode + learned prefs to the typed change list).

### Sequence Diagrams
Per-job pipeline (happy path):
1. resume-kit gate (I-0011) → 2. resolve base variant file → 3. once-per-variant structural
fix (extract-resume + check-resume-ats → export-resume → confirm-replace → set `ats_fixed`)
→ 4. `check-resume-job-match` (skip if `>= 90`) → 5. `identify-resume-gaps` (tailored=base,
master=full resume, job) → 6. vet injectable keywords vs `skills` (ask on unknowns) → 7.
`build-candidate-evidence` (master + confirmed skills) → 8. `align-resume` (evidence-
constrained; `human_in_loop` when review mode = interactive) → 9. classify edits → drop
above freedom ceiling / unvetted → order & auto-apply/defer by learned prefs + mode → 10.
`validate-resume-truth` (drop unsupported/contradicted) → 11. `check-resume-job-match`
rescore → 12. gate on `>= 80` AND `> original` → 13. `export-resume` to
`resume/tailored/<job-id>` → 14. update `edit_prefs` / `skills` / `disclaimed_skills` →
return envelope.

## Detailed Design **[REQUIRED]**

Author `skills/tailor-resume/SKILL.md` plus references:
- `references/degree-of-freedom.md` — the 0–10 ladder table mapping freedom to the permitted
  cumulative edit-type subset, and the invariants that hold at every level.
- `references/edit-classifier.md` — how to diff `align-resume`'s `aligned_resume` against the
  base and assign each change one edit-type from the I-0012 enum; how to present a change in
  each review mode; how a decision maps to a tally update.
- `references/tailoring-pipeline.md` — the ordered pipeline (the sequence above), the score
  gates, the structural-fix once-only rule, the skills-vetting question flow, the
  best-effort fallback, and the defensive/degrade rules.

Degree-of-freedom ladder (authored in `degree-of-freedom.md`):

| Freedom | Permitted edit-types (cumulative) |
| --- | --- |
| 0 | none (equivalent to "do not tailor") |
| 1–2 | `skill_add` (vetted only), `reorder` (skills) |
| 3–4 | + `term_swap` |
| 5–6 | + `bullet_rewrite`, reorder bullets |
| 7–8 | + `bullet_add`, `summary_rewrite` |
| 9–10 | + `entry_rewrite`, section reordering |

Invariants at every level: never fabricate; never add a skill absent from `skills`; always
pass `validate-resume-truth`; no new employment entries.

The skill reads capability/tool names from `references/resume-kit.md` (I-0011) and the prefs
shape/taxonomy from the I-0012 schema. It writes `resume-prefs.json` (skills, disclaimed,
variants.ats_fixed, edit_prefs) and `resume/tailored/` files, and — only on a confirmed
structural replace — invokes `update-resumes` for the base variant.

## Alternatives Considered **[REQUIRED]**

- **Inline the pipeline into each apply skill.** Rejected in the approved design — it
  duplicates a large workflow across two orchestrators and drifts. A shared worker is the
  single implementation both call.
- **Let `align-resume`'s single LLM call be the whole tailoring, trusting its policy.**
  Rejected — we need explicit degree-of-freedom bounding, per-edit review, learned
  preferences, and a hard truth-validation pass; a single opaque rewrite gives none of that
  control and can exceed the user's allowed freedom.
- **Enforce freedom by prompt-only instructions to the aligner.** Rejected — unreliable; we
  enforce by *classifying the produced diff* and dropping out-of-bounds edits deterministically.
- **Write tailored resumes as new rotation variants.** Rejected — pollutes the variant set
  and rotation state; per-job tailored files live under `resume/tailored/` and `resume_used`
  stays the base variant id with a "tailored" note.
- **Ship a below-target tailored resume automatically.** Rejected — the best-effort case
  always asks the user (or, in automatic mode, falls back to base) rather than silently
  submitting a weak tailoring.

## Implementation Plan **[REQUIRED]**

Human-in-the-loop: task decomposition pending Daniel's approval. Planned decomposition:

1. **Pipeline + ladder + classifier reference docs** under `skills/tailor-resume/references/`
   (`tailoring-pipeline.md`, `degree-of-freedom.md`, `edit-classifier.md`).
   *Recommended Agent: opus + high* — defines the core patterns every later step depends on.
2. **Author `skills/tailor-resume/SKILL.md`** implementing the call contract, gates, pipeline
   orchestration, review modes, skills-vetting, and learning updates, citing the references.
   *Recommended Agent: opus + high* — complex multi-capability orchestration with load-bearing
   invariants (truth, human-in-control, freedom bounding).
3. **Validation + registration + `npm run check`** (skill validator passes, registers in any
   skill index, example envelope documented). *Recommended Agent: sonnet + medium* —
   mechanical once the skill exists.

`blocked_by`: JOBHUN-I-0011 (resume-kit gate + capability map) and JOBHUN-I-0012 (resume-prefs
schema + taxonomy). Blocks JOBHUN-I-0014.