---
id: tailor-resume-skill-wiring-no-llm
level: task
title: "tailor-resume SKILL wiring: no-LLM steps, alias index, extract-once"
short_code: "JOBHUN-T-0040"
created_at: 2026-08-05T02:44:51.165684+00:00
updated_at: 2026-08-05T04:09:20.935410+00:00
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

# tailor-resume SKILL wiring: no-LLM steps, alias index, extract-once

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0015]]

## Objective **[REQUIRED]**

Wire the no-LLM pipeline design (T-0039) into the `tailor-resume` worker itself. Update
`skills/tailor-resume/SKILL.md` so its procedure, files-read/writes, and call-contract notes
match the pivoted pipeline: remove the `align-resume` step, add convert-once (`resume-to-json` /
`job-to-json`), the project alias index, and the grow-index / inject-keywords / mirror-wording
steps — all under the existing freedom/review/truth/learning invariants. Verify the
`resume-prefs` schema recognizes the edit types the no-LLM path emits.

**Recommended Agent: opus + high** — integrates the new no-LLM engine into the load-bearing worker
skill under existing invariants, and carries the align-removal in executable procedure form;
upgraded from medium because a wrong wiring here ships broken tailoring.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `SKILL.md` procedure no longer invokes `align-resume`; the "Align" step is removed and its
      references (e.g. SKILL.md:26, :165) are gone or rewritten.
- [ ] `SKILL.md` adds convert-once: base resume via `resume-to-json` (subagent) → `ResumeDocument`,
      job via `job-to-json`, reused across the job's calls (REQ-006).
- [ ] `SKILL.md` bootstraps / consumes the project alias index at
      `<working_dir>/resume-kit/config.json` + `learning/synonyms.json` and passes `alias_file`
      on the alias-aware scoring calls (REQ-001, REQ-002).
- [ ] `SKILL.md` includes the grow-index (interactive/review-after only, `manage-synonyms`
      subagent), inject-keywords (subagent), and mirror-wording (`update-terminology` tools) steps
      in the correct order, each producing edits governed by the existing classifier/freedom/
      truth/learning machinery (REQ-003, REQ-004, REQ-009).
- [ ] `SKILL.md` files-read/writes and call-contract sections are updated to list the alias index
      (read + shell-write only), the resume-kit `resume-to-json`/`job-to-json`/`inject-keywords`/
      `update-terminology`/`manage-synonyms` skills, and to drop `align-resume`.
- [ ] The `resume-prefs` schema (`schemas/resume-prefs.schema.json`) is verified to contain the
      `edit_prefs` keys the no-LLM path emits: `term_swap`, `skill_add`, `bullet_add`. If any is
      genuinely missing, it is added following the schema-change rules (justified, minimal); no
      rule is loosened or bypassed (NFR-003).
- [ ] The truth invariant is preserved end-to-end: no unconfirmed/disclaimed skill is injected,
      no gap is fabricated, and the engine truth-gate remains the backstop (REQ-005).
- [ ] `npm run check` passes and the edited skill validates.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Treat T-0039's rewritten `tailoring-pipeline.md` / `edit-classifier.md` as the spec; SKILL.md is
the executable procedure that must mirror it. Do not restate pipeline mechanics in SKILL.md that
belong in the references — cite them. Keep the worker's call-contract envelope
(`{ working_dir, resume_variant_id, job, freedom, review_mode }` → outcome) unchanged; only the
internal steps change. For the schema check, read the current `edit_prefs` enum/keys before
deciding whether anything is missing — per edit-classifier.md the set already includes
`skill_add`, `term_swap`, `bullet_add`, so likely no schema change is needed; confirm rather than
assume.

### Dependencies

- Depends on T-0039 (pipeline design) and T-0038 (references) being complete — this task
  implements their design.
- Loosely coupled with T-0041 (align purge): this task removes align from SKILL.md; T-0041 sweeps
  the remaining reference docs. Coordinate so neither leaves a dangling reference.

### Risk Considerations

- Risk: touching the schema unnecessarily or via a disallowed workaround. Mitigation: verify the
  enum first; only add a genuinely-missing key, following the schema-change rules — never loosen
  validation, never cast around it.
- Risk: breaking the "no edits ⇒ no pause" and review-mode guarantees while re-sequencing steps.
  Mitigation: preserve the exact gating/presentation semantics from the references; only edit
  sources change.
- Risk: the inject-keywords/manage-synonyms subagent dispatch contradicting resume-kit's own
  "run me in a subagent" guidance. Mitigation: follow each skill's stated invocation contract.

## Status Updates **[REQUIRED]**

**2026-08-04 — Completed.** Verified `schemas/resume-prefs.schema.json` already contains
`skill_add`, `term_swap`, `bullet_add` in `edit_prefs` — no schema change needed. Rewired
`skills/tailor-resume/SKILL.md`: removed the `align-resume` "Align" step and the
`PROVIDER_NOT_CONFIGURED` degrade wording; updated the references intro (typed edits from the
no-LLM path) and the "freedom is enforced by typing each candidate edit" principle; added
Procedure step 3 (convert-once via `resume-to-json`/`job-to-json` + alias-index bootstrap),
step 4 switched to `check-ats-structure`, `alias_file` on match/gaps/rescore, step 8 grow-index
(`manage-synonyms`, interactive/review only), step 10 inject-keywords, step 11 mirror-wording;
renumbered the whole procedure 1–17 (fixing MD029); added the alias index to files-read/writes
(shell + pointer only). `npm run check` green.