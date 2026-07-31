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

## Skills (planned)

Orchestrators (interactive):

- `job-hunter-setup` — one-time wizard: create the working folder, ingest resumes/cover
  letters, choose rotation strategy, capture remote/local + screening answers, review
  resume, confirm target job types.
- `find-jobs` — run a search across chosen sites (per-run automated-vs-human choice).
- `apply-to-jobs` — apply to new listings using saved answers and rotated materials.
- `review-resume`, `update-job-focus`, `update-resumes` — maintenance.

Workers (non-interactive):

- `search-linkedin`, `search-indeed`, `search-glassdoor`, `search-generic-site` — site
  adapters driving your logged-in browser.
- `add-job-to-list` — normalize + dedupe + append a listing.
- `record-application` — status transitions + material bookkeeping.

## Status

Planned and tracked in Metis under `.metis/` — see the vision (`JOBHUN-V-0001`) and the
five initiatives (`JOBHUN-I-0001`…`0005`). Skills are not yet implemented.

## Requirements

Claude Code with the claude-in-chrome browser tools, logged in to the relevant job sites.
