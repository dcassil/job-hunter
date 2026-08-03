---
id: new-interactive-apply-skill
level: task
title: "New interactive-apply skill (collaborative one-by-one)"
short_code: "JOBHUN-T-0021"
created_at: 2026-08-01T17:37:16+00:00
updated_at: 2026-08-01T22:00:39.686766+00:00
parent: JOBHUN-I-0007
blocked_by: [JOBHUN-T-0018]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0007
---

# New interactive-apply skill (collaborative one-by-one)

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0007]]

## Objective **[REQUIRED]**

Add the user-facing `interactive-apply` skill: when the user says "let's go through the
ones you couldn't complete together," present the backlog of jobs needing human help and
work them one at a time — showing each job's company/role details and blocking reason,
asking whether to apply, then opening and co-filling the application while pausing for the
human-only parts.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] New skill directory `skills/interactive-apply/SKILL.md` with frontmatter `name` +
      `description` whose triggers include phrasings like "let's go through the ones you
      couldn't complete together" / "apply to the deferred ones with me".
- [x] Gate: valid working folder (per `config.json`); if none, instruct the user to run
      `job-hunter-setup` and stop.
- [x] Builds the queue from `jobs.json`: statuses `needs_human` / `account_required`, plus
      deferred/external jobs and any saved drafts; presents a numbered list first.
- [x] Per job, ONE AT A TIME: shows role + company info (title, company, location, comp if
      known, short description/why-it-fits, ATS type, and the exact blocking reason), then
      asks the user **"apply to this one?"** (yes / skip / stop).
- [x] On yes: opens the application (human speed), fills everything resolvable from
      `profile.json`/question-log per `references/custom-application.md`, and **pauses and
      asks the user** to complete each human-only part (create account, enter password,
      paste email/OTP code, solve CAPTCHA, answer an unknown question), resuming after each.
- [x] Newly obtained reusable answers are written back to `profile.logged_questions` via
      the question-log rules; the account/password/email/CAPTCHA steps are performed by the
      user, never the agent.
- [x] On a confirmed submit, calls `record-application` (status `applied`, `resume_used`,
      `cover_used`); if the user stops mid-way, the job stays `needs_human` with an updated
      `handoff`.
- [x] Skill states the safety invariant and human-speed-only rule; validates and is
      registered; `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Model the orchestration on `apply-to-jobs` (gates, per-job loop, record-application on
submit) but make it **interactive** — it prompts the user and waits, rather than deferring.
Share `references/custom-application.md` for all form mechanics; do not duplicate them.
Company/role detail can come from the job's stored fields plus a quick read of the posting.
This is a new user-facing orchestrator, so the skill description/triggers must be crisp for
discovery.

**Recommended Agent: opus + high** — a new user-facing orchestration skill with interactive
pause/resume, queue construction, and correct record-application/question-log integration;
sets a pattern for collaborative flows and is easy to get subtly wrong.

## Verification **[REQUIRED]**

- [x] Walk through the skill against a seeded `jobs.json` containing a `needs_human` job and
      an `account_required` job: confirm it lists them, shows details + blocking reason,
      asks before opening, and (in a live check) pauses at the human-only step.
- [x] Confirm on submit it routes through `record-application` and on stop it leaves the job
      `needs_human` with an updated handoff.
- [x] `npm run check` passes; the skill appears in validation output.