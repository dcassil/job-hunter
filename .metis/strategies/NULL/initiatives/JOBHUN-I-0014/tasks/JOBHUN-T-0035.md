---
id: wire-tailoring-into-apply-to-jobs
level: task
title: "Wire tailoring into apply-to-jobs (prompt, gate, per-job call, auto×interactive, summary)"
short_code: "JOBHUN-T-0035"
created_at: 2026-08-04T19:02:21.225617+00:00
updated_at: 2026-08-04T19:07:06.858884+00:00
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

# Wire tailoring into apply-to-jobs

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0014]]

## Objective **[REQUIRED]**

Wire the `tailor-resume` worker into `skills/apply-to-jobs/SKILL.md`: add the per-run
tailoring prompt, the tailoring-only resume-kit gate, the per-job worker call at material
resolution, the run-mode × review-mode composition, and the tailoring outcome in the summary.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] A new "Step 2b — tailoring choice" (after Step 2 run mode) asks: tailor this run? (y/n)
      → if yes, freedom (0–10)? and review mode (interactive / review-after / automatic)?.
      Nothing persisted to `config.json` (REQ-001).
- [ ] When tailoring is requested, the run gates on resume-kit per `references/resume-kit.md`;
      if absent, it shows the guided-install hand-off and offers to install or continue
      untailored — never a silent drop (REQ-002).
- [ ] In Step 4a, after the rotation resolver returns `{ resume_used, cover_used }`, it calls
      `tailor-resume` with `{ working_dir, resume_variant_id: resume_used, job, freedom,
      review_mode }` and uses the envelope: `tailored-pass` → attach `tailored_path`;
      `skipped-strong` → attach base; `tailored-best-effort`/`declined` → follow the worker's
      user decision or fall back to base. The attachment is used in 4c/4x (REQ-003).
- [ ] `record-application` in 4f still receives the base `resume_used` variant id; tailored
      file is an attachment only (REQ-004).
- [ ] The `auto` × `interactive` composition is documented exactly: `skipped-strong` jobs run
      fully `auto` with no pause; jobs needing changes pause ONLY for edit approval, then
      resume `auto` for fill + submit gate; `automatic` never pauses (REQ-005). The call passes
      the interactive review mode to the worker so the pause (if any) lives inside it; the
      orchestrator's submit/defer stays governed by run mode (REQ-006).
- [ ] A tailoring error for a job degrades to attaching the base resume with a noted reason;
      the defensive loop continues (REQ-007).
- [ ] Step 5 summary gains a per-job tailoring outcome (skipped-strong / tailored → score /
      best-effort / not tailored).
- [ ] No tailoring logic is duplicated — only prompt + call + act on envelope (NFR-001).
- [ ] `scripts/validate-skills.mjs` still passes for apply-to-jobs; `npm run check` green.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Edit only `skills/apply-to-jobs/SKILL.md`. Preserve the existing Principles, gates, defensive
per-job loop, and the human-in-control submit gate — tailoring only changes which resume file
is attached before those gates. Cite the `tailor-resume` SKILL.md call contract; do not
restate the pipeline.

### Dependencies
Consumes merged I-0013 (`tailor-resume`). Independent of JOBHUN-T-0036 (different file); the
shared docs live in JOBHUN-T-0037.

### Recommended Agent
**opus + medium** — integration across a consequential orchestrator; must preserve
human-in-control and the defensive loop. Execution: **codex** headless under supervision.

### Verification
- `npm run check` green.
- Read-through confirms the auto×interactive rule and the base-id recording.

## Status Updates **[REQUIRED]**

*To be added during implementation*