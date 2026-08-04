---
id: resume-prefs-learning-substrate
level: initiative
title: "resume-prefs learning substrate (known-skills + edit-acceptance memory)"
short_code: "JOBHUN-I-0012"
created_at: 2026-08-04T18:00:14.078274+00:00
updated_at: 2026-08-04T18:48:48.847988+00:00
parent: JOBHUN-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: S
strategy_id: NULL
initiative_id: resume-prefs-learning-substrate
---

# resume-prefs learning substrate Initiative

## Context **[REQUIRED]**

The resume-tailoring feature must *learn* so it gets better at each user's preferences over
time. Two kinds of learning were specified:

1. **A known-skills list.** Tailoring may never invent a skill the candidate does not have.
   When a job's keywords imply a skill we have no record of, the skill asks the user "do you
   have X?"; a yes adds X to a persistent list that constrains all future tailoring
   (feeding resume-kit's `build-candidate-evidence` / `validate-resume-truth`), a no records
   that it must never be claimed.
2. **Edit-acceptance memory.** Every proposed resume edit is one of a fixed set of
   *edit-types* (add a skill, swap a term to match the job's language, rewrite a single
   employment-history sentence, add a bullet, rewrite a whole job entry, rewrite the summary,
   reorder). The skill records what the user accepts, accepts-with-edits, or rejects per
   edit-type — e.g. "skill additions: accepted; single-term swaps: accepted; full-sentence
   rewrites: accepted with edits; whole-entry replacement: rejected" — so future runs
   propose more of what the user tends to accept and hold back what they tend to reject.

`profile.json` cannot hold this: its schema is `additionalProperties: false` and is scoped
to reusable *application answers*, not resume-editing policy. The approved design puts this
state in a **new** working-folder file, `resume-prefs.json`, with its own JSON Schema and a
worked example, and documents it in the data contract. This initiative delivers only that
substrate — the schema, the file's semantics, the edit-type taxonomy, and the contract docs —
so the `tailor-resume` skill (JOBHUN-I-0013) can read and update it without re-litigating the
shape.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Add `schemas/resume-prefs.schema.json` defining the new working-folder file:
  - `skills`: array of known-skill strings the candidate has confirmed they possess.
  - `disclaimed_skills`: skills the user has explicitly said they do NOT have, so tailoring
    never re-asks and never claims them.
  - `variants`: per resume-variant flags, notably `ats_fixed` (structural fix already done
    once, so it is never redone).
  - `edit_prefs`: per edit-type acceptance tallies
    (`accepted` / `accepted_with_edits` / `rejected`).
- Define the canonical **edit-type taxonomy** as a closed enum used identically for
  degree-of-freedom gating and for learning: `skill_add`, `term_swap`, `bullet_rewrite`,
  `bullet_add`, `entry_rewrite`, `summary_rewrite`, `reorder`.
- Add `schemas/examples/resume-prefs.example.json` that validates against the schema.
- Document the file in `references/data-contract.md`: layout (including the
  `resume/tailored/<job-id>.<ext>` output location), field semantics, the taxonomy, and the
  update rules (how tallies change on accept / accept-with-edits / reject, and how the skills
  list grows).
- Extend the schema validator (`scripts/validate-schemas.mjs`) to cover the new schema +
  example so `npm run check` enforces them.

**Non-Goals:**
- No tailoring logic, scoring, or review flow — that is JOBHUN-I-0013. This initiative only
  defines the state and its contract.
- No changes to `profile.json` / `config.json` / `jobs.json` shapes.
- No migration tooling: the file is created on first tailoring run when absent (defined
  here as a semantic, executed by JOBHUN-I-0013); an absent file simply means "no learning
  yet".
- No automatic skill inference from the resume into the list without user confirmation —
  the list only grows from explicit yes/no answers (that behavior lives in I-0013; here we
  only define that the list is user-confirmed).

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: `resume-prefs.json` MUST be a top-level object with `skills` (array of strings)
    and `edit_prefs` (object keyed by the edit-type enum) required; `disclaimed_skills` and
    `variants` optional. The schema MUST pin the edit-type enum as a closed set.
  - REQ-002: Each `edit_prefs` entry MUST be an object with integer counts
    `accepted`, `accepted_with_edits`, `rejected` (all `>= 0`, default 0).
  - REQ-003: `variants` MUST map a resume-variant id (e.g. `resume-a`) to an object carrying
    at least `ats_fixed` (boolean) so the once-only structural fix is recorded per variant.
  - REQ-004: The schema MUST forbid additional top-level properties it does not define
    (mirroring `profile.schema.json`'s discipline) while allowing the `variants` map to key
    on arbitrary variant ids.
  - REQ-005: `references/data-contract.md` MUST document the file, the taxonomy, the tally
    update rules, and the `resume/tailored/` output directory, and MUST state that
    `resume-prefs.json` is NOT part of the working-folder *validity* marker (that remains
    `config.json`) — its absence just means no learning has accumulated.
  - REQ-006: A worked example MUST exist and validate.
- **Non-Functional Requirements:**
  - NFR-001: The schema is the machine contract; the data-contract prose explains it and, on
    any disagreement, the schema wins (consistent with the existing contract convention).
  - NFR-002: `scripts/validate-schemas.mjs` validates the new schema and example; the edit
    taxonomy enum appears in exactly one place (the schema) and is referenced, not restated,
    by prose.
  - NFR-003: `npm run check` stays green.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: First confirmed new skill
- **Actor:** the job seeker, mid-tailoring.
- **Scenario:** a job wants "Terraform"; it is not in the resume or the skills list. The
  tailoring skill (I-0013) asks "do you have Terraform experience?"; the user says yes. The
  substrate defined here is where "Terraform" is appended to `skills` so it is never asked
  again and becomes claimable.
- **Expected Outcome:** `resume-prefs.json.skills` contains "Terraform"; future runs treat
  it as an injectable, evidence-backed skill.

### Use Case 2: Learning a rejection pattern
- **Actor:** the job seeker, reviewing proposed edits.
- **Scenario:** across several jobs the user rejects every `entry_rewrite` but accepts
  `term_swap`. The substrate records `edit_prefs.entry_rewrite.rejected` climbing and
  `edit_prefs.term_swap.accepted` climbing.
- **Expected Outcome:** the tallies exist and are readable so I-0013 can propose fewer
  whole-entry rewrites and lead with term swaps.

### Use Case 3: Structural fix recorded once
- **Actor:** the tailoring skill.
- **Scenario:** `resume-a` has its structural ATS issues fixed once. `variants["resume-a"]
  .ats_fixed` is set true.
- **Expected Outcome:** later runs read the flag and skip re-fixing the same variant.

## Detailed Design **[REQUIRED]**

Add `schemas/resume-prefs.schema.json` (draft-07, matching the other schemas' style):

```jsonc
{
  "type": "object",
  "additionalProperties": false,
  "required": ["skills", "edit_prefs"],
  "properties": {
    "skills": { "type": "array", "items": { "type": "string" } },
    "disclaimed_skills": { "type": "array", "items": { "type": "string" } },
    "variants": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "additionalProperties": false,
        "properties": { "ats_fixed": { "type": "boolean" } }
      }
    },
    "edit_prefs": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "skill_add":      { "$ref": "#/definitions/tally" },
        "term_swap":      { "$ref": "#/definitions/tally" },
        "bullet_rewrite": { "$ref": "#/definitions/tally" },
        "bullet_add":     { "$ref": "#/definitions/tally" },
        "entry_rewrite":  { "$ref": "#/definitions/tally" },
        "summary_rewrite":{ "$ref": "#/definitions/tally" },
        "reorder":        { "$ref": "#/definitions/tally" }
      }
    }
  },
  "definitions": {
    "tally": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "accepted":            { "type": "integer", "minimum": 0 },
        "accepted_with_edits": { "type": "integer", "minimum": 0 },
        "rejected":            { "type": "integer", "minimum": 0 }
      }
    }
  }
}
```

Add `schemas/examples/resume-prefs.example.json` with a realistic populated instance. Extend
`references/data-contract.md` with a `resume-prefs.json` section (fields, taxonomy, tally
update rules, `resume/tailored/` output dir, and the "not a validity marker" note) and add
the new file to the working-folder layout diagram. Extend `scripts/validate-schemas.mjs` to
validate schema + example.

## Alternatives Considered **[REQUIRED]**

- **Extend `profile.json` with `skills` + `resume_edit_prefs`.** Considered and rejected in
  the approved design: it broadens `profile.json` beyond reusable application answers and
  couples resume-editing policy to the answer store; a dedicated file keeps concerns
  separate and lets tailoring evolve its schema independently.
- **Store learning in `config.json`.** Rejected — `config.json` is preferences/anchor state
  read by every skill; growing per-edit tallies and a skills list there bloats the anchor and
  risks accidental clobbering by unrelated skills.
- **Free-form edit-type strings instead of a closed enum.** Rejected — learning requires
  stable keys; a closed enum guarantees the degree-of-freedom ladder and the tallies line up
  exactly.
- **Infer the skills list automatically from the resume with no confirmation.** Rejected —
  violates the "never claim a skill the user hasn't confirmed" invariant; the list only
  grows from explicit user answers.

## Implementation Plan **[REQUIRED]**

Human-in-the-loop: task decomposition pending Daniel's approval. Planned decomposition:

1. **Author schema + example + validator wiring** (`resume-prefs.schema.json`,
   `examples/resume-prefs.example.json`, extend `validate-schemas.mjs`).
   *Recommended Agent: opus + high* — schema design other tasks consume; a wrong shape here
   forces rework across I-0013 and I-0014.
2. **Document in the data contract** (new `resume-prefs.json` section, layout diagram,
   taxonomy, tally-update rules, `resume/tailored/` dir, validity-marker note).
   *Recommended Agent: sonnet + medium* — single-file prose following the schema from task 1.

No `blocked_by`. JOBHUN-I-0013 depends on this initiative.