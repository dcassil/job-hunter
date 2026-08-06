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
- **Human owns the prohibited + consequential steps.** Never create an account, enter a
  password, read the user's email (for a confirmation link/OTP), solve a CAPTCHA, or
  enter payment details — on any site, ever. On a custom application these become a
  **handoff** to the user (status `needs_human` / `account_required`), never an action
  the skill performs.
- **Human-speed UI only.** Drive applications with real clicks/typing at a deliberate
  pace; never submit or fill via `fetch`/XHR/DOM injection (anti-bot-guard). See
  [`custom-application.md`](../../references/custom-application.md).
- **Pre-answer gates on every field.** Before answering any field, apply the
  [pre-answer gates](../../references/question-log.md#pre-answer-gates): if it could be an
  AI/bot-detection trap, or if it needs prose beyond a known short answer, do NOT fill it —
  log it for the user (`needs: ["bot-check"]` or `["question"]`). Conservative: when
  unsure, log for the user.
- **Ask once, reuse forever.** Questions already answered anywhere in `profile.json` are
  never re-asked; genuinely new questions are logged. All of this goes through
  [`question-log.md`](../../references/question-log.md) — never invent your own storage.
- **One status writer.** Only `record-application` changes a job's `status`,
  `applied_at`, `resume_used`, or `cover_used`. This skill NEVER edits `jobs.json` /
  `jobs.md` directly.
- **Tailoring is attachment selection, not status or rotation.** When per-run resume
  tailoring is enabled, this orchestrator only prompts, gates on resume-kit, invokes the
  [`tailor-resume`](../tailor-resume/SKILL.md) worker using its
  [call contract](../tailor-resume/SKILL.md#call-contract), and acts on the returned
  envelope. It does not duplicate tailoring logic. `record-application` still receives the
  base `resume_used` variant id selected by rotation; any tailored file is only the resume
  attachment for that application.
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

### Step 2b — tailoring choice

Ask whether to tailor resumes for this run. This is a per-run choice only: persist nothing
to `config.json` or anywhere else as a default.

1. Ask: **tailor resumes this run?** (`y` / `n`).
2. If `n`, set tailoring for this run to off. Every job's summary tailoring outcome is
   `not tailored`.
3. If `y`, ask for:
   - **freedom**: an integer from `0` to `10`;
   - **review mode**: one of `interactive`, `review-after`, or `automatic`.
4. Only when tailoring is requested, gate on resume-kit per
   [`references/resume-kit.md`](../../references/resume-kit.md). If absent, show the exact
   guided-install hand-off from that reference:

   ```text
   Resume tailoring needs the `resume-intelligence` plugin (marketplace `resume-kit`). Install it with `/plugin`, then re-run.
   ```

   Then offer the user an explicit choice: install/re-run later, or continue this apply run
   untailored. If they choose install/re-run, stop without creating partial application or
   tailoring state. If they choose to continue untailored, turn tailoring off for this run
   and mark every per-job tailoring outcome as `not tailored (resume-kit unavailable; user
   continued untailored)`.
5. When tailoring is on and resume-kit is present, **bootstrap the project alias index**
   (idempotent, create-if-absent): ensure `<working_dir>/resume-kit/config.json` carries
   `"alias_file": "learning/synonyms.json"` and that `<working_dir>/resume-kit/learning/synonyms.json`
   exists as the empty shell `{"version":1,"aliases":{},"justifications":{}}`. Write ONLY the
   shell + pointer, never its content — `manage-synonyms` (inside `tailor-resume`) is the sole
   content writer. See
   [`data-contract.md`](../../references/data-contract.md#resume-kit-alias-index).

The **tailoring review mode** is independent of the apply **run mode**. In `auto` run mode
with tailoring review mode `interactive`, skipped-strong jobs run fully `auto` with no
pause; jobs needing changes pause ONLY for edit approval inside `tailor-resume`, then resume
`auto` behavior for field fill and the normal submit gate; `automatic` review mode never
pauses. Pass the selected review mode through to the worker so any edit-approval pause lives
inside it. This orchestrator's submit/defer behavior stays governed only by the run mode.

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

After the resolver returns, decide the resume attachment for this job:

- Start with the base attachment for `resume_used` (or no resume attachment when
  `resume_used` is `null`) and a tailoring outcome of `not tailored`.
- If tailoring is off for this run or `resume_used` is `null`, do not call the worker.
- If tailoring is on, call [`tailor-resume`](../tailor-resume/SKILL.md) exactly as a worker
  using its [call contract](../tailor-resume/SKILL.md#call-contract):

  ```json
  {
    "working_dir": "<absolute working_dir from config.json>",
    "resume_variant_id": "<resume_used from rotation>",
    "job": "<this job object>",
    "freedom": "<Step 2b integer 0-10>",
    "review_mode": "<Step 2b review mode>"
  }
  ```

- Act only on the returned envelope:
  - `tailored-pass` with `tailored_path` → attach `tailored_path`; summarize as
    `tailored -> score <final_score>`.
  - `skipped-strong` → attach the base resume; summarize as `skipped-strong` or
    `skipped-strong (base score <original_score>)`.
  - `tailored-best-effort` / `declined` → follow the worker's user decision when its
    envelope includes a `tailored_path` to use; otherwise attach the base resume and
    summarize as `best-effort -> score <final_score>` or `declined`.
- From the envelope's `changes_applied`, also record the **terminology and injection
  outcomes** for the summary: the count of `term_swap` edits applied (wording mirrors), the
  count of `skill_add` / `bullet_add` edits (keywords injected), and any synonyms grown this
  run (the worker reports these). Fold them into the job's tailoring outcome, e.g.
  `tailored -> score 84 (2 term-swaps, 1 keyword injected, 1 synonym grown)`.
- If the tailoring call errors, returns an unusable envelope, or cannot produce an
  attachment decision, degrade to the base resume, note the tailoring outcome as
  `not tailored (tailoring error: <reason>)`, and continue the per-job defensive loop.

Keep both values separate for the rest of the job: `resume_used` is the base variant id for
rotation and `record-application`; the chosen resume attachment path is what 4c or 4x uploads
to the application form.

#### 4b — Open the posting and route by application type

Open the job's `url` with the claude-in-chrome tools (a new tab in the user's existing
session). Follow the claude-in-chrome guidance: prefer its structured page-read and
form-input tools, avoid triggering native dialogs, and read the form before acting. If
the posting cannot be opened (dead link, login/anti-bot wall on the *posting itself*),
treat it as a per-job failure: record `skipped` with the reason and continue.

Then determine the **application type** and route:

- **LinkedIn Easy Apply** (an in-LinkedIn "Easy Apply" flow): use the Easy Apply path,
  steps 4c–4f below.
- **External / ATS / custom** (an "Apply" that leaves LinkedIn for Greenhouse, Lever,
  Workday, Ashby, iCIMS, SmartRecruiters, or a company site): use the **custom route**,
  step [4x](#4x--custom--non-easy-apply-route) below, which follows
  [`references/custom-application.md`](../../references/custom-application.md). Do NOT
  attempt the Easy Apply steps on a custom site.

#### 4c — Fill fields answerable from profile.json (WITHOUT asking)

For each field, FIRST apply the two
[pre-answer gates](../../references/question-log.md#pre-answer-gates) — they run before any
lookup and are conservative (when unsure, log for the user, never guess):

- **Trap gate** — could this be an AI/bot-detection trap or honeypot (hidden/off-screen
  input, "leave blank if human", "are you an AI/bot?")? If maybe, do NOT fill it. In this
  batch, treat the job as needing the user: record a handoff with `needs` including
  `bot-check` (via 4x-style handoff / `record-application`) and do not submit.
- **Free-response gate** — does the field need prose beyond a known static answer or ~1–4
  words (essay, "why this company?", open cover text)? If yes, do NOT auto-answer; handle
  it as an unknown in 4d (`needs: ["question"]`), leaving it for a human.

Only a field that passes BOTH gates is answered. Resolve its value through the question
log's [lookup order](../../references/question-log.md#lookup-order):

1. **Structured demographics/contact.** If the field maps to a
   `profile.demographics` field (`gender`, `ethnicity`, `veteran`, `disability`,
   `work_authorized`, `needs_sponsorship`) or a present `profile.contact` field (e.g.
   `full_name`, `email`, `phone`, `linkedin_url`, or `portfolio_url` for
   "website"/"portfolio" fields), fill it from there directly. These are answerable
   without asking — fill them and do not log them.
2. **Logged questions.** Normalize the question text per the
   [reuse-key rules](../../references/question-log.md#normalizing-the-reuse-key) and scan
   `profile.logged_questions`. If a match is `answered:true` with a non-null `answer`,
   **reuse** it and fill the field.

Attach the chosen resume attachment from 4a and the cover file for `cover_used` where the
form has upload/text slots for them (skip an attachment whose id is `null` or whose chosen
path is absent).

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
  "resume_used": "<base resume_used from 4a, or null>",
  "cover_used": "<from 4a, or null>"
}
```

`record-application` validates the `new → applied` transition, sets `applied_at` to
today's date, writes the base `resume_used` variant id / `cover_used`, and regenerates
`jobs.md`. Do NOT pass a tailored file path as `resume_used`; tailored files are
attachments only. Do NOT write `jobs.json` or `jobs.md` yourself. Inspect its return: on
`{ "id", "from", "to", "applied_at", "resume_used", "cover_used" }` mark the job
`applied` in your summary. If it returns an error object
(`{ "error": "no-working-folder" }`, `{ "error": "job-not-found" }`,
`{ "error": "invalid-status" }`, or `{ "error": "invalid-transition", ... }`), treat the
job as a per-job failure: record it `skipped` with the error as the reason and continue —
do not retry with fabricated data and do not abort the run.

#### 4x — Custom / non-Easy-Apply route

Taken when 4b routed the job as external/ATS/custom. Follow
[`references/custom-application.md`](../../references/custom-application.md) end to end —
including its **safety invariant** (never create accounts, enter passwords, read email,
or solve CAPTCHAs) and **human-speed-only** rule (real clicks/typing; never fetch/DOM-
injection submits). In this unattended batch, one blocked application MUST NOT stall the
run — resolve each custom job to exactly one outcome and continue:

- **Account required before the form is viewable** → do NOT sign up. Call
  `record-application` with `status: "account_required"` and a `handoff`
  (`needs: ["account"]`, `application_url` = the job/apply URL, `blocking` =
  "account required before application is viewable", `logged_at` = today). Continue.
- **Fillable form** → detect the ATS, then for each field apply the two
  [pre-answer gates](../../references/question-log.md#pre-answer-gates) first (trap →
  leave it, handoff `needs: ["bot-check"]`; free-response/prose → leave it, handoff
  `needs: ["question"]`), and fill only fields that pass both from `profile.json` via the
  [question log](../../references/question-log.md#lookup-order) at human speed, attaching
  the chosen resume attachment from 4a (skip cover tailoring; paste the default prose cover
  only into an optional plain-text field). Then:
  - **A human-only step is hit** (account / password / email-confirm / CAPTCHA /
    payment) **or** an **unknown question** appears (no answer in the profile; in this
    non-interactive batch you do NOT ask): do NOT guess and do NOT submit. Save a draft
    if the ATS supports it. For an unknown question, first append it to
    `profile.logged_questions` (unanswered) per the question log. Then call
    `record-application` with `status: "needs_human"` and a `handoff`
    (`ats`, `application_url`, `blocking` = the exact step/question, `needs` = the
    trigger value(s), `draft_saved`, `filled_through`, `logged_at` = today). Continue to
    the next job.
  - **Fully answerable and no human-only step** → submit with a real click, verify the
    confirmation, and record `applied` via 4f (rotation pointer advances only here).
- **Dead/closed posting** → record `skipped` with the reason and continue.

`needs_human` / `account_required` jobs are NOT failures — they are successfully
prepared handoffs. Collect them for the Step 5 handoff queue.

### Step 5 — Report the run summary

After the loop, print a summary listing every job worked and its outcome — `applied`,
`deferred`, `needs_human`, `account_required`, or `skipped` — each with a reason, plus a
per-job `tailoring` column/field (`not tailored`, `skipped-strong`,
`tailored -> score X`, `best-effort`, or the base-fallback reason) — including, when
tailoring applied edits, the terminology/injection detail (term-swaps applied, keywords
injected, synonyms grown), plus totals. Then print
a **handoff queue**: the `needs_human` / `account_required` jobs, each with company, role,
the `handoff.blocking` reason, and the URL to finish at. Remind the user that deferred jobs
are still `status:"new"`, that unanswered logged questions can be resolved on a `human`
run, that the handoff jobs are prepared and waiting, and that they can clear the handoff
queue collaboratively by running the
[`interactive-apply`](../interactive-apply/SKILL.md) skill ("let's go through the ones you
couldn't complete together"). The pipeline is reviewable in `jobs/jobs.md`.

Suggested format:

```text
Apply run — run mode: auto · tailoring: interactive freedom 5 · new jobs worked: 6

Per job:
- linkedin-3891   Senior Backend Engineer @ Acme     : applied           (resume-b / cover-b; tailoring: tailored -> score 86; 2 term-swaps, 1 keyword injected, 1 synonym grown)
- indeed-1024     Platform Engineer @ Nimbus Labs     : deferred          (resume-a / cover-a; tailoring: skipped-strong; unanswered: "Desired salary?" — needs human run)
- greenhouse-77   SRE @ Globex                        : needs_human       (resume-c / cover-c; tailoring: best-effort -> base; account required to submit)
- workday-88      Staff Eng @ Initech                 : account_required  (resume-b / cover-b; tailoring: not tailored; signup required before form is viewable)
- linkedin-4002   Staff Engineer @ Hooli              : applied           (resume-a / cover-a; tailoring: skipped-strong)
- lever-90        Frontend @ Vertex                   : skipped           (resume-c / cover-c; tailoring: not tailored (tailoring error: resume-kit call failed); posting 404)

Totals: 2 applied · 1 deferred · 1 needs_human · 1 account_required · 1 skipped

Handoff queue (finish these with `interactive-apply`):
- greenhouse-77  SRE @ Globex     — account required to submit → https://boards.greenhouse.io/globex/jobs/77
- workday-88     Staff Eng @ Initech — signup required before form → https://initech.wd1.myworkdayjobs.com/…
```

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json` (discovery + `automation_default`,
  `resume_strategy`, `resume_domains`, `round_robin_pointer`),
  `<working_dir>/jobs/jobs.json` (the `status:"new"` work list),
  `<working_dir>/profile.json` (demographics, contact, logged_questions),
  `<working_dir>/job-focus.md` (advisory domain context), optional
  `<working_dir>/resume-prefs.json` via `tailor-resume` when tailoring is enabled, the
  resume/cover variant files under `<working_dir>/resume/` and
  `<working_dir>/cover-letters/`, tailored resume files under
  `<working_dir>/resume/tailored/` when returned by the worker, and the contracts/schemas in
  [`../../references/`](../../references/) and
  [`../../schemas/`](../../schemas/).
- **Writes directly:** `<working_dir>/profile.json` only — appending or answering logged
  questions via [`question-log.md`](../../references/question-log.md) — and, per
  [`rotation.md`](../../references/rotation.md#pointer-persistence), the
  `round_robin_pointer` field of `<working_dir>/config.json` when (and only when) a
  round-robin slot is consumed. It writes NOTHING else in `config.json`. When tailoring is
  on, it may bootstrap the empty-shell `<working_dir>/resume-kit/learning/synonyms.json` +
  `resume-kit/config.json` `alias_file` pointer if absent (shell + pointer only, idempotent);
  it never writes `synonyms.json` content (`manage-synonyms` inside `tailor-resume` is the
  sole content writer).
- **Writes via workers:** `<working_dir>/jobs/jobs.json` and `<working_dir>/jobs/jobs.md`
  are written EXCLUSIVELY through the [`record-application`](../record-application/SKILL.md)
  worker on a confirmed submission — never directly. When tailoring is enabled,
  [`tailor-resume`](../tailor-resume/SKILL.md) may write
  `<working_dir>/resume-prefs.json` and `<working_dir>/resume/tailored/` according to its
  own contract.
- **Dispatches:** the claude-in-chrome browser tools (open/fill posting) and the
  `record-application` worker; when tailoring is enabled, also dispatches the
  [`tailor-resume`](../tailor-resume/SKILL.md) worker.
