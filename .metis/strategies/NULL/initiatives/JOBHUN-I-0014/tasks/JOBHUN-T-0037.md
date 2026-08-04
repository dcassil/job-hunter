---
id: docs-file-list-updates-version
level: task
title: "Docs + file-list updates + version bump + npm run check (I-0014)"
short_code: "JOBHUN-T-0037"
created_at: 2026-08-04T19:02:23.899438+00:00
updated_at: 2026-08-04T19:08:12.174904+00:00
parent: JOBHUN-I-0014
blocked_by: [JOBHUN-T-0035, JOBHUN-T-0036]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0014
---

# Docs + file-list updates + version bump

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0014]]

## Objective **[REQUIRED]**

Finish I-0014: update human-facing docs and the two apply skills' "Files this skill reads and
writes" sections to mention tailoring / `resume-prefs.json` / `resume/tailored/`, bump the
plugin version, and confirm the whole guardrail suite is green.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `README.md` and `AGENTS.md` mention that the apply skills can tailor resumes per job
      (referencing `tailor-resume` and the resume-kit dependency).
- [ ] Both apply skills' "Files this skill reads and writes" sections list `resume-prefs.json`
      and `resume/tailored/` where the skill now causes reads/writes via the worker (NFR-002).
- [ ] Plugin `version` bumped (minor, 0.6.0 → 0.7.0).
- [ ] `npm run check` passes with zero errors.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Small doc pass after both wiring tasks land. Keep the single-source-of-truth discipline:
mention and link, do not restate the pipeline or tool names.

### Dependencies
Blocked by JOBHUN-T-0035 and JOBHUN-T-0036.

### Recommended Agent
**sonnet + medium** — mechanical doc/version pass. Execution: **codex** headless (folded into
the same worktree agent after the two wiring edits).

### Verification
- `npm run check` green end to end.

## Status Updates **[REQUIRED]**

*To be added during implementation*