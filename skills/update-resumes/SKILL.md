---
name: update-resumes
description: Use when the user says "update my resumes", "update resumes/cover letters on file", "add/replace/remove a resume or cover letter", or otherwise wants to change the resume and cover-letter variants in an existing job-hunter working folder. Adds, replaces, or removes resume and cover-letter variants and reconfigures the rotation strategy / domain mapping, reusing the setup wizard's ingestion and rotation-capture helper.
---

# Update resumes and cover letters

This is a maintenance skill for an already-initialized job-hunter working folder.
It lets the user add, replace, or remove resume and cover-letter variants and keeps
the rotation state in `config.json` consistent afterward. It writes only the variant
files under `resume/` and `cover-letters/` and the resume-rotation fields of
`config.json`. It conforms EXACTLY to the data contract in
[`../../references/data-contract.md`](../../references/data-contract.md) and the
schema in [`../../schemas/config.schema.json`](../../schemas/config.schema.json).

You are the executing agent. Delegate the repeatable procedures to the ingestion
helper and do not duplicate its content:

- Resume/cover ingestion (both modes) and rotation-strategy capture:
  [`../job-hunter-setup/references/ingestion.md`](../job-hunter-setup/references/ingestion.md)

## Principles (non-negotiable)

- **Confirm before acting.** Never remove or overwrite a file without showing the
  user exactly what will change and getting an explicit yes. Adds are consequential
  too — show the id and destination before copying.
- **Stateless.** Discover the working folder from `config.json`; never rely on
  conversation memory.
- **Schema-exact.** The plugin's validators do NOT run inside the user's working
  folder, so YOU are responsible for producing a `config.json` that would validate
  against `config.schema.json`.
- **Stay in scope.** Touch only `config.json` and the `resume/` / `cover-letters/`
  contents. NEVER read-modify `profile.json` and NEVER touch `jobs/jobs.json`.

## Gate: require a valid working folder

Before anything else, locate the working folder and confirm it is valid, following
the [Discovery contract](../../references/data-contract.md#discovery-contract):

1. Determine the working-folder path (ask the user if it is not already known, or
   use the `working_dir` recorded in a `config.json` the user points you at).
2. Read `<working-folder>/config.json` and confirm it validates against
   [`../../schemas/config.schema.json`](../../schemas/config.schema.json).
3. **If there is no `config.json`, or it fails validation:** do NOT guess, do NOT
   create partial state, and do NOT proceed. Tell the user to run the
   `job-hunter-setup` skill first, and **stop**.

## Ordered procedure

### Step 1 — List current variants

Read the current state and show it to the user:

- List the resume variant files present in `<working-folder>/resume/` (by id and
  filename, e.g. `resume-a` → `resume-a.pdf`).
- List the cover-letter variant files present in
  `<working-folder>/cover-letters/`.
- Show the current rotation state from `config.json`: `resume_strategy`, any
  `resume_domains` mapping, and `round_robin_pointer` if present.

Treat the files on disk as the source of truth for which variants exist; the ids
follow the `resume-<label>` / `cover-<label>` convention from the
[Variant naming](../../references/data-contract.md#variant-naming) section.

### Step 2 — Ask what the user wants to change

Offer the operations: **add**, **replace**, or **remove** a resume or cover-letter
variant (and, separately, changing the rotation strategy — see Step 4). Handle each
requested operation as below. Repeat until the user is done.

#### Add a variant

Reuse the ingestion procedure in
[`../job-hunter-setup/references/ingestion.md`](../job-hunter-setup/references/ingestion.md)
(paths mode or copy-in mode). Assign the **next available** label after the highest
existing one for that kind (e.g. if `resume-a` and `resume-b` exist, the new one is
`resume-c`), keep the original file extension, and save it into `resume/` or
`cover-letters/` named after its id. Show the user the assigned id and destination
and confirm before copying. Pair a resume with its matching cover using the same
label where applicable.

#### Replace a variant (destructive)

1. Ask which existing id to replace and which new file to use (path or copy-in per
   the ingestion helper).
2. Show the user exactly what will happen: the old file at
   `resume/<id>.<ext>` (or `cover-letters/<id>.<ext>`) will be **overwritten** with
   the new file, keeping the same id so all references in `config.json` /
   `jobs.json` stay valid. Keep the id; the extension follows the new file.
3. **Confirm before overwriting.** Only then perform the replace.

#### Remove a variant (destructive)

1. Ask which existing id to remove.
2. Show the user exactly what will be deleted (the file under `resume/` or
   `cover-letters/`) and warn that the id will no longer exist.
3. **Confirm before deleting.** Only then delete the file.

Do not renumber or re-label the remaining variants: removing `resume-b` leaves
`resume-a` and `resume-c` as-is (gaps are fine). Ids are stable handles referenced
elsewhere.

### Step 3 — Recompute the resume variant set

After all add/replace/remove operations, recount the **resume** variants present in
`resume/` (cover letters do not drive the rotation strategy). You will use this
count in Step 4.

### Step 4 — Reconcile the rotation strategy

Follow the "Reconfiguring later (maintenance)" section of
[`../job-hunter-setup/references/ingestion.md`](../job-hunter-setup/references/ingestion.md#reconfiguring-later-maintenance).
Re-run the rotation-strategy capture from that helper **when** the resume-variant
count crossed the single↔multiple boundary during this session, **or** the user
asks to change the strategy:

- **Now exactly one resume variant** (crossed multiple→single): set
  `resume_strategy` to `single`, and drop `resume_domains` and
  `round_robin_pointer` entirely (they do not apply to `single`).
- **Now more than one resume variant** (crossed single→multiple, or user wants a
  change): run rotation-strategy capture to pick `round-robin`, `domain`, or `both`,
  and collect the strategy-specific state (a `resume_domains` mapping for `domain` /
  `both`; a `round_robin_pointer` for `round-robin` / `both`).

In all cases where multiple variants remain and the config is not being recaptured
from scratch, keep existing state consistent:

- **`resume_domains`:** keep entries for variant ids that still exist; drop entries
  for ids that were removed or replaced-away; add entries for genuinely new ids only
  by asking the user (never invent domains).
- **`round_robin_pointer`:** clamp it to a valid index for the new resume-variant
  count — i.e. if the pointer is `>=` the new count, reset it to `0` (or any index
  in `0..count-1`). It must stay an integer `>= 0`.

Show the user the resulting `resume_strategy`, `resume_domains` (if any), and
`round_robin_pointer` (if any) and confirm before writing.

### Step 5 — Write back config.json

Write the updated `<working-folder>/config.json`. It MUST still validate against
[`../../schemas/config.schema.json`](../../schemas/config.schema.json):

- Preserve every existing field you did not intend to change (`working_dir`,
  `remote_pref`, `automation_default`, `sites`, and any additional properties).
- Update only `resume_strategy`, `resume_domains`, and `round_robin_pointer` per
  Step 4. For `resume_strategy: single`, omit `resume_domains` and
  `round_robin_pointer`. Required keys (`working_dir`, `resume_strategy`,
  `remote_pref`, `automation_default`, `sites`) must remain present.

Show the exact JSON you are about to write and confirm before writing.

### Step 6 — Report

Confirm what changed: variants added/replaced/removed (by id and filename) and the
final `resume_strategy` / `resume_domains` / `round_robin_pointer`. Remind the user
that `jobs/jobs.json` and `profile.json` were left untouched.

## Files this skill reads and writes

- **Reads:** `<working-folder>/config.json`; the contents of
  `<working-folder>/resume/` and `<working-folder>/cover-letters/`; user-supplied
  resume/cover files; the schema at
  [`../../schemas/config.schema.json`](../../schemas/config.schema.json), the
  contract at [`../../references/data-contract.md`](../../references/data-contract.md),
  and the ingestion helper at
  [`../job-hunter-setup/references/ingestion.md`](../job-hunter-setup/references/ingestion.md).
- **Writes:** `<working-folder>/config.json` (resume-rotation fields only) and the
  variant files under `<working-folder>/resume/` and
  `<working-folder>/cover-letters/`.
- **Never touches:** `<working-folder>/jobs/jobs.json` or
  `<working-folder>/profile.json`.
