# Data Contract

This is the single, authoritative human-readable reference for the job-hunter
working folder. Every skill that reads or writes working-folder state MUST conform
to it. The machine contract lives in the JSON Schemas under
[`../schemas/`](../schemas/); this document explains and pins the semantics around
them.

The schemas are load-bearing. Where a schema and this document appear to
disagree, the schema wins and this document is the bug. Field names, enums, and
required/optional status here are copied directly from:

- [`../schemas/config.schema.json`](../schemas/config.schema.json)
- [`../schemas/profile.schema.json`](../schemas/profile.schema.json)
- [`../schemas/jobs.schema.json`](../schemas/jobs.schema.json)

Worked examples that validate against these schemas live in
[`../schemas/examples/`](../schemas/examples/).

## Working-folder layout

All state lives in a single working folder on the user's machine. The plugin
itself is stateless: it never remembers state between runs and never relies on
conversation memory. Everything a skill needs is discovered from the working
folder.

The canonical layout is:

```text
<working-folder>/
├── config.json          # preferences; presence marks a valid working folder
├── profile.json         # reusable applicant answers
├── job-focus.md         # free-form description of what the user is looking for
├── resume/              # resume variant files (e.g. resume-a.pdf, resume-b.pdf)
├── cover-letters/       # cover-letter variant files (e.g. cover-a.md, cover-b.md)
└── jobs/
    ├── jobs.json        # canonical structured job list
    └── jobs.md          # generated human-readable mirror of jobs.json
```

- `config.json` is the anchor file. Its presence is what makes a directory a
  valid job-hunter working folder (see [Discovery contract](#discovery-contract)).
- `resume/` and `cover-letters/` hold the resume and cover-letter variant files
  that `resume_used` / `cover_used` and `resume_domains` refer to by id (see
  [Variant naming](#variant-naming)). File extensions are user-owned; the schemas
  only reference variants by id, never by path.

## Discovery contract

Skills are stateless and must locate the working folder on their own every run.

1. **Setup records the path.** The setup skill writes the absolute path of the
   working folder into `config.json` as the `working_dir` field. This is the
   authoritative record of where state lives.
2. **Validity is confirmed by `config.json`.** A directory is a valid working
   folder if and only if it contains a `config.json` that validates against
   [`../schemas/config.schema.json`](../schemas/config.schema.json). Presence of
   `config.json` is the marker; skills confirm they have found real state by
   reading it.
3. **No discoverable working folder means gate and stop.** A skill that cannot
   locate a valid working folder (no `config.json`, or one that fails schema
   validation) MUST NOT guess, MUST NOT create partial state, and MUST NOT
   proceed. It gates: it tells the user to run setup first, and stops.

`working_dir` inside `config.json` should be an absolute path and should point at
the folder that contains that same `config.json`.

## config.json

Working-folder preferences written by setup and read by all skills. Defined by
[`../schemas/config.schema.json`](../schemas/config.schema.json). The object
allows additional properties beyond those listed (`additionalProperties: true`),
but the fields below are the contract.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `working_dir` | string | Yes | Absolute path to the working folder that contains this config. |
| `resume_strategy` | string enum | Yes | One of `single`, `round-robin`, `domain`, `both`. |
| `resume_domains` | object | No | Maps a resume/cover variant id (e.g. `resume-a`) to an array of domain strings it targets. |
| `round_robin_pointer` | integer | No | Index (≥ 0) of the next variant to use in round-robin rotation. |
| `remote_pref` | string enum | Yes | One of `remote`, `local`, `both`. |
| `automation_default` | string enum | Yes | One of `ask`, `auto`, `human`. Default answer to the per-run automated-vs-human prompt. |
| `sites` | array of string enum | Yes | Each item is a board id from the [board registry](job-boards.md) (e.g. `linkedin`, `indeed`, `glassdoor`, `ziprecruiter`, …, `generic`). The schema enum is the authoritative closed set. |
| `email_accounts` | array | No | Optional (additive; not schema-validated). Gmail inboxes for `check-email-status` to scan, each `{ "email": <address>, "authuser": <gmail index>, "primary": <bool?> }`. The `primary` entry is checked first, then the rest. See [`email-status.md`](email-status.md#which-accounts-to-check). |

Enum values, copied verbatim:

- `resume_strategy`: `single`, `round-robin`, `domain`, `both`
- `remote_pref`: `remote`, `local`, `both`
- `automation_default`: `ask`, `auto`, `human`
- `sites` items: any board id in `config.schema.json`'s `sites` enum — see the
  [board registry](job-boards.md) for the full set and each board's meaning

`automation_default` encodes the human-in-control principle: `ask` prompts every
run, `auto` submits without prompting, and `human` always defers final submission
to the user. `resume_domains` and `round_robin_pointer` are the state that makes
the `domain`, `round-robin`, and `both` resume strategies work.

See [`../schemas/examples/config.example.json`](../schemas/examples/config.example.json).

## profile.json

Reusable applicant answers. Written once, reused across every application.
Defined by
[`../schemas/profile.schema.json`](../schemas/profile.schema.json). The top-level
object forbids additional properties (`additionalProperties: false`): only the
fields below may appear.

Top-level fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `demographics` | object | Yes | EEO-style fields; forbids additional properties. |
| `contact` | object | No | Optional contact fields reused on forms; allows additional properties. |
| `logged_questions` | array | Yes | Application questions not covered above, accumulated for reuse. |

`demographics` (all fields required; no others allowed):

| Field | Type | Notes |
| --- | --- | --- |
| `gender` | string | Free-form; e.g. `prefer-not-to-say`. |
| `ethnicity` | string | Free-form; e.g. `prefer-not-to-say`. |
| `veteran` | string | Free-form; e.g. `no`. |
| `disability` | string | Free-form; e.g. `prefer-not-to-say`. |
| `work_authorized` | boolean | Whether the applicant is authorized to work. |
| `needs_sponsorship` | boolean | Whether the applicant needs visa sponsorship. |

`contact` is an open object (`additionalProperties: true`) for fields reused on
application forms. It is optional. Recommended well-known keys: `portfolio_url`
(personal portfolio / personal website URL, reused on "website"/"portfolio" fields),
`full_name`, `email`, `phone`, and `linkedin_url`.

`logged_questions` items (forbid additional properties):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `question` | string | Yes | The application question text. |
| `answer` | string or null | No | The stored answer, or `null` if not yet answered. |
| `source_job` | string or null | No | Job `id` where the question was first seen, or `null`. |
| `answered` | boolean | Yes | Whether this question has been answered. |

`logged_questions` encodes the "ask once, reuse forever" principle: a genuinely
new application question is appended here (with `answered: false` and a `null`
`answer` until the user provides one), and no question already present is asked
again.

See [`../schemas/examples/profile.example.json`](../schemas/examples/profile.example.json).

## job-focus.md

`job-focus.md` is a free-form Markdown file that captures what the user is
looking for: target titles, seniority, technologies, domains, locations,
compensation expectations, and any other search guidance. It has no JSON Schema
because it is human prose, not structured data.

Skills read it to steer discovery and matching. It is written during setup and
may be edited by the user at any time. Treat it as advisory context, not as
machine state: never parse it as authoritative structured data — that role
belongs to `config.json` and `profile.json`.

## jobs/jobs.json

The canonical structured job list. Defined by
[`../schemas/jobs.schema.json`](../schemas/jobs.schema.json). The top level is a
JSON **array**; each element is a job object that forbids additional properties
(`additionalProperties: false`).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Stable id, e.g. `linkedin-3891`. See [Job id](#job-id). |
| `title` | string | Yes | Job title. |
| `company` | string | Yes | Company name. |
| `location` | string or null | No | Location string, or `null`. |
| `remote` | string enum or null | No | One of `remote`, `hybrid`, `onsite`, or `null`. |
| `url` | string (uri) | Yes | Canonical job URL. |
| `source` | string enum | Yes | The board id the listing came from — a value from the [board registry](job-boards.md) (`linkedin`, `indeed`, `glassdoor`, `ziprecruiter`, …, `generic`). The schema enum is the authoritative set. |
| `posted` | string or null | No | When the job was posted, or `null`. |
| `found_at` | string | Yes | When this row was discovered. |
| `status` | string enum | Yes | See [Status enum and transitions](#status-enum-and-transitions). |
| `resume_used` | string or null | No | Resume variant id used to apply, or `null`. |
| `cover_used` | string or null | No | Cover variant id used to apply, or `null`. |
| `applied_at` | string or null | No | When the application was submitted, or `null`. |
| `notes` | string | No | Free-form notes. |
| `handoff` | object | No | Present on `needs_human` / `account_required` jobs; see [Handoff object](#handoff-object). |

Enum values, copied verbatim:

- `remote`: `remote`, `hybrid`, `onsite`, `null`
- `source`: any board id in `jobs.schema.json`'s `source` enum — see the
  [board registry](job-boards.md)
- `status`: `new`, `applied`, `interviewing`, `offer`, `skipped`, `rejected`,
  `needs_human`, `account_required`

See [`../schemas/examples/jobs.example.json`](../schemas/examples/jobs.example.json).

## jobs/jobs.md mirror

`jobs/jobs.md` is a **generated** human-readable mirror of `jobs/jobs.json`. It
exists so the user can scan their pipeline without reading JSON.

- `jobs.json` is the source of truth; `jobs.md` is derived from it.
- The mirror is regenerated from `jobs.json` whenever the list changes. Do not
  hand-edit `jobs.md`; edit `jobs.json` and regenerate. Any manual change to
  `jobs.md` will be lost on the next regeneration.
- Every job in `jobs.json` should appear in `jobs.md`, typically as a table or
  list grouped or sorted by `status`, showing at least `title`, `company`,
  `status`, and a link to `url`.
- Jobs in `needs_human` / `account_required` should render a scannable "needs you"
  section (or column) showing the `handoff.blocking` reason and `handoff.application_url`
  so the user knows exactly what to finish and where.

## Shared conventions

### Job id

Each job has a stable, unique `id` string. The convention is:

```text
<source>-<site-native-id-or-hash>
```

- `<source>` is the job's `source` value (`linkedin`, `indeed`, `glassdoor`, or
  `generic`).
- `<site-native-id-or-hash>` is the board's own posting id when one is available
  (e.g. `linkedin-3891`, `indeed-1024`). When no native id is available (common
  for `generic` sources), use a stable hash derived from the
  [dedupe identity](#dedupe-identity) so the same posting always yields the same
  id.

The id must be stable across runs: re-discovering the same posting must produce
the same `id` so rows are updated, not duplicated.

### Dedupe identity

Two discovered postings are the same job when they share a dedupe identity.
Resolve identity in this order:

1. **Canonical URL.** Normalize the job `url` (strip tracking query parameters,
   fragments, and trailing slashes; lowercase the host) and compare. Matching
   canonical URLs are the same job.
2. **Normalized `title` + `company` + `location`.** When URLs are missing or not
   comparable, fall back to a normalized combination of `title`, `company`, and
   `location` (trim, collapse whitespace, lowercase). Matching triples are the
   same job.

On a dedupe hit, update the existing row in `jobs.json` rather than appending a
new one.

### Status enum and transitions

`status` is one of the following (copied verbatim from the schema):
`new`, `applied`, `interviewing`, `offer`, `skipped`, `rejected`, `needs_human`,
`account_required`.

The primary lifecycle is:

```text
new → applied → interviewing → offer
```

`needs_human` and `account_required` are **holding states** for custom /
non-Easy-Apply applications: the agent filled everything it could and now needs the
user to complete a human-only step (create an account, enter a password, confirm an
email, solve a CAPTCHA, or answer an unknown question). They carry a
[`handoff`](#handoff-object) object and rejoin the primary lifecycle once the human
finishes (→ `applied`) or the user drops the job (→ `skipped`).

`skipped` and `rejected` are **terminal side states**: a job can leave the
primary lifecycle for a terminal state, but nothing transitions out of a terminal
state.

Allowed transitions:

| From | Allowed to |
| --- | --- |
| `new` | `applied`, `skipped`, `needs_human`, `account_required` |
| `applied` | `interviewing`, `rejected`, `skipped` |
| `interviewing` | `offer`, `rejected`, `skipped` |
| `offer` | (terminal — pipeline success) |
| `needs_human` | `applied`, `account_required`, `skipped` |
| `account_required` | `applied`, `needs_human`, `skipped` |
| `skipped` | (terminal) |
| `rejected` | (terminal) |

Notes:

- A newly discovered job starts at `new`.
- `skipped` means the user chose not to pursue the job; `rejected` means the
  employer declined the applicant. Both are terminal.
- When a job moves to `applied`, record `applied_at` and the `resume_used` /
  `cover_used` variant ids used for that application.
- When a custom application can't be completed unattended, it moves to
  `needs_human` (a step needs the user mid-application) or `account_required` (the
  site required an account before the form was even viewable), always carrying a
  `handoff` object. Both are written only by `record-application`.

### Handoff object

`handoff` is present only on `needs_human` / `account_required` jobs and records how
far a custom / non-Easy-Apply application got and what the human must do to finish it.
It is written exclusively by `record-application`.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ats` | string or null | No | Detected platform (`greenhouse`, `lever`, `workday`, `ashby`, `icims`, `smartrecruiters`, `generic`) or `null` if unknown. |
| `application_url` | string | No | The URL the user should open to finish the application. |
| `blocking` | string | Yes | Short human-readable reason, e.g. `"account required to submit"` or `"unknown question: years managing a P&L"`. |
| `needs` | array | Yes | One or more of `account`, `password`, `email-confirm`, `captcha`, `question`, `payment`, `bot-check` — the human-only step(s)/unknowns blocking completion. `bot-check` = a suspected AI/bot-detection trap or honeypot field the agent left untouched for the user to review (see the [pre-answer gates](question-log.md#pre-answer-gates)); `question` also covers a free-response/prose field the user must write. |
| `draft_saved` | boolean | No | Whether the ATS supported saving progress and a draft was saved for the user to resume. |
| `filled_through` | string or null | No | How far the agent got, e.g. `"all fields except final account+submit"`. |
| `logged_at` | string | Yes | Date the handoff was recorded (`YYYY-MM-DD`). |

The `needs` values are the join point the `interactive-apply` skill reads to know
what to ask the user for. None of these steps are ever performed by the agent — they
are always handed to the human (see the safety invariant in
[`custom-application.md`](custom-application.md)).

### Variant naming

Resume and cover-letter variants are referenced by id, never by file path, so the
same id is used consistently across `config.json` (`resume_domains`) and
`jobs.json` (`resume_used`, `cover_used`).

- Resume variant ids follow `resume-<label>` (e.g. `resume-a`, `resume-b`).
- Cover variant ids follow `cover-<label>` (e.g. `cover-a`, `cover-b`).
- Labels pair a resume with its matching cover where applicable (e.g. `resume-b`
  and `cover-b` are used together), and are the same labels that
  `resume_domains` maps to target domains.
- Resume files live under the working folder's `resume/` directory and cover
  files under `cover-letters/`; the id is the stable handle that all structured
  state uses to refer to them.
