---
id: build-job-hunter-setup-skill-and
level: task
title: "Build job-hunter-setup skill and shared ingestion/analysis helpers"
short_code: "JOBHUN-T-0002"
created_at: 2026-07-31T00:21:14.046129+00:00
updated_at: 2026-07-31T00:26:15.241273+00:00
parent: JOBHUN-I-0002
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0002
---

# Build job-hunter-setup skill and shared ingestion/analysis helpers

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0002]]

## Objective **[REQUIRED]**

Author the `job-hunter-setup` orchestrator skill (the setup wizard) plus two shared
reference docs it relies on and that the maintenance skills (JOBHUN-I-0005) will
reuse: an ingestion helper (resume/cover ingestion + rotation-strategy capture) and a
resume-analysis helper (review resume text → propose target job types). This is core
architecture: downstream skills reuse these patterns, so the interfaces must be clean
and stable.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/job-hunter-setup/SKILL.md` exists with valid frontmatter: `name:
      job-hunter-setup`, a `description` (20–1024 chars) that says to use it when the
      user says "let's set up job-hunter" / wants to set up the plugin.
- [ ] The SKILL.md body encodes the full ordered wizard as an explicit checklist:
      (1) ask working-folder location (current dir / Desktop / a given path) and
      confirm before creating; (2) create `job-hunter/` with `jobs/`, `resume/`,
      `cover-letters/`; (3) ingest resumes (paths mode with "add another?" loop, or
      copy-in mode with a "let me know when done" prompt) → save as `resume-a`,
      `resume-b`, …; (4) ingest cover letters the same way → `cover-a`, …; (5) if >1
      variant, ask rotation strategy (round-robin A/B, domain-targeted, or both) and,
      if domain, collect the domain→variant mapping; (6) ask remote/local/both;
      (7) collect screening answers (gender, ethnicity, veteran, disability,
      work_authorized, needs_sponsorship); (8) review resume, propose likely job
      types in a few lines, let the user add/change, confirm; (9) write `config.json`,
      `profile.json`, `job-focus.md`.
- [ ] Every consequential step (folder creation, writing state files) is confirmed
      with the user before acting.
- [ ] All written state conforms EXACTLY to the data contract: read
      `references/data-contract.md` and the `schemas/*.json`. `config.json`,
      `profile.json`, and `jobs/jobs.json` (initialized to `[]`) must validate
      against their schemas. Set `working_dir`, `automation_default` (default `ask`),
      `resume_strategy` (`single` when only one variant), `remote_pref`, `sites`
      (sensible default e.g. all of linkedin/indeed/glassdoor).
- [ ] Gate: if a valid `config.json` already exists at the chosen folder, switch to
      update mode (offer to update specific pieces) rather than clobbering.
- [ ] `skills/job-hunter-setup/references/ingestion.md` exists: reusable procedure for
      ingesting resume/cover variants (both modes, add-another loop, variant naming
      per the contract) and capturing/reconfiguring rotation strategy. Written so
      maintenance skills can cite it.
- [ ] `skills/job-hunter-setup/references/resume-analysis.md` exists: reusable
      procedure for reading resume file(s) and summarizing skills + likely target job
      types for confirmation.
- [ ] The SKILL.md references both helper docs by relative path rather than
      duplicating their content.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Skills are instruction files (Markdown), not runtime code — write clear, imperative,
step-by-step instructions for the agent that will execute the skill. Express the
user-facing branching in prose (the executing agent will ask the user). Copying files:
instruct use of standard file tools / `cp`. Resume text extraction for analysis:
instruct reading the file (PDF/text) via the Read tool. Keep the SKILL.md focused on
orchestration and delegate the repeatable procedures to the two reference docs. Do NOT
implement search or apply behavior here.

### Dependencies

Depends on the data contract (`references/data-contract.md`) and schemas, already on
`main`. No sibling tasks.

### Risk Considerations

Risk: state files drift from schemas. Mitigation: the skill must instruct validating
written JSON against the schemas — the plugin's `npm run check` will NOT run inside the
user's working folder, so the skill itself must specify exact field shapes and values.
Risk: helper docs duplicate SKILL content — keep procedures in the helpers, keep
orchestration/branching in SKILL.md.

### Recommended Agent

opus + high — core architecture; establishes the ingestion/analysis interfaces that
the maintenance initiative reuses. A wrong interface here creates compounding rework.

## Status Updates **[REQUIRED]**

*To be added during implementation*