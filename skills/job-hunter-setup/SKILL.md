---
name: job-hunter-setup
description: Use when the user says "let's set up job-hunter", "set up the job hunter plugin", or otherwise wants to initialize or reconfigure the job-hunter working folder. Runs the interactive setup wizard that creates the working folder, ingests resume and cover-letter variants, captures preferences and screening answers, and writes the state files (config.json, profile.json, jobs/jobs.json, job-focus.md) that every other skill reads.
---

# job-hunter setup

This is the interactive orchestrator that stands up (or updates) a job-hunter
working folder. It asks the user questions in a fixed order, confirms before every
consequential action, and writes state files that conform EXACTLY to the data
contract in [`../../references/data-contract.md`](../../references/data-contract.md)
and the schemas in [`../../schemas/`](../../schemas/).

You are the executing agent. Follow the ordered checklist below. Delegate the
repeatable procedures to the two helper docs and do not duplicate their content:

- Resume/cover ingestion and rotation-strategy capture:
  [`references/ingestion.md`](references/ingestion.md)
- Reading resumes and proposing target job types:
  [`references/resume-analysis.md`](references/resume-analysis.md)

## Principles (non-negotiable)

- **Confirm before acting.** Never create a folder or write a file without showing
  the user what you are about to do and getting an explicit yes.
- **Ask once.** Every answer you collect is stored so no skill re-asks it later.
- **Stateless.** All state lives in the working folder. Record its absolute path in
  `config.json.working_dir`.
- **Schema-exact.** The plugin's validators do NOT run inside the user's working
  folder, so YOU are responsible for producing files that would validate. The exact
  shapes are spelled out in [Step 9](#step-9--write-the-state-files).

## Gate: update mode vs. fresh setup

Before anything else, determine the target folder (see Step 1) and check whether it
already contains a `config.json` that validates against
[`../../schemas/config.schema.json`](../../schemas/config.schema.json):

- **Valid `config.json` exists** → switch to **update mode**. Do NOT clobber. Read
  the existing `config.json`, `profile.json`, and `job-focus.md`, summarize the
  current settings back to the user, and ask which pieces they want to change
  (resumes/covers, rotation strategy, remote preference, screening answers, sites,
  automation default, job focus). Run only the relevant steps below and re-write only
  the affected files, preserving all other existing values (including any
  `logged_questions` already accumulated in `profile.json`). Never reset
  `jobs/jobs.json` in update mode.
- **No `config.json`, or it fails validation** → proceed with the full fresh setup
  checklist starting at Step 1.

## Ordered wizard checklist

### Step 1 — Choose the working-folder location

Ask where the working folder should live. Offer these choices:

- the current directory,
- the user's Desktop (`~/Desktop/job-hunter`), or
- a specific absolute path they provide.

The working folder itself should be a directory named `job-hunter/` at the chosen
location (unless the user gives a full path that already names the folder). Resolve
the choice to a single absolute path, show it to the user, and **confirm before
creating anything**. Then apply the update-mode gate above for that path.

### Step 2 — Create the folder structure

After confirmation, create the working folder and its subfolders:

```text
<working-folder>/
├── jobs/
├── resume/
└── cover-letters/
```

Use standard file tools. Confirm the structure was created.

### Step 3 — Ingest resumes

Follow the resume ingestion procedure in
[`references/ingestion.md`](references/ingestion.md). It covers both ingestion modes
(paths mode with an "add another?" loop, or copy-in mode with a "let me know when
you're done" prompt) and saves variants into `resume/` as `resume-a`, `resume-b`, …
per the variant-naming convention. Record the list of resume variant ids you created.

### Step 4 — Ingest cover letters

Repeat the same ingestion procedure from
[`references/ingestion.md`](references/ingestion.md) for cover letters, saving into
`cover-letters/` as `cover-a`, `cover-b`, …. Pair labels with their matching resume
where applicable (`cover-b` goes with `resume-b`). Cover letters are optional; if the
user has none, record zero cover variants and continue. Record the list of cover
variant ids you created.

### Step 5 — Rotation strategy (only if more than one variant)

If there is only one resume variant, set `resume_strategy` to `single` and skip this
step. If there is more than one variant, follow the rotation-strategy capture
procedure in [`references/ingestion.md`](references/ingestion.md) to ask the user
whether to use round-robin (`round-robin`), domain-targeted (`domain`), or both
(`both`); and, when `domain` or `both` is chosen, collect the domain→variant mapping
that becomes `resume_domains`. Record the chosen `resume_strategy`, and (if
applicable) `resume_domains` and an initial `round_robin_pointer` of `0`.

### Step 6 — Remote / local preference

Ask whether the user wants remote roles, local/on-site roles, or both. Map the answer
to exactly one of `remote`, `local`, `both` and record it as `remote_pref`.

### Step 7 — Screening answers

Collect the reusable EEO-style screening answers, letting the user answer or decline
each (e.g. `prefer-not-to-say`). You need all six of these for `profile.json`:

- `gender` (string)
- `ethnicity` (string)
- `veteran` (string)
- `disability` (string)
- `work_authorized` (boolean — are they authorized to work?)
- `needs_sponsorship` (boolean — do they need visa sponsorship?)

Optionally also collect basic `contact` fields (e.g. `full_name`, `email`) if the
user wants them reused on forms. Contact is optional.

### Step 8 — Review resume and confirm job focus

Follow the resume-analysis procedure in
[`references/resume-analysis.md`](references/resume-analysis.md): read the ingested
resume file(s), summarize the applicant's skills, and propose likely target job types
in a few lines. Let the user add, remove, or change entries, then confirm. Turn the
confirmed result into the prose that will become `job-focus.md`.

### Step 9 — Write the state files

Show the user the exact contents you are about to write, then, after confirmation,
write these files. Each must conform exactly to its schema.

**`config.json`** (validates against `config.schema.json`; required keys:
`working_dir`, `resume_strategy`, `remote_pref`, `automation_default`, `sites`):

- `working_dir` (string): the absolute path of the working folder created in Step 2.
- `resume_strategy` (string enum): one of `single`, `round-robin`, `domain`, `both`.
  Use `single` when there is exactly one resume variant; otherwise the value chosen
  in Step 5.
- `resume_domains` (object, optional): present only for `domain` or `both`; maps each
  variant id (e.g. `resume-a`) to an array of domain strings.
- `round_robin_pointer` (integer ≥ 0, optional): include as `0` for `round-robin` or
  `both`.
- `remote_pref` (string enum): one of `remote`, `local`, `both` — from Step 6.
- `automation_default` (string enum): one of `ask`, `auto`, `human`. **Default to
  `ask`** unless the user explicitly requests otherwise.
- `sites` (array of string enum): each item one of `linkedin`, `indeed`,
  `glassdoor`, `generic`. Sensible default: `["linkedin", "indeed", "glassdoor"]`.

Example (all-variants case):

```json
{
  "working_dir": "/Users/example/job-hunter",
  "resume_strategy": "single",
  "remote_pref": "both",
  "automation_default": "ask",
  "sites": ["linkedin", "indeed", "glassdoor"]
}
```

**`profile.json`** (validates against `profile.schema.json`; top level forbids extra
properties; required keys: `demographics`, `logged_questions`):

- `demographics` (object, all six keys required, no others): `gender`, `ethnicity`,
  `veteran`, `disability` (strings), `work_authorized`, `needs_sponsorship`
  (booleans) — from Step 7.
- `contact` (object, optional, open shape): only if collected in Step 7.
- `logged_questions` (array): initialize to `[]` on fresh setup. Each future item is
  `{ "question": string, "answer": string|null, "source_job": string|null,
  "answered": boolean }`. In update mode, preserve the existing array.

Example:

```json
{
  "demographics": {
    "gender": "prefer-not-to-say",
    "ethnicity": "prefer-not-to-say",
    "veteran": "no",
    "disability": "prefer-not-to-say",
    "work_authorized": true,
    "needs_sponsorship": false
  },
  "logged_questions": []
}
```

**`jobs/jobs.json`** — initialize to an empty JSON array exactly: `[]`. This
validates against `jobs.schema.json` (top level is an array). Never seed rows here.
In update mode, leave any existing `jobs/jobs.json` untouched.

**`job-focus.md`** — free-form Markdown prose from Step 8 (target titles, seniority,
technologies, domains, locations, comp expectations, and any other guidance). No
schema; it is advisory context, not machine state.

Optionally also generate an empty `jobs/jobs.md` header so the folder is complete;
downstream skills regenerate it from `jobs.json`.

### Step 10 — Browser and login preflight

Because every search and application runs by driving the user's own logged-in Chrome,
verify that connection now so search/apply do not fail later. Follow the reusable
procedure in [`../../references/browser-preflight.md`](../../references/browser-preflight.md)
(cite it; do not duplicate). Run it against the boards in `config.sites` (the value just
written in Step 9):

1. Confirm the claude-in-chrome browser is connected; if not, walk the user through
   installing Chrome (preferred) and the Claude-in-Chrome extension, verifying after they
   confirm and looping until connected.
2. For each board in `config.sites` that needs a login (`linkedin`, `indeed`,
   `glassdoor`), confirm a logged-in account; if not logged in, give the user the login
   link to click in the terminal, wait for them to sign in, and re-verify. `generic`
   needs no login check.
3. Loop until every chosen board is reachable and logged in, or the user explicitly
   **skips** a board.

If the user skips a board, offer to remove it from `config.sites` so search/apply do not
attempt it, and record the skip for the final report. Do not silently drop a board.

### Step 11 — Report

Confirm to the user what was created, list the files written and their location, and
include the preflight summary (which boards are reachable/logged in, and any skipped).
Tell them they can now run the search/apply skills. Remind them they can re-run setup
any time to update settings (it will enter update mode).

## Files this skill reads and writes

- **Reads:** existing `<working-folder>/config.json`, `profile.json`, `job-focus.md`
  (update mode); user-supplied resume/cover files; the schemas under
  [`../../schemas/`](../../schemas/) and the contract at
  [`../../references/data-contract.md`](../../references/data-contract.md).
- **Writes:** `<working-folder>/config.json`, `<working-folder>/profile.json`,
  `<working-folder>/jobs/jobs.json` (`[]`), `<working-folder>/job-focus.md`, and the
  `resume/` and `cover-letters/` variant files.
