---
name: add-job-to-list
description: Use when a search adapter (search-linkedin, search-indeed, search-glassdoor, search-generic-site) or the find-jobs orchestrator has one or more discovered job listings to record. This is a non-interactive worker skill — it is invoked by other skills, never run directly by the user. It normalizes each listing to the jobs schema, dedupes it against the existing list, appends genuinely new jobs, never overwrites an existing job's status or application fields, regenerates the jobs/jobs.md mirror, and returns added-vs-duplicate counts to its caller.
---

# add-job-to-list

The single **sink** for discovered job listings. Search adapters gather listings
per the [adapter contract](../../references/adapter-contract.md); this worker is
the ONLY thing that writes `jobs/jobs.json` and `jobs/jobs.md`. It runs
non-interactively: it asks the user nothing, makes no consequential prompts, and
returns a small result object to whatever skill invoked it.

All state shapes here conform EXACTLY to
[`../../references/data-contract.md`](../../references/data-contract.md) and
[`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json). Where this
document and the schema appear to disagree, the schema wins.

## When to use

- Invoked by a search adapter or `find-jobs` with a batch of listing objects to
  record. Not a user-facing skill.

## Gates / preconditions (check first, in order)

1. **Working folder is discoverable.** Locate the working folder via
   `config.json` (see [Procedure step 1](#step-1--locate-the-working-folder)). If
   no valid `config.json` can be found, DO NOT guess and DO NOT create state:
   return `{ "error": "no-working-folder" }` to the caller so it can tell the
   user to run setup, and stop.
2. **Input is a list of listing objects.** The caller passes zero or more listing
   objects shaped per the adapter contract. An empty list is valid: return zero
   counts. Never fabricate listings.
3. **Never interactive.** If information is missing, use `null` — do not ask the
   user.

## Input

A list of **listing objects** as defined in the
[adapter contract](../../references/adapter-contract.md#listing-object). Each has
at least `id`, `title`, `company`, `url`, `source`, and may carry `location`,
`remote`, `posted`, `notes` (unknowns `null` or omitted). Listings deliberately
carry NO `status`, `found_at`, or application fields — those belong to this sink.

## Procedure

### Step 1 — Locate the working folder

Resolve the working folder the same way every skill does: read `config.json` and
confirm it validates against
[`../../schemas/config.schema.json`](../../schemas/config.schema.json). Its
`working_dir` field is the absolute path to the folder. If none is discoverable,
gate per precondition 1 and stop. The jobs list lives at
`<working_dir>/jobs/jobs.json`; the mirror at `<working_dir>/jobs/jobs.md`.

### Step 2 — Load the current jobs list

Read `<working_dir>/jobs/jobs.json`. It is a JSON **array** of job objects. If the
file is missing or empty, treat the list as `[]`. Keep the existing rows exactly
as they are — you will only append to them, or fill missing metadata on a match.

### Step 3 — Normalize each incoming listing

For each listing object, build a candidate job row conforming to
`jobs.schema.json`:

- Copy `id`, `title`, `company`, `url`, `source` through unchanged (all required).
- Copy `location`, `remote`, `posted`, `notes` if present; set nullable fields
  (`location`, `remote`, `posted`) to `null` when unknown; omit optional
  non-nullable `notes` when there is none.
- Validate enums: `remote` ∈ {`remote`, `hybrid`, `onsite`, `null`}; `source` ∈
  {`linkedin`, `indeed`, `glassdoor`, `generic`}. If a value is out of range,
  coerce `remote` to `null`; a bad `source` is a caller bug — skip that listing
  and note it in the result.
- Do NOT set `status`, `found_at`, `resume_used`, `cover_used`, or `applied_at`
  yet — those are decided by dedupe outcome in the next step.

### Step 4 — Compute dedupe identity and match

Using the [dedupe identity](../../references/data-contract.md#dedupe-identity)
rules, check whether the candidate already exists in the list. Resolve identity in
this order:

1. **Canonical URL.** Normalize both URLs (strip tracking query params and
   fragments, drop trailing slashes, lowercase the host) and compare. A match is
   the same job.
2. **Normalized `title` + `company` + `location`.** When URLs are missing or not
   comparable, compare the trimmed, whitespace-collapsed, lowercased triple. A
   match is the same job.

(The `id` is already stable per the adapter contract, so an equal `id` is also a
match — but URL/triple identity is authoritative and catches the same posting
arriving under different ids.)

### Step 5a — On a dedupe MATCH (existing job)

The job is already tracked. **NEVER overwrite** the existing row's `status`,
`resume_used`, `cover_used`, `applied_at`, or `found_at` — those record the user's
pipeline progress and must be preserved untouched. You MAY fill in **missing
metadata only**: if an existing field is `null`/absent and the incoming listing
has a value, you may populate `location`, `remote`, `posted`, or append to
`notes`. Never replace an existing non-null metadata value. Count this listing as
a **duplicate**.

### Step 5b — On NO match (new job)

Append a new job row to the array with:

- all normalized fields from Step 3,
- `status`: `"new"` (a newly discovered job always starts at `new`),
- `found_at`: today's date (`YYYY-MM-DD`).

Leave `resume_used`, `cover_used`, and `applied_at` unset/`null`. Count this
listing as **added**.

### Step 6 — Write jobs.json

Write the updated array back to `<working_dir>/jobs/jobs.json` as pretty-printed
JSON. The result MUST still validate against `jobs.schema.json`: a top-level
array, each element with the required fields (`id`, `title`, `company`, `url`,
`source`, `found_at`, `status`) and no additional properties beyond the schema.
Do not reorder or drop pre-existing rows.

### Step 7 — Regenerate jobs.md

Regenerate `<working_dir>/jobs/jobs.md` fully from the updated `jobs.json` (it is a
derived mirror — never hand-edit it, always regenerate). Group or sort by
`status`, and within each group sort by `found_at` descending (newest first).
Include at least `title`, `company`, `status`, and a Markdown link to `url`.

Suggested format:

```markdown
# Jobs

_Generated from jobs.json — do not edit by hand._

## new

| Title | Company | Status | Link |
| --- | --- | --- | --- |
| Senior Backend Engineer | Acme Robotics | new | [open](https://www.linkedin.com/jobs/view/3891204471) |

## applied

| Title | Company | Status | Link |
| --- | --- | --- | --- |
| Platform Engineer | Nimbus Labs | applied | [open](https://nimbuslabs.example/careers/platform-engineer) |
```

Emit a section only for statuses that have at least one job. Order sections by the
lifecycle: `new`, `applied`, `interviewing`, `offer`, `skipped`, `rejected`.

### Step 8 — Return a result to the caller

Return a small machine-readable result so `find-jobs` can total across adapters:

```json
{
  "added": 3,
  "duplicates": 2,
  "updated_metadata": 1,
  "skipped_invalid": 0,
  "total_in_list": 42
}
```

- `added` — new rows appended (Step 5b).
- `duplicates` — listings that matched an existing job (Step 5a).
- `updated_metadata` — subset of duplicates where missing metadata was filled.
- `skipped_invalid` — listings dropped for a bad/unknown `source` or unusable
  shape.
- `total_in_list` — total job count after the write.

On the gate failure from precondition 1, return `{ "error": "no-working-folder" }`
instead.

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json` (to discover the folder and confirm
  validity), `<working_dir>/jobs/jobs.json` (current list), and the schema
  [`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json) plus the
  contract [`../../references/data-contract.md`](../../references/data-contract.md)
  and [`../../references/adapter-contract.md`](../../references/adapter-contract.md).
- **Writes:** `<working_dir>/jobs/jobs.json` (append / metadata fill only) and
  `<working_dir>/jobs/jobs.md` (full regeneration).
- **Never touches:** any other working-folder file; never `config.json` or
  `profile.json`.
