---
name: find-jobs
description: Use when the user says "find jobs", "search for jobs", "run a job search", or otherwise wants to discover new postings for their job-hunter working folder. Runs one interactive search "run" — it gates on completed setup, asks the per-run automated-vs-human choice, derives one shared search query from job-focus.md and config, builds the offered-board list from the board registry by category (general by default, remote when the remote preference allows, design only when design-relevant), dispatches each board's dedicated adapter or a registry-seeded generic adapter, surfaces access quirks, funnels every returned listing through the add-job-to-list worker, degrades gracefully when a board is blocked, and reports a per-board and total summary.
---

# find-jobs

The interactive **orchestrator** for one job-search run. It coordinates: it locates
the working folder, asks the run's questions, builds one shared search query, dispatches
the per-board adapter skills, hands every listing they return to the `add-job-to-list`
sink, and reports a summary. It contains **no board-specific scraping logic and no
hardcoded board catalog** — the boards, their categories, search-URL templates, login
URLs, and access quirks all live in the **board registry**
([`../../references/job-boards.md`](../../references/job-boards.md)), and the scraping lives
entirely in the adapter skills (`search-linkedin`, `search-indeed`, `search-glassdoor`,
`search-generic-site`). Keep it thin: read the registry, delegate everything else.

All state shapes here conform EXACTLY to
[`../../references/data-contract.md`](../../references/data-contract.md), the query and
envelope shapes to
[`../../references/adapter-contract.md`](../../references/adapter-contract.md), the board
catalog to [`../../references/job-boards.md`](../../references/job-boards.md), and the
schemas in [`../../schemas/`](../../schemas/). Where this document and a schema appear to
disagree, the schema wins.

## Principles (non-negotiable)

- **Human in control of consequences.** The per-run automated-vs-human choice governs
  how results are handled downstream; respect it and never silently override it.
- **Gates before actions.** Confirm a valid working folder before doing anything else.
- **Stateless.** Discover all state from `config.json` every run; never rely on
  conversation memory.
- **Registry-driven.** The set of boards, their categories, search-URL templates, login
  URLs, and access quirks come from the board registry — never from a hardcoded list in
  this skill. Adding a board is a registry edit, not a skill edit.
- **Thin orchestrator.** Never embed board logic. Build the query once, dispatch adapters,
  funnel results through the sink.
- **Never drop a board silently.** A board that is blocked, gated, or unreachable is
  reported in the summary with the reason — it is skipped, never omitted without a word.
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

### Step 4 — Build the offered-board list from the registry

Read [`../../references/job-boards.md`](../../references/job-boards.md) and build the list
of boards to offer this run. **Do not hardcode a board list here** — derive it from the
registry's category rows every run. Apply these gates (from the registry's `category`
column):

1. **General boards** (`category: general`) — offered **by default**.
2. **Remote boards** (`category: remote`; currently `we-work-remotely`, `remoteok`) —
   offered **only when `config.remote_pref` is `remote` or `both`**. Do not offer them
   when `remote_pref` is `local`.
3. **Design / creative boards** (`category: design`; e.g. `dribbble`, `behance`, `aiga`,
   `coroflot`, `working-not-working`, `authentic-jobs`) — offered **only when the resume /
   `job-focus.md` indicates design/creative relevance** (e.g. Art Director, designer,
   creative, brand, visual, UX/UI). Judge relevance from `job-focus.md` (advisory prose)
   and the resume context. **If you are unsure whether the user is design-relevant, ASK
   rather than showing design boards unprompted** — never surface them on a hunch.

Start the default selection from the intersection of the gated offer-list above with
`config.sites` (the boards the user configured during setup), but let the user accept the
default or pick a different subset of the offered list. Keep at least one board; if the
user picks none, re-ask or stop.

When presenting the list, **surface each board's registry `access notes` quirks** so the
user can decide up front — in particular: aggregators (e.g. `google-jobs` links out to
other boards; it relies on the sink's dedupe), curated/invite-style membership (e.g.
`working-not-working`), profile/account-gated apply (e.g. `wellfound`), and third-party
login (e.g. `behance` via Adobe ID). Boards known to hard-block reading (registry notes
say "report as blocked"/"treat as blocked" — `linkedin`, `indeed`, `glassdoor`) can still
be selected; they will be attempted and reported per Step 6.

### Step 5 — Dispatch adapters and collect envelopes (routing)

For each selected board, in turn, dispatch its adapter with the shared query from Step 3,
routing per the
[adapter-contract Routing section](../../references/adapter-contract.md#routing-dedicated-vs-generic):

- **Dedicated adapter** — if a `search-<board>` adapter exists (currently `linkedin` →
  `search-linkedin`, `indeed` → `search-indeed`, `glassdoor` → `search-glassdoor`, matching
  the registry's `adapter: dedicated` rows), dispatch it. It stamps its fixed `source` id.
- **Generic adapter (registry-seeded)** — otherwise (registry `adapter: generic`), dispatch
  `search-generic-site` **seeded** with, from that board's registry row: the **search-URL
  template** (substitute `<keywords>` and `<location>` URL-encoded from the query; drop
  `<location>` for remote-only boards, and for `remoteok` substitute `<keywords>` as a
  hyphenated slug), the **login URL**, and the **access notes**. Tell the generic adapter
  which **board id** it is searching so it stamps **that board's id** as `source` (e.g.
  `ziprecruiter`, `wellfound`, `we-work-remotely`) — not `generic`. Only an off-registry
  board or a user-pasted source stamps `generic`.

Whichever route is taken, the `source` stamped on every listing MUST be the correct board
id from the registry, so the sink attributes it correctly.

Each adapter is a non-interactive worker that returns exactly one **result envelope** shaped
per the
[adapter-contract OUTPUT section](../../references/adapter-contract.md#output--the-result-envelope):
`{ source, status, listings, message }`, where `status` is one of `ok`, `no_results`, or
`blocked`.

Dispatch each adapter **defensively**: treat any adapter outcome — including one that
errors or returns a malformed envelope — as a per-board failure. It MUST NOT abort the
run or stop the remaining boards. Record the outcome and move to the next board.

### Step 6 — Handle a blocked, gated, or unreachable board

When an adapter returns `status: "blocked"`, hits an access wall named in the registry's
notes (curated/invite membership, profile-gated apply, third-party login), or otherwise
fails or is unreachable:

1. **Report it** in the run summary with the adapter's `message` and the relevant registry
   access-note quirk (e.g. what wall/CAPTCHA/login gate it hit, or that membership is
   required). **Never drop the board silently** — every selected board appears in the
   summary with an outcome and a reason.
2. **Offer a fallback**, without forcing it:
   - dispatch `search-generic-site` for the same query — seeded with the board's registry
     URL template if it was a dedicated-adapter block, else against the same board — as a
     fallback source, and/or
   - offer **manual paste** — let the user paste one or more postings (URL/title/company),
     which you shape into listing objects per the
     [listing-object contract](../../references/adapter-contract.md#listing-object)
     (fill unknowns with `null`, never invent values) and feed to the sink like any other
     listing.
3. **Continue** with the remaining selected boards regardless. Any listings an adapter did
   gather before being blocked are still passed to the sink; it deduplicates them.

### Step 7 — Funnel every listing through add-job-to-list

Pass every listing object from every envelope (regardless of the envelope's `status`) to
the [`add-job-to-list`](../add-job-to-list/SKILL.md) worker — it is the ONLY writer of
`jobs/jobs.json` / `jobs/jobs.md`. Do **not** write those files yourself and do **not**
set `status`, `found_at`, or application fields on any listing; the sink owns those.

You may batch each adapter's listings into one `add-job-to-list` call (so per-board counts
are easy to attribute) or pass the whole run at once. Collect the result object it returns
each time:
`{ added, duplicates, updated_metadata, skipped_invalid, total_in_list }`.

If `add-job-to-list` returns `{ "error": "no-working-folder" }`, the folder gate failed —
stop and instruct the user to run `job-hunter-setup`.

### Step 8 — Report the run summary

Print a summary with **per-board** and **total** counts. For each selected board report its
envelope `status` and, from the sink's result, how many listings were `added` (new) vs
`duplicate`; surface `no_results` and `blocked`/gated boards with their `message` and any
registry access-note quirk. Every board the user selected must appear — none dropped
silently. Then print the run totals.

Suggested format:

```text
Job search run — remote_pref: both · result_cap: 25 · run mode: human

Per board:
- linkedin         : ok         — 12 found, 5 new, 7 duplicate
- indeed           : ok         — 8 found, 8 new, 0 duplicate
- glassdoor        : blocked    — login/anti-bot wall; skipped (offered generic fallback)
- ziprecruiter     : ok         — 6 found, 4 new, 2 duplicate
- google-jobs      : ok         — 9 found, 2 new, 7 duplicate (aggregator; sink deduped)
- working-not-work.: blocked    — curated/invite membership required to apply; skipped
- we-work-remotely : no_results — no postings matched "platform engineer"

Totals: 35 found · 15 new · 16 duplicate · 2 blocked · 1 no-results
Jobs now tracked: 42
```

Note that new jobs are recorded at `status: "new"` and remind the user they can review
their pipeline in `jobs/jobs.md` and run the apply-side skills next.

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json` (to discover the folder and read
  `automation_default`, `remote_pref`, `sites`), `<working_dir>/job-focus.md` (advisory
  context for the query and for judging design/creative relevance), the **board registry**
  [`../../references/job-boards.md`](../../references/job-boards.md) (the source of the
  offered boards, their categories, search-URL templates, login URLs, and access notes),
  and the other contracts/schemas in [`../../references/`](../../references/) and
  [`../../schemas/`](../../schemas/).
- **Writes:** nothing in the working folder directly. All writes to `jobs/jobs.json` and
  `jobs/jobs.md` happen exclusively through the `add-job-to-list` worker.
- **Dispatches:** the dedicated adapter skills `search-linkedin`, `search-indeed`,
  `search-glassdoor`; the registry-seeded `search-generic-site` adapter for every other
  board; and the `add-job-to-list` sink.
