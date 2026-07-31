---
id: maintenance-skills
level: initiative
title: "Maintenance skills"
short_code: "JOBHUN-I-0005"
created_at: 2026-07-30T23:56:21.287208+00:00
updated_at: 2026-07-31T00:48:41.062148+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0001, JOBHUN-I-0002]
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: maintenance-skills
---

# Maintenance skills Initiative

## Context **[REQUIRED]**

A job search evolves: the user refines what they're targeting, swaps in a better
resume, tweaks a cover letter, or wants a fresh read of their materials. This
initiative delivers the three maintenance skills that let the user keep the working
folder current without re-running the whole setup wizard. They are thin editors over
the same state files defined in JOBHUN-I-0001 and populated in JOBHUN-I-0002, reusing
the setup wizard's ingestion and review routines rather than duplicating them.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Implement `update-job-focus`: view and edit `job-focus.md` (add/remove/adjust
  target job types), with an optional re-analysis of the resume to suggest changes.
- Implement `update-resumes`: add, replace, or remove resumes and cover letters, and
  reconfigure the rotation strategy / domain mapping — reusing the setup ingestion flow.
- Implement `review-resume`: re-read the current resume(s) and report inferred skills
  and likely job types, optionally feeding `update-job-focus`.
- Keep all three gated on an existing, valid working folder.

**Non-Goals:**
- No searching or applying (those are JOBHUN-I-0003 / JOBHUN-I-0004).
- No resume *content authoring* — the plugin ingests and analyzes, it does not write
  the user's resume for them.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Refine targeting
- **Actor:** the job seeker.
- **Scenario:** user says "update the kind of jobs I'm looking for" → `update-job-focus`
  shows current `job-focus.md` → user edits or asks for a resume-based suggestion →
  confirmed changes are written back.
- **Expected Outcome:** `job-focus.md` reflects the new targeting; future searches use it.

### Use Case 2: Swap a resume
- **Actor:** the job seeker.
- **Scenario:** user says "update my resumes" → `update-resumes` lists current variants
  → user adds/replaces/removes files (by path or copy-in) → if variant count changes,
  re-confirm rotation strategy → state written back.
- **Expected Outcome:** `resume/` and `config` reflect the change; rotation stays valid.

### Use Case 3: Re-review materials
- **Actor:** the job seeker.
- **Scenario:** user says "review my resume" → `review-resume` reads current resume(s)
  and summarizes skills and likely job types → offers to update job focus.
- **Expected Outcome:** user gets an up-to-date read; optional hand-off to focus update.

## Detailed Design **[REQUIRED]**

Each skill is a small interactive editor sharing helpers with the setup wizard:
- `update-resumes` reuses the resume/cover ingestion routine (paths or copy-in,
  add-another loop) and the rotation-strategy capture from JOBHUN-I-0002, then rewrites
  `config.json` and the `resume/`/`cover-letters/` contents.
- `update-job-focus` is a load → edit → confirm → write cycle over `job-focus.md`,
  optionally invoking the resume-analysis routine for suggestions.
- `review-resume` is read-only over the resume files, producing a summary and an
  optional hand-off to `update-job-focus`.
All three gate on a discoverable working folder with `config.json`; if absent they
direct the user to run setup.

## Alternatives Considered **[REQUIRED]**

- **Folding these into the setup wizard's update mode.** Rejected — dedicated,
  independently-triggerable skills match the user's requested surface ("update the kind
  of jobs," "update resumes on file," "review resume") and keep each skill focused.
- **Duplicating ingestion/analysis logic per skill.** Rejected — shared helpers from
  JOBHUN-I-0002 avoid divergence.
- **Allowing the plugin to rewrite resume content.** Rejected as out of scope and
  high-risk; the plugin analyzes, the user authors.

## Implementation Plan **[REQUIRED]**

1. Extract shared ingestion/analysis helpers from the setup wizard (JOBHUN-I-0002) so
   maintenance skills reuse them.
2. `review-resume` (read-only analysis) — smallest, validates the shared helper.
3. `update-job-focus` (edit `job-focus.md` + optional suggestion).
4. `update-resumes` (add/replace/remove + rotation reconfigure).

Depends on JOBHUN-I-0001 (contract) and JOBHUN-I-0002 (setup wizard + shared helpers).
Decomposition/model-effort assignments at decompose time; initiative decomposition is
opus + high.