---
id: fix-linkedin-relay-classification
level: task
title: "Fix LinkedIn-relay classification + preferred-account support"
short_code: "JOBHUN-T-0027"
created_at: 2026-08-03T20:17:35+00:00
updated_at: 2026-08-03T20:22:05.327846+00:00
parent: JOBHUN-I-0010
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0010
---

# Fix LinkedIn-relay classification + preferred-account support

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0010]]

## Objective **[REQUIRED]**

Correct the email-status search recipe so LinkedIn-relayed employer decisions are caught
(not excluded), classify the LinkedIn "Your application to X at Y" pattern by body, and let
the skill read a configured preferred email account. Ship it.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `references/email-status.md` search-scoping no longer excludes job-board senders for
      status detection; it adds distinctive rejection/interview/offer phrase searches run
      across ALL senders (e.g. "will not be moving forward", "would like to schedule",
      "pleased to offer"), and states that recommendation noise is separated by
      classification, not by excluding senders.
- [x] `references/email-status.md` taxonomy documents the LinkedIn-relay rule: subject
      "Your application to \<role\> at \<company\>" → classify by BODY (application
      sent/received = `confirmation`; decision language = `rejection` / `interview` /
      `offer`).
- [x] `references/email-status.md` documents an `email_accounts` config field (list of
      `{ email, authuser, primary? }`) and how the skill selects the account (primary by
      default; can sweep the rest).
- [x] `skills/check-email-status/SKILL.md` Step 1/2 read `config.email_accounts`, default to
      the primary, note it can iterate the others, and use the corrected search recipe (no
      job-board exclusion; body-based classification).
- [x] `references/data-contract.md` mentions the optional `email_accounts` config field.
- [x] `.claude-plugin/plugin.json` and `package.json` version bumped (0.5.0 → 0.5.1).
- [x] `npm run check` passes; the skill validates; commit + push.

## Implementation Notes **[CONDITIONAL: Technical Task]**

`config.json` already permits additional properties, so `email_accounts` needs no schema
change — document it as optional. Keep the read-only invariant and record-application-only
write path untouched. Small, focused edits across the reference, the skill, the contract,
and the two manifests.

**Recommended Agent: opus + medium** — a correctness fix to a safety-relevant search recipe
plus a small config-driven behavior; edits span a few files but follow the existing style.

## Verification **[REQUIRED]**

- [x] Confirm the fixed recipe would catch a LinkedIn-relayed rejection (walk the Atos /
      Technology Partners example: included sender, rejection phrase, body-based class).
- [x] `grep` the version in both manifests shows `0.5.1`.
- [x] `npm run check` passes.