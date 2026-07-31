---
name: find-jobs
description: Use when the user says "find jobs", "search for jobs", "run a job search", or otherwise wants to discover new postings for their job-hunter working folder. Runs one interactive search "run" — it gates on completed setup, asks the per-run automated-vs-human choice, derives one shared search query from job-focus.md and config, asks which sites to search, dispatches the matching per-site adapter skills, funnels every returned listing through the add-job-to-list worker, degrades gracefully when a site is blocked, and reports a per-site and total summary.
---

# find-jobs

The interactive **orchestrator** for one job-search run. It coordinates: it locates
the working folder, asks the run's questions, builds one shared search query, dispatches
the per-site adapter skills, hands every listing they return to the `add-job-to-list`
sink, and reports a summary. It contains **no site-specific scraping logic** — that lives
entirely in the adapter skills (`search-linkedin`, `search-indeed`, `search-glassdoor`,
`search-generic-site`). Keep it thin; delegate everything site-specific.

All state shapes here conform EXACTLY to
[`../../references/data-contract.md`](../../references/data-contract.md), the query and
envelope shapes to
[`../../references/adapter-contract.md`](../../references/adapter-contract.md), and the
schemas in [`../../schemas/`](../../schemas/). Where this document and a schema appear to
disagree, the schema wins.

## Principles (non-negotiable)

- **Human in control of consequences.** The per-run automated-vs-human choice governs
  how results are handled downstream; respect it and never silently override it.
- **Gates before actions.** Confirm a valid working folder before doing anything else.
- **Stateless.** Discover all state from `config.json` every run; never rely on
  conversation memory.
- **Thin orchestrator.** Never embed site logic. Build the query once, dispatch adapters,
  funnel results through the sink.
- **One writer.** Only `add-job-to-list` writes `jobs/jobs.json` / `jobs/jobs.md`. This
  skill NEVER writes them directly.
- **One failure never aborts the run.** Wrap each adapter dispatch defensively so a
  blocked or failing site is reported and skipped while the others continue.

## Gate: valid working folder required

Before anything else, locate the working folder and confirm it is set up:

1. Read `config.json` and confirm it validates against
   [`../../schemas/config.schema.json`](../../schemas/config.schema.json). Its
   `working_dir` field is the absolute path to the working folder.
2. **If no valid `config.json` can be found** (missing, or fails validation): DO NOT
   guess, DO NOT create any state, and DO NOT proceed. Tell the user the working folder
   is not set up and that they should run the `job-hunter-setup` skill first, then stop.

The jobs list lives at `<working_dir>/jobs/jobs.json`; discovery context lives at
`<working_dir>/job-focus.md`.

## Procedure

### Step 1 — Locate the working folder

Resolve the working folder via `config.json` per the gate above. Read the whole
`config.json` — you will use `automation_default`, `remote_pref`, and `sites` below.

### Step 2 — Ask the automated-vs-human choice for this run

The run's automated-vs-human setting governs how far downstream skills go without human
confirmation. Default it to `config.automation_default`:

- `ask` → **prompt the user** for this run: automated (`auto`) or human-in-the-loop
  (`human`)? Record their answer for the run.
- `auto` → use `auto` for the run **without prompting**, but tell the user this is the
  default and that they may override it.
- `human` → use `human` for the run **without prompting**, telling the user they may
  override it.

Carry the resolved choice through the run. (find-jobs itself only discovers postings;
the choice is recorded so the apply-side skills honor the human-in-control principle.)

### Step 3 — Derive the shared search query

Build ONE query object, per the
[adapter-contract INPUT section](../../references/adapter-contract.md#input--the-search-query),
that every dispatched adapter will receive unchanged:

| Field | Source |
| --- | --- |
| `keywords` | Distilled from `job-focus.md`: the target titles, seniority, and technologies. Read the file as advisory prose — never parse it as structured data. |
| `location` | The target location from `job-focus.md`, or `null` for no location filter / remote-only. |
| `remote` | Copied **verbatim** from `config.remote_pref`: one of `remote`, `local`, `both`. (This is the config vocabulary, NOT the jobs-schema `remote` enum — adapters translate it.) |
| `result_cap` | Maximum listings per adapter this run. Default `25`; let the user change it if they wish. |

Show the derived `keywords` / `location` back to the user so they can refine them before
searching (the file is advisory; confirm the interpretation).

### Step 4 — Ask which sites to search

Present the site list, defaulting to `config.sites` (a subset of `linkedin`, `indeed`,
`glassdoor`, `generic`). Let the user accept the default or pick a different subset. Keep
at least one site; if the user picks none, re-ask or stop.

Map each chosen site to its adapter skill:

| Site | Adapter skill | Fixed `source` |
| --- | --- | --- |
| `linkedin` | `search-linkedin` | `linkedin` |
| `indeed` | `search-indeed` | `indeed` |
| `glassdoor` | `search-glassdoor` | `glassdoor` |
| `generic` | `search-generic-site` | `generic` |

### Step 5 — Dispatch adapters and collect envelopes

For each selected site, in turn, dispatch its adapter skill with the shared query from
Step 3. Each adapter is a non-interactive worker that returns exactly one **result
envelope** shaped per the
[adapter-contract OUTPUT section](../../references/adapter-contract.md#output--the-result-envelope):
`{ source, status, listings, message }`, where `status` is one of `ok`, `no_results`, or
`blocked`.

Dispatch each adapter **defensively**: treat any adapter outcome — including one that
errors or returns a malformed envelope — as a per-site failure. It MUST NOT abort the
run or stop the remaining sites. Record the outcome and move to the next site.

### Step 6 — Handle a blocked or failed adapter

When an adapter returns `status: "blocked"` (or otherwise fails):

1. **Report it** in the run summary with the adapter's `message` (e.g. what wall/CAPTCHA/
   login gate it hit).
2. **Offer a fallback**, without forcing it:
   - dispatch `search-generic-site` for the same query as a fallback source, and/or
   - offer **manual paste** — let the user paste one or more postings (URL/title/company),
     which you shape into listing objects per the
     [listing-object contract](../../references/adapter-contract.md#listing-object)
     (fill unknowns with `null`, never invent values) and feed to the sink like any other
     listing.
3. **Continue** with the remaining selected sites regardless. Any listings an adapter did
   gather before being blocked are still passed to the sink; it deduplicates them.

### Step 7 — Funnel every listing through add-job-to-list

Pass every listing object from every envelope (regardless of the envelope's `status`) to
the [`add-job-to-list`](../add-job-to-list/SKILL.md) worker — it is the ONLY writer of
`jobs/jobs.json` / `jobs/jobs.md`. Do **not** write those files yourself and do **not**
set `status`, `found_at`, or application fields on any listing; the sink owns those.

You may batch each adapter's listings into one `add-job-to-list` call (so per-site counts
are easy to attribute) or pass the whole run at once. Collect the result object it returns
each time:
`{ added, duplicates, updated_metadata, skipped_invalid, total_in_list }`.

If `add-job-to-list` returns `{ "error": "no-working-folder" }`, the folder gate failed —
stop and instruct the user to run `job-hunter-setup`.

### Step 8 — Report the run summary

Print a summary with **per-site** and **total** counts. For each selected site report its
envelope `status` and, from the sink's result, how many listings were `added` (new) vs
`duplicate`; surface `no_results` and `blocked` sites with their `message`. Then print the
run totals.

Suggested format:

```text
Job search run — remote_pref: both · result_cap: 25 · run mode: human

Per site:
- linkedin  : ok         — 12 found, 5 new, 7 duplicate
- indeed    : ok         — 8 found, 8 new, 0 duplicate
- glassdoor : blocked    — login/anti-bot wall; skipped (offered generic fallback)
- generic   : no_results — no postings matched "platform engineer"

Totals: 20 found · 13 new · 7 duplicate · 1 blocked · 1 no-results
Jobs now tracked: 42
```

Note that new jobs are recorded at `status: "new"` and remind the user they can review
their pipeline in `jobs/jobs.md` and run the apply-side skills next.

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json` (to discover the folder and read
  `automation_default`, `remote_pref`, `sites`), `<working_dir>/job-focus.md` (advisory
  context for the query), and the contracts/schemas in
  [`../../references/`](../../references/) and [`../../schemas/`](../../schemas/).
- **Writes:** nothing in the working folder directly. All writes to `jobs/jobs.json` and
  `jobs/jobs.md` happen exclusively through the `add-job-to-list` worker.
- **Dispatches:** the adapter skills `search-linkedin`, `search-indeed`,
  `search-glassdoor`, `search-generic-site`, and the `add-job-to-list` sink.
