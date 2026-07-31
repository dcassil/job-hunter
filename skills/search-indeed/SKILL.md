---
name: search-indeed
description: Use when the find-jobs orchestrator needs to search Indeed for job postings matching a shared search query. This is a non-interactive adapter worker invoked by find-jobs, never run directly by the user. It drives the user's already-logged-in Chrome via the claude-in-chrome tools to run one Indeed search, extracts each result card into the adapter-contract listing shape (title, company, location, remote, canonical url, posted), reports blocks or verification walls gracefully, honors the result cap, and hands the listings to add-job-to-list. It never writes jobs.json and never attempts to defeat anti-bot protections.
---

# search-indeed

The **Indeed search adapter**. It performs one Indeed search for the query it is
given, maps each result card onto the adapter-contract listing shape, and returns
a **result envelope** to `find-jobs`. It is a non-interactive worker: it asks the
user nothing, writes no working-folder state, and returns normally even when the
site blocks it.

This skill conforms EXACTLY to the shared interface in
[`../../references/adapter-contract.md`](../../references/adapter-contract.md) and
the field shapes in
[`../../references/data-contract.md`](../../references/data-contract.md) and
[`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json). Where this
document and the schema/contract appear to disagree, the schema and contract win.

## When to use

- Invoked by the `find-jobs` orchestrator with a shared **search query** when
  `indeed` is one of the configured `sites`.
- Never run directly by the user, and never used to write the jobs list — that is
  `add-job-to-list`'s exclusive job.

## Gates / preconditions (check first, in order)

1. **A valid search query was supplied.** The caller passes the query object
   described in [Input](#input--the-search-query). If `keywords` is missing or empty, there is
   nothing to search: return an envelope with `status: "no_results"`, empty
   `listings`, and a `message` explaining the missing query. Do not ask the user.
2. **A logged-in Chrome is reachable via claude-in-chrome.** This adapter drives
   the user's existing browser session; it does NOT log in, create accounts, or
   enter credentials. If no browser/tab can be reached, treat it as a `blocked`
   outcome per [Graceful degradation](#graceful-degradation-blocks-and-empty-results).
3. **Never interactive; never a writer.** If a field is unknown, set it to `null`
   — do not ask. Never write `jobs/jobs.json` or `jobs/jobs.md`, and never mutate
   any working-folder file. The only writer is `add-job-to-list`.
4. **Never defeat anti-bot protections.** Do not solve CAPTCHAs, bypass
   verification walls, spoof headers, or retry aggressively. A protection wall is
   reported as data (`status: "blocked"`), not fought.

## Input — the search query

The same query object every adapter receives (see the
[adapter contract](../../references/adapter-contract.md#input--the-search-query)):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `keywords` | string | Yes | Search terms distilled from `job-focus.md`. Goes in Indeed's `q` param. |
| `location` | string or null | No | Target location, or `null` for none. Goes in Indeed's `l` param. |
| `remote` | string enum | Yes | Config vocabulary: `remote`, `local`, or `both`. Translated to an Indeed remote filter. |
| `result_cap` | integer | Yes | Maximum listings to return this run (≥ 1). Stop early; do not paginate forever. |

Note the `remote` field uses the **config** vocabulary (`remote` / `local` /
`both`), not the jobs-schema vocabulary. Translate it when building the URL (see
Step 2) and when emitting each listing's `remote` field (see Step 5).

## Output — the result envelope

Return exactly one envelope to `find-jobs`:

```json
{
  "source": "indeed",
  "status": "ok",
  "listings": [],
  "message": null
}
```

- `source` is always the fixed string `"indeed"`.
- `status` is one of `ok`, `no_results`, or `blocked` (see
  [Graceful degradation](#graceful-degradation-blocks-and-empty-results)).
- `listings` holds up to `result_cap` [listing objects](#listing-object). Empty
  when `status` is `no_results` or `blocked`.
- `message` is a short human note for the run summary, or `null` when
  unremarkable.

## Procedure

### Step 0 — Load the browser tools

The claude-in-chrome tools are provided by an MCP server and may be deferred. Load
the ones this adapter needs in a **single** `ToolSearch` call before using any of
them, for example:

```text
ToolSearch: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__find,mcp__claude-in-chrome__computer
```

Use `tabs_context_mcp` (or `list_connected_browsers`) to confirm a browser is
reachable. If none is, stop and return a `blocked` envelope per
[Graceful degradation](#graceful-degradation-blocks-and-empty-results). Do not
attempt to launch or log into anything.

### Step 1 — Build the Indeed search URL

Construct a jobs-search URL against `https://www.indeed.com/jobs` with
URL-encoded query parameters:

- `q` = the query `keywords` (URL-encoded).
- `l` = the query `location` when it is a non-empty string; omit `l` entirely
  when `location` is `null` or empty.
- Remote filter, translated from the config-vocabulary `remote`:
  - `remote` → request remote-only results. Indeed expresses this via its remote
    facet; the portable, defensive approach is to append `remote` (or "remote") to
    the search — e.g. include the remote keyword in `q` — AND/OR apply the remote
    facet in the results UI after the page loads. Prefer whichever the current
    Indeed markup exposes; if neither can be applied, proceed unfiltered and note
    it in `message`.
  - `local` → do not request remote results; rely on `l` for on-site/hybrid
    postings. Do not add a remote facet.
  - `both` → apply no remote filter at all.
- Do not add tracking or session parameters. Keep the URL minimal.

Example (keywords "platform engineer", location "Austin, TX", remote `both`):

```text
https://www.indeed.com/jobs?q=platform+engineer&l=Austin%2C+TX
```

Because the query is **advisory** (per the contract): if Indeed cannot express a
filter you asked for, apply what you can and return what you find — the sink and
downstream matching handle the rest.

### Step 2 — Open the search in a new tab

Open the URL in a **new tab** in the user's existing Chrome session using the
browser tools (`tabs_create_mcp` then `navigate`, or `navigate` with a new tab),
so you never disturb the user's current tab. Wait for the results to load.

### Step 3 — Detect a block or verification wall FIRST

Before extracting anything, check whether Indeed served results or a wall. Read
the page (`read_page` / `get_page_text`) and look for signals of:

- a CAPTCHA / "Verify you are human" / Cloudflare / hCaptcha challenge,
- a "Additional Verification Required" or "unusual traffic" interstitial,
- a login/sign-in gate standing between you and results,
- a rate-limit or "too many requests" message,
- an otherwise empty shell with no result cards where results were expected.

If any is present: **stop immediately**. Do not solve it, do not retry
aggressively, do not enter credentials. Return a `blocked` envelope with a
`message` describing what was observed, e.g.
`"Indeed presented a human-verification wall; skipped"`. Any listings you had
already extracted before hitting the wall MAY be returned with `status: "blocked"`
— the sink dedupes them normally. See
[Graceful degradation](#graceful-degradation-blocks-and-empty-results).

### Step 4 — Locate the result cards

If results loaded, identify the individual job result cards on the page (Indeed
renders them as a list of job cards, each linking to a job with a `jk` job key).
Use `read_page` / `get_page_text` / `find` to enumerate the cards. Extract
**defensively**: Indeed's markup changes often, so never assume a fixed selector —
read the visible text and the anchor targets, and tolerate missing pieces by
falling back to `null` rather than failing.

### Step 5 — Extract each card into a listing object

Walk the cards in display order until you have collected `result_cap` listings (or
run out of cards — do not paginate past the cap). For each card, build a
[listing object](#listing-object):

- **`title`** (required): the job title text as posted. If a card has no readable
  title, skip that card (it is not a usable listing).
- **`company`** (required): the company name as posted. If absent and
  unrecoverable, skip the card.
- **`location`** (nullable): the location string shown on the card, or `null` if
  none is shown.
- **`remote`** (nullable, jobs-schema enum): map what the card indicates to one of
  `remote`, `hybrid`, `onsite`, or `null`:
  - explicit "Remote" badge/text → `remote`;
  - explicit "Hybrid" text → `hybrid`;
  - explicit on-site / a physical address with no remote indicator → `onsite`
    only when the card clearly says so;
  - anything ambiguous or unstated → `null`. Do NOT infer `remote` from the query
    `remote` preference — emit only what the card actually states.
- **`url`** (required, canonical): resolve the card's **`jk` job key** and build
  the canonical posting URL
  `https://www.indeed.com/viewjob?jk=<jk>`. Read `jk` from the card's job link
  (its `href` typically contains `jk=<key>`, e.g. `/rc/clk?jk=...`, `/viewjob?jk=...`,
  or a `data-jk` attribute). Strip all tracking parameters — keep only `jk`. If no
  `jk` is resolvable, fall back to the card's plain job link with tracking params
  stripped (lowercase host, drop fragment and trailing slash).
- **`source`** (required): always the fixed string `"indeed"`.
- **`posted`** (nullable): the posting date or relative string as shown (e.g.
  `"Posted 3 days ago"`, `"Just posted"`, or a date), or `null` if none is shown.
  Copy it verbatim; do not compute an absolute date.
- **`notes`** (optional): include only when the card shows something worth keeping,
  such as a salary range (e.g. `"Listed salary: $150k–$180k"`). Omit entirely when
  there is nothing.

Do NOT emit `status`, `found_at`, `resume_used`, `cover_used`, or `applied_at` —
setting lifecycle and application state is the sink's exclusive job, and emitting
`status` would let a re-discovered posting reset the user's pipeline progress.
Never invent values: every field you cannot determine is `null` (nullable) or
omitted (optional `notes`).

### Step 6 — Build the stable id

For each listing, build `id` per the
[data contract](../../references/data-contract.md#job-id):

- When the `jk` job key is known: `id = "indeed-" + <jk>` (e.g.
  `indeed-a1b2c3d4e5f6`). This is Indeed's own posting id and is stable across
  runs.
- When no `jk` is resolvable: derive a **stable hash** from the
  [dedupe identity](../../references/data-contract.md#dedupe-identity) — the
  normalized canonical `url`, else the normalized `title` + `company` +
  `location` triple — and use `id = "indeed-" + <short-hash>` (e.g.
  `indeed-9f2a1c7e`). The same posting must always yield the same id so the sink
  updates rather than duplicates.

### Step 7 — Hand listings to add-job-to-list

Pass the collected listing objects to
[`add-job-to-list`](../add-job-to-list/SKILL.md), the ONLY writer of the jobs
list. This adapter never touches `jobs/jobs.json` or `jobs/jobs.md` itself. The
sink normalizes, dedupes, stamps `status: "new"` and `found_at`, and returns
added-vs-duplicate counts.

### Step 8 — Return the result envelope

Return exactly one [envelope](#output--the-result-envelope) to `find-jobs`:

- `status: "ok"` when the search ran and returned at least one listing.
- `status: "no_results"` with empty `listings` and an explanatory `message` when
  the search ran successfully but matched nothing (e.g.
  `"No Indeed postings matched 'platform engineer' in Austin, TX"`).
- `status: "blocked"` with empty (or partially gathered) `listings` and a `message`
  describing the wall when a block prevented reading results.

`find-jobs` uses `status`/`message` for its run summary and continues with the
other sources regardless of this adapter's outcome; one blocked adapter never
aborts the run.

## Listing object

Each element of `listings` maps a card onto the jobs-schema fields known at
discovery time (see the
[adapter contract](../../references/adapter-contract.md#listing-object)):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | `indeed-<jk>`, or `indeed-<hash>` when no `jk`. |
| `title` | string | Yes | Job title as posted. |
| `company` | string | Yes | Company name as posted. |
| `location` | string or null | No | Location string, or `null`. |
| `remote` | string enum or null | No | `remote`, `hybrid`, `onsite`, or `null`. |
| `url` | string (uri) | Yes | Canonical `https://www.indeed.com/viewjob?jk=<jk>`. |
| `source` | string enum | Yes | Always `"indeed"`. |
| `posted` | string or null | No | Posting date/relative string as shown, or `null`. |
| `notes` | string | No | Optional (e.g. salary). Omit when none. |

Example:

```json
{
  "id": "indeed-a1b2c3d4e5f6a7b8",
  "title": "Senior Platform Engineer",
  "company": "Nimbus Labs",
  "location": "Austin, TX",
  "remote": "hybrid",
  "url": "https://www.indeed.com/viewjob?jk=a1b2c3d4e5f6a7b8",
  "source": "indeed",
  "posted": "Posted 2 days ago",
  "notes": "Listed salary: $150k–$180k"
}
```

## Graceful degradation (blocks and empty results)

Discovery runs against a live, hostile site. This adapter MUST report failure as
data and return normally — it MUST NOT throw, crash the run, or abort sibling
adapters. Map each outcome to the envelope `status`:

- **`ok`** — the search ran and returned results; `listings` holds up to
  `result_cap` objects; `message` may be `null`.
- **`no_results`** — the search ran but matched nothing; `listings` is `[]`; set a
  short `message`. This is a normal, non-error outcome.
- **`blocked`** — a CAPTCHA, verification wall, login gate, rate limit, unreachable
  browser, or otherwise unreadable results page prevented discovery; `listings` is
  `[]` (or whatever was gathered before the wall); set `message` to what was
  observed. The adapter stops trying and returns; it does not retry aggressively or
  attempt to defeat the protection.

## Invariants (this adapter MUST uphold)

1. Never writes `jobs/jobs.json` or `jobs/jobs.md`; only `add-job-to-list` does.
2. Never sets `status` or application fields on a listing.
3. Unknown fields are `null` (nullable) or omitted (optional) — never guessed.
4. `id` is stable across runs and formatted `indeed-<jk-or-hash>`.
5. `source` is always `"indeed"`.
6. Failures are reported via the envelope `status`/`message`, never by throwing.
7. Honors `result_cap` and the `remote` filter translation.
8. Never logs in, enters credentials, or attempts to defeat anti-bot protections.

## Files this skill reads and writes

- **Reads:** the search query passed by `find-jobs`; live Indeed pages via the
  claude-in-chrome browser tools; and, for shape reference, the contracts
  [`../../references/adapter-contract.md`](../../references/adapter-contract.md)
  and [`../../references/data-contract.md`](../../references/data-contract.md) plus
  the schema [`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json).
- **Writes:** nothing in the working folder. It opens a browser tab and hands
  listing objects to [`add-job-to-list`](../add-job-to-list/SKILL.md), which is the
  sole writer of `jobs/jobs.json` and `jobs/jobs.md`.
- **Never touches:** `config.json`, `profile.json`, `job-focus.md`, `jobs/jobs.json`,
  or `jobs/jobs.md`.
