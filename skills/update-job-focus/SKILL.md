---
name: update-job-focus
description: Use when the user says "update the kind of jobs I'm looking for", "update job focus", "change my target job types", "edit job-focus", or otherwise wants to revise the search guidance in job-focus.md. Loads the current job-focus.md, lets the user add, remove, or adjust entries (optionally with a fresh resume-based suggestion), confirms, and writes the file back. It only ever writes job-focus.md and never touches config.json, profile.json, or jobs.json.
---

# Update job focus

Maintenance skill to view and edit `job-focus.md` — the free-form Markdown that
captures what the user is looking for (target titles, seniority, technologies,
domains, locations, compensation expectations, and any other search guidance).

`job-focus.md` has no JSON Schema; it is human prose, advisory context that
downstream skills read to steer discovery and matching (see the "job-focus.md"
section of the data contract at
[`../../references/data-contract.md`](../../references/data-contract.md)). This is a
straightforward load → edit → confirm → write cycle.

## Principles (non-negotiable)

- **Gate before acting.** Confirm a valid working folder exists before doing
  anything.
- **Confirm before writing.** Never overwrite the user's prose without showing them
  the exact new content and getting an explicit yes. Show the current content first
  so nothing is clobbered silently.
- **Stay in scope.** This skill writes **only** `job-focus.md`. It must never write
  or modify `config.json`, `profile.json`, `jobs/jobs.json`, or any other state
  file.
- **Stateless.** Discover the working folder from `config.json` every run; never
  rely on conversation memory.

## Gate: require a valid working folder

Before anything else, locate the working folder and confirm it is valid:

1. Determine the working-folder path (the folder that contains `config.json`; its
   `working_dir` field records the absolute path — see the "Discovery contract"
   section of [`../../references/data-contract.md`](../../references/data-contract.md)).
2. Read that `config.json` and confirm it validates against
   [`../../schemas/config.schema.json`](../../schemas/config.schema.json).

If there is **no** discoverable `config.json`, or it fails validation, **stop**: do
not guess, do not create partial state. Tell the user to run the `job-hunter-setup`
skill first, then stop.

You read `config.json` only to confirm the gate and locate the working folder. You
do not modify it.

## Procedure

### 1. Load and show the current job focus

Read `<working-folder>/job-focus.md` and show its full current contents to the
user so they can see exactly what they are editing.

- If the file does not exist yet (unusual after setup), tell the user it is empty
  and offer to create it from scratch — treat the current content as empty prose.

### 2. Offer a resume-based suggestion (optional)

Ask whether the user wants a fresh, resume-based suggestion to inform their edits
(useful if their resume changed or their focus has drifted). If they say yes,
follow the resume-analysis procedure in
[`../job-hunter-setup/references/resume-analysis.md`](../job-hunter-setup/references/resume-analysis.md)
to read the ingested resume file(s), summarize the applicant's skills, and propose
likely target job types. Do not duplicate that procedure here — cite and follow it.

Present the suggestion as input for the user to accept, reject, or adapt. It is
advisory only; the user's decisions drive the final content.

### 3. Let the user add / remove / adjust

Work with the user to revise the focus: add new target titles, seniority levels,
technologies, domains, locations, remote-preference nuances, compensation
expectations, or companies to include/avoid; remove entries that no longer apply;
and adjust wording. Keep the result clear human-readable Markdown prose — not JSON
or a rigid schema.

### 4. Confirm, then write back (GATE)

Show the user the **exact** full Markdown content you propose to write to
`job-focus.md`. Do not write until the user explicitly confirms. On confirmation,
write the content to `<working-folder>/job-focus.md`, overwriting the previous
prose.

Write **only** `job-focus.md`. Do not touch any other file.

### 5. Report

Confirm what was written and its path. Remind the user that job-focus is advisory
context the search/apply skills read, and that they can edit it directly or re-run
this skill any time.

## Files this skill reads and writes

- **Reads:** `<working-folder>/config.json` (gate + discovery only, never modified);
  `<working-folder>/job-focus.md` (current content); when a resume-based suggestion
  is requested, the ingested resume files under `<working-folder>/resume/` via the
  resume-analysis helper; the referenced helper and contract docs.
- **Writes:** `<working-folder>/job-focus.md` — and nothing else.
