---
name: review-resume
description: Use when the user says "review my resume", "review resume", or otherwise wants a read-only summary of the resume variant(s) currently in their job-hunter working folder — inferred skills and likely target job types — without changing any state. Optionally hands off to update-job-focus if they want to act on the summary.
---

# review-resume

A **read-only** maintenance skill. It re-reads the resume variant file(s) in the
current job-hunter working folder and reports the applicant's inferred skills and
likely target job types. It never modifies any file. If the user wants to turn the
summary into changes, it offers to hand off to `update-job-focus`.

This skill conforms to the data contract in
[`../../references/data-contract.md`](../../references/data-contract.md) and follows
the same gate/style conventions as the setup wizard in
[`../job-hunter-setup/SKILL.md`](../job-hunter-setup/SKILL.md).

## Principles (non-negotiable)

- **Read-only.** This skill MUST NOT create, edit, delete, or overwrite ANY file in
  the working folder (`config.json`, `profile.json`, `job-focus.md`, `jobs/`,
  `resume/`, `cover-letters/`, or anything else). It only reads. All writing is
  deferred to `update-job-focus` via the hand-off.
- **Gate before acting.** Locate and validate the working folder before doing
  anything else.
- **Stateless.** Discover the working folder from `config.json`; never rely on
  conversation memory.
- **Do not duplicate the analysis logic.** The read-and-summarize procedure lives in
  the shared helper; cite it and follow it, do not restate it.

## Gate — require a valid working folder

Per the [Discovery contract](../../references/data-contract.md#discovery-contract),
locate the working folder and confirm it contains a `config.json` that validates
against [`../../schemas/config.schema.json`](../../schemas/config.schema.json).

- **Valid `config.json` found** → read its `working_dir` field to anchor the
  working folder, then proceed.
- **No `config.json`, or it fails validation** → STOP. Tell the user to run
  `job-hunter-setup` first, and do not proceed, guess, or create any state.

## Procedure

1. **Confirm the gate above passed.** You now have a valid working folder path.

2. **Review the resume(s).** Follow the resume-analysis procedure in
   [`../job-hunter-setup/references/resume-analysis.md`](../job-hunter-setup/references/resume-analysis.md).
   Read the ingested variant file(s) from the working folder's `resume/` directory,
   summarize the applicant's skills, and propose likely target job types. Do NOT
   duplicate that procedure here — follow it as written.

   Read-only note: run only the reading and summarizing parts of that helper. Present
   the summary and proposed job types to the user. Do NOT write `job-focus.md` or any
   other file from this skill — the helper's "emit job-focus prose" step is out of
   scope here and belongs to `update-job-focus`.

3. **Offer the hand-off.** After presenting the summary, ask whether the user wants
   to act on it. If they do, hand off to the `update-job-focus` skill (which reads
   the resume analysis and writes the updated `job-focus.md`). If they decline, stop
   — nothing has been changed.

## Files this skill reads and writes

- **Reads:** `<working-folder>/config.json` (gate + `working_dir`); the resume
  variant file(s) under `<working-folder>/resume/`; the schemas under
  [`../../schemas/`](../../schemas/), the contract at
  [`../../references/data-contract.md`](../../references/data-contract.md), and the
  helper at
  [`../job-hunter-setup/references/resume-analysis.md`](../job-hunter-setup/references/resume-analysis.md).
- **Writes:** nothing. This skill is strictly read-only. Any state changes happen in
  the separate `update-job-focus` skill after the hand-off.
