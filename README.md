# job-hunter

A Claude Code plugin that turns the repetitive parts of a job search into a guided,
agent-assisted workflow: search LinkedIn, Indeed, Glassdoor and other boards; compile
and manage one job list; and apply with rotating resumes/cover letters and a saved
bank of screening answers.

## Two folders, cleanly separated

- **Plugin source** (this repo) — reusable skills + manifest. Version-controlled. Holds
  *no* user data.
- **Working folder** (created at runtime wherever you choose) — your data: `config.json`,
  `profile.json`, `job-focus.md`, `jobs/`, `resume/`, `cover-letters/`. All state lives
  here; the plugin is stateless.

## Skills

Orchestrators (interactive):

- `job-hunter-setup` — one-time wizard: create the working folder, ingest resumes/cover
  letters, choose rotation strategy, capture remote/local + screening answers, review
  resume, confirm target job types.
- `find-jobs` — run a search across chosen sites (per-run automated-vs-human choice).
- `apply-to-jobs` — apply to new listings using saved answers and rotated materials.
  Handles both **LinkedIn Easy Apply** and **custom / non-Easy-Apply** applications
  (Greenhouse, Lever, Workday, Ashby, iCIMS, SmartRecruiters, company sites): it fills
  what it can at human speed, and on any step only a human may do — creating an account,
  entering a password, confirming an email code, solving a CAPTCHA — or an unknown
  question, it saves a draft, records a **handoff** (status `needs_human` /
  `account_required`), and keeps going so one blocked application never stalls the batch.
- `interactive-apply` — the collaborative counterpart: say "let's go through the ones you
  couldn't complete together" and it walks the handoff backlog one job at a time — showing
  each job's details and what's blocking, asking whether to apply, then co-filling the
  application while pausing for you to do the human-only steps, and submitting on your go.
- `check-email-status` — reads your logged-in Gmail (browser, **read-only**), classifies
  application-status mail (confirmation / interview / rejection / offer vs. recommendation
  noise), updates the affected jobs via `record-application` (asking you before any
  ambiguous change), and reports the important changes. It never sends, replies to, or
  drafts email; recommendation digests are offered to `find-jobs` instead of changing the
  list.
- `review-resume`, `update-job-focus`, `update-resumes` — maintenance.

Workers (non-interactive):

- `search-linkedin`, `search-indeed`, `search-glassdoor`, `search-generic-site` — site
  adapters driving your logged-in browser.
- `add-job-to-list` — normalize + dedupe + append a listing.
- `record-application` — status transitions + material bookkeeping (including `handoff`).

**Safety invariant (all apply flows):** the agent never creates accounts, enters
passwords, reads your email, solves CAPTCHAs, or enters payment details, and never
submits via `fetch`/DOM injection — those steps are always handed to you and driven at
human speed. Two **pre-answer gates** run on every field before it's filled: a
**bot-trap gate** (suspected AI/bot-detection or honeypot fields are left for you to
review, not filled) and a **free-response gate** (anything needing prose beyond a known
short answer is logged for you to write in your own voice). Both are conservative — when
unsure, they log for you. See
[`references/custom-application.md`](references/custom-application.md) and the
[pre-answer gates](references/question-log.md#pre-answer-gates).

## Data contract & guardrails

- Working-folder file shapes are defined by JSON Schemas in [`schemas/`](schemas/) and
  documented in [`references/data-contract.md`](references/data-contract.md).
- Search adapters obey [`references/adapter-contract.md`](references/adapter-contract.md);
  rotation and question-log behavior live in [`references/rotation.md`](references/rotation.md)
  and [`references/question-log.md`](references/question-log.md).
- `npm run check` runs the manifest/schema/skill validators plus ESLint, markdownlint,
  and Prettier; a pre-commit hook blocks any commit that fails it. Agent rules are in
  [`AGENTS.md`](AGENTS.md).

## Status

Active. All fourteen skills are implemented and validated. Planned and tracked in Metis
under `.metis/` — vision `JOBHUN-V-0001`; initiatives `JOBHUN-I-0001`…`0006` completed;
`JOBHUN-I-0007` adds the `apply-to-jobs` custom route + `interactive-apply`; `JOBHUN-I-0008`
adds the apply-time bot-trap and free-response gates; `JOBHUN-I-0009` adds the
`check-email-status` skill (email-based status tracking).

## Requirements

Claude Code with the claude-in-chrome browser tools, logged in to the relevant job sites.
