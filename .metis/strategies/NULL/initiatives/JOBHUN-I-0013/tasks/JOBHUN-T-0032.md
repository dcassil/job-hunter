---
id: author-tailor-resume-reference
level: task
title: "Author tailor-resume reference docs (pipeline, degree-of-freedom, edit-classifier)"
short_code: "JOBHUN-T-0032"
created_at: 2026-08-04T18:53:38.172084+00:00
updated_at: 2026-08-04T18:54:43.710761+00:00
parent: JOBHUN-I-0013
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/active"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0013
---

# Author tailor-resume reference docs

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0013]]

## Objective **[REQUIRED]**

Author the three reference docs under `skills/tailor-resume/references/` that the SKILL.md
(JOBHUN-T-0033) cites, so the skill stays focused: `tailoring-pipeline.md`,
`degree-of-freedom.md`, and `edit-classifier.md`.

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `degree-of-freedom.md` contains the 0–10 ladder table mapping freedom → cumulative
      permitted edit-types (using the closed enum from `schemas/resume-prefs.schema.json`),
      plus the invariants that hold at every level (never fabricate; never claim a skill not
      in `resume-prefs.json.skills`; always pass `validate-resume-truth`; no new employment
      entries). Ladder exactly matches the initiative's Detailed Design table.
- [ ] `edit-classifier.md` defines how to diff `resume_align`'s `aligned_resume` vs the base
      and assign each change one edit-type from the enum; how to present a change in each
      review mode; and how a decision (accept / accept-with-edits / reject) maps to a
      `resume-prefs.json` tally update.
- [ ] `tailoring-pipeline.md` documents the ordered pipeline (gate → resolve base → once-per-
      variant structural fix → match-gate skip ≥90 → gaps → skills vetting → evidence →
      align → classify/gate/order by prefs → truth check → rescore → gate ≥80 & >original →
      export to `resume/tailored/<job-id>` → learning updates → return envelope), the
      score gates, the best-effort fallback, and the defensive/degrade rules (resume-kit call
      errors or `PROVIDER_NOT_CONFIGURED` on an LLM path → safe fallback to base).
- [ ] All resume-kit capability names are cited from `references/resume-kit.md`; the edit
      taxonomy is cited from the schema — neither restated as a new source of truth.
- [ ] Markdown lints clean; `npm run check` green.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Follow the style of existing multi-doc skills (e.g. `references/custom-application.md`,
`references/question-log.md`). Read `references/resume-kit.md` (capability map) and
`schemas/resume-prefs.schema.json` (edit-type enum) — both already on `main`.

### Dependencies
Depends on merged I-0011 (resume-kit.md) and I-0012 (resume-prefs schema/contract). Blocks
JOBHUN-T-0033 (SKILL.md cites these docs).

### Recommended Agent
**opus + high** — defines the core patterns every later step depends on. Execution: **claude**
subagent (larger orchestration) in an isolated worktree.

### Verification
- `npm run check` green.
- Cross-check the ladder table against the initiative Detailed Design and the enum keys.

## Status Updates **[REQUIRED]**

*To be added during implementation*