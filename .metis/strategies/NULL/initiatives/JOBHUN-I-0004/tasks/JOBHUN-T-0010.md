---
id: build-apply-to-jobs-orchestrator
level: task
title: "Build apply-to-jobs orchestrator skill"
short_code: "JOBHUN-T-0010"
created_at: 2026-07-31T00:37:04.381914+00:00
updated_at: 2026-07-31T00:37:04.381914+00:00
parent: JOBHUN-I-0004
blocked_by: [JOBHUN-T-0009]
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0004
---

# Build apply-to-jobs orchestrator skill

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0004]]

## Objective **[REQUIRED]**

Build `apply-to-jobs`: the interactive orchestrator that walks `status:"new"` jobs,
selects materials via the rotation resolver, fills each application from `profile.json`,
logs new questions via the question-log helper, and — per the run's automated-vs-human
choice — submits or stops for human review, recording the outcome through
`record-application`. This is the highest-consequence skill: it can submit real
applications, so oversight is central.

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/apply-to-jobs/SKILL.md` exists (`name: apply-to-jobs`), description
      triggering on "apply to jobs" / "let's apply".
- [ ] Gate: requires completed setup (`config.json`) AND at least one job with
      `status:"new"`; otherwise explain and stop (suggest running `find-jobs`).
- [ ] Asks automated-vs-human-in-the-loop for the run, defaulting to
      `config.automation_default`.
- [ ] Per `new` job: resolve resume/cover via `references/rotation.md`; open the posting
      in the browser (claude-in-chrome); fill fields answerable from `profile.json`
      (demographics, work-auth, contact) WITHOUT asking.
- [ ] For each unknown field/question: use `references/question-log.md` — reuse a stored
      answer if present; otherwise log it. In human-in-the-loop mode, prompt the user and
      store the answer for reuse. In automated mode, DO NOT guess — defer the job
      (leave it `new`, flag it) rather than submit with a fabricated answer.
- [ ] Human-in-the-loop mode MUST stop before final submit and hand control to the user;
      only after the user confirms submission is it recorded.
- [ ] Automated mode may submit jobs that are fully answerable; ambiguous ones are
      deferred.
- [ ] On submission, call `record-application` to set `status:"applied"`, `applied_at`,
      and the `resume_used`/`cover_used` variants. Never write `jobs.json` directly.
- [ ] A failure on one job MUST NOT corrupt the list or block the remaining jobs.
- [ ] Reports a run summary (applied / deferred / skipped, with reasons).
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/data-contract.md`, `references/rotation.md`,
`references/question-log.md`, `skills/record-application/SKILL.md`, and
`skills/find-jobs/SKILL.md` (for orchestrator style/gates). Instruction file. Describe
the per-job loop, the two automation branches, the review stop, and defensive handling.
Reference claude-in-chrome tools for form filling; follow their dialog-avoidance
guidance. Emphasize the human-in-control principle throughout.

### Dependencies

Blocked by JOBHUN-T-0009 (record-application, rotation, question-log). Consumes the
search subsystem's populated `jobs.json`.

### Risk Considerations

Risk: silent bad submissions → never guess in automated mode; human mode always stops
before submit. Risk: status written in two places → only `record-application` writes it.
Risk: one job's failure aborts the run → isolate per-job handling.

### Recommended Agent

opus + high — highest-consequence skill; oversight logic and integration must be exact.

## Status Updates **[REQUIRED]**

*To be added during implementation*
