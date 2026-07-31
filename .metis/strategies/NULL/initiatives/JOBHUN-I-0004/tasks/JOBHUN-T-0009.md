---
id: build-record-application-worker
level: task
title: "Build record-application worker, rotation resolver, and question-log helpers"
short_code: "JOBHUN-T-0009"
created_at: 2026-07-31T00:36:59.435485+00:00
updated_at: 2026-07-31T00:41:28.658879+00:00
parent: JOBHUN-I-0004
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0004
---

# Build record-application worker, rotation resolver, and question-log helpers

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0004]]

## Objective **[REQUIRED]**

Build the foundation of the application subsystem that `apply-to-jobs` will consume:
(1) `skills/record-application/SKILL.md` — the sole writer of a job's application-status
fields, enforcing the status-transition rules; (2) `references/rotation.md` — the
resume/cover rotation resolver (round-robin, domain, both); (3) `references/question-log.md`
— the read/append procedure for `profile.json.logged_questions` implementing
"ask once, reuse forever".

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/record-application/SKILL.md` (`name: record-application`) — non-interactive
      worker. Given a job `id`, a target `status`, and (when applying) the
      `resume_used` / `cover_used` variant ids, it: locates the working folder via
      `config.json`; finds the job in `jobs/jobs.json`; validates the transition against
      the status graph in `references/data-contract.md` (reject invalid transitions,
      returning a clear error); on a move to `applied` sets `applied_at` to today and
      records `resume_used`/`cover_used`; writes `jobs.json`; regenerates `jobs/jobs.md`.
      It NEVER changes any field other than the status/application fields for that one job.
- [ ] `references/rotation.md` — given `config.resume_strategy`, the available variant
      ids, `config.resume_domains`, `config.round_robin_pointer`, and the job (title/
      company/domain), returns which `resume`/`cover` variant to use. Specifies: `single`
      → the only variant; `round-robin` → variant at the pointer, then advance+persist
      the pointer; `domain` → best domain match from `resume_domains`; `both` → domain
      match first, else round-robin. Documents how/when `round_robin_pointer` is advanced
      and persisted, and the cover-letter pairing (`cover-<label>` matches `resume-<label>`).
- [ ] `references/question-log.md` — procedure to: normalize a question string (trim,
      collapse whitespace, lowercase) as the reuse key; look it up in
      `profile.json.logged_questions` and in `demographics`/`contact`; if answered,
      reuse; if new, append `{question, answer:null, source_job, answered:false}`; when
      an answer is obtained, set `answer` and `answered:true`. All writes keep
      `profile.json` valid against its schema.
- [ ] All three conform exactly to the data contract and schemas.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/data-contract.md`, `schemas/jobs.schema.json`,
`schemas/config.schema.json`, `schemas/profile.schema.json`, and
`skills/add-job-to-list/SKILL.md` (for the jobs.md regeneration convention — keep it
identical so both writers produce the same mirror format). Instruction files.

### Dependencies

Data contract + schemas + jobs.md mirror convention (on `main`). Blocks JOBHUN-T-0010
(the orchestrator consumes all three).

### Risk Considerations

Risk: two different jobs.md formats (add-job-to-list vs record-application) → reuse the
exact same table format. Risk: invalid transitions corrupt the pipeline → validate
against the documented status graph and reject. Risk: pointer desync → define a single
persist point for `round_robin_pointer`.

### Recommended Agent

opus + high — foundational; defines the status-writer, rotation, and question-log
interfaces the orchestrator depends on.

## Status Updates **[REQUIRED]**

*To be added during implementation*