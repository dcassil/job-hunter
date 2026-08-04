---
id: wire-tailoring-into-interactive
level: task
title: "Wire tailoring into interactive-apply (prompt, gate, per-job call)"
short_code: "JOBHUN-T-0036"
created_at: 2026-08-04T19:02:22.704855+00:00
updated_at: 2026-08-04T19:05:55.393480+00:00
parent: JOBHUN-I-0014
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0014
---

# Wire tailoring into interactive-apply

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0014]]

## Objective **[REQUIRED]**

Wire the `tailor-resume` worker into `skills/interactive-apply/SKILL.md`: add the per-run
tailoring prompt, the tailoring-only resume-kit gate, and the per-job worker call at material
resolution (Step 4b), attaching the tailored file for the co-fill.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] The per-run tailoring prompt (tailor y/n → freedom 0–10 → review mode) is asked in
      Step 1/2 before the per-job loop; nothing persisted (REQ-001).
- [ ] When tailoring is requested, gates on resume-kit per `references/resume-kit.md`; if
      absent, shows the guided-install hand-off and offers install-or-continue-untailored
      (REQ-002).
- [ ] In Step 4b (resolve materials), calls `tailor-resume` with the job's resolved variant,
      freedom, and review mode; attaches `tailored_path` on `tailored-pass`, base on
      `skipped-strong`, and follows the worker's decision on best-effort/declined. Attachment
      used in 4c (REQ-003).
- [ ] `record-application` in 4e still receives the base `resume_used` variant id (REQ-004).
- [ ] Because this skill is inherently collaborative, interactive / review-after review modes
      compose directly with the co-fill loop; the human-in-control submit behavior is
      unchanged (REQ-006).
- [ ] A tailoring error degrades to the base resume with a noted reason; the loop continues
      (REQ-007).
- [ ] No tailoring logic duplicated (NFR-001); `scripts/validate-skills.mjs` passes;
      `npm run check` green.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Edit only `skills/interactive-apply/SKILL.md`. Preserve its one-at-a-time, user-in-control
structure and the prohibited/consequential-step handling. Cite the `tailor-resume` call
contract; do not restate the pipeline.

### Dependencies
Consumes merged I-0013. Independent of JOBHUN-T-0035 (different file); shared docs are in
JOBHUN-T-0037.

### Recommended Agent
**opus + medium** — parallel integration in the collaborative orchestrator. Execution:
**codex** headless under supervision.

### Verification
- `npm run check` green.
- Read-through confirms the Step 4b call and base-id recording.

## Status Updates **[REQUIRED]**

*To be added during implementation*