---
id: plugin-scaffolding-and-working
level: initiative
title: "Plugin scaffolding and working-folder contract"
short_code: "JOBHUN-I-0001"
created_at: 2026-07-30T23:56:08.823473+00:00
updated_at: 2026-07-31T00:17:07.367725+00:00
parent: JOBHUN-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/active"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: plugin-scaffolding-and-working
---

# Plugin scaffolding and working-folder contract Initiative

## Context **[REQUIRED]**

This is the foundational initiative. Every other skill in job-hunter depends on a
shared contract: where the working folder lives, how a skill finds it, and the
exact shape of the files it contains (`config.json`, `profile.json`, `job-focus.md`,
`jobs/jobs.json`, `jobs/jobs.md`). If this contract is wrong or under-specified,
every downstream skill inherits the problem and rework compounds across the whole
plugin. This initiative establishes the plugin manifest, the folder-discovery
mechanism, the JSON schemas, and a small set of shared conventions (status values,
id generation, dedupe keys) that all other initiatives consume.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Establish the plugin package: `.claude-plugin/plugin.json`, `skills/` layout, and
  a `README.md` describing install and the two-folder model (source vs working).
- Define the working-folder discovery contract: how any skill locates the active
  working folder without relying on conversation memory.
- Specify and document the canonical schemas for `config.json`, `profile.json`,
  `job-focus.md`, `jobs/jobs.json`, and the `jobs/jobs.md` mirror.
- Define shared conventions: job `id` generation, dedupe key, allowed `status`
  values and their transitions, resume/cover variant naming.
- Provide a reference document (in the plugin) that all skills link to as the single
  source of truth for the data contract.

**Non-Goals:**
- No interactive skills yet (setup, find, apply) — those are separate initiatives.
- No browser automation logic.
- No creation of a user's actual working folder at build time; only the schema and
  discovery rules that the setup wizard will later implement.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements
- **Functional Requirements:**
  - REQ-001: The plugin MUST expose a valid `.claude-plugin/plugin.json` manifest.
  - REQ-002: A documented, deterministic rule MUST let any skill locate the working
    folder (e.g., a recorded absolute path plus presence of `config.json` marker).
  - REQ-003: `jobs.json` MUST be an array of job objects matching the documented
    schema, including a `status` field constrained to the allowed enum.
  - REQ-004: A job's dedupe identity MUST be defined (canonical URL, falling back to
    normalized `title`+`company`+`location`).
  - REQ-005: `profile.json` MUST hold both fixed demographic/work-auth fields and an
    extensible `logged_questions` array.
  - REQ-006: `config.json` MUST capture resume strategy, remote preference, automation
    default, resume domain mapping, and selected sites.
- **Non-Functional Requirements:**
  - NFR-001: All files MUST be plain JSON/Markdown editable by hand.
  - NFR-002: Schemas MUST be forward-compatible — unknown fields ignored, new fields
    additive.

## Detailed Design **[REQUIRED]**

**Package layout** (source): `.claude-plugin/plugin.json`, `skills/<skill>/SKILL.md`
per skill, `README.md`, and a `references/data-contract.md` that all skills cite.

**Working-folder discovery:** the setup wizard writes the chosen absolute path into
a small marker the plugin can find, and every skill confirms a folder is valid by
checking for `config.json` at that path. Skills that run without a discoverable
working folder instruct the user to run setup first (a gate).

**Schemas** (as specified in the vision/design):
- `config.json`: `{ working_dir, resume_strategy: "round-robin|domain|both",
  resume_domains: {variant: [domains]}, remote_pref: "remote|local|both",
  automation_default: "ask|auto|human", sites: [ ... ] }`
- `profile.json`: `{ demographics: { gender, ethnicity, veteran, disability,
  work_authorized, needs_sponsorship }, logged_questions: [ { question, answer,
  source_job, answered } ] }`
- `job-focus.md`: prose + bullet list of target job types (human-editable).
- `jobs/jobs.json`: array of job objects — `id, title, company, location, remote,
  url, source, posted, found_at, status, resume_used, cover_used, applied_at, notes`.
- `jobs/jobs.md`: generated table mirror for human reading.

**Status enum & transitions:** `new → applied → interviewing → offer` with
`skipped` and `rejected` as terminal side states. Documented once; `record-application`
enforces it later.

## Alternatives Considered **[REQUIRED]**

- **Single combined state file vs split files.** Rejected a single monolithic JSON:
  splitting config/profile/jobs keeps concerns separate, makes hand-editing safer,
  and limits blast radius of a corrupt file.
- **SQLite for the job list.** Rejected for v1: JSON is hand-editable, diff-friendly,
  and sufficient for single-user scale; a DB adds opacity and tooling cost.
- **Storing state inside the plugin source folder.** Rejected — violates the
  stateless-plugin principle and breaks reuse/versioning; state must live in the
  user-chosen working folder.
- **Implicit "current directory" discovery only.** Rejected as sole mechanism —
  fragile across sessions; a recorded absolute path + marker file is more robust.

## Implementation Plan **[REQUIRED]**

1. Author `plugin.json` and `README.md` (source-vs-working model, install steps).
2. Write `references/data-contract.md` defining all schemas, the status enum, id and
   dedupe rules, and the discovery contract.
3. Provide JSON schema examples / templates the setup wizard will instantiate.
4. Validate the contract by hand-authoring a sample working folder and confirming a
   dry read against the schemas.

Decomposition and per-task model/effort assignments will be added at decompose time.
Initiative decomposition itself is opus + high.