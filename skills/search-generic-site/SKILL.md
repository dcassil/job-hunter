---
name: search-generic-site
description: Use when find-jobs needs to search a job board that has no dedicated adapter, or as the fallback when a dedicated adapter (search-linkedin, search-indeed, search-glassdoor) is blocked. This is a non-interactive worker/adapter — it is invoked by find-jobs, never run directly by the user. Given the shared search query plus either a board URL to open in the browser or listing text/URLs the user already pasted, it extracts what it can into adapter-contract listing objects (unknowns left null), stamps source "generic" with a stable generic-<hash> id, returns a result envelope (ok/no_results/blocked), and hands the listings to add-job-to-list. It never writes jobs.json.
---

# search-generic-site

The safe-baseline **search adapter**. It handles any board that lacks a dedicated
adapter and is the fallback when a dedicated adapter is blocked. It performs one
site's search (or parses pasted text), maps each raw posting onto a **listing
object**, and returns a **result envelope** to `find-jobs`.

This adapter obeys the shared interface in
[`../../references/adapter-contract.md`](../../references/adapter-contract.md) and
the field shapes in
[`../../references/data-contract.md`](../../references/data-contract.md) and
[`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json). Where this
document and the schema appear to disagree, the schema wins.

It runs **non-interactively**: it asks the user nothing, never writes
`jobs/jobs.json` or `jobs/jobs.md`, never mutates working-folder state, and never
throws — every failure is reported as data in the envelope.

## When to use

- Invoked by `find-jobs` for a board with no dedicated adapter, or as the fallback
  when another adapter returned `blocked`. Not a user-facing skill.

## Gates / preconditions (check first, in order)

1. **A search query is provided.** The caller passes the shared query object
   (`keywords`, `location`, `remote`, `result_cap`). If it is absent, return a
   `blocked` envelope with a message saying the query was missing — do not guess a
   query.
2. **An input source is provided.** The caller supplies exactly one of: (a) a board
   **URL** to open, or (b) **pasted listing text/URLs**. If neither is present,
   return a `no_results` envelope explaining that no board URL or listing text was
   supplied.
3. **Never interactive.** If a field cannot be determined, set it to `null` — never
   ask the user. Do NOT locate or read the working folder, `config.json`, or
   `jobs.json`; the sink (`add-job-to-list`) owns all working-folder access.
4. **Never defeat protections.** If a page shows a login wall, CAPTCHA, anti-bot
   interstitial, or rate limit, stop and report `blocked`. Do not retry
   aggressively, solve challenges, or attempt to bypass them.

## INPUT — the search query

Consume the shared query object exactly as defined in the
[adapter contract](../../references/adapter-contract.md#input--the-search-query):

| Field | Type | Use |
| --- | --- | --- |
| `keywords` | string | Filter/steer which postings count as matches. |
| `location` | string or null | Advisory location filter; `null` means no filter. |
| `remote` | enum (`remote`/`local`/`both`) | Config vocabulary — translate per below. |
| `result_cap` | integer | Hard cap on returned listings; stop early, never paginate forever. |

**Remote translation** (config vocabulary → what to keep): `remote` → keep only
postings that read as remote; `local` → keep on-site/hybrid postings; `both` →
apply no remote filter. The per-listing `remote` field you emit uses the
**jobs-schema** enum (`remote` / `hybrid` / `onsite` / `null`), not the config
vocabulary. Treat every filter as advisory: if the page cannot express it, apply
what you can and return what you find.

## Input modes

The caller provides one of these two sources. Detect which and follow that branch.

### Mode A — board URL (browser)

Use the **claude-in-chrome** browser tools. If those tools are not yet loaded,
load them first with a single `ToolSearch` call:

```text
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__tabs_create_mcp
```

Procedure:

1. Open the given URL with `navigate` (in a new tab via `tabs_create_mcp` if
   needed). Do not click into destructive or account flows; only read.
2. If the query's `keywords`/`location` can be applied by editing the URL's query
   string (many boards accept `?q=` / `?l=` style params), prefer constructing the
   search URL over interacting with page widgets — this avoids triggering modal
   dialogs. Only fall back to on-page interaction when the URL cannot express the
   search.
3. Read the rendered results with `read_page` (structured) and/or `get_page_text`
   (plain text). Prefer `read_page` for links/structure; use `get_page_text` as a
   fallback when structure is unavailable.
4. **Detect a wall before parsing.** If the page is a login/signup gate, CAPTCHA,
   "verify you are human" interstitial, "access denied"/429/403 page, or is
   otherwise empty of results because of protection, STOP and return a `blocked`
   envelope describing what you saw. Do not retry or attempt to bypass.
5. Otherwise, extract the individual postings from the results (see
   [Extraction](#extraction--mapping-to-a-listing-object)). Honor `result_cap`:
   stop collecting once you have `result_cap` listings; do not paginate endlessly.

Dialog safety: follow the claude-in-chrome guidance — avoid actions that trigger
modal dialogs (file pickers, permission prompts, "apply now" flows). Read, do not
transact.

### Mode B — pasted listing text or URLs

The caller passes free-form text the user pasted: it may be one or many postings,
a block of copied search results, and/or a list of posting URLs.

1. Split the input into candidate postings. Detect boundaries from blank lines,
   list markers, repeated title/company patterns, or one-URL-per-line.
2. For each candidate URL you are given, you MAY open it in the browser (Mode A
   tools) to enrich the fields — but only if that is cheap and safe; if opening a
   URL hits a wall, keep whatever fields the pasted text already provided and leave
   the rest `null` (do not mark the whole run `blocked` just because one enrichment
   fetch failed).
3. Extract fields from the text you have (see
   [Extraction](#extraction--mapping-to-a-listing-object)). Honor `result_cap`.

## Extraction — mapping to a listing object

For each posting, build a **listing object** per the
[adapter contract](../../references/adapter-contract.md#listing-object). Map only
what the source actually contains; **leave every undetermined field `null` (for
nullable fields) or omit it (for optional non-null fields). Never invent, infer, or
guess a value.**

| Field | Required | How to fill |
| --- | --- | --- |
| `title` | Yes | Job title as posted. If no title can be identified, drop the candidate (it is not a usable listing). |
| `company` | Yes | Company name as posted. If none can be identified, drop the candidate. |
| `location` | No | Location string as shown, else `null`. |
| `remote` | No | Map explicit signals to `remote` / `hybrid` / `onsite`; if not stated, `null`. Never assume. |
| `url` | Yes | Canonical posting URL — strip tracking query params (e.g. `utm_*`, `gclid`, `ref`), fragments, and trailing slashes; lowercase the host. In Mode A prefer the posting's own link; in Mode B use the pasted URL. If truly no URL exists, use the board/search URL the posting came from. |
| `source` | Yes | Always the string `"generic"`. |
| `posted` | No | Posted date or relative string as shown (e.g. `"2 days ago"`), else `null`. |
| `notes` | No | Optional free-form note (e.g. salary text). Omit when there is none. |
| `id` | Yes | Stable id — see [Stable id](#stable-id) below. |

Do NOT emit `status`, `found_at`, `resume_used`, `cover_used`, or `applied_at` —
setting lifecycle/application state is the sink's exclusive job, and emitting
`status` could reset a user's pipeline progress.

Apply the query filters here: drop postings that clearly fail the `remote`
translation or that plainly do not match `keywords`. When unsure, keep the posting
— the sink and downstream matching handle the rest. Stop once you reach
`result_cap`.

### Stable id

Format: `generic-<hash>`. Generic boards rarely expose a native posting id, so
derive the `<hash>` from the
[dedupe identity](../../references/data-contract.md#dedupe-identity) so the same
posting yields the same id across runs:

1. **Prefer the canonical URL.** Normalize it (strip tracking params/fragments,
   drop trailing slash, lowercase host), then take a short stable hash of that
   normalized string — e.g. `generic-9f2a1c7e`.
2. **Fallback to the normalized triple.** When no usable URL exists, hash the
   normalized `title` + `company` + `location` (trim, collapse whitespace,
   lowercase, joined consistently).

Use the *same* normalization the sink uses so ids stay consistent. If a board does
expose its own native posting id, you MAY use `generic-<native-id>` instead — but
the hash-from-identity path is the norm for generic sources.

## OUTPUT — the result envelope

Return exactly one envelope to `find-jobs`, per the
[adapter contract](../../references/adapter-contract.md#output--the-result-envelope):

| Field | Value |
| --- | --- |
| `source` | Always `"generic"`. |
| `status` | `ok`, `no_results`, or `blocked` (see below). |
| `listings` | Array of listing objects (up to `result_cap`); `[]` for `no_results`/`blocked`. |
| `message` | Short human note for the run summary, or `null` when unremarkable. |

Map outcomes to `status` ([graceful degradation](../../references/adapter-contract.md#graceful-degradation)):

- **`ok`** — the search/parse ran and produced at least one listing. Populate
  `listings`; `message` may be `null`.
- **`no_results`** — it ran successfully but matched nothing (empty board results,
  or pasted text held no usable postings). `listings: []`; set a short `message`
  such as `"No generic postings matched 'platform engineer'"`.
- **`blocked`** — a login gate, CAPTCHA, anti-bot wall, rate limit, or similar
  prevented reading results, or a required input was missing (see gates).
  `listings: []`; set `message` to what was observed, e.g.
  `"Board returned a login/anti-bot wall; skipped"`. Stop; do not retry
  aggressively. Any listings gathered before the block occurred may still be
  returned with `status: "blocked"` — the sink dedupes them normally.

Example envelope:

```json
{
  "source": "generic",
  "status": "ok",
  "listings": [
    {
      "id": "generic-9f2a1c7e",
      "title": "Platform Engineer",
      "company": "Nimbus Labs",
      "location": null,
      "remote": null,
      "url": "https://nimbuslabs.example/careers/platform-engineer",
      "source": "generic",
      "posted": null
    }
  ],
  "message": null
}
```

## Hand off to add-job-to-list

Pass the envelope's `listings` array (even if empty) to
[`../add-job-to-list/SKILL.md`](../add-job-to-list/SKILL.md), the ONLY writer of
`jobs/jobs.json` and `jobs/jobs.md`. This adapter never writes those files itself.
`find-jobs` collects this adapter's envelope, forwards the listings to the sink,
and uses `status`/`message` for its per-source run summary. Return the envelope to
your caller after handing off.

## Invariants (must hold every run)

1. Never write `jobs/jobs.json` or `jobs/jobs.md`; only `add-job-to-list` does.
2. Never set `status`, `found_at`, or application fields on a listing.
3. Unknown fields are `null` (nullable) or omitted (optional) — never guessed.
4. `id` is stable across runs and formatted `generic-<native-id-or-hash>`.
5. Failures are reported via the envelope `status`/`message`, never by throwing.
6. Honor `result_cap` and the `remote` filter translation.

## Files this skill reads and writes

- **Reads:** the caller-supplied search query and input source (board URL or
  pasted text); web pages via the claude-in-chrome browser tools (Mode A); and the
  contracts [`../../references/adapter-contract.md`](../../references/adapter-contract.md)
  and [`../../references/data-contract.md`](../../references/data-contract.md).
- **Writes:** nothing in the working folder. It returns a result envelope and hands
  listings to [`../add-job-to-list/SKILL.md`](../add-job-to-list/SKILL.md).
- **Never touches:** `config.json`, `profile.json`, `jobs/jobs.json`,
  `jobs/jobs.md`, or any other working-folder state.
