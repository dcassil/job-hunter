---
id: author-skills-tailor-resume-skill
level: task
title: "Author skills/tailor-resume/SKILL.md (call contract, gates, pipeline, review modes, learning)"
short_code: "JOBHUN-T-0033"
created_at: 2026-08-04T18:53:39.785963+00:00
updated_at: 2026-08-04T18:53:39.785963+00:00
parent: JOBHUN-I-0013
blocked_by: [JOBHUN-T-0032]
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0013
---

# Author skills/tailor-resume/SKILL.md

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0013]]

## Objective **[REQUIRED]**

Author `skills/tailor-resume/SKILL.md`: the worker skill implementing the call contract,
gates, pipeline orchestration, degree-of-freedom bounding, three review modes, skills-vetting,
truth validation, and learning updates, citing the JOBHUN-T-0032 reference docs.

## Acceptance Criteria **[REQUIRED]**

- [ ] Frontmatter `name: tailor-resume` and a description matching the worker's role (invoked
      by apply skills, one job at a time; never submits, never writes jobs.json).
- [ ] Implements the REQ-001 call contract (inputs `{ working_dir, resume_variant_id, job,
      freedom, review_mode }`; envelope `{ outcome, tailored_path?, resume_used,
      original_score, final_score, changes_applied[], learning_updated }`).
- [ ] Enforces every initiative requirement: resume-kit gate (REQ-002); once-per-variant
      structural fix with confirm-before-replace via `update-resumes` (REQ-003); skip at ≥90
      (REQ-004); skills vetting with the "do you have X?" question and skills/disclaimed_skills
      writes (REQ-005); freedom-ceiling edit gating (REQ-006); `validate-resume-truth` drop of
      unsupported/contradicted (REQ-007); rescore gate ≥80 & >original else best-effort ask
      (REQ-008); tally learning + auto-apply/defer by prefs (REQ-009); "no edits ⇒ no pause"
      review-mode guarantee (REQ-010); export to `resume/tailored/<job-id>` and no jobs.json
      writes (REQ-011).
- [ ] Cites `references/resume-kit.md`, the resume-prefs schema, and the T-0032 reference docs
      instead of restating tool names / enum / ladder.
- [ ] Includes a "Principles (non-negotiable)" section consistent with the other apply skills
      (human-in-control, never fabricate, single-writer boundaries).
- [ ] "Files this skill reads and writes" section is accurate (reads config/profile/resume-
      prefs/resume variants; writes resume-prefs.json + resume/tailored/; invokes update-
      resumes only on confirmed structural replace; never jobs.json).
- [ ] Passes `scripts/validate-skills.mjs`; `npm run check` green.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Model structure on `skills/apply-to-jobs/SKILL.md` and `skills/interactive-apply/SKILL.md`
(Principles → Gate → Procedure steps → Files read/written). Keep mechanics in the T-0032
references; SKILL.md orchestrates and cites.

### Dependencies
Blocked by JOBHUN-T-0032 (references). Consumes merged I-0011 + I-0012. Blocks JOBHUN-T-0034.

### Recommended Agent
**opus + high** — complex multi-capability orchestration with load-bearing invariants (truth,
human-in-control, freedom bounding). Execution: **claude** subagent in the isolated worktree.

### Verification
- `node scripts/validate-skills.mjs` lists `skills/tailor-resume (tailor-resume)` ok.
- `npm run check` green.

## Status Updates **[REQUIRED]**

*To be added during implementation*
