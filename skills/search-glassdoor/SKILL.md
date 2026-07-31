---
name: search-glassdoor
description: Use when find-jobs needs Glassdoor results for a search query. This is a non-interactive adapter worker invoked by the find-jobs orchestrator, never run directly by the user. It drives the user's already-logged-in Chrome (via the claude-in-chrome browser tools) to run a Glassdoor jobs search built from the query params, reads the result cards, maps each posting into the adapter-contract listing shape, hands them to add-job-to-list, and returns a result envelope. It never writes jobs.json, never asks the user questions, and treats sign-up walls or anti-bot gates as a graceful blocked degradation.
---

# search-glassdoor

The **Glassdoor search adapter**. It is one of the interchangeable adapters
described by the [adapter contract](../../references/adapter-contract.md): given a
shared search query it performs one Glassdoor jobs search, maps each raw posting
to a **listing object**, hands the listings to
[`add-job-to-list`](../add-job-to-list/SKILL.md), and returns a single **result
envelope** to its caller.

This is a **non-interactive worker**. It is invoked by the `find-jobs`
orchestrator, never run directly by the user. It asks the user nothing, writes no
working-folder state, and reports every failure as data rather than throwing.

All field shapes here conform EXACTLY to the
[adapter contract](../../references/adapter-contract.md), the
[data contract](../../references/data-contract.md), and
[`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json). Where this
document and the schema appear to disagree, the schema wins.

## When to use

- Invoked by `find-jobs` with a search query object when `glassdoor` is in the
  configured `sites`. Not a user-facing skill.

## Fixed identity

- `source` (envelope and every listing): always `"glassdoor"`.
- Listing `id`: always `glassdoor-<native-id-or-hash>` (see
  [Stable id](#stable-id)).

## Gates / preconditions (check first, in order)

1. **Input is a search query.** The caller passes one query object with
   `keywords` (string, required), `location` (string or `null`), `remote`
   (one of `remote` / `local` / `both`, required — the **config** vocabulary),
   and `result_cap` (integer ≥ 1, required). If `keywords` is empty or
   `result_cap` < 1, return a `no_results` envelope with an explanatory
   `message`; do not open a browser.
2. **A browser is available.** Confirm the claude-in-chrome tools can reach a
   connected Chrome. If no browser is available or it cannot be driven, return a
   `blocked` envelope explaining that Chrome was unreachable. Never crash.
3. **Never interactive.** If a value is missing or unknowable, use `null` — never
   ask the user, never guess.
4. **Never write state.** This adapter MUST NOT write `jobs/jobs.json`,
   `jobs/jobs.md`, or any other working-folder file. Only `add-job-to-list`
   writes those.
5. **Never defeat anti-bot protection.** Do not solve CAPTCHAs, dismiss login
   walls by authenticating, spoof headers, or retry aggressively. A wall is a
   `blocked` outcome, full stop.

## Input

The shared **search query** object from the
[adapter contract](../../references/adapter-contract.md#input--the-search-query):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `keywords` | string | Yes | Search terms derived from `job-focus.md`. |
| `location` | string or null | No | Target location, or `null` for none / remote-only. |
| `remote` | string enum | Yes | Config vocabulary: `remote`, `local`, or `both`. |
| `result_cap` | integer | Yes | Maximum listings to return this run (≥ 1). |

## Procedure

### Step 1 — Load the tools and confirm a browser

Load the claude-in-chrome browser tools via ToolSearch before calling them
(batch them in one call), then confirm a connected Chrome is reachable. If none
is reachable, stop and return the `blocked` envelope from precondition 2. This
adapter relies on the user's existing logged-in Chrome session; it does not
launch or authenticate a new one.

### Step 2 — Build the Glassdoor search URL

Construct a Glassdoor jobs search URL from the query params:

- **Base:** the Glassdoor jobs search endpoint
  (`https://www.glassdoor.com/Job/jobs.htm`).
- **Keywords:** pass `keywords` as the search-term parameter (e.g. `sc.keyword`),
  URL-encoded.
- **Location:** when `location` is a non-empty string, pass it as the location
  parameter (e.g. `locT` / `locKeyword`), URL-encoded. When `location` is `null`,
  omit the location filter entirely.
- **Remote filter (translate the config vocabulary):**
  - `remote` → apply Glassdoor's remote/work-from-home filter (e.g. the
    `remoteWorkType=1` facet) so only remote postings return.
  - `local` → apply the on-site/hybrid facet if Glassdoor exposes one
    (`remoteWorkType=0`); otherwise apply no remote facet and rely on the
    `location` filter, letting downstream matching handle the rest.
  - `both` → apply no remote facet at all.
- The query is **advisory**: if Glassdoor cannot express a given filter, apply
  what you can and return what you find. Do not fabricate results to satisfy a
  filter.

Open the built URL in a **new tab** via the browser tools. Do not disturb the
user's other tabs.

### Step 3 — Detect a block or sign-up wall (graceful degradation)

Glassdoor very frequently gates results behind a sign-up / login wall, an
email-capture modal, a CAPTCHA, or a rate-limit / anti-bot page. After the page
loads, inspect it (page text / DOM) for these signals **before** trying to read
cards. Treat any of the following as a **block**:

- a sign-up, login, or "create a free account to see jobs" wall / modal that
  covers the results,
- a CAPTCHA or human-verification challenge,
- a rate-limit, "unusual activity", or access-denied interstitial,
- a redirect away from the search results to an auth or marketing page,
- no results container renders at all after a reasonable wait.

On a block: do NOT attempt to defeat it (no solving CAPTCHAs, no logging in, no
aggressive reloads). Stop reading and return a `blocked` envelope whose `message`
states what was observed (e.g. `"Glassdoor showed a sign-up wall over the
results; skipped"`). If some cards were already successfully read before the wall
appeared, include those listings in the `blocked` envelope — the sink dedupes
them normally.

### Step 4 — Read the result cards

If results render, read the job result cards from the page (via the browser
tools' page-reading capability). For each card, extract only what the card
actually shows; everything unknown stays `null`:

- **`title`** (required): the job title as posted.
- **`company`** (required): the company name as posted.
- **`location`**: the location string shown on the card, else `null`.
- **`remote`**: map any remote/hybrid/on-site indicator on the card to the
  **jobs-schema** enum — `"remote"`, `"hybrid"`, `"onsite"`, or `null` if the
  card gives no indication. (Note: this is the jobs-schema vocabulary, not the
  config vocabulary from the input.)
- **`url`** (required): the canonical posting URL the card links to. Prefer the
  absolute job-view URL; strip tracking query parameters and fragments where
  possible.
- **`posted`**: the posted-date or relative string as shown (e.g. `"3d"`,
  `"2026-07-28"`), else `null`.
- **`notes`** (optional): include a short note only for genuinely present extra
  info (e.g. a listed salary range). Omit entirely when there is none.

If a card is missing a **required** field (`title`, `company`, or a usable
`url`), skip that card rather than inventing a value.

Stop reading as soon as you have collected `result_cap` listings. **Do not
paginate forever** — honor the cap and stop early. If the page shows fewer than
`result_cap` cards and there is no further page readily available, return what
you have.

### Step 5 — Build each listing object

For each kept card, assemble a listing object exactly per the
[listing object](../../references/adapter-contract.md#listing-object) shape:

- `source`: `"glassdoor"` (fixed).
- `id`: `glassdoor-<native-id-or-hash>` (see [Stable id](#stable-id)).
- `title`, `company`, `url`: the required values from Step 4.
- `location`, `remote`, `posted`: the values from Step 4, or `null`.
- `notes`: include only if present.

Do **NOT** emit `status`, `found_at`, `resume_used`, `cover_used`, or
`applied_at`. Setting lifecycle or application state is the sink's exclusive job;
emitting it here is a contract violation.

#### Stable id

- **Prefer the native Glassdoor posting id parsed from the job URL.** Glassdoor
  job-view URLs embed a numeric listing id (for example a `jobListingId=77120`
  query param, or a trailing numeric id in a `.../job-listing/...-JV_...` slug).
  Extract that id and form `glassdoor-<native-id>`, e.g. `glassdoor-77120`.
- **Fallback when no native id can be parsed:** derive a **stable hash** from the
  [dedupe identity](../../references/data-contract.md#dedupe-identity) — the
  normalized canonical URL, else normalized `title` + `company` + `location` — and
  form `glassdoor-<hash>` (a short hex hash). The same posting must always yield
  the same id across runs so the sink updates rather than duplicates.

### Step 6 — Hand listings to add-job-to-list

Pass the full array of listing objects (may be empty) to
[`add-job-to-list`](../add-job-to-list/SKILL.md). That worker is the ONLY writer
of `jobs/jobs.json` / `jobs/jobs.md`; it normalizes, dedupes, appends new rows,
and returns added-vs-duplicate counts. This adapter does not touch those files.

If `add-job-to-list` returns `{ "error": "no-working-folder" }`, surface that in
the envelope `message` so `find-jobs` can tell the user to run setup; still return
normally.

### Step 7 — Return the result envelope

Return exactly one envelope to `find-jobs` per the
[result envelope](../../references/adapter-contract.md#output--the-result-envelope)
shape:

```json
{
  "source": "glassdoor",
  "status": "ok",
  "listings": [
    {
      "id": "glassdoor-77120",
      "title": "Senior Backend Engineer",
      "company": "Acme Robotics",
      "location": "San Francisco, CA",
      "remote": "hybrid",
      "url": "https://www.glassdoor.com/job-listing/senior-backend-engineer-acme-robotics-JV_IC1147401_KO0,24.htm?jobListingId=77120",
      "source": "glassdoor",
      "posted": "3d"
    }
  ],
  "message": null
}
```

Set `status` per [Graceful degradation](#graceful-degradation):

- **`ok`** — the search ran and returned at least one listing. `listings` holds up
  to `result_cap` objects; `message` may be `null`.
- **`no_results`** — the search ran successfully but matched nothing. `listings`
  is `[]`; set `message` to a short note (e.g.
  `"No Glassdoor postings matched 'platform engineer' in San Francisco"`).
- **`blocked`** — a sign-up wall, CAPTCHA, rate limit, redirect, or unreachable
  browser prevented reading results. `listings` is `[]` (or holds any cards read
  before the block); set `message` to what was observed.

`find-jobs` uses `status`/`message` for its run summary; one blocked adapter must
never abort the others, so ALWAYS return an envelope — never throw.

## Graceful degradation

Discovery runs against a live, hostile site. This adapter MUST report failure as
data and return normally. Map outcomes to envelope `status` exactly as above:
`ok`, `no_results`, or `blocked`. Never retry aggressively and never attempt to
defeat anti-bot protection — a wall is a `blocked` outcome. Any listings gathered
before a block may still be returned with `status: "blocked"`.

## Invariants (MUST uphold)

1. Never writes `jobs/jobs.json` or `jobs/jobs.md`; only `add-job-to-list` does.
2. Never sets `status` or application fields on a listing.
3. Unknown fields are `null` (nullable) or omitted (optional) — never guessed.
4. `id` is stable across runs and formatted `glassdoor-<native-id-or-hash>`.
5. Failures are reported via the envelope `status`/`message`, never by throwing.
6. Honors `result_cap` and the `remote` filter translation.
7. Never defeats anti-bot / login walls; a wall is `blocked`.

## Files this skill reads and writes

- **Reads:** the query object passed by `find-jobs`; live Glassdoor pages via the
  claude-in-chrome browser tools; the
  [adapter contract](../../references/adapter-contract.md), the
  [data contract](../../references/data-contract.md), and
  [`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json) for field
  shapes.
- **Writes:** nothing in the working folder. It hands listings to
  [`add-job-to-list`](../add-job-to-list/SKILL.md), the only writer of
  `jobs/jobs.json` and `jobs/jobs.md`.
- **Never touches:** `config.json`, `profile.json`, `job-focus.md`, or any other
  working-folder file.
