---
id: orchestrator-summaries-alias-index
level: task
title: "Orchestrator summaries + alias-index bootstrap in apply-to-jobs / interactive-apply"
short_code: "JOBHUN-T-0042"
created_at: 2026-08-05T02:44:54.245167+00:00
updated_at: 2026-08-05T04:12:12.717770+00:00
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

# Orchestrator summaries + alias-index bootstrap in apply-to-jobs / interactive-apply

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0015]]

## Objective **[REQUIRED]**

Update the two apply orchestrators (`skills/apply-to-jobs` and `skills/interactive-apply`) so
their tailoring gate bootstraps the project alias index and their per-job run summaries surface
the new terminology + injection outcomes. No change to run-mode composition, submit gates, or the
rotation/record-application contracts — this is additive reporting plus a defensive bootstrap.

**Recommended Agent: sonnet + medium** — mechanical and follows the pipeline design set by
T-0039/T-0040; single-purpose edits to two skills with a stated pattern.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] Both orchestrators' tailoring gate ensures the alias index exists before tailoring runs:
      `<working_dir>/resume-kit/config.json` (with `alias_file` → `learning/synonyms.json`) and
      the empty-shell `learning/synonyms.json` (`{"version":1,"aliases":{},"justifications":{}}`)
      are created if absent; job-hunter writes only the shell + pointer (REQ-001).
- [ ] Both orchestrators' per-job run summaries report terminology outcomes: term-swaps applied
      and any synonyms grown, alongside the existing tailoring outcome (REQ-008).
- [ ] Injection outcomes (missing-but-true keywords injected) are also surfaced in the summary so
      the user sees what the no-LLM path changed.
- [ ] Each orchestrator's files-read/writes list is updated to include the `<working_dir>/resume-kit/`
      alias index (read + shell-write only; never writes `synonyms.json` content).
- [ ] No change to run-mode (automatic/interactive) composition, submit gates, rotation, or
      `record-application` behavior; `jobs.json` is still never written by these skills.
- [ ] Automatic-mode behavior matches the design: growth is skipped (no confirmation), known
      aliases still count, and the run never pauses for terminology (Use Case 3).
- [ ] `npm run check` passes and both skills validate.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Locate the existing tailoring gate and per-job summary assembly in each orchestrator (they were
wired in JOBHUN-T-0035 / T-0036). Add the alias-index bootstrap defensively at the gate (idempotent
create-if-absent), and extend the summary structure the worker already returns with the terminology
and injection fields the pivoted `tailor-resume` envelope now carries. Keep the summary wording
consistent between the two skills.

### Dependencies

- Depends on T-0040 (the `tailor-resume` worker must actually return terminology/injection outcomes
  in its envelope for the orchestrators to surface).
- Depends on T-0038 (the alias-index state shape + single-writer rule the bootstrap follows).

### Risk Considerations

- Risk: the orchestrator writing `synonyms.json` content and violating the single-writer rule.
  Mitigation: bootstrap writes ONLY the empty shell + config pointer; all appends stay with
  resume-kit's `manage-synonyms`.
- Risk: bootstrap racing or duplicating across the two skills. Mitigation: make it idempotent
  (create-if-absent, never overwrite an existing index).
- Risk: summary changes leaking into the submit/rotation path. Mitigation: keep edits confined to
  the gate and summary assembly; do not touch submit gates or `record-application`.

## Status Updates **[REQUIRED]**

**2026-08-04 — Completed.** `apply-to-jobs/SKILL.md`: added Step 2b item 5 (idempotent alias-index
bootstrap — shell + pointer only); added terminology/injection outcome capture from
`changes_applied` in the worker-envelope handling; extended the Step 5 summary description +
example to show term-swaps/keywords/synonyms; changed a stale "provider not configured" example to
"resume-kit call failed"; added the alias-index bootstrap to files-writes. `interactive-apply/SKILL.md`:
mirrored all of the above — bootstrap after the tailoring gate, outcome capture in envelope
handling (dropped "provider" from the error branch), Step 5 summary detail, and files-writes.
`npm run check` green.