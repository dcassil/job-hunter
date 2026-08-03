# Email status reference — classify inbox mail into pipeline updates

The shared recipe the [`check-email-status`](../skills/check-email-status/SKILL.md) skill
follows to turn inbox mail into job-pipeline updates. It defines the classification
taxonomy, how to scope the Gmail search, how to match a message to a tracked job, and the
status → transition mapping. Keeping it here means the taxonomy and rules are tunable in
one place, and the skill's "read the inbox" step is isolated so a future Gmail-API / MCP
adapter could replace browser reading without touching classification or matching.

## Read-only invariant (non-negotiable)

This procedure is **read-only on the mailbox**. It NEVER sends, replies to, drafts, or
forwards a message; never opens attachments; never clicks links inside a message; never
changes labels, archives, deletes, or marks read/unread. It only *reads* mail to update
the job list. All writes go to the list, exclusively through
[`record-application`](../skills/record-application/SKILL.md) — never to `jobs.json`
directly. Reading the user's own inbox here is user-invoked and for status tracking only.

## Browser now, API later

The current mechanism is the user's logged-in Chrome via the claude-in-chrome tools
(navigate to a Gmail `#search/<query>` URL, read the rendered results/messages). Treat the
"fetch matching messages" step as a replaceable adapter: a later Gmail-API / MCP
integration can supply the same `{ from, subject, date, snippet/body }` records, and the
classification + matching below stay unchanged.

## Which account(s) to check

A user may have more than one Gmail account (e.g. a dedicated job inbox plus a personal
one). The working-folder `config.json` MAY carry an optional `email_accounts` array — each
entry `{ "email": <address>, "authuser": <gmail index>, "primary": <bool?> }` — listing the
inboxes to check and which Gmail `authuser` index each maps to (the number in
`mail.google.com/mail/u/<authuser>/`). Selection:

- If `email_accounts` is present, check the entry marked `primary` **first**, then sweep the
  rest (the primary is where application/status mail is expected to land).
- If it is absent, check whichever account the browser is currently on (today's behavior).
- Navigate per account with the entry's `authuser` in the URL
  (`mail.google.com/mail/u/<authuser>/#search/...`); if that account shows a
  "Verify it's you" wall, STOP for that account and hand off to the user (never sign in) —
  then continue with the others.

`authuser` indices are per Chrome profile and machine-specific, so `email_accounts` stores
the address alongside the index; treat the address as the source of truth and the index as
a hint for URL navigation.

## Search scoping (never walk the inbox)

The inbox is very high volume (100k+). NEVER enumerate it. Build ONE tightly scoped Gmail
search from three ingredients and a window, then read only those results:

1. **Tracked targets** — from `jobs.json`, the companies/recruiters of jobs whose status is
   `applied`, `interviewing`, `needs_human`, or `account_required` (the jobs that could
   plausibly receive a status update). Use their `company` values (which include recruiter
   firms, e.g. "CyberCoders", "Kforce") as `from:` / phrase terms.
2. **ATS / job sender domains** — `greenhouse.io`, `lever.co`, `hire.lever.co`,
   `myworkdayjobs.com`, `ashbyhq.com`, `smartrecruiters.com`, `icims.com`,
   `workable.com`, `linkedin.com`, plus recruiter/company domains inferred from tracked
   targets.
3. **Status phrases** — `"thank you for applying"`, `"application received"`,
   `"your application"`, `"move forward"`, `"next steps"`, `"schedule"`, `"interview"`,
   `"unfortunately"`, `"not moving forward"`, `"other candidates"`, `"offer"`.
4. **Window** — `newer_than:7d` by default (user-overridable, e.g. `newer_than:3d` or since
   the last check). Prefer date-bounding over unbounded searches.

Assemble as a Gmail query, e.g.
`newer_than:7d (from:(greenhouse.io OR lever.co OR ...) OR "thank you for applying" OR "next steps" OR <tracked company/recruiter names>)`,
and navigate to `https://mail.google.com/mail/u/<authuser>/#search/<url-encoded-query>`.
Beware loose substring matches (Gmail matches `for` inside "For You") — prefer quoted
phrases and `from:` domains over bare words.

**Do NOT exclude job-board senders when hunting status changes.** LinkedIn (and to a lesser
extent Indeed) **relays employer decisions** — the subject is "Your application to \<role\>
at \<company\>" and the *body* carries the status ("we will not be moving forward" =
rejection). Filtering out `from:linkedin.com` therefore hides real rejections/interviews.
Separate recommendation noise by **classification** (below), not by excluding senders. The
only safe narrowing is by distinctive status phrase and the window — never by dropping a
sender you actually applied through.

Run these **dedicated status searches** (across all senders, quoted phrases, within the
window) in addition to the broad query, so decisions are never missed:

- **Rejections:** `"will not be moving forward" OR "not be moving forward" OR "decided not to move forward" OR "move forward with other candidates" OR "will not be proceeding" OR "not selected" OR "regret to inform"`
- **Interviews:** `"would like to schedule" OR "schedule an interview" OR "schedule a time" OR "invite you to" OR "phone screen" OR "next round" OR "set up a time" OR "interview invitation"`
- **Offers:** `"pleased to offer" OR "extend an offer" OR "offer letter"`

If any pass returns a large set, narrow by window (not by sender), and classify each hit by
reading its body.

## Classification taxonomy

Read each matched message (sender, subject, body) and assign **exactly one** class:

| Class | Signals | Drives a status change? |
| --- | --- | --- |
| `confirmation` | "thank you for applying", "we received your application", automated ATS acknowledgements | No — note only (job is already `applied`). |
| `interview` | "we'd like to schedule", "set up a call", "interview", "next steps", "meet the team", availability requests | Yes → `interviewing`. |
| `rejection` | "unfortunately", "not moving forward", "decided to move forward with other candidates", "will not be proceeding" | Yes → `rejected`. |
| `offer` | "pleased to offer", "offer letter", "extend an offer", compensation/start-date terms | Yes → `offer`. |
| `recruiter-outreach` | a recruiter proposing a NEW role / asking to connect about a specific job (not one already applied to) | No — surface to the user; optionally a lead. |
| `recommendation-alert` | Indeed "you may be a good match", ZipRecruiter "jobs recommended for you", LinkedIn job alerts — automated **discovery** digests | No — summarize and offer to `find-jobs` (below). |
| `unrelated` | anything not about the user's job search | No — ignore. |

When a message is genuinely ambiguous between two classes (e.g. a soft "we'll keep your
resume on file"), prefer the LESS consequential reading and flag it for the user rather
than transitioning.

**LinkedIn-relay rule (classify by BODY, not sender).** LinkedIn sends two look-alike
emails whose subject is nearly identical — do not classify them by subject or sender:

- Subject "Daniel, **your application was sent** to \<company\>" / "Your application to
  \<role\> at \<company\>" **whose body acknowledges receipt** → `confirmation`.
- Subject "Your application to \<role\> at \<company\>" **whose body says
  "\<company\> … will not be moving forward with your application"** → `rejection`; body
  inviting you to schedule/interview → `interview`; body offering the role → `offer`.

Always open and read the body to decide. The sender being `linkedin.com` (or `indeed.com`)
does NOT make it a `recommendation-alert` — only automated *discovery digests* ("jobs
recommended for you", "you may be a good match", job-alert lists) are
`recommendation-alert`.

## Job matching

For a status-bearing message (`interview` / `rejection` / `offer` / `confirmation`),
identify which tracked job it refers to:

- Match on **company / recruiter** (`from:` domain and display name vs. the job `company`),
  the **role title** if named in the subject/body, and the **ATS domain** vs. the job's
  `source` / `handoff.ats`. A confident match aligns on company/recruiter AND (role or ATS)
  and points to exactly one `applied`/`interviewing` job.
- **Ambiguous** = matches zero jobs, more than one job, or only weakly (company-only across
  several applications). Do NOT guess. Surface the message + the candidate job(s) and ask
  the user which job (if any) it belongs to before changing anything.
- Recruiter firms represent multiple roles; a recruiter email must name/point to a specific
  tracked job to be a confident match, else it is ambiguous or `recruiter-outreach`.

## Status → transition mapping

Apply through `record-application` (the sole writer), which validates the transition:

| Class | Target status | Notes |
| --- | --- | --- |
| `interview` | `interviewing` | From `applied`. Add a dated note with the email gist (who/when). |
| `rejection` | `rejected` | From `applied` or `interviewing`. Note the sender + date. |
| `offer` | `offer` | Normally from `interviewing`. If the job is still `applied` (no interview email was seen), the `applied → offer` step is not in the status graph — do NOT force it; report the offer prominently and ask the user how to record it. |
| `confirmation` | (no transition) | Job is already `applied`; add a note that a confirmation arrived. |

Never fabricate a transition the graph disallows; when in doubt, report and ask. Every list
change carries a short dated note quoting/paraphrasing the email so the pipeline is
traceable.

## Recommendation-alert handling → find-jobs

`recommendation-alert` messages never change the list. Summarize them (source, count, any
notable postings) and **offer** to pass the postings to
[`find-jobs`](../skills/find-jobs/SKILL.md) as candidate leads — the user opts in; nothing
is auto-added, and `find-jobs`/`add-job-to-list` own dedupe against the existing list.

## Files this reference governs

- **Reads:** the user's logged-in Gmail (via the claude-in-chrome tools), and `jobs.json`
  (tracked companies for scoping + matching).
- **Consumed by:** [`check-email-status`](../skills/check-email-status/SKILL.md).
- **Writes:** nothing directly — list changes go through
  [`record-application`](../skills/record-application/SKILL.md); the mailbox is never
  modified.
