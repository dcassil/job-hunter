---
id: apply-time-honeypot-and-free
level: initiative
title: "Apply-time honeypot and free-response gates"
short_code: "JOBHUN-I-0008"
created_at: 2026-08-01T22:17:19+00:00
updated_at: 2026-08-01T22:22:35.662024+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0007]
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: S
strategy_id: NULL
initiative_id: apply-time-honeypot-and-free
---

# Apply-time honeypot and free-response gates Initiative

## Context **[REQUIRED]**

The apply skills (`apply-to-jobs`, `interactive-apply`) auto-fill form fields from the
profile. Two classes of field should NOT be auto-filled, because auto-filling them either
gets the applicant flagged as a bot or produces a low-quality answer the applicant would
never have written:

1. **Bot / AI-detection traps.** Honeypot fields (hidden/off-screen inputs a human never
   sees), "leave this blank if you're human" fields, "are you an AI/bot?" questions, and
   similar tricks exist specifically to catch automated submissions. The agent guessing at
   them — filling a honeypot, or answering an "are you an AI" question — is exactly the
   failure mode these traps are built to detect.
2. **Free-response / prose fields.** Anything that needs more than a known static answer or
   a few words (essays, "why this company?", "describe a time you…", open cover-letter
   text) should be written by the applicant in their own voice, not auto-generated.

Both should be **detected before filling and logged for the user** rather than answered by
the agent. This is a natural extension of the existing "never guess" / handoff model from
`JOBHUN-I-0007`.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Add two **pre-answer gates** that every apply surface applies to each field *before*
  attempting to answer it, defined once in `references/question-log.md` (which already
  governs all apply surfaces) so both apply skills inherit them:
  - **Trap gate:** "Does this field look like it could be an AI / bot-detection trap?" If
    *maybe*, do NOT fill it — log it for the user to review.
  - **Free-response gate:** "Does this field require prose beyond a known static answer or
    1–4 words?" If yes, do NOT auto-answer — log it for the user to provide.
- Represent the trap case in the handoff model: add `bot-check` to the `handoff.needs`
  enum so a logged trap is distinguishable from a plain unknown question.
- Wire both gates into `apply-to-jobs` (Easy Apply path and custom route) and
  `interactive-apply`, and into `references/custom-application.md`'s field-mapping step.

**Non-Goals:**
- No attempt to *solve* or *defeat* a trap/honeypot/CAPTCHA — detection only, then hand to
  the user. (Solving remains prohibited, per I-0007.)
- No auto-generation of prose answers, even "as a draft," in unattended batch mode. (In
  interactive mode the user may request a draft in their own voice.)
- No new skills; this refines existing apply behavior.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: Before answering any field, the apply logic MUST apply the **trap gate** — if
    the field plausibly is an AI/bot-detection trap (hidden/honeypot input, "leave blank if
    human", "are you an AI/bot?", or similar), it MUST NOT fill it and MUST log it for the
    user (batch: handoff with `needs` including `bot-check`; interactive: ask the user).
  - REQ-002: Before answering any field, the apply logic MUST apply the **free-response
    gate** — if answering requires prose beyond a known static answer or ~1–4 words, it
    MUST NOT auto-answer and MUST log it for the user (batch: handoff `needs: ["question"]`;
    interactive: ask the user, who may write it in their own voice).
  - REQ-003: `schemas/jobs.schema.json` `handoff.needs` enum MUST include `bot-check`;
    `data-contract.md` documents it.
  - REQ-004: The gates MUST be defined once (in `question-log.md`) and referenced — not
    duplicated — by `apply-to-jobs`, `interactive-apply`, and `custom-application.md`.
  - REQ-005: The gates apply to BOTH LinkedIn Easy Apply and custom/ATS applications.
- **Non-Functional Requirements:**
  - NFR-001: `npm run check` stays green.
  - NFR-002: The gates are conservative: when unsure whether a field is a trap or needs
    prose, they err toward logging for the user, never toward guessing.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Honeypot field on a career-site form
- **Actor:** the job seeker (unattended batch).
- **Scenario:** a Greenhouse form includes a hidden "website2" honeypot and a visible
  "Please confirm you are not a bot" text field. The trap gate catches both; the agent
  leaves them untouched and records a handoff (`needs: ["bot-check"]`, blocking =
  "possible bot-detection field(s): 'website2' (hidden), 'confirm not a bot'").
- **Expected Outcome:** the applicant reviews and handles the trap themselves; the agent
  never flags the applicant as a bot by mis-filling it.

### Use Case 2: "Why do you want to work here?" essay
- **Actor:** the job seeker.
- **Scenario:** a Lever form asks "In a few paragraphs, why this role at this company?"
  The free-response gate flags it as prose beyond a short static answer.
- **Expected Outcome:** batch → handoff (`needs: ["question"]`, blocking = the prompt);
  interactive → the agent asks the user, who writes it in their own voice (a draft only if
  they ask).

### Use Case 3: Short known field is unaffected
- **Actor:** any user.
- **Scenario:** "Years of React experience?" → a known 1-word answer in the profile.
- **Expected Outcome:** neither gate trips; the field auto-fills as before.

## Detailed Design **[REQUIRED]**

Add a `## Pre-answer gates` section to `references/question-log.md`, evaluated for each
field **before** the lookup order:

1. **Trap gate** — think: could this be an AI/bot-detection trap? Signals: inputs hidden
   from a human (CSS-hidden, off-screen, `aria-hidden`, zero-size), fields whose
   label/placeholder says to leave them blank or that only a bot would fill, explicit "are
   you an AI/automated tool/bot?" questions, and fields that seem designed to trip
   automation. If *maybe* → do not fill; log for user review (`bot-check`). Never try to
   pass the check.
2. **Free-response gate** — think: does answering require prose beyond a known static
   answer or ~1–4 words? If yes → do not auto-answer; log for user input (`question`). A
   short factual field with a known/short answer passes and is filled normally.

Both gates precede and take priority over the normal lookup/answer path. Add `bot-check`
to the `handoff.needs` enum in `jobs.schema.json` and document it in `data-contract.md`
(and in `record-application`'s handoff notes). Then have `apply-to-jobs` (Easy Apply steps
and the custom `4x` route), `interactive-apply`, and `custom-application.md`'s field-
mapping step reference the two gates rather than restating them.

## Alternatives Considered **[REQUIRED]**

- **Auto-answer prose with a generated draft in batch mode.** Rejected — low-quality,
  not the applicant's voice, and some sites explicitly screen for AI-written answers;
  logging for the user is safer and higher quality. (Interactive mode may offer a draft on
  request.)
- **Try to "pass" bot-detection by leaving honeypots blank silently.** Rejected as the sole
  behavior — leaving a honeypot blank is correct, but the user asked for these to be
  *logged for review*, and some traps are visible questions (not blank-me honeypots) that
  genuinely need the user. Detect-and-log covers both.
- **Define the gates separately in each apply skill.** Rejected — duplication drifts; one
  definition in `question-log.md` (already the shared answer authority) keeps them in sync.
- **A separate `trap` status instead of a `handoff.needs` value.** Rejected — a trap is a
  reason a job is `needs_human`, not a new lifecycle state; `needs: ["bot-check"]` fits the
  existing handoff model.

## Implementation Plan **[REQUIRED]**

1. **Gate definitions + schema (JOBHUN-T-0023, opus + high):** add the `Pre-answer gates`
   section to `question-log.md`; add `bot-check` to `handoff.needs` in `jobs.schema.json`;
   document it in `data-contract.md` and `record-application`; note the gates in
   `custom-application.md`.
2. **Wire into the apply skills + ship (JOBHUN-T-0024, opus + medium):** reference the two
   gates in `apply-to-jobs` (Easy Apply steps 4c/4d and custom `4x`) and
   `interactive-apply`; update README/AGENTS; bump version; `npm run check` green.

Depends on JOBHUN-I-0007 (the handoff model this extends). T-0023 blocks T-0024.