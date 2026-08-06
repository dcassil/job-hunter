---
id: docs-contract-foundation-resume
level: task
title: "Docs/contract foundation: resume-kit.md + data-contract.md alias-index state"
short_code: "JOBHUN-T-0038"
created_at: 2026-08-05T02:44:47.741124+00:00
updated_at: 2026-08-05T04:02:43.511742+00:00
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

# Docs/contract foundation: resume-kit.md + data-contract.md alias-index state

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0015]]

## Objective **[REQUIRED]**

Establish the reference/contract substrate every other task in this initiative cites. Finish the
factual correction of `references/resume-kit.md` (the capability map + alias-index section were
already brought to v0.3.0 reality in-session; this task closes the remaining gaps) and add the
new alias-index state to `references/data-contract.md` with its single-writer rule. After this
task, the two reference docs are the accurate, documented source of truth for the resume-kit
dependency, the `<working_dir>/resume-kit/` alias index, and who is allowed to write it.

**Recommended Agent: opus + medium** — load-bearing reference substrate that downstream tasks
(pipeline design, SKILL wiring, orchestrators) cite verbatim; correctness here prevents
compounding drift, but the work follows a known doc pattern.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `references/resume-kit.md` capability map reflects v0.3.0: terminology tools
      (`resume_suggest_terminology` / `resume_align_terminology`), `inject-keywords`,
      `manage-synonyms`, the `check-ats-structure` (no alias) vs keyword `check-resume-ats`
      (alias) split, the `alias_file` column, and `align-resume` marked DISABLED. *(Already
      applied in-session — verify it is present and correct, do not duplicate.)*
- [ ] `references/resume-kit.md` adds a "Delegable resume-kit skills" note listing the skills
      job-hunter dispatches as subagents: `resume-to-json`, `job-to-json`, `inject-keywords`,
      `update-terminology`, `manage-synonyms`.
- [ ] `references/resume-kit.md` documents that `resume_export` returns artifact bytes (base64
      over MCP) that the caller decodes and writes (cross-refs REQ-007), so the export contract
      is unambiguous.
- [ ] `references/data-contract.md` gains a "resume-kit alias index" state entry describing
      `<working_dir>/resume-kit/config.json` (`alias_file` pointer) and
      `<working_dir>/resume-kit/learning/synonyms.json` (shape
      `{"version":1,"aliases":{},"justifications":{}}`), including the empty-shell bootstrap.
- [ ] `references/data-contract.md` states the single-writer rule: job-hunter writes ONLY the
      empty shell + config pointer; resume-kit's `manage-synonyms` is the sole writer of
      `synonyms.json` thereafter.
- [ ] No section of either doc still describes `align-resume` as an available/normal tailoring
      step (beyond the explicit "DISABLED" note).
- [ ] `npm run check` passes (markdown/link/lint gates the repo enforces on references).

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Edit only the two reference docs. `references/resume-kit.md` was already substantially corrected
in-session (capability map, `alias_file` column, "Terminology mirroring & the alias index"
section, reserved-but-unbuilt list); this task adds the delegable-skills note and the
export-bytes note, and audits the whole file for any lingering "align-resume is available"
framing. For `references/data-contract.md`, follow the existing state-entry style used for other
working-folder state files (config.json, resume-prefs.json), adding the `resume-kit/` alias-index
entry and the single-writer rule alongside them.

### Dependencies

None (can start immediately). It is the upstream dependency for T-0039 (pipeline design), T-0040
(SKILL wiring), and T-0042 (orchestrators), which cite these docs.

### Risk Considerations

- Risk: divergence between these docs and the schemas. Mitigation: where a doc and a schema
  disagree, the schema wins — state that explicitly and do not assert doc facts that contradict
  `schemas/`.
- Risk: re-describing `resume_extract` as the extraction path. Mitigation: per the 2026-08-04
  decision, the extraction path is the agent-driven `resume-to-json` / `job-to-json` skills; the
  raw extract tools are "callable but not surfaced." Keep that framing consistent.

## Status Updates **[REQUIRED]**

**2026-08-04 — Completed.** `references/resume-kit.md`: capability map already reflected v0.3.0
(done in-session); added the "Delegable resume-kit skills (run as subagents)" section
(`resume-to-json`, `job-to-json`, `inject-keywords`, `update-terminology`, `manage-synonyms`) and
an "Export returns artifact bytes" section (base64 decode + write to
`resume/tailored/<job-id>.<ext>`). `references/data-contract.md`: added `resume-kit/` to the
working-folder layout tree and a new "resume-kit alias index" section documenting
`resume-kit/config.json` (`alias_file`) + `learning/synonyms.json` (shape + seed-union) and the
single-writer rule (job-hunter writes only the empty shell + pointer, idempotently;
`manage-synonyms` is the sole content writer). `npm run check` green (schemas, skills, eslint,
markdownlint, prettier all pass).