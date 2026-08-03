---
id: define-pre-answer-gates-bot-check
level: task
title: "Define pre-answer gates + bot-check needs value"
short_code: "JOBHUN-T-0023"
created_at: 2026-08-01T22:17:19+00:00
updated_at: 2026-08-01T22:20:57.597088+00:00
parent: JOBHUN-I-0008
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0008
---

# Define pre-answer gates + bot-check needs value

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0008]]

## Objective **[REQUIRED]**

Define the two pre-answer gates once, in the shared answer authority, and extend the
handoff model so a detected trap is distinguishable from a plain unknown question. This is
the substrate the apply skills reference in T-0024.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `references/question-log.md` gains a `## Pre-answer gates` section, evaluated for each
      field BEFORE the lookup order, defining: (1) **Trap gate** — "does this field look
      like it could be an AI/bot-detection trap?" (signals: hidden/honeypot inputs,
      "leave blank if human", "are you an AI/bot?", fields designed to trip automation);
      if maybe → do NOT fill, log for user review; and (2) **Free-response gate** — "does
      answering require prose beyond a known static answer or ~1–4 words?"; if yes → do NOT
      auto-answer, log for user input.
- [x] The section states both gates are conservative (when unsure, log for the user, never
      guess) and take priority over the normal lookup/answer path, and that they apply to
      every apply surface (Easy Apply and custom/ATS).
- [x] `schemas/jobs.schema.json` `handoff.needs` item enum adds `bot-check` (keeping
      `account`, `password`, `email-confirm`, `captcha`, `question`, `payment`).
- [x] `references/data-contract.md` handoff-object `needs` list documents `bot-check`
      (trap/honeypot/AI-detection field for the user to review).
- [x] `skills/record-application/SKILL.md` handoff notes mention `bot-check` as a valid
      `needs` value.
- [x] `references/custom-application.md` field-mapping / human-only-step sections note that
      the two pre-answer gates from `question-log.md` run first, and map the trap gate to
      `needs: ["bot-check"]` and the prose gate to `needs: ["question"]`.
- [x] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Put the gates in `question-log.md` because it already governs answering across ALL apply
surfaces, so both apply skills inherit them without duplication. Keep the schema change
minimal (one additive enum value). The trap gate never attempts to pass/defeat detection —
detection-and-log only, consistent with the I-0007 safety invariant.

**Recommended Agent: opus + high** — defines cross-cutting gating semantics and a shared
schema value that both apply skills depend on; wrong wording here weakens a safety-relevant
guardrail everywhere.

## Verification **[REQUIRED]**

- [x] Hand-author a `jobs.json` fixture with a `needs_human` job whose `handoff.needs` is
      `["bot-check"]`; confirm it validates; remove it.
- [x] Re-read the `Pre-answer gates` section: both gates are unambiguous, conservative, and
      ordered before the lookup; no placeholder text.
- [x] `npm run check` passes.