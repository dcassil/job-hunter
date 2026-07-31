---
name: apply-to-jobs
description: Use when the user says "apply to jobs", "let's apply", "start applying", or otherwise wants to work through the new postings in their job-hunter working folder and submit applications. Runs one interactive apply "run" — it gates on completed setup AND at least one `status:"new"` job, asks the per-run automated-vs-human choice, then walks each new job: resolves resume/cover via the rotation resolver, opens the posting in the browser, fills fields answerable from profile.json without asking, routes unknown questions through the question log, and — honoring the human-in-control principle — either stops before submit for human confirmation or (in automated mode) submits only fully-answerable jobs while deferring ambiguous ones. Records every submission through record-application; never writes jobs.json directly.
---

# apply-to-jobs

The interactive **orchestrator** for one apply run and the highest-consequence skill
in this plugin: it can submit real job applications. Because of that, the
**human-in-control-of-consequences** principle governs everything below. Read it as a
hard constraint, not a suggestion.

It coordinates: locates the working folder, gates on setup and on the presence of at
least one `status:"new"` job, asks the run's automated-vs-human choice, then loops over
the new jobs. For each job it resolves materials via the rotation resolver, opens the
posting in the browser, fills every field it can answer from `profile.json` without
asking, routes unknown fields through the question log, and then either hands control to
the user (human mode) or submits only if the job is fully answerable (automated mode).
Every submission is recorded through the `record-application` worker — this skill NEVER
writes `jobs/jobs.json` or `jobs/jobs.md` itself.

All state shapes here conform EXACTLY to
[`../../references/data-contract.md`](../../references/data-contract.md), the rotation
logic to [`../../references/rotation.md`](../../references/rotation.md), the question
handling to [`../../references/question-log.md`](../../references/question-log.md), and
the schemas in [`../../schemas/`](../../schemas/). Where this document and a schema
appear to disagree, the schema wins.

## Principles (non-negotiable)

- **Human in control of consequences.** The per-run automated-vs-human choice governs
  final submission. In `human` mode, the run ALWAYS stops before the final submit and
  hands control to the user; nothing is submitted or recorded until the user confirms.
  In `auto` mode, a job is submitted only when every required field is answerable
  without inventing anything.
- **Never guess an answer.** An answer that is not in `profile.json` and not obtainable
  from the question log (and, in human mode, not provided by the user) is NEVER
  fabricated. In automated mode an unanswerable job is **deferred**, not submitted.
- **Ask once, reuse forever.** Questions already answered anywhere in `profile.json` are
  never re-asked; genuinely new questions are logged. All of this goes through
  [`question-log.md`](../../references/question-log.md) — never invent your own storage.
- **One status writer.** Only `record-application` changes a job's `status`,
  `applied_at`, `resume_used`, or `cover_used`. This skill NEVER edits `jobs.json` /
  `jobs.md` directly.
- **Gates before actions.** Confirm a valid working folder AND at least one new job
  before touching a browser.
- **Stateless.** Discover all state from `config.json` every run; never rely on
  conversation memory.
- **One failure never aborts the run.** Wrap each per-job step defensively; a job that
  errors is recorded as skipped-with-reason and the loop continues with the next job.

## Gate: valid working folder AND at least one new job

Before anything else, confirm the run is possible:

1. **Working folder.** Read `config.json` and confirm it validates against
   [`../../schemas/config.schema.json`](../../schemas/config.schema.json). Its
   `working_dir` field is the absolute path to the working folder. If no valid
   `config.json` can be found (missing, or fails validation): DO NOT guess, DO NOT
   create any state, and DO NOT proceed. Tell the user the working folder is not set up
   and that they should run the `job-hunter-setup` skill first, then stop.
2. **At least one new job.** Read `<working_dir>/jobs/jobs.json` (a JSON array). Count
   the jobs with `status == "new"`. If the file is missing/empty or **no** job has
   `status:"new"`, explain there is nothing to apply to and suggest running the
   `find-jobs` skill to discover postings first, then stop. Do NOT create the file or
   any partial state.

Only when both gates pass does the run proceed.

## Procedure

### Step 1 — Locate the working folder and load state

Resolve the working folder via `config.json` per the gate above. Read the whole
`config.json` — you will use `automation_default`, `resume_strategy`, `resume_domains`,
and `round_robin_pointer` below. Read `<working_dir>/profile.json` (demographics,
contact, logged_questions) and `<working_dir>/job-focus.md` (advisory domain context for
rotation). List the resume variant ids present in `<working_dir>/resume/` and the cover
variant ids in `<working_dir>/cover-letters/`, expressed as ids per
[variant naming](../../references/data-contract.md#variant-naming) and in a stable sorted
order so round-robin is deterministic.

### Step 2 — Ask the automated-vs-human choice for this run

The run's automated-vs-human setting governs how far the run goes without human
confirmation. Default it to `config.automation_default`:

- `ask` → **prompt the user** for this run: automated (`auto`) or human-in-the-loop
  (`human`)? Record their answer for the run.
- `auto` → use `auto` for the run **without prompting**, but tell the user this is the
  default and that they may override it to `human`.
- `human` → use `human` for the run **without prompting**, telling the user they may
  override it to `auto`.

Carry the resolved choice — call it the **run mode** (`auto` or `human`) — through every
job below. It is the single switch that decides submit-vs-defer behavior.

### Step 3 — Build the work list

Collect every job with `status:"new"` from `jobs.json`. This is the ordered work list for
the run. Optionally show the user the list (title, company, link) and let them narrow it
to a subset, but never widen it beyond `status:"new"` jobs — this skill only acts on new
jobs. Keep a per-job outcome record for the final summary: `applied`, `deferred`, or
`skipped`, each with a reason.

### Step 4 — Per-job loop (defensive; one failure never aborts the run)

For each job in the work list, do the following **inside a defensive boundary**: if any
step throws, is blocked, or leaves the job in an uncertain state, stop working THAT job,
record it as `skipped` (with the reason, e.g. "posting 404", "browser blocked", "form
structure unrecognized"), leave its `status` as `new`, and continue with the next job.
Never let one job's failure corrupt the list or halt the remaining jobs. Because only
`record-application` mutates the list and it is called only on a confirmed submit, a
mid-job failure leaves `jobs.json` untouched for that job.

#### 4a — Resolve materials via the rotation resolver

Apply [`rotation.md`](../../references/rotation.md) with `config.resume_strategy`, the
available resume variant ids from Step 1, `config.resume_domains`,
`config.round_robin_pointer`, and this job's domain signal (from its `title` / `company`
/ `notes` and `job-focus.md` context). It returns `{ resume_used, cover_used }` (either
may be `null` when no variant/cover exists). Follow the resolver's
[pointer-persistence rule](../../references/rotation.md#pointer-persistence) exactly: the
`round_robin_pointer` in `config.json` is advanced and written back **only** when a
round-robin slot is actually consumed (the `round-robin` strategy, or `both` when it
falls through to round-robin). That single field is the ONLY thing this skill may write to
`config.json`; touch nothing else in it. Hold the returned ids to pass to
`record-application` on submit.

#### 4b — Open the posting in the browser

Open the job's `url` with the claude-in-chrome tools (a new tab in the user's existing
session). Follow the claude-in-chrome guidance: prefer its structured page-read and
form-input tools, avoid triggering native dialogs, and read the form before acting. If
the posting cannot be opened (dead link, login/anti-bot wall, CAPTCHA), treat it as a
per-job failure: record `skipped` with the reason and continue.

#### 4c — Fill fields answerable from profile.json (WITHOUT asking)

For each field on the application form, resolve its value through the question log's
[lookup order](../../references/question-log.md#lookup-order):

1. **Structured demographics/contact.** If the field maps to a
   `profile.demographics` field (`gender`, `ethnicity`, `veteran`, `disability`,
   `work_authorized`, `needs_sponsorship`) or a present `profile.contact` field (e.g.
   `full_name`, `email`), fill it from there directly. These are answerable without
   asking — fill them and do not log them.
2. **Logged questions.** Normalize the question text per the
   [reuse-key rules](../../references/question-log.md#normalizing-the-reuse-key) and scan
   `profile.logged_questions`. If a match is `answered:true` with a non-null `answer`,
   **reuse** it and fill the field.

Attach the resolved resume file for `resume_used` and cover file for `cover_used` where
the form has upload/text slots for them (skip an attachment whose id is `null`).

#### 4d — Handle unknown fields/questions (the guess boundary)

A field is **unknown** when it is not answerable from demographics/contact and has no
answered logged question. For each unknown field, route through
[`question-log.md`](../../references/question-log.md) — never invent storage:

- If it is a **genuinely new** question (matches nothing in demographics, contact, or
  `logged_questions`), append it to `profile.logged_questions` with `answer: null`,
  `source_job` set to this job's `id`, and `answered: false`, per
  [appending a new question](../../references/question-log.md#appending-a-new-question).
  If it matches an existing but **unanswered** logged question, do NOT duplicate it.
- **Then branch on the run mode:**
  - **`human` mode:** prompt the user for the answer. When they provide it, update the
    matching logged item in place (`answer` set, `answered: true`) per
    [recording an obtained answer](../../references/question-log.md#recording-an-obtained-answer),
    fill the field, and the question is now reusable on future runs. If the user declines
    to answer, leave the field unfilled and let Step 4e handle the stop.
  - **`auto` mode:** DO NOT guess and DO NOT ask (automated runs are non-interactive for
    consequences). The job is now **not fully answerable** → mark it for **deferral** in
    Step 4e. The question stays logged (unanswered) so a later human run can answer it.

Every write to `profile.json` must leave it valid against
[`profile.schema.json`](../../schemas/profile.schema.json): top-level
`additionalProperties:false`, `demographics` complete, each `logged_questions` item
carrying only `question`/`answer`/`source_job`/`answered`.

#### 4e — Submit-or-defer (HUMAN IN CONTROL)

This is the consequence gate. Behavior depends strictly on the run mode:

- **`human` mode — always stop before final submit.** Do NOT click submit. Present the
  filled form back to the user (fields filled, materials attached, any unresolved
  fields), then **hand control to the user** so they review and submit themselves (or
  ask you to). Wait for the user's explicit confirmation that the application was
  submitted. Only AFTER that confirmation do you proceed to Step 4f to record it. If the
  user does not confirm submission, do not record it: leave the job `status:"new"` and
  record its outcome as `deferred` (reason: "awaiting user submission / not confirmed").
  Never record an application the user did not confirm.

- **`auto` mode — submit only if fully answerable.**
  - If every required field was answered from `profile.json` / the question log (no
    unknowns hit the guess boundary in 4d), you MAY complete and submit the form.
    Verify submission actually succeeded (confirmation page/state) before recording.
  - If ANY required field was unanswerable (an unknown was reached in 4d), DO NOT submit
    and DO NOT guess. **Defer** the job: leave `status:"new"`, flag it in the summary
    (reason: "unanswered question — needs a human-in-the-loop run"), and continue. The
    logged unanswered question makes it resolvable on a later `human` run.

#### 4f — Record a confirmed submission via record-application

Only when a submission is confirmed (user-confirmed in `human` mode, or verified
successful in `auto` mode) call the [`record-application`](../record-application/SKILL.md)
worker — the SOLE writer of pipeline status — with:

```json
{
  "id": "<this job's id>",
  "status": "applied",
  "resume_used": "<from 4a, or null>",
  "cover_used": "<from 4a, or null>"
}
```

`record-application` validates the `new → applied` transition, sets `applied_at` to
today's date, writes `resume_used` / `cover_used`, and regenerates `jobs.md`. Do NOT
write `jobs.json` or `jobs.md` yourself. Inspect its return: on
`{ "id", "from", "to", "applied_at", "resume_used", "cover_used" }` mark the job
`applied` in your summary. If it returns an error object
(`{ "error": "no-working-folder" }`, `{ "error": "job-not-found" }`,
`{ "error": "invalid-status" }`, or `{ "error": "invalid-transition", ... }`), treat the
job as a per-job failure: record it `skipped` with the error as the reason and continue —
do not retry with fabricated data and do not abort the run.

### Step 5 — Report the run summary

After the loop, print a summary listing every job worked and its outcome — `applied`,
`deferred`, or `skipped` — each with a reason, plus totals. Remind the user that deferred
jobs are still `status:"new"`, that unanswered logged questions can be resolved on a
`human` run, and that they can review the pipeline in `jobs/jobs.md`.

Suggested format:

```text
Apply run — run mode: human · new jobs worked: 5

Per job:
- linkedin-3891  Senior Backend Engineer @ Acme      : applied   (resume-b / cover-b)
- indeed-1024    Platform Engineer @ Nimbus Labs      : deferred  (unanswered: "Desired salary?" — needs human run)
- glassdoor-77   SRE @ Globex                         : applied   (resume-a / cover-a)
- generic-abc123 Backend Dev @ Initech                : skipped   (posting behind login wall)
- linkedin-4002  Staff Engineer @ Hooli               : deferred  (user did not confirm submission)

Totals: 2 applied · 2 deferred · 1 skipped
```

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json` (discovery + `automation_default`,
  `resume_strategy`, `resume_domains`, `round_robin_pointer`),
  `<working_dir>/jobs/jobs.json` (the `status:"new"` work list),
  `<working_dir>/profile.json` (demographics, contact, logged_questions),
  `<working_dir>/job-focus.md` (advisory domain context), the resume/cover variant files
  under `<working_dir>/resume/` and `<working_dir>/cover-letters/`, and the
  contracts/schemas in [`../../references/`](../../references/) and
  [`../../schemas/`](../../schemas/).
- **Writes directly:** `<working_dir>/profile.json` only — appending or answering logged
  questions via [`question-log.md`](../../references/question-log.md) — and, per
  [`rotation.md`](../../references/rotation.md#pointer-persistence), the
  `round_robin_pointer` field of `<working_dir>/config.json` when (and only when) a
  round-robin slot is consumed. It writes NOTHING else in `config.json`.
- **Writes via workers:** `<working_dir>/jobs/jobs.json` and `<working_dir>/jobs/jobs.md`
  are written EXCLUSIVELY through the [`record-application`](../record-application/SKILL.md)
  worker on a confirmed submission — never directly.
- **Dispatches:** the claude-in-chrome browser tools (open/fill posting) and the
  `record-application` worker.
