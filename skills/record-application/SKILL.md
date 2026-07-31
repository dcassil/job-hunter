---
name: record-application
description: Use when an application step needs to change a single job's pipeline status — for example when apply-to-jobs has submitted an application (move to `applied`), when the user marks a job `skipped`, or when interview/offer/rejection outcomes arrive. This is a non-interactive worker skill — invoked by other skills, never run directly by the user. It is the SOLE writer of a job's `status`, `resume_used`, `cover_used`, and `applied_at` fields; it validates the requested transition against the data-contract status graph and rejects invalid ones, and it never touches any other field or any other job.
---

# record-application

The single **status writer** for the jobs pipeline. Where `add-job-to-list` is the
sink for newly discovered jobs, `record-application` is the ONLY thing that mutates a
job's lifecycle: its `status` and, on a move to `applied`, its `applied_at`,
`resume_used`, and `cover_used`. It runs non-interactively: it asks the user nothing,
makes no consequential prompts, and returns a small result object to whatever skill
invoked it.

All state shapes here conform EXACTLY to
[`../../references/data-contract.md`](../../references/data-contract.md) and
[`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json). Where this
document and the schema appear to disagree, the schema wins.

## When to use

- Invoked by `apply-to-jobs` (or another orchestrator/worker) with a single job `id`
  and a target `status` to move that job to. Not a user-facing skill.

## Gates / preconditions (check first, in order)

1. **Working folder is discoverable.** Locate the working folder via `config.json`
   (see [Step 1](#step-1--locate-the-working-folder)). If no valid `config.json` can
   be found, DO NOT guess and DO NOT create state: return
   `{ "error": "no-working-folder" }` to the caller so it can tell the user to run
   setup, and stop.
2. **Input names exactly one job and one target status.** The caller passes a single
   job `id`, a target `status`, and — only when the target is `applied` — the
   `resume_used` and `cover_used` variant ids for that application. If the job `id`
   is missing or not found in `jobs/jobs.json`, return `{ "error": "job-not-found" }`
   and stop.
3. **Target status is a valid enum value.** The target `status` MUST be one of
   `new`, `applied`, `interviewing`, `offer`, `skipped`, `rejected`. Anything else
   returns `{ "error": "invalid-status" }` and stops.
4. **The transition must be allowed by the status graph.** See
   [Step 3](#step-3--validate-the-transition). An illegal transition is rejected —
   never forced.
5. **Never interactive.** If the caller failed to supply `resume_used` / `cover_used`
   on a move to `applied`, record `null` for the missing one — do not ask the user.

## Input

```json
{
  "id": "linkedin-3891",
  "status": "applied",
  "resume_used": "resume-b",
  "cover_used": "cover-b"
}
```

- `id` (required) — the job to transition.
- `status` (required) — the target lifecycle status.
- `resume_used`, `cover_used` (only meaningful when `status` is `applied`) — the
  variant ids chosen by the rotation resolver in
  [`../../references/rotation.md`](../../references/rotation.md). If absent, treat as
  `null`. Ignored for any target status other than `applied`.

## Procedure

### Step 1 — Locate the working folder

Resolve the working folder the same way every skill does: read `config.json` and
confirm it validates against
[`../../schemas/config.schema.json`](../../schemas/config.schema.json). Its
`working_dir` field is the absolute path to the folder. If none is discoverable,
gate per precondition 1 and stop. The jobs list lives at
`<working_dir>/jobs/jobs.json`; the mirror at `<working_dir>/jobs/jobs.md`.

### Step 2 — Load the jobs list and find the job

Read `<working_dir>/jobs/jobs.json` (a JSON **array** of job objects). Find the row
whose `id` equals the input `id`. If the file is missing/empty or no row matches,
gate per precondition 2 (`{ "error": "job-not-found" }`) and stop. Keep every other
row, and every other field of the matched row, exactly as-is.

### Step 3 — Validate the transition

Read the current `status` of the matched job. The allowed transitions are the status
graph in
[`../../references/data-contract.md`](../../references/data-contract.md#status-enum-and-transitions),
copied here verbatim:

| From | Allowed to |
| --- | --- |
| `new` | `applied`, `skipped` |
| `applied` | `interviewing`, `rejected`, `skipped` |
| `interviewing` | `offer`, `rejected`, `skipped` |
| `offer` | (terminal — pipeline success) |
| `skipped` | (terminal) |
| `rejected` | (terminal) |

Rules:

- `offer`, `skipped`, and `rejected` are terminal: nothing transitions out of them.
- A no-op where the target equals the current status is NOT a valid transition (it
  is not listed in the graph); reject it as invalid rather than rewriting fields.
- If the requested `current → target` pair is not in the table, reject:
  return `{ "error": "invalid-transition", "from": "<current>", "to": "<target>" }`
  and make NO changes to `jobs.json` or `jobs.md`.

### Step 4 — Apply the field changes (status/application fields only)

On a valid transition, mutate ONLY the matched job, and ONLY these fields:

- Set `status` to the target status.
- **On a move to `applied` (and only then):**
  - Set `applied_at` to today's date (`YYYY-MM-DD`).
  - Set `resume_used` to the input `resume_used` (or `null` if none supplied).
  - Set `cover_used` to the input `cover_used` (or `null` if none supplied).
- For every other target status (`skipped`, `interviewing`, `offer`, `rejected`),
  change `status` only. Do NOT touch `applied_at`, `resume_used`, or `cover_used` —
  leave whatever values they already hold.

NEVER change `id`, `title`, `company`, `location`, `remote`, `url`, `source`,
`posted`, `found_at`, or `notes`. NEVER touch any other job's row.

### Step 5 — Write jobs.json

Write the updated array back to `<working_dir>/jobs/jobs.json` as pretty-printed
JSON. The result MUST still validate against `jobs.schema.json`: a top-level array,
each element with the required fields (`id`, `title`, `company`, `url`, `source`,
`found_at`, `status`) and no additional properties beyond the schema. Do not reorder
or drop pre-existing rows.

### Step 6 — Regenerate jobs.md

Regenerate `<working_dir>/jobs/jobs.md` fully from the updated `jobs.json` (it is a
derived mirror — never hand-edit it, always regenerate). This MUST produce the
identical format to `add-job-to-list` so the two writers never disagree: group by
`status`, and within each group sort by `found_at` descending (newest first).
Include at least `title`, `company`, `status`, and a Markdown link to `url`.

Format (identical to `add-job-to-list`):

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

### Step 7 — Return a result to the caller

On success, return:

```json
{
  "id": "linkedin-3891",
  "from": "new",
  "to": "applied",
  "applied_at": "2026-07-30",
  "resume_used": "resume-b",
  "cover_used": "cover-b"
}
```

`applied_at`, `resume_used`, and `cover_used` are echoed only for a move to
`applied`; for other transitions return just `id`, `from`, and `to`. On any gate
failure return the corresponding error object instead:
`{ "error": "no-working-folder" }`, `{ "error": "job-not-found" }`,
`{ "error": "invalid-status" }`, or
`{ "error": "invalid-transition", "from": "<current>", "to": "<target>" }`.

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json` (to discover the folder and confirm
  validity), `<working_dir>/jobs/jobs.json` (current list), and the schema
  [`../../schemas/jobs.schema.json`](../../schemas/jobs.schema.json) plus the
  contract [`../../references/data-contract.md`](../../references/data-contract.md).
- **Writes:** `<working_dir>/jobs/jobs.json` (status/application fields of one job
  only) and `<working_dir>/jobs/jobs.md` (full regeneration).
- **Never touches:** any other working-folder file; never `config.json` or
  `profile.json`; never any field other than `status`/`applied_at`/`resume_used`/
  `cover_used`; never any job other than the one named.
