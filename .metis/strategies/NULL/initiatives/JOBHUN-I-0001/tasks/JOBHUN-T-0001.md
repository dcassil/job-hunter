---
id: write-references-data-contract-md
level: task
title: "Write references/data-contract.md"
short_code: "JOBHUN-T-0001"
created_at: 2026-07-31T00:16:37.905456+00:00
updated_at: 2026-07-31T00:16:37.905456+00:00
parent: JOBHUN-I-0001
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0001
---

# Write references/data-contract.md

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0001]]

## Objective **[REQUIRED]**

Author `references/data-contract.md`: the single, authoritative human-readable
reference that every job-hunter skill links to as the source of truth for the
working-folder layout, the file schemas, shared conventions (id generation, dedupe
key, status enum + transitions, resume/cover variant naming), and the working-folder
discovery contract. The JSON schemas in `schemas/` already exist and are the machine
contract; this document explains and pins the *semantics* around them.

## Acceptance Criteria **[REQUIRED]**

- [ ] `references/data-contract.md` exists with these sections: Working-folder layout;
      Discovery contract; `config.json`; `profile.json`; `job-focus.md`; `jobs/jobs.json`;
      `jobs/jobs.md` mirror; Shared conventions (job id, dedupe key, status enum +
      transitions, variant naming).
- [ ] Every field described matches the corresponding JSON Schema in `schemas/`
      (no field named that the schema forbids; no required field omitted).
- [ ] Status enum documented as `new → applied → interviewing → offer` with `skipped`
      and `rejected` as terminal side states, and the allowed transitions listed.
- [ ] Discovery contract documented: setup records the absolute working-folder path;
      skills confirm validity by the presence of `config.json`; skills with no
      discoverable working folder must gate and tell the user to run setup.
- [ ] Dedupe identity documented: canonical URL, falling back to normalized
      `title` + `company` + `location`.
- [ ] Job id convention documented (e.g. `<source>-<site-native-id-or-hash>`).
- [ ] Document links to the schema files by relative path.
- [ ] `npm run check` passes (markdownlint + format included).

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `schemas/config.schema.json`, `schemas/profile.schema.json`,
`schemas/jobs.schema.json`, and the example fixtures under `schemas/examples/`. Write
prose + tables that exactly reflect them. Do NOT change the schemas. Keep line length
markdownlint-friendly (MD013 is disabled, but keep it readable). Run `npm run format`
then `npm run check` before finishing.

### Dependencies

Schemas and fixtures already exist on `main` (created with the guardrail scaffold).
No other task depends on this one starting, but downstream initiatives cite this doc.

### Risk Considerations

Risk: doc drifts from schemas. Mitigation: describe fields directly from the schema
files; where a value set exists, copy the enum verbatim.

### Recommended Agent

opus + medium — single doc, but load-bearing as the cited contract; needs careful
cross-referencing against the schemas.

## Status Updates **[REQUIRED]**

*To be added during implementation*
