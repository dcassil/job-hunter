---
name: interactive-apply
description: Use when the user says "let's go through the ones you couldn't complete together", "apply to the deferred/handoff ones with me", or otherwise wants to collaboratively clear the backlog of jobs that couldn't be submitted unattended. The interactive counterpart to apply-to-jobs: it gates on a valid working folder, builds the queue of jobs needing human help (statuses needs_human and account_required, plus deferred/external jobs and saved drafts), then works them ONE AT A TIME — showing each job's company/role details and the blocking reason, asking whether to apply, and on yes opening the application and filling what it can at human speed while PAUSING for the user to do each human-only step (create an account, enter a password, paste an email/OTP code, solve a CAPTCHA, answer an unknown question). Records confirmed submissions via record-application; never creates accounts, enters passwords, reads email, or solves CAPTCHAs.
---

# interactive-apply

The **interactive, collaborative** apply orchestrator. Where
[`apply-to-jobs`](../apply-to-jobs/SKILL.md) runs a batch and *hands off* anything that
needs a human, `interactive-apply` sits down **with** the user and clears that handoff
backlog job by job: it fills everything it can and pauses to let the user do the parts
only a human may do. It is the intended way to complete custom / non-Easy-Apply
applications and anything the batch left in a holding state.

All form mechanics come from
[`../../references/custom-application.md`](../../references/custom-application.md); field
resolution from [`../../references/question-log.md`](../../references/question-log.md);
rotation from [`../../references/rotation.md`](../../references/rotation.md); and all state
shapes from [`../../references/data-contract.md`](../../references/data-contract.md) and
[`../../schemas/`](../../schemas/). Where this document and a schema disagree, the schema
wins.
Optional per-job resume tailoring is delegated to
[`tailor-resume`](../tailor-resume/SKILL.md), with dependency gating from
[`../../references/resume-kit.md`](../../references/resume-kit.md).

## Principles (non-negotiable)

- **Human owns the prohibited + consequential steps.** The skill NEVER creates an account,
  enters a password, reads the user's email (including for a confirmation link or OTP),
  solves a CAPTCHA, or enters payment details. It pauses and asks the user to do each of
  those in the same browser, then resumes. This holds even if the user has provided
  credentials.
- **Human-speed UI only.** Drive applications with real clicks/typing at a deliberate
  pace; never submit or fill via `fetch`/XHR/DOM injection (anti-bot-guard).
- **Never guess an answer.** A field with no answer in `profile.json` is asked of the user,
  never fabricated; a provided answer is saved via the question log for reuse.
- **Pre-answer gates.** Before answering any field, apply the
  [pre-answer gates](../../references/question-log.md#pre-answer-gates): a suspected
  AI/bot-detection trap and any free-response/prose field are surfaced to the user, not
  filled by the agent. Conservative: when unsure, ask the user.
- **One status writer.** Only `record-application` changes a job's `status`, `applied_at`,
  `resume_used`, `cover_used`, or `handoff`. This skill NEVER edits `jobs.json` / `jobs.md`
  directly.
- **The user chooses each job.** Nothing is opened or submitted without the user saying so
  for that specific job.
- **Tailoring is attachment-only.** When the user requests per-run resume tailoring, this
  skill prompts for the run settings, calls `tailor-resume`, and uses that worker's
  envelope to pick the resume attachment. It does not duplicate tailoring logic, persist
  tailoring defaults, or treat tailored files as rotation variants.
- **Gates before actions.** Confirm a valid working folder before touching a browser.

## Gate: valid working folder

Read `config.json` and confirm it validates against
[`../../schemas/config.schema.json`](../../schemas/config.schema.json); its `working_dir`
is the working folder. If no valid `config.json` is found, DO NOT guess or create state —
tell the user to run [`job-hunter-setup`](../job-hunter-setup/SKILL.md) first, then stop.

## Procedure

### Step 1 — Locate the working folder and load state

Resolve the working folder via `config.json`. Read `config.json`
(`resume_strategy`, `resume_domains`, `round_robin_pointer`), `profile.json`
(demographics, contact, logged_questions), `job-focus.md` (advisory domain context), and
the resume/cover variant ids under `resume/` and `cover-letters/`.

Before building the per-job queue, ask the per-run tailoring prompt:

1. **Tailor resumes this run?** Accept `yes` / `no`.
2. If yes, ask **degree of freedom?** Accept an integer `0`-`10`.
3. If yes, ask **review mode?** Accept `interactive`, `review-after`, or `automatic`.

Persist none of these answers. If tailoring is requested, probe resume-kit availability per
[`resume-kit.md` detection](../../references/resume-kit.md#detection). If absent, show the
exact guided-install hand-off:

```text
Resume tailoring needs the `resume-intelligence` plugin (marketplace `resume-kit`). Install it with `/plugin`, then re-run.
```

Then ask whether to stop so the user can install and restart, or continue this run
untailored. If the user continues, set tailoring off for this run only and proceed with
the base rotation resumes.

### Step 2 — Build the handoff queue

Read `<working_dir>/jobs/jobs.json`. The queue is every job that needs the user, newest
handoff first:

- `status: "needs_human"` — a custom application filled up to a human-only step or unknown
  question (carries a `handoff`).
- `status: "account_required"` — an application gated behind signup before the form was
  viewable (carries a `handoff`).
- Jobs the batch left as `new` with a note that they are external / were deferred for an
  unanswered question, and any saved drafts.

If the queue is empty, tell the user there is nothing waiting on them (optionally suggest
running `apply-to-jobs` or `find-jobs`) and stop.

### Step 3 — Present the list

Show a numbered list of the queue: index, company, role, location/remote, source, and the
blocking reason (`handoff.blocking` or the deferred question). Tell the user you'll go
through them one at a time and they can stop anytime.

### Step 4 — Per-job loop (one at a time, user in control)

For each job in the queue, in order:

#### 4a — Present the job and ask

Show the job's details: title, company, location, remote, compensation if known, a short
description / why-it-fits (from stored fields plus, if useful, a quick read of the
posting), the detected ATS, and the exact blocking reason. Then ask plainly:
**"Apply to this one?"** — accept **yes** / **skip** / **stop**.

- **skip** → move to the next job; leave this job's status unchanged (or, if the user says
  they're not interested, offer to mark it `skipped` via `record-application`).
- **stop** → end the run and go to Step 5.
- **yes** → continue to 4b.

#### 4b — Resolve materials

Apply [`rotation.md`](../../references/rotation.md) to pick `{ resume_used, cover_used }`
for this job. Honor pointer-persistence: `config.round_robin_pointer` advances (and is
written back) ONLY when a round-robin slot is actually consumed by a confirmed submit. Do
not tailor the cover letter — use a default only where a plain-text cover field exists.

If tailoring is off for this run, the resume attachment is the base file for `resume_used`
and the tailoring outcome is `not-tailored`.

If tailoring is on, invoke [`tailor-resume`](../tailor-resume/SKILL.md) using its call
contract:

```json
{
  "working_dir": "/abs/path/to/working-folder",
  "resume_variant_id": "resume_used",
  "job": "<current job object>",
  "freedom": "<0-10 run setting>",
  "review_mode": "interactive | review-after | automatic"
}
```

Use only the returned envelope to decide the attachment:

- `tailored-pass` with `tailored_path` → attach `tailored_path`.
- `skipped-strong` → attach the base file for `resume_used`.
- `tailored-best-effort` / `declined` → follow the worker's user decision; if the envelope
  includes `tailored_path` as the selected result, attach it, otherwise attach the base.
- Any tailoring error, missing `tailored_path` for a tailored-pass, or provider/dependency
  failure after the run gate → attach the base file, note the reason in the per-job
  tailoring outcome, and continue the loop.

Because this skill is collaborative, `interactive` and `review-after` tailoring review
modes compose directly with this co-fill loop: any tailoring pause happens before opening
or resuming the form, then the existing human-in-control submit behavior remains unchanged.

#### 4c — Open and co-fill the application

Open the application URL (the job `url`, or `handoff.application_url` / a saved draft when
present) and follow
[`custom-application.md`](../../references/custom-application.md): detect the ATS, and at
human speed fill every field resolvable from `profile.json` via the
[question log](../../references/question-log.md#lookup-order), attaching the resume chosen
in 4b (tailored file when the worker returned one to use, otherwise the base rotation
resume). Resume from a saved draft where one exists rather than re-entering.

For each field, apply the two
[pre-answer gates](../../references/question-log.md#pre-answer-gates) first: if it could be
an **AI/bot-detection trap** (hidden/honeypot input, "leave blank if human", "are you an
AI/bot?"), do NOT fill it — point it out and let the user decide; if it needs
**free-response prose** beyond a known short answer, do NOT auto-answer — ask the user for
it (they write it in their own voice; offer a draft only if they ask). Conservative: when
unsure, surface it to the user rather than filling.

#### 4d — Pause and hand off each human-only part

Whenever the application reaches something the agent may not do or does not know, PAUSE and
ask the user to do it in the browser, then wait for them to say it's done before
continuing:

- **Account creation / sign-up** → ask the user to create the account; do not do it.
- **Password / login** → ask the user to enter it; never type a password.
- **Email / OTP confirmation** → ask the user to fetch the code from their email and enter
  it; never open or read their email.
- **CAPTCHA / bot check** → ask the user to solve it; never attempt it.
- **Payment** → ask the user to enter payment details; never enter them.
- **Unknown question** → ask the user the question directly. When they answer, fill the
  field AND record the answer via the question log
  ([recording an obtained answer](../../references/question-log.md#recording-an-obtained-answer))
  so it auto-fills next time. If it's clearly a one-off/bespoke essay, let the user write it
  in their own voice (offer a draft only if they want one).

After each hand-off completes, continue filling the rest.

#### 4e — Submit (with the user) and record

When the form is complete, do the final submit as a real click (or, if the user prefers to
click submit themselves, let them). Verify the success confirmation. Then call
[`record-application`](../record-application/SKILL.md) with
`{ id, status: "applied", resume_used, cover_used }`, where `resume_used` is the base
rotation variant id resolved in 4b even when a tailored file was attached. On its success
result, note the job as applied.

If the user stops partway (or an unresolved human-only step remains), do NOT submit. Call
`record-application` with `status: "needs_human"` and an updated `handoff` capturing where
it now stands (draft saved if possible, `blocking`/`needs`/`filled_through`/`logged_at`),
so the job stays in the queue for later. Never record an application the user did not
complete.

Keep each job inside a defensive boundary: if one errors or the posting is dead, tell the
user, leave the job for later (or mark `skipped` on their say-so), and continue.

### Step 5 — Report

Summarize the session: which jobs were applied (with resume/cover used), which were
skipped, and which remain `needs_human` / `account_required` for next time. Include each
job's tailoring outcome (`not-tailored`, `skipped-strong`, `tailored-pass` with score when
available, `tailored-best-effort`, `declined`, or degraded to base with reason). Remind the
user the remaining ones stay in the queue and they can resume this skill whenever they like.

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json`, `<working_dir>/jobs/jobs.json` (the handoff
  queue), `<working_dir>/profile.json` (via the question log), `<working_dir>/job-focus.md`,
  `<working_dir>/resume-prefs.json` when tailoring is requested, the resume/cover variants,
  and the references/schemas above; resume-kit capabilities per
  [`resume-kit.md`](../../references/resume-kit.md) when tailoring is requested; the target
  application sites via the claude-in-chrome tools.
- **Writes directly:** `<working_dir>/profile.json` only — recording answers the user gives
  to unknown questions, via [`question-log.md`](../../references/question-log.md) — and,
  per [`rotation.md`](../../references/rotation.md#pointer-persistence), the
  `round_robin_pointer` field of `config.json` when a round-robin slot is consumed by a
  confirmed submit.
- **Writes via workers:** all `jobs.json` / `jobs.md` state (status/application fields and
  `handoff`) exclusively through [`record-application`](../record-application/SKILL.md);
  `<working_dir>/resume-prefs.json` and `<working_dir>/resume/tailored/` exclusively
  through [`tailor-resume`](../tailor-resume/SKILL.md) when tailoring is requested.
- **Never performs:** account creation, password entry, email reading, CAPTCHA solving, or
  payment — these are always handed to the user.
