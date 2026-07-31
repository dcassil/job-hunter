---
id: job-search-subsystem
level: initiative
title: "Job search subsystem"
short_code: "JOBHUN-I-0003"
created_at: 2026-07-30T23:56:15.590236+00:00
updated_at: 2026-07-31T00:27:35.373563+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0001]
archived: false

tags:
  - "#initiative"
  - "#phase/active"


exit_criteria_met: false
estimated_complexity: L
strategy_id: NULL
initiative_id: job-search-subsystem
---

# Job search subsystem Initiative

## Context **[REQUIRED]**

This initiative delivers discovery: turning the user's job focus and preferences
into a deduped, growing list of real listings. It is where browser automation enters
the picture. Because each job board blocks scrapers, gates content behind logins, and
changes its markup frequently, the design isolates site-specific fragility into
per-site adapter sub-skills behind a common interface, orchestrated by a thin
`find-jobs` skill. The subsystem drives the user's own logged-in Chrome via the
claude-in-chrome tools rather than scraping infrastructure. Its output is appended to
the `jobs.json` list defined in JOBHUN-I-0001 through the shared `add-job-to-list`
worker so dedupe rules live in exactly one place.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Implement `find-jobs`: a gated orchestrator that runs one search "run" — asks the
  per-run automated-vs-human choice, selects sites, dispatches adapters, and reports
  what was added.
- Implement per-site adapter sub-skills: `search-linkedin`, `search-indeed`,
  `search-glassdoor`, and a `search-generic-site` fallback for other boards.
- Implement `add-job-to-list`: a non-interactive worker that normalizes a listing to
  the job schema, dedupes against existing entries, appends to `jobs.json`, and
  regenerates the `jobs.md` mirror.
- Honor the user's remote/local preference and job focus when forming queries.
- Degrade gracefully when a site blocks automation (fall back to generic adapter or
  manual paste) and clearly report partial results.

**Non-Goals:**
- No applying — that is JOBHUN-I-0004.
- No editing of job focus or preferences — that is maintenance (JOBHUN-I-0005).
- No headless scraping infrastructure; browser automation uses the user's session.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements
- **Functional Requirements:**
  - REQ-001: `find-jobs` MUST gate on completed setup and abort with guidance if none.
  - REQ-002: `find-jobs` MUST ask automated-vs-human for the run (default from
    `config.automation_default`).
  - REQ-003: Each adapter MUST return listings in the common job schema shape.
  - REQ-004: `add-job-to-list` MUST dedupe by canonical URL, falling back to
    normalized title+company+location, and MUST NOT overwrite an existing job's status.
  - REQ-005: New jobs MUST be written with `status: "new"` and `found_at` set.
  - REQ-006: The `jobs.md` mirror MUST be regenerated after any list change.
- **Non-Functional Requirements:**
  - NFR-001: Adapter fragility MUST be contained — a failing adapter must not corrupt
    the list or crash the whole run.
  - NFR-002: The run MUST report counts (found, new, duplicates, skipped) to the user.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Multi-site search run
- **Actor:** the job seeker.
- **Scenario:** user says "let's find jobs" → `find-jobs` confirms setup exists →
  asks automated vs human-in-the-loop → asks which sites (default: configured set) →
  dispatches each adapter, which drives the browser to run the query derived from the
  job focus + remote preference → each listing goes through `add-job-to-list` →
  orchestrator reports "N found, M new, K duplicates."
- **Expected Outcome:** `jobs.json` grows with new deduped listings; user sees a summary.

### Use Case 2: A site is blocked
- **Actor:** the job seeker.
- **Scenario:** LinkedIn presents an anti-bot wall → the adapter reports the block →
  orchestrator offers to fall back to `search-generic-site` or manual paste and
  continues with the other sites.
- **Expected Outcome:** partial results are still captured and the block is reported.

## Architecture **[CONDITIONAL: Technically Complex Initiative]**

### Overview
Thin orchestrator (`find-jobs`) over a set of interchangeable adapters implementing a
common contract: input = query params (keywords, location, remote pref); output =
list of raw listings mapped to the job schema. A single sink (`add-job-to-list`) owns
normalization, dedupe, and persistence. Browser interaction is confined to adapters.

### Sequence (per run)
`find-jobs` → (gate) → ask automation mode → ask sites → for each site: adapter →
list of listings → for each listing: `add-job-to-list` (dedupe + append) → regenerate
`jobs.md` → report summary.

## Detailed Design **[REQUIRED]**

Adapters use the claude-in-chrome tools: open a tab, navigate to the site's search
URL constructed from the job focus and remote preference, read the results, and
extract per-listing fields (title, company, location, remote flag, url, posted date).
Extraction is best-effort with defensive parsing; missing fields are left null rather
than guessed. `add-job-to-list` computes the dedupe key, checks existing `jobs.json`,
and either appends a `status:"new"` record or skips (counting the duplicate). The
`jobs.md` mirror is regenerated from `jobs.json` as a table. The generic adapter
accepts either a board URL or user-pasted listing text and parses what it can.

## Alternatives Considered **[REQUIRED]**

- **One monolithic search skill vs adapter-per-site.** Chose adapters: sites differ
  and break independently; isolation limits blast radius and eases maintenance.
- **Dedupe inside each adapter vs a single sink.** Chose a single sink so dedupe and
  schema rules exist in exactly one place.
- **WebSearch/WebFetch instead of browser automation.** Rejected as primary (per the
  design decision): misses gated/logged-in content and hits anti-bot walls; retained
  only as an implicit capability of the generic adapter where public.
- **Fully automated runs only.** Rejected — the user wants a per-run automated-vs-
  human choice.

## Implementation Plan **[REQUIRED]**

1. `add-job-to-list` worker (schema mapping, dedupe, persistence, md mirror) — build
   first since adapters depend on it.
2. `find-jobs` orchestrator shell (gate, automation prompt, site selection, summary).
3. `search-generic-site` adapter (URL + paste) as the safe baseline.
4. `search-linkedin`, `search-indeed`, `search-glassdoor` adapters.
5. Graceful-degradation + reporting polish.

Depends on JOBHUN-I-0001. Decomposition/model-effort assigned at decompose time;
initiative decomposition is opus + high.