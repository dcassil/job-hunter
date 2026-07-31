# Adapter Contract

This is the shared interface that every job-hunter **search adapter** and the
**find-jobs orchestrator** must obey. It exists so that four adapters written
independently — `search-linkedin`, `search-indeed`, `search-glassdoor`, and
`search-generic-site` — produce interchangeable output that a single sink,
[`../skills/add-job-to-list/SKILL.md`](../skills/add-job-to-list/SKILL.md), can
consume without special-casing any source.

This document pins the semantics; the field shapes it references are defined by
[`../schemas/jobs.schema.json`](../schemas/jobs.schema.json) and explained in
[`data-contract.md`](data-contract.md). Where this document and the schema
appear to disagree, the schema wins.

## Roles

- **find-jobs orchestrator** (interactive): locates the working folder via
  `config.json`, derives one shared **search query** (below) from `job-focus.md`
  and `config.remote_pref`, invokes each configured adapter with that query,
  collects each adapter's **result envelope**, and hands every returned listing
  to `add-job-to-list`. It totals the added-vs-duplicate counts the sink returns
  and reports a per-source summary (including blocks and no-result reports).
- **Adapter** (non-interactive worker): performs one site's search for the given
  query, maps each raw posting to a **listing object**, and returns a **result
  envelope**. An adapter never asks the user questions, never writes
  `jobs/jobs.json` or `jobs/jobs.md`, and never mutates any working-folder state.
- **add-job-to-list** (non-interactive worker / sink): the ONLY writer of
  `jobs/jobs.json`. See its SKILL for normalization, dedupe, and mirror rules.

## INPUT — the search query

Every adapter receives the same query object. `find-jobs` builds it once:
`keywords` and `location` are distilled from the free-form `job-focus.md`;
`remote` is copied from `config.remote_pref`; `result_cap` is chosen by the
orchestrator (default `25`).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `keywords` | string | Yes | Search terms (titles, seniority, technologies) derived from `job-focus.md`. |
| `location` | string or null | No | Target location string, or `null` for no location filter / remote-only. |
| `remote` | string enum | Yes | Copied verbatim from `config.remote_pref`: one of `remote`, `local`, `both`. |
| `result_cap` | integer | Yes | Maximum number of listings the adapter should return this run (≥ 1). |

Notes:

- `remote` uses the **config** vocabulary (`remote` / `local` / `both`), NOT the
  jobs-schema `remote` vocabulary. Adapters translate: `local` filters to
  on-site/hybrid postings; `remote` filters to remote postings; `both` applies no
  remote filter. The per-listing `remote` field an adapter emits uses the
  jobs-schema enum (`remote` / `hybrid` / `onsite` / `null`).
- Adapters MUST honor `result_cap` and stop early rather than paginate forever.
- Adapters treat the query as advisory: if a site cannot express a filter, it
  applies what it can and returns what it finds; the sink and downstream matching
  handle the rest.

## OUTPUT — the result envelope

Each adapter returns exactly one envelope to `find-jobs`:

| Field | Type | Notes |
| --- | --- | --- |
| `source` | string enum | The adapter's fixed source: `linkedin`, `indeed`, `glassdoor`, or `generic`. |
| `status` | string enum | `ok`, `no_results`, or `blocked` (see [Graceful degradation](#graceful-degradation)). |
| `listings` | array | Zero or more **listing objects** (below). Empty when `status` is `no_results` or `blocked`. |
| `message` | string or null | Human-readable note for the run summary (e.g. why it was blocked). `null` when unremarkable. |

`find-jobs` passes every object in `listings` to `add-job-to-list` regardless of
`status`, but `status` drives the run summary and never aborts the whole run: one
adapter being blocked must not stop the others.

## Listing object

A listing object maps a raw posting onto the **jobs-schema fields the adapter can
know at discovery time**. It is NOT a full job row: the adapter deliberately omits
`status` and the application fields — the sink sets `status` to `new`, stamps
`found_at`, and leaves `resume_used`, `cover_used`, and `applied_at` at their
defaults. Every field the adapter cannot determine MUST be set to `null` (for
nullable fields) or omitted (for optional non-null fields); adapters MUST NOT
invent values.

| Field | Type | Required | Set by adapter |
| --- | --- | --- | --- |
| `id` | string | Yes | Stable id `<source>-<native-id-or-hash>` (see [Stable id](#stable-id-and-source)). |
| `title` | string | Yes | Job title as posted. |
| `company` | string | Yes | Company name as posted. |
| `location` | string or null | No | Location string, or `null` if unknown. |
| `remote` | string enum or null | No | One of `remote`, `hybrid`, `onsite`, or `null` if unknown. |
| `url` | string (uri) | Yes | Canonical posting URL (strip tracking params where possible). |
| `source` | string enum | Yes | The adapter's fixed source (see below). |
| `posted` | string or null | No | Posting date/relative string as shown, or `null`. |
| `notes` | string | No | Optional free-form note (e.g. salary text). Omit if none. |

Adapters MUST NOT emit `status`, `found_at`, `resume_used`, `cover_used`, or
`applied_at`. Emitting `status` is a contract violation because it would let a
re-discovered posting reset a user's pipeline progress; setting lifecycle state is
the sink's exclusive job.

### Stable id and source

- `source` is fixed per adapter: `search-linkedin` → `linkedin`,
  `search-indeed` → `indeed`, `search-glassdoor` → `glassdoor`,
  `search-generic-site` → `generic`.
- `id` follows the data contract: `<source>-<native-id-or-hash>`.
  - Prefer the board's own posting id: `linkedin-3891`, `indeed-1024`,
    `glassdoor-77120`.
  - When no native id exists (common for `generic`), derive a **stable hash** from
    the [dedupe identity](data-contract.md#dedupe-identity) — the normalized
    canonical URL, else normalized `title` + `company` + `location` — so the same
    posting always yields the same id across runs. Example:
    `generic-9f2a1c7e` where the suffix is a short hash of the canonical URL.
- The id must be stable across runs so the sink updates rather than duplicates.

### Example listing object

```json
{
  "id": "linkedin-3891204471",
  "title": "Senior Backend Engineer",
  "company": "Acme Robotics",
  "location": "San Francisco, CA",
  "remote": "hybrid",
  "url": "https://www.linkedin.com/jobs/view/3891204471",
  "source": "linkedin",
  "posted": "2026-07-28",
  "notes": "Listed salary: $180k–$220k"
}
```

A minimal, mostly-unknown generic listing (unknowns as `null`, `notes` omitted):

```json
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
```

## Graceful degradation

Discovery runs against live, hostile sites. An adapter MUST report failure as data
and return normally — it MUST NOT throw, crash the run, or abort sibling adapters.
Map each outcome to an envelope `status`:

- **`ok`** — the search ran and returned results. `listings` holds up to
  `result_cap` listing objects; `message` may be `null`.
- **`no_results`** — the search ran successfully but matched nothing. `listings`
  is `[]`; set `message` to a short human note (e.g. `"No postings matched
  'platform engineer' in San Francisco"`). This is a normal, non-error outcome.
- **`blocked`** — the site presented an anti-bot wall, CAPTCHA, login gate, rate
  limit, or otherwise prevented reading results. `listings` is `[]`; set `message`
  to what was observed (e.g. `"LinkedIn returned a login/anti-bot wall; skipped"`).
  The adapter stops trying and returns; it does not retry aggressively or attempt
  to defeat the protection.

`find-jobs` surfaces `no_results` and `blocked` in its run summary so the user
knows which sources produced nothing and why, then continues with the remaining
sources. Any listings that were successfully gathered before a block occurred may
still be returned with `status: "blocked"`; the sink deduplicates them normally.

## Invariants (every adapter and the orchestrator MUST uphold)

1. Adapters never write `jobs/jobs.json` or `jobs/jobs.md`; only `add-job-to-list`
   does.
2. Adapters never set `status` or application fields on a listing.
3. Unknown fields are `null` (nullable) or omitted (optional) — never guessed.
4. `id` is stable across runs and formatted `<source>-<native-id-or-hash>`.
5. Failures are reported via the envelope `status`/`message`, never by throwing.
6. Adapters honor `result_cap` and the `remote` filter translation.
