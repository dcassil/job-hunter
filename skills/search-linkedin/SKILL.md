---
name: search-linkedin
description: Use when find-jobs needs to discover jobs on LinkedIn for the shared search query. This is a non-interactive adapter worker — it is invoked by the find-jobs orchestrator, never run directly by the user. It drives the user's logged-in Chrome via the claude-in-chrome browser tools to run a LinkedIn Jobs search, extracts each result into the adapter-contract listing shape, hands the listings to add-job-to-list, and returns a result envelope. It never writes jobs.json and never attempts to defeat anti-bot protection.
---

# search-linkedin

The LinkedIn Jobs **search adapter**. It performs one LinkedIn Jobs search for the
query it is handed, maps each result card to a listing object, and returns a
**result envelope** to `find-jobs`. It is a non-interactive worker: it never asks
the user questions, never writes `jobs/jobs.json` or `jobs/jobs.md`, and never
mutates any working-folder state.

This adapter conforms EXACTLY to the shared
[adapter contract](../../references/adapter-contract.md) and the field shapes in
[`../../references/data-contract.md`](../../references/data-contract.md) /
[`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json). Where this
document and the schema/contract appear to disagree, the schema and contract win.

## When to use

- Invoked by the `find-jobs` orchestrator with the shared search query when
  `linkedin` is among the configured `sites`. Not a user-facing skill.

## Gates / preconditions (check first, in order)

1. **Input is the shared search query.** The caller passes one query object per the
   [adapter contract INPUT](../../references/adapter-contract.md#input--the-search-query):
   `keywords` (string, required), `location` (string or `null`), `remote` (one of
   `remote` / `local` / `both`, required), `result_cap` (integer ≥ 1, required). If
   `result_cap` is missing, default it to `25`. Do not ask the user anything.
2. **Never interactive.** If information is missing or a value is unknown, use
   `null` — never prompt the user, never invent data.
3. **Never write working-folder state.** This adapter only *reads* the browser and
   *returns* listings. Writing `jobs/jobs.json` / `jobs/jobs.md` is the exclusive
   job of `add-job-to-list`.
4. **Never defeat anti-bot protection.** If LinkedIn presents a login wall,
   CAPTCHA, rate limit, or any anti-bot challenge, stop and report it as data (see
   [Graceful degradation](#graceful-degradation)). Do not retry aggressively, do
   not attempt to solve CAPTCHAs, do not try to bypass the gate.

## Fixed source

This adapter's `source` is always `linkedin`. Every listing it emits carries
`"source": "linkedin"`, and the returned envelope's `source` is `linkedin`.

## Procedure

### Step 1 — Build the LinkedIn Jobs search URL

Construct a LinkedIn Jobs search URL from the query params. Use the public jobs
search endpoint and URL-encode all values:

```text
https://www.linkedin.com/jobs/search/?keywords=<enc(keywords)>&location=<enc(location)>&f_WT=<remote-code>
```

- `keywords`: URL-encode the query `keywords` verbatim into the `keywords` param.
- `location`: if `location` is a non-empty string, URL-encode it into the
  `location` param. If `location` is `null` or empty, omit the `location` param.
- Remote filter — translate the **config** `remote` vocabulary into LinkedIn's
  workplace-type filter `f_WT` (LinkedIn codes: `1` = On-site, `2` = Remote,
  `3` = Hybrid):
  - `remote` → `f_WT=2` (remote postings only).
  - `local` → `f_WT=1,3` (on-site and hybrid postings).
  - `both` → omit `f_WT` entirely (no workplace-type filter).
- Treat the query as advisory: if LinkedIn ignores a filter, apply what you can and
  extract what the results actually show; downstream matching handles the rest.

### Step 2 — Open the search in the user's logged-in Chrome

Drive the user's existing Chrome session with the claude-in-chrome browser tools.
The tools may be deferred; if so, load them first with a single `ToolSearch` call:

```text
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text
```

Then, in order:

1. Call `tabs_context_mcp` to inspect the current browser context and confirm a
   connected, logged-in Chrome is available. If no browser context is available at
   all, return a `blocked` envelope (see [Graceful degradation](#graceful-degradation))
   with a message that Chrome could not be reached.
2. Open the search URL from Step 1 in a **new tab** with `tabs_create_mcp` (or
   create a tab and `navigate` to the URL). Do not disturb the user's other tabs.
3. Wait for the results to load, then read the rendered page with `read_page`
   (structured) and/or `get_page_text` (text fallback). Prefer `read_page` for
   structured card data; fall back to `get_page_text` when structure is thin.

Assume the user is logged in. Do NOT log in on their behalf and do NOT submit any
credentials.

### Step 3 — Detect auth walls / anti-bot blocks

Before extracting, check the page for a block signal. Treat any of the following as
`blocked` and stop (return per [Graceful degradation](#graceful-degradation)):

- A login / sign-in / "Join LinkedIn" wall instead of results.
- A CAPTCHA, security checkpoint, "unusual activity", or challenge page.
- A rate-limit / "too many requests" notice, or an otherwise empty page that is not
  a genuine no-results state.

Never try to solve, bypass, or work around any of these. Report and return so
`find-jobs` can offer the generic fallback.

### Step 4 — Extract each result card

From the loaded results, read up to `result_cap` job cards (stop early once you
have `result_cap` listings — do not paginate forever). For each card, build a
**listing object** per the
[adapter contract listing object](../../references/adapter-contract.md#listing-object):

| Field | How to fill it |
| --- | --- |
| `title` | Job title text as posted (required). |
| `company` | Company name as posted (required). |
| `location` | Location string shown on the card, else `null`. |
| `remote` | Map LinkedIn's workplace type: **Remote → `remote`**, **Hybrid → `hybrid`**, **On-site → `onsite`**; if not shown or ambiguous, `null`. |
| `url` | The canonical job URL — see [Step 5](#step-5--canonical-url-and-stable-id). |
| `source` | Always the literal string `linkedin`. |
| `posted` | The posted date / relative string as shown (e.g. `"2 days ago"`), else `null`. |
| `notes` | Optional free-form note (e.g. visible salary text). Omit if none. |

Rules:

- Unknown nullable fields (`location`, `remote`, `posted`) MUST be `null`; the
  optional `notes` MUST be omitted when empty. Never guess or fabricate a value.
- Do NOT emit `status`, `found_at`, `resume_used`, `cover_used`, or `applied_at` —
  setting lifecycle/application state is the sink's exclusive job. Emitting `status`
  is a contract violation.
- Extract defensively: LinkedIn markup changes. If a card is missing a required
  field (`title` or `company`) you cannot recover, skip that card rather than
  emitting a malformed listing.

### Step 5 — Canonical URL and stable id

For each card, resolve the canonical LinkedIn job URL and the stable id:

- **Canonical URL.** Normalize to the canonical job-view form and strip tracking
  query params (`refId`, `trackingId`, `trk`, `eBP`, etc.) and fragments. The
  canonical shape is `https://www.linkedin.com/jobs/view/<native-job-id>`.
- **Native job id.** LinkedIn job URLs contain the numeric posting id, usually in
  the path (`/jobs/view/3891204471`) or as a `currentJobId=` query param on the
  search URL. Parse that numeric id out.
- **`id`.** Build `linkedin-<native-job-id>` (e.g. `linkedin-3891204471`).
- **Hash fallback.** If no native id can be parsed from the URL, derive a stable
  short hash from the [dedupe identity](../../references/data-contract.md#dedupe-identity)
  — the normalized canonical URL, else normalized `title` + `company` + `location`
  — and use `linkedin-<hash>`. The id MUST be stable across runs so the sink
  updates rather than duplicates.

### Step 6 — Hand listings to add-job-to-list

Pass the array of listing objects gathered in Steps 4–5 to
[`add-job-to-list`](../add-job-to-list/SKILL.md), the sole writer of
`jobs/jobs.json`. It handles normalization, dedupe, appending, and the `jobs.md`
mirror, and returns added-vs-duplicate counts. This adapter itself writes nothing.

An empty listings array is valid (pass it through unchanged) — e.g. on
`no_results` or `blocked`.

### Step 7 — Return the result envelope

Return exactly one **result envelope** to `find-jobs`:

```json
{
  "source": "linkedin",
  "status": "ok",
  "listings": [
    {
      "id": "linkedin-3891204471",
      "title": "Senior Backend Engineer",
      "company": "Acme Robotics",
      "location": "San Francisco, CA",
      "remote": "hybrid",
      "url": "https://www.linkedin.com/jobs/view/3891204471",
      "source": "linkedin",
      "posted": "2 days ago"
    }
  ],
  "message": null
}
```

- `source` is always `linkedin`.
- `status` is one of `ok`, `no_results`, or `blocked` (see below).
- `listings` holds up to `result_cap` listing objects; `[]` for `no_results` /
  `blocked`.
- `message` is a short human note for the run summary, or `null` when unremarkable.

## Graceful degradation

Discovery runs against a live, hostile site. This adapter MUST report failure as
data and return normally — it MUST NOT throw, crash the run, or abort sibling
adapters. Map each outcome to the envelope `status`:

- **`ok`** — the search ran and returned results. `listings` holds up to
  `result_cap` objects; `message` may be `null`.
- **`no_results`** — the search ran successfully but LinkedIn matched nothing.
  `listings` is `[]`; set `message` to a short note, e.g.
  `"No LinkedIn postings matched 'platform engineer' in San Francisco"`. This is a
  normal, non-error outcome.
- **`blocked`** — LinkedIn presented a login/auth wall, CAPTCHA, security
  checkpoint, rate limit, or otherwise prevented reading results, or Chrome could
  not be reached. `listings` is `[]` (or any listings gathered before the block);
  set `message` to what was observed, e.g.
  `"LinkedIn returned a login/anti-bot wall; skipped"`. Stop trying — do not retry
  aggressively and do not attempt to defeat the protection.

`find-jobs` surfaces `no_results` and `blocked` in its run summary (and can offer
the generic fallback on a block), then continues with the remaining sources.

## Invariants (this adapter MUST uphold)

1. Never writes `jobs/jobs.json` or `jobs/jobs.md`; only `add-job-to-list` does.
2. Never sets `status`, `found_at`, or application fields on a listing.
3. Unknown fields are `null` (nullable) or omitted (optional) — never guessed.
4. `id` is stable across runs and formatted `linkedin-<native-id-or-hash>`.
5. Failures are reported via the envelope `status`/`message`, never by throwing.
6. Honors `result_cap` and the `remote` filter translation.
7. Never attempts to defeat anti-bot protection; reports and returns.

## Files this skill reads and writes

- **Reads:** the browser (the user's logged-in Chrome) via the claude-in-chrome
  tools; the [adapter contract](../../references/adapter-contract.md), the
  [data contract](../../references/data-contract.md), and
  [`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json) for the
  listing shape.
- **Writes:** nothing in the working folder. It hands listings to
  [`add-job-to-list`](../add-job-to-list/SKILL.md), which is the only writer of
  `jobs/jobs.json` and `jobs/jobs.md`.
- **Never touches:** `config.json`, `profile.json`, `jobs/jobs.json`,
  `jobs/jobs.md`, or any other working-folder file directly.
