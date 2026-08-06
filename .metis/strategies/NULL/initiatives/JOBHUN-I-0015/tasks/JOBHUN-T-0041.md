---
id: purge-lingering-align-resume
level: task
title: "Purge lingering align-resume references across tailor-resume docs"
short_code: "JOBHUN-T-0041"
created_at: 2026-08-05T02:44:52.888078+00:00
updated_at: 2026-08-05T04:10:02.504646+00:00
parent: JOBHUN-I-0015
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0015
---

# Purge lingering align-resume references across tailor-resume docs

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0015]]

## Objective **[REQUIRED]**

Exhaustively remove every lingering reference to the disabled `align-resume` / `resume_align`
path across the tailor-resume documentation so no doc still implies an align step exists. T-0039
and T-0040 remove align from the primary pipeline/classifier/SKILL docs; this task sweeps the
remaining references (`degree-of-freedom.md`, the degrade sections, and any other `.md` under
`skills/tailor-resume/` or `references/`) for `align-resume`, `resume_align`, and
`PROVIDER_NOT_CONFIGURED`-on-align wording, and reconciles each hit with the no-LLM design.

**Recommended Agent: sonnet + medium** — mechanical but must be exhaustive; the reasoning is
already fixed by the T-0039 design, so this is disciplined find-reconcile-verify.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `grep -rin "align-resume\|resume_align" skills/tailor-resume references` returns no hit that
      describes align as an available/normal step (only historical/"disabled" notes may remain,
      and only where intentional).
- [ ] `degree-of-freedom.md` no longer frames the freedom ladder as enforced via `align-resume`;
      its invariants are restated independent of the align path (the ladder still governs the
      no-LLM edits).
- [ ] The `PROVIDER_NOT_CONFIGURED`-on-align degrade wording is removed from every reference; the
      remaining degrade rules cover deterministic-call failure → fall back to base, never
      fabricate.
- [ ] Any step numbering / cross-references left dangling by align removal (e.g. "Step 8", "the
      aligner", "aligned_resume") are fixed or removed consistently.
- [ ] No new contradiction is introduced with T-0039's pipeline/classifier docs; the whole
      tailor-resume doc set reads as one coherent no-LLM design.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Start from a full-repo grep for `align-resume`, `resume_align`, `aligned_resume`, `the aligner`,
and `PROVIDER_NOT_CONFIGURED`. Triage each hit: delete, or rewrite to the no-LLM equivalent, per
the T-0039 design. Do not re-open design questions — if a hit reveals a genuine gap in T-0039's
design, flag it back to that task rather than inventing new behavior here.

### Dependencies

- Depends on T-0039 and T-0040 being complete (they define the replacement wording this task
  reconciles against); this is the closing sweep of the doc pivot.

### Risk Considerations

- Risk: missing a hit in a less-obvious file (schemas' descriptions, examples, comments).
  Mitigation: grep the entire repo, not just the two skill dirs, and review every match.
- Risk: deleting a reference that was intentionally kept as a "disabled" note. Mitigation:
  preserve the single explicit "align-resume is DISABLED in v0.3.0" statement in
  `references/resume-kit.md`; only remove framings that imply it is usable.

## Status Updates **[REQUIRED]**

**2026-08-04 — Completed.** Full-repo grep for `align-resume` / `resume_align` / `aligned_resume` /
`the aligner` / `PROVIDER_NOT_CONFIGURED` (excluding the legitimate `resume_align_terminology`).
The only substantive hit was `degree-of-freedom.md:20`, which framed the freedom ladder as enforced
against `align-resume`; rewrote it to enforce by typing the no-LLM path's candidate edits
(`inject-keywords` / `update-terminology`). All other remaining hits are intentional negative /
"DISABLED" / forward-compat notes (resume-kit.md capability row, tailoring-pipeline.md degrade
notes, edit-classifier.md forward-compat note) and were left as-is. No doc describes align as an
available step. `npm run check` green.