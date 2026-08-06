---
id: pipeline-design-docs-pivot
level: task
title: "Pipeline design docs: pivot tailoring-pipeline.md + edit-classifier.md off align-resume"
short_code: "JOBHUN-T-0039"
created_at: 2026-08-05T02:44:49.676007+00:00
updated_at: 2026-08-05T04:06:34.954227+00:00
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

# Pipeline design docs: pivot tailoring-pipeline.md + edit-classifier.md off align-resume

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0015]]

## Objective **[REQUIRED]**

Rewrite the two pipeline design references so they describe the **no-LLM** tailoring engine that
replaces `align-resume`. This is the load-bearing design task: `skills/tailor-resume/references/
tailoring-pipeline.md` and `skills/tailor-resume/references/edit-classifier.md` define the exact
behavior the SKILL wiring (T-0040) must implement. After this task, the pipeline docs describe:
extract-once via `resume-to-json`, `alias_file` threading, the deleted align step, and the new
grow-index / inject-keywords / mirror-wording steps feeding the existing classifier as discrete
typed edits.

**Recommended Agent: opus + high** — defines the new pipeline behavior every downstream wiring
task must match exactly; the align-removal and step re-sequencing are architecture-level and a
wrong call here compounds across T-0040/T-0041/T-0042.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `tailoring-pipeline.md` adds "Step 2b — convert once": the base resume is converted to a
      `ResumeDocument` once per job via the agent-driven `resume-to-json` skill (subagent), and
      the job via `job-to-json`; both reused across the job's calls (REQ-006). Not `resume_extract`.
- [ ] `tailoring-pipeline.md` threads `alias_file` on the scoring calls that accept it
      (`check-resume-ats` keyword-ATS, `check-resume-job-match`, `identify-resume-gaps`,
      `resume_suggest_terminology`); explicitly notes `check-ats-structure` takes none (REQ-002).
- [ ] `tailoring-pipeline.md` **deletes Step 8 (Align / `align-resume`)** and rewrites Step 9 so
      the classifier no longer diffs an opaque rewrite; the `PROVIDER_NOT_CONFIGURED`-on-align
      degrade branch is removed (REQ-002b). The remaining degrade rules still cover deterministic
      call failures → fall back to base, never fabricate (NFR-002).
- [ ] `tailoring-pipeline.md` adds **Step 6a — grow the project index** (interactive/review-after
      only; `manage-synonyms` subagent; re-score with `alias_file` on confirmed appends; skipped
      in automatic) (REQ-004).
- [ ] `tailoring-pipeline.md` adds **Step 8a — inject missing-but-true keywords** (`inject-keywords`
      subagent → `skill_add`/`bullet_add` edits from injectable gaps + confirmed skills; never
      injects unknown/disclaimed) (REQ-009).
- [ ] `tailoring-pipeline.md` adds **Step 8b — mirror employer wording** (`resume_suggest_terminology`
      → `term_swap` edits → `resume_align_terminology` per accepted, engine truth-gated) (REQ-003).
- [ ] `tailoring-pipeline.md` shows Steps 8a/8b feeding Step 9 (classify/gate/order), then the
      unchanged truth-check → apply → rescore → gate → export → learn tail.
- [ ] `edit-classifier.md` "Input" and "Diffing aligned vs. base" sections are rewritten: the
      classifier receives **already-typed edits** from `inject-keywords` and `update-terminology`;
      the opaque-`align-resume`-diff framing is removed.
- [ ] `edit-classifier.md` documents the reduced generated edit-set (no `bullet_rewrite` /
      `entry_rewrite` / `summary_rewrite` / free-form `reorder` without an LLM rewrite) while
      noting the schema/ladder retain all types for forward-compat.
- [ ] All cross-references between these two docs and to `resume-kit.md` / `data-contract.md` /
      `degree-of-freedom.md` remain valid; `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Work from the revised initiative's "Detailed Design" and "Sequence Diagrams" sections — they
prescribe the new step order (extract-once → ATS-fix → match-gate → identify-gaps → skills-vetting
→ build-evidence → 6a grow-index → 8a inject → 8b mirror → classify/gate → truth → apply → rescore
→ gate → export → learn). Preserve the existing prose style and the "schema wins on conflict"
convention. Keep the freedom-ceiling, review-mode, learning-tally, and rescore-gate semantics
exactly as they are — only the edit *sources* change, not how edits are governed.

### Dependencies

- Depends on T-0038 (references/resume-kit.md capability names + alias-index state) being correct,
  since these docs cite it.
- Blocks T-0040 (SKILL wiring implements this design) and T-0041 (the align-reference purge
  operates against the finalized wording here).

### Risk Considerations

- Risk: leaving a dangling "Step 8 Align" cross-reference elsewhere in the doc after deletion.
  Mitigation: renumber/relabel steps consistently and grep for "Step 8"/"align" within the file.
- Risk: over-reaching into the SKILL.md procedure (that's T-0040). Mitigation: keep this task to
  the two reference docs; SKILL wiring is a separate task that consumes this design.
- Risk: describing inject-keywords/update-terminology behavior in a way that contradicts the
  actual resume-kit skills. Mitigation: cross-check against the installed skills' SKILL.md before
  finalizing the step descriptions.

## Status Updates **[REQUIRED]**

**2026-08-04 — Completed.** Rewrote `tailoring-pipeline.md`: updated the capability-name list;
added Step 2b (convert-once via `resume-to-json`/`job-to-json` + alias-index bootstrap); switched
the structural check to `check-ats-structure` (no alias); threaded `alias_file` on match/gaps/
rescore; added Step 6a (grow-index via `manage-synonyms`, interactive/review-after only, re-score
on confirmed appends); replaced Step 8 (align) with Step 8a (inject-keywords → `skill_add`/
`bullet_add`) and Step 8b (mirror wording → `term_swap` via suggest/align terminology); rewrote
Step 9 to consume already-typed edits; removed the `PROVIDER_NOT_CONFIGURED`/align degrade branch
(content path now fully no-LLM) and added a per-step terminology/growth degrade rule; updated the
files-read/writes to include the alias index. Rewrote `edit-classifier.md`: Input now describes
already-typed edits from inject-keywords/update-terminology (no opaque-rewrite diff); documented
the generated edit-set (`skill_add`/`bullet_add`/`term_swap`) and that `bullet_rewrite`/
`entry_rewrite`/`summary_rewrite`/`reorder` are retained in schema/ladder for forward-compat but
not produced now; reworded the interactive-presentation aligner note. `npm run check` green.