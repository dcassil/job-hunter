---
id: application-subsystem
level: initiative
title: "Application subsystem"
short_code: "JOBHUN-I-0004"
created_at: 2026-07-30T23:56:18.307097+00:00
updated_at: 2026-07-30T23:56:18.307097+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0001, JOBHUN-I-0003]
archived: false

tags:
  - "#initiative"
  - "#phase/discovery"


exit_criteria_met: false
estimated_complexity: L
strategy_id: NULL
initiative_id: application-subsystem
---

# Application subsystem Initiative

## Context **[REQUIRED]**

This initiative delivers the payoff: applying to the listings discovered in
JOBHUN-I-0003, reusing the profile and materials captured in setup so the user never
re-answers a known question. It is also the highest-consequence subsystem — it can
submit real applications under the user's name — so oversight and the "ask once,
reuse forever" principle are central. `apply-to-jobs` orchestrates the flow; the
`record-application` worker owns status transitions and material bookkeeping; new
application questions are logged into `profile.json` for the user to answer once and
reuse thereafter.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Implement `apply-to-jobs`: a gated orchestrator that walks `status:"new"` jobs,
  selects the resume/cover variant per the rotation strategy, fills the application
  from `profile.json`, and — per the run's automated-vs-human choice — submits or
  stops for review.
- Implement `record-application`: a non-interactive worker enforcing status
  transitions and recording `resume_used`, `cover_used`, and `applied_at`.
- Implement question logging: when an application asks something not in
  `profile.json`, capture it into `logged_questions` (answered/unanswered), prompt the
  user when human-in-the-loop, and reuse the answer on future applications.
- Honor the rotation strategy: round-robin, domain-targeted (by job/company domain),
  or both.

**Non-Goals:**
- No searching (JOBHUN-I-0003) and no editing of stored profile answers beyond
  appending logged questions (broader edits live in maintenance, JOBHUN-I-0005).
- No fully-silent submission when the user chose human-in-the-loop for the run.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements
- **Functional Requirements:**
  - REQ-001: `apply-to-jobs` MUST gate on the existence of at least one `status:"new"`
    job and on completed setup.
  - REQ-002: It MUST ask automated-vs-human-in-the-loop per run (default from
    `config.automation_default`).
  - REQ-003: Material selection MUST follow `config.resume_strategy`.
  - REQ-004: Fields answerable from `profile.json` MUST be filled without asking.
  - REQ-005: Any unknown question MUST be logged to `logged_questions`; in
    human-in-the-loop mode the user is prompted and the answer stored for reuse.
  - REQ-006: `record-application` MUST set `status`, `resume_used`, `cover_used`,
    `applied_at` and MUST reject invalid status transitions.
  - REQ-007: In human-in-the-loop mode the skill MUST stop before final submit and
    hand control to the user.
- **Non-Functional Requirements:**
  - NFR-001: No consequential submission occurs outside the user's chosen oversight
    level for the run.
  - NFR-002: A failure on one job MUST NOT corrupt the list or block remaining jobs.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Assisted application (human-in-the-loop)
- **Actor:** the job seeker.
- **Scenario:** user says "let's apply" → gate passes → user picks human-in-the-loop →
  for each `new` job: pick resume/cover per strategy → open the posting → fill known
  fields from profile → any new question is surfaced to the user and stored → skill
  stops at review; user submits → `record-application` marks it `applied`.
- **Expected Outcome:** applications prepared with user confirmation; list and profile
  updated; new answers remembered.

### Use Case 2: Automated run
- **Actor:** the job seeker.
- **Scenario:** user picks automated → skill fills and submits each job whose questions
  are fully answerable from profile; any job with an unanswered new question is left in
  `new`/flagged for the user rather than guessed.
- **Expected Outcome:** answerable jobs submitted and recorded; ambiguous ones deferred.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
`apply-to-jobs` (interactive orchestrator) drives the browser per job, reading from
`profile.json` and writing through `record-application` (worker) and the question-log
routines. Rotation strategy resolution is a small pure helper reused across jobs.

### Sequence (per job)
select material (strategy) → open posting → map form fields to profile answers → for
each unknown field: check `logged_questions`; else log + (if human) ask → fill →
(human: stop for review | auto: submit) → `record-application` updates status/material.

## Detailed Design **[REQUIRED]**

Form filling uses the claude-in-chrome tools to map visible form fields to profile
data (demographics, work-auth, contact). The question log is keyed by a normalized
question string so the same phrasing across sites reuses one answer. Rotation:
round-robin advances a pointer stored in `config`/`jobs.json`; domain-targeted maps
the job's inferred domain to a variant via `config.resume_domains`; "both" applies
domain targeting first, round-robin within a domain. `record-application` is the sole
writer of application-status fields and enforces the transition rules from
JOBHUN-I-0001.

## Alternatives Considered **[REQUIRED]**

- **Guessing unknown answers to keep automation flowing.** Rejected — risks wrong
  submissions; unknowns are logged and deferred/asked instead.
- **Per-application answer storage.** Rejected — the whole point is cross-application
  reuse; answers live in shared `profile.json`.
- **Letting the orchestrator write status directly.** Rejected — funneling through
  `record-application` keeps transition rules in one enforced place.
- **A single global automation setting.** Rejected — the user wants the choice per run.

## Implementation Plan **[REQUIRED]**

1. Rotation-strategy resolver helper.
2. `record-application` worker (status transitions + material fields).
3. Question-log read/append routines.
4. `apply-to-jobs` orchestrator (gate, automation prompt, per-job loop, review stop).
5. Automated vs human-in-the-loop branching + deferral of unanswerable jobs.

Depends on JOBHUN-I-0001 (contract) and JOBHUN-I-0003 (a populated list). Decomposition
and model/effort assignments at decompose time; initiative decomposition is opus + high.
