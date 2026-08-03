---
id: email-status-linkedin-relay
level: initiative
title: "Email status: LinkedIn-relay classification + preferred account"
short_code: "JOBHUN-I-0010"
created_at: 2026-08-03T20:17:35+00:00
updated_at: 2026-08-03T20:22:05.359563+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0009]
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: S
strategy_id: NULL
initiative_id: email-status-linkedin-relay
---

# Email status: LinkedIn-relay classification + preferred account Initiative

## Context **[REQUIRED]**

Running `check-email-status` live (2026-08-03) exposed a real flaw in its search recipe:
to cut recommendation noise, it **excluded `from:linkedin.com`** — but LinkedIn *relays*
employer decisions as emails with the subject "Your application to \<role\> at \<company\>",
whose body carries the actual status ("we will not be moving forward…" = rejection).
Excluding LinkedIn therefore hid **four genuine rejections** (Technology Partners, Atos,
Albert Bow, Cloud Campaign) on the first pass; they were only caught after the user
flagged one. The recipe must NOT exclude job-board senders when hunting status changes,
and the taxonomy must distinguish a LinkedIn "your application **was sent** to X"
(confirmation) from "your application to X at Y … **will not be moving forward**"
(rejection / interview / offer).

Separately, the user has two Gmail accounts — **forhire@danielcassil.com** (the primary
job inbox, where LinkedIn/ATS status mail lands) and **me@danielcassil.com** (occasional).
The skill defaulted to whichever account the browser opened; it should default to the
user's configured primary and be able to check both.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Fix `references/email-status.md` so the **search-scoping** step does NOT exclude
  LinkedIn / Indeed / other job-board senders when detecting status changes, and instead
  runs distinctive status-phrase searches (rejection / interview / offer) across all
  senders, reading the body to classify.
- Add explicit handling of the **LinkedIn-relay pattern**: subject "Your application to
  \<role\> at \<company\>" is a `confirmation` when the body says the application was
  sent/received, and a `rejection` / `interview` / `offer` when the body says so —
  classify by body, not by sender.
- Support a **preferred email account**: read an optional `email_accounts` list from the
  working-folder `config.json` (each entry an address + Gmail `authuser` index, one marked
  primary); the skill checks the primary by default and can iterate the others.
- Ship it: update the skill to read the config, refresh docs, bump version, keep
  `npm run check` green.

**Non-Goals:**
- No change to the read-only invariant or the record-application-only write path.
- No Gmail-API integration (still browser).
- No auto-adding recommendation postings (unchanged; still offered to `find-jobs`).
- No schema-breaking change — `config.json` already allows extra properties, so
  `email_accounts` is additive and optional.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: `email-status.md` search-scoping MUST NOT exclude job-board senders for status
    detection; it MUST include distinctive rejection/interview/offer phrase searches run
    across all senders (e.g. "will not be moving forward", "would like to schedule",
    "pleased to offer").
  - REQ-002: The taxonomy MUST classify the LinkedIn-relay "Your application to \<role\> at
    \<company\>" email by its BODY: application-sent/received → `confirmation`; decision
    language → `rejection` / `interview` / `offer`.
  - REQ-003: The skill MUST read an optional `config.email_accounts` (list of
    `{ email, authuser, primary? }`); default to the primary account, and support checking
    additional listed accounts. Absent the field, behave as today (current account).
  - REQ-004: `data-contract.md` (or `email-status.md`) documents the `email_accounts`
    config field.
- **Non-Functional Requirements:**
  - NFR-001: `npm run check` stays green; the skill still validates.
  - NFR-002: No regression to the read-only / single-writer guarantees.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: LinkedIn-relayed rejection is caught
- **Actor:** the job seeker.
- **Scenario:** LinkedIn relays "Your application to Frontend Architect at Atos … we will
  not be moving forward". The fixed recipe includes LinkedIn senders and rejection phrases;
  the taxonomy reads the body and classifies it `rejection`.
- **Expected Outcome:** the job moves `applied → rejected` — not missed.

### Use Case 2: Primary account by default
- **Actor:** the job seeker with two inboxes.
- **Scenario:** the user runs the skill without naming an account.
- **Expected Outcome:** it checks `forhire@` (the configured primary) first, and can also
  sweep `me@`.

## Detailed Design **[REQUIRED]**

Edit `references/email-status.md`: (1) in search-scoping, remove any "exclude job-board
senders" guidance for status detection and add a set of distinctive status-phrase searches
(rejection/interview/offer) run across ALL senders, plus a note that recommendation noise
is separated by *classification*, not by excluding senders; (2) in the taxonomy, add the
LinkedIn-relay subject rule (classify by body); (3) add an `email_accounts` config section
(list of `{ email, authuser, primary? }`) and how the skill selects the account. Edit
`skills/check-email-status/SKILL.md` Step 1/Step 2 to read `config.email_accounts`, default
to the primary, and note it can iterate the rest; update the search-build step to the
corrected recipe. Document `email_accounts` in `data-contract.md`. Bump version; keep
`npm run check` green.

## Alternatives Considered **[REQUIRED]**

- **Keep excluding job boards, add a special LinkedIn allow-list.** Rejected — brittle; the
  clean fix is to stop excluding senders for status and separate noise by classification.
- **Hard-code the account index (u/1).** Rejected — `authuser` indices are per-profile and
  machine-specific; storing the address plus index in config is portable and explicit.
- **A schema change to add `email_accounts` as a required/validated field.** Rejected as
  unnecessary — `config.json` already permits additional properties; keep it optional and
  additive, documented in the contract.

## Implementation Plan **[REQUIRED]**

1. **Fix + ship (JOBHUN-T-0027, opus + medium):** correct the `email-status.md`
   search-scoping + LinkedIn-relay taxonomy; add the `email_accounts` config support to the
   skill and document it; bump version; `npm run check` green; commit/push.

Depends on JOBHUN-I-0009 (the skill this refines). Single focused task.