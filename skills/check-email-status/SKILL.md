---
name: check-email-status
description: Use when the user says "check my email for job status", "any updates from my applications", "check application status emails", "did any employers reply", or otherwise wants to fold email updates into their job pipeline. Reads the user's logged-in Gmail in the browser (read-only), scopes a tight search to tracked companies/recruiters + ATS sender domains + status phrases within a recent window, classifies each matched message (confirmation, interview, rejection, offer, recruiter-outreach, recommendation-alert, unrelated), matches status messages to a tracked job, updates the job through record-application (interview→interviewing, rejection→rejected, offer→offer; confirmation→note only), asks the user before changing anything on an ambiguous match, and reports important changes first. Recommendation/alert digests never change the list — they are summarized and offered to find-jobs. The skill never sends, replies to, drafts, or acts on any email; it only reads.
---

# check-email-status

Folds **email updates into the job pipeline**. It reads the user's logged-in Gmail (in the
browser, read-only), figures out which messages are real application status changes,
updates the affected jobs through the single status writer, and tells the user what
matters — while leaving recommendation noise out of the list.

All classification, search-scoping, matching, and transition rules come from
[`../../references/email-status.md`](../../references/email-status.md); browser setup from
[`../../references/browser-preflight.md`](../../references/browser-preflight.md); list
writes exclusively through
[`../../skills/record-application`](../record-application/SKILL.md); state shapes from
[`../../references/data-contract.md`](../../references/data-contract.md) and
[`../../schemas/`](../../schemas/).

## Principles (non-negotiable)

- **Read-only on the mailbox.** Never send, reply to, draft, or forward a message; never
  open attachments; never click links inside a message; never change labels / archive /
  delete / mark read. Only read. (Per
  [`email-status.md`](../../references/email-status.md#read-only-invariant-non-negotiable).)
- **One status writer.** All list changes go through `record-application`. This skill never
  edits `jobs.json` / `jobs.md` directly.
- **Never guess a status change.** A transition happens only on a confident message → job
  match with an allowed transition. Ambiguous matches and disallowed transitions are shown
  to the user and confirmed before anything changes.
- **Scope tightly.** Never enumerate the inbox; always search-scope (companies + domains +
  phrases + window).
- **Gates before actions.** Confirm a valid working folder and a logged-in Gmail tab first.

## Gate: working folder + logged-in Gmail

1. Read `config.json`; confirm it validates against
   [`../../schemas/config.schema.json`](../../schemas/config.schema.json). If none is
   found, tell the user to run [`job-hunter-setup`](../job-hunter-setup/SKILL.md) and stop.
2. Confirm a reachable, logged-in Gmail tab (per
   [`browser-preflight.md`](../../references/browser-preflight.md)). If Gmail can't be
   reached or isn't logged in, say so and stop — never attempt to log in.

## Procedure

### Step 1 — Load tracked jobs and choose the window

Read `<working_dir>/jobs/jobs.json`. Collect the **tracked targets**: jobs with status
`applied`, `interviewing`, `needs_human`, or `account_required` — these are the ones that
could receive an update. Note their companies/recruiters and roles. Choose the search
window: default `newer_than:7d`; let the user override (e.g. "last 3 days", or since the
last check).

### Step 2 — Build and run the scoped search

Assemble ONE Gmail query per the
[search-scoping recipe](../../references/email-status.md#search-scoping-never-walk-the-inbox)
— tracked companies/recruiters + ATS/job sender domains + status phrases + the window —
and navigate to `https://mail.google.com/mail/u/0/#search/<url-encoded-query>`. Read the
result list. If it's still large, tighten (exclude promotions, narrow the window, or search
per company). Prefer quoted phrases and `from:` domains over bare words to avoid loose
substring matches.

### Step 3 — Read and classify each match

Open/read each result (sender, subject, body) at human speed and assign exactly one class
per the [taxonomy](../../references/email-status.md#classification-taxonomy):
`confirmation`, `interview`, `rejection`, `offer`, `recruiter-outreach`,
`recommendation-alert`, or `unrelated`. `unrelated` mail is dropped.

### Step 4 — Match status messages to jobs

For each `confirmation` / `interview` / `rejection` / `offer` message, identify the tracked
job it refers to per the [matching rules](../../references/email-status.md#job-matching)
(company/recruiter + role + sender domain). A **confident** match points to exactly one
job. If the match is **ambiguous** (zero, multiple, or weak), do NOT change anything — hold
it for Step 6 to confirm with the user.

### Step 5 — Apply confident status changes via record-application

For each confident match, apply the
[status → transition mapping](../../references/email-status.md#status--transition-mapping)
by calling [`record-application`](../record-application/SKILL.md):
`interview → interviewing`, `rejection → rejected`, `offer → offer`; `confirmation` adds a
dated note only (no transition). Include a short dated note paraphrasing the email
(sender + gist) so the change is traceable. If `record-application` rejects the transition
as disallowed (e.g. an `offer` while the job is still `applied`), do NOT force it — carry
it to Step 6 to ask the user.

### Step 6 — Confirm the uncertain ones with the user

Present every ambiguous match and disallowed-transition case: show the email (sender,
subject, gist) and the candidate job(s), and ask the user which job (if any) it belongs to
and whether to record the change. Apply only what the user confirms, via
`record-application`. Never guess on their behalf.

### Step 7 — Handle recommendation-alerts

For `recommendation-alert` messages (Indeed / ZipRecruiter / LinkedIn job digests): change
nothing in the list. Summarize them (source, count, any notable postings) and **offer** to
pass the postings to [`find-jobs`](../find-jobs/SKILL.md) as candidate leads. Only if the
user accepts, hand the postings to `find-jobs` (which dedupes against the existing list);
never auto-add.

### Step 8 — Report

Report **important changes first** — interviews, offers, rejections — each with the job,
the sender, and what changed. Then note confirmations recorded, ambiguous items awaiting
the user, and the recommendation summary. Include the caveat that **email coverage is
partial**: LinkedIn Easy Apply and recruiter-submitted applications often confirm inside
LinkedIn rather than by email, so "no email" does not mean "no progress". Point the user to
`jobs/jobs.md` for the full pipeline.

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json`, `<working_dir>/jobs/jobs.json` (tracked targets),
  the user's logged-in Gmail (via the claude-in-chrome tools, read-only), and the
  references/schemas above.
- **Writes via workers:** all `jobs.json` / `jobs.md` changes exclusively through
  [`record-application`](../record-application/SKILL.md).
- **Never:** modifies the mailbox in any way (no send / reply / draft / label / archive /
  delete / attachment / link click); never edits `jobs.json` / `jobs.md` directly; never
  auto-adds recommendation postings (those route through `find-jobs` on user opt-in).
