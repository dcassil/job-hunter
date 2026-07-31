# Ingestion helper: resume/cover variants and rotation strategy

Reusable procedure for ingesting resume and cover-letter variant files into a
job-hunter working folder and for capturing (or reconfiguring) the resume rotation
strategy. The setup wizard cites this doc; maintenance skills that add/remove
variants or change rotation should cite it too, so the behavior stays identical
everywhere.

All variant handling follows the "Variant naming" section of the data contract
([`../../../references/data-contract.md`](../../../references/data-contract.md)):
variants are referenced by **id**, never by file path, and the same id appears in
`config.json` (`resume_domains`) and `jobs.json` (`resume_used`, `cover_used`).

## Variant naming rules

- Resume variant ids follow `resume-<label>`: `resume-a`, `resume-b`, `resume-c`, …
- Cover variant ids follow `cover-<label>`: `cover-a`, `cover-b`, …
- Labels are assigned in order (`a`, `b`, `c`, …) as files are ingested.
- Pair a resume with its matching cover using the same label where applicable:
  `resume-b` and `cover-b` are meant to be used together.
- Resume files live in the working folder's `resume/` directory; cover files in
  `cover-letters/`. The file extension is user-owned (`.pdf`, `.docx`, `.md`, `.txt`,
  …); the id is the stable handle. Name the saved file after its id while keeping the
  original extension, e.g. `resume/resume-a.pdf`, `cover-letters/cover-b.md`.

## Ingestion modes

Ask the user which mode they prefer for the current kind (resumes, then covers):

### Mode 1 — Paths mode (user gives file paths)

1. Ask the user for the path to a file.
2. Copy that file into the correct subfolder, renaming it to the next available
   variant id plus its original extension (e.g. first resume → `resume/resume-a.pdf`).
   Use standard file tools (e.g. `cp`).
3. Confirm the copy succeeded and tell the user the assigned id.
4. Ask: **"Add another?"** If yes, advance the label (`b`, `c`, …) and repeat from
   step 1. If no, stop the loop.

### Mode 2 — Copy-in mode (user drops files into the folder)

1. Tell the user the exact folder path to drop their files into (`resume/` or
   `cover-letters/`) and say: **"Let me know when you're done."**
2. When the user says they are done, list the files present in that folder.
3. For each file, assign the next variant id in order and rename it to
   `<id>.<original-extension>`. Show the user the id→filename mapping and confirm.

## After ingestion

- Record the ordered list of ids you created for this kind (resumes or covers).
- Cover letters are optional. If the user has none, record zero cover variants and
  continue — do not block setup.
- Never invent variants the user did not provide.

## Rotation-strategy capture

Run this only when there is **more than one resume variant**. With exactly one
variant, set `resume_strategy` to `single` and skip the rest of this section (no
`resume_domains`, no `round_robin_pointer`).

Ask the user which rotation strategy they want. Map their answer to exactly one of
these `resume_strategy` enum values from `config.schema.json`:

- **`round-robin`** — alternate variants A/B/C in turn on each application.
- **`domain`** — pick the variant whose target domains best match the job.
- **`both`** — use domain targeting when a domain matches, and round-robin among the
  rest otherwise.

Then collect the strategy-specific state:

- For `round-robin` or `both`: set `round_robin_pointer` to `0` (the index of the
  next variant to use). Maintenance skills advance this pointer as variants are used.
- For `domain` or `both`: collect a `resume_domains` mapping. For each variant id,
  ask which domains/skills it targets and store an array of domain strings, e.g.:

  ```json
  {
    "resume-a": ["frontend", "react"],
    "resume-b": ["platform", "infrastructure"]
  }
  ```

Show the user the resulting `resume_strategy`, `resume_domains` (if any), and
`round_robin_pointer` (if any) and confirm before it is written into `config.json`.

## Reconfiguring later (maintenance)

When a maintenance skill adds or removes a variant, re-run the relevant ingestion
mode for the new files, then re-run rotation-strategy capture if the variant count
crosses the single↔multiple boundary or the user wants to change strategy. Keep any
existing `resume_domains` entries for variants that still exist; drop entries for
variants that were removed; and clamp `round_robin_pointer` to a valid index for the
new variant count.
