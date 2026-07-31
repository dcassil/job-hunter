---
id: build-update-resumes-skill
level: task
title: "Build update-resumes skill"
short_code: "JOBHUN-T-0013"
created_at: 2026-07-31T00:42:42.545461+00:00
updated_at: 2026-07-31T00:48:34.630532+00:00
parent: JOBHUN-I-0005
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0005
---

# Build update-resumes skill

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0005]]

## Objective **[REQUIRED]**

Build `update-resumes`: a maintenance skill to add, replace, or remove resume and
cover-letter variants and reconfigure the rotation strategy / domain mapping, reusing
the setup wizard's ingestion and rotation-capture helper.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/update-resumes/SKILL.md` exists (`name: update-resumes`), description
      triggering on "update my resumes" / "update resumes/cover letters on file".
- [ ] Gate: requires a valid working folder (`config.json`); if absent, tell the user to
      run `job-hunter-setup` and stop.
- [ ] Lists current resume and cover variants (from `resume/` / `cover-letters/` and
      `config`), then lets the user add / replace / remove variants (by path or copy-in),
      reusing `skills/job-hunter-setup/references/ingestion.md` (cite; do not duplicate).
- [ ] When the variant count crosses the single↔multiple boundary or the user asks to
      change it, re-run the rotation-strategy capture from `ingestion.md`; update
      `config.resume_strategy`, `resume_domains`, and clamp `round_robin_pointer` to a
      valid index (per the "Reconfiguring later" section of that helper).
- [ ] Writes back `config.json` (schema-valid) and the `resume/` / `cover-letters/`
      contents; confirms before destructive actions (removing/replacing a file).
- [ ] Does NOT touch `jobs/jobs.json` or `profile.json`.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/data-contract.md`, `schemas/config.schema.json`,
`skills/job-hunter-setup/references/ingestion.md`, and `skills/job-hunter-setup/SKILL.md`
(gate/style). Instruction file. Lean on the ingestion helper for both the add/replace/
remove flow and rotation reconfiguration so behavior matches setup exactly.

### Dependencies

Reuses the setup ingestion helper (on `main`). Independent of the other two maintenance
tasks — safe to build in parallel.

### Risk Considerations

Risk: rotation state left inconsistent after variant changes → follow the helper's
"Reconfiguring later" rules (drop removed variants from `resume_domains`, clamp pointer).
Risk: destroying a file the user wanted → confirm before remove/replace.

### Recommended Agent

opus + medium — touches config + files and must keep rotation state consistent.

## Status Updates **[REQUIRED]**

*To be added during implementation*