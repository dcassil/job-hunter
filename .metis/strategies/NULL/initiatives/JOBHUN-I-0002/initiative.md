---
id: setup-wizard-skill
level: initiative
title: "Setup wizard skill"
short_code: "JOBHUN-I-0002"
created_at: 2026-07-30T23:56:11.846148+00:00
updated_at: 2026-07-31T00:26:22.548561+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0001]
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: L
strategy_id: NULL
initiative_id: setup-wizard-skill
---

# Setup wizard skill Initiative

## Context **[REQUIRED]**

The setup wizard is the user's first contact with job-hunter and the skill that
creates and populates the working folder defined in JOBHUN-I-0001. It is the most
conversation-heavy skill: a linear, gated wizard that captures the working-folder
location, resumes, cover letters, rotation strategy, remote/local preference,
screening answers, and confirmed job focus. Getting this flow right matters because
everything downstream reads the state it writes; a missed question here becomes a
gap every application inherits. Triggered when the user says "let's set up
job-hunter."

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Implement the `job-hunter-setup` skill as a guided wizard that produces a complete,
  valid working folder conforming to the data contract.
- Support both resume-ingestion modes: user provides paths (with an "add another?"
  loop) or copies files in themselves (with a "let me know when done" prompt).
  Same for cover letters.
- Determine rotation strategy when more than one resume/cover exists: round-robin
  A/B, domain-targeted, or both — and record it.
- Capture remote/local/both preference and the demographic/work-auth screening
  answers (gender, ethnicity, veteran, disability, work-authorized, needs-sponsorship).
- Review the resume, propose likely target job types in a few lines, let the user
  add/change, and record the confirmed focus.
- Be idempotent-aware: detect an existing working folder and offer re-run vs update.

**Non-Goals:**
- No job searching or applying (those are separate initiatives).
- No resume *editing* — only ingestion and analysis.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: First-time setup
- **Actor:** the job seeker.
- **Scenario:** user says "let's set up job-hunter" → skill asks where to create the
  working folder (current dir, Desktop, or a given path) → creates `job-hunter/` with
  `jobs/`, `resume/`, `cover-letters/` → asks whether to take resume paths or have the
  user copy them in → loops "add another?" → repeats for cover letters → if >1,
  asks rotation strategy → asks remote/local/both → reads resume, proposes job types,
  confirms → collects screening answers → writes `config.json`, `profile.json`,
  `job-focus.md`.
- **Expected Outcome:** a complete working folder; user is told the plugin can now
  search for matching jobs.

### Use Case 2: Re-running setup
- **Actor:** the job seeker.
- **Scenario:** working folder already exists → skill detects it and offers to update
  specific pieces (resumes, focus, preferences) rather than clobbering everything.
- **Expected Outcome:** targeted update without data loss.

## Detailed Design **[REQUIRED]**

`job-hunter-setup` is an interactive orchestrator with an explicit ordered checklist
so no step is skipped. Each externally consequential step (folder creation, writing
config) is confirmed. Resume ingestion branches:
- **Paths mode:** for each path, copy into `resume/` as `resume-a`, `resume-b`, …;
  after each, ask "add another or done?".
- **Copy-in mode:** print target path, prompt "let me know when you've copied them
  in," then enumerate what landed in `resume/`.
After ingestion, count variants; if >1, ask rotation strategy and, if domain-targeted,
collect the domain→variant mapping. Resume review uses the model to read the resume
text and summarize inferred job types in a few lines for confirmation. Screening
answers are written to `profile.json.demographics`. All writes conform to the
JOBHUN-I-0001 contract.

**Gate:** if `config.json` exists at the discovered working folder, switch to update
mode instead of fresh setup.

## Alternatives Considered **[REQUIRED]**

- **One giant question dump vs stepwise wizard.** Chose stepwise with an explicit
  checklist — matches the user's specified flow and reduces missed inputs.
- **Auto-inferring job focus without confirmation.** Rejected — the user explicitly
  wants to review and adjust the proposed job types.
- **Only supporting path-based ingestion.** Rejected — the spec requires supporting
  users who prefer to copy files in manually.
- **Storing screening answers per-application.** Rejected — they are stable and
  belong in the shared `profile.json` for reuse.

## Implementation Plan **[REQUIRED]**

1. Skeleton `SKILL.md` with the ordered checklist and gates.
2. Working-folder creation + folder scaffolding step.
3. Resume ingestion (both modes + add-another loop).
4. Cover-letter ingestion (mirror of resumes).
5. Rotation-strategy capture.
6. Remote/local + screening-answer capture.
7. Resume review → propose/confirm job focus.
8. Write all state files; update-mode branch.

Depends on JOBHUN-I-0001 (contract). Decomposition/model-effort assigned at decompose
time; initiative decomposition is opus + high.