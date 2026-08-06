---
id: docs-version-bump-validation
level: task
title: "Docs, version bump, validation (README/AGENTS + npm run check)"
short_code: "JOBHUN-T-0043"
created_at: 2026-08-05T02:44:55.114930+00:00
updated_at: 2026-08-05T04:13:31.023507+00:00
parent: JOBHUN-I-0015
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0015
---

# Docs, version bump, validation (README/AGENTS + npm run check)

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0015]]

## Objective **[REQUIRED]**

Close out the initiative: update the top-level user/agent docs (`README.md`, `AGENTS.md`) to
describe the no-LLM tailoring flow + the project alias index, bump the plugin version, and get
`npm run check` fully green across the whole change set. This is the final validation gate that
ships I-0015.

**Recommended Agent: sonnet + medium** — mechanical closeout following the design already fixed
by earlier tasks; the value is in exhaustive validation, not new reasoning.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `README.md` describes the current tailoring flow (no-LLM: convert → check → inject-keywords
      + terminology-mirror → export) and mentions the project alias index; no stale `align-resume`
      description remains.
- [ ] `AGENTS.md` reflects the pivot for agents that read it (the tailor-resume worker steps, the
      alias index, and the delegable resume-kit skills).
- [ ] The plugin version is bumped (plugin manifest + `package.json` kept in sync, matching the
      existing convention from the last release commit).
- [ ] `npm run check` passes cleanly across the full repo with all I-0015 changes applied.
- [ ] A final grep confirms no `align-resume` / `resume_align` "available step" framing survives
      anywhere in the repo (belt-and-suspenders over T-0041).
- [ ] The initiative's acceptance/exit criteria are satisfied and the change set is ready to
      transition I-0015 toward completed.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Run last, after T-0038–T-0042. Follow the existing version-bump convention (the recent history
shows the plugin manifest and `package.json` are kept in lockstep). Update README/AGENTS prose to
match the shipped behavior, then run `npm run check` and fix any residual lint/link/validation
issues surfaced by the accumulated changes.

### Dependencies

- Depends on ALL prior tasks (T-0038 through T-0042) being complete; this is the terminal closeout
  and validation task.

### Risk Considerations

- Risk: version bump drifting between manifest and `package.json`. Mitigation: mirror the exact
  two-file convention from the previous release commit.
- Risk: `npm run check` surfacing issues that actually belong to an earlier task. Mitigation: if a
  failure is a design/wiring defect, route the fix back to the owning task rather than patching
  over it here.
- Risk: README/AGENTS drifting from the reference docs. Mitigation: describe behavior at the
  summary level and link to `references/` rather than restating mechanics that could diverge.

## Status Updates **[REQUIRED]**

**2026-08-04 — Completed.** `README.md`: expanded the `tailor-resume` bullet to describe the
no-LLM flow (convert → check → inject-keywords + update-terminology → export) and the
per-working-folder synonym/alias index. `AGENTS.md`: added a note that tailoring is no-LLM as of
resume-kit v0.3.0 (`align-resume` disabled), edits from inject-keywords/update-terminology, alias
index under `<working_dir>/resume-kit/` (grown only by `manage-synonyms`). Bumped the version
0.7.0 → 0.8.0 in both `.claude-plugin/plugin.json` and `package.json` (kept in sync). Final
belt-and-suspenders grep confirms every remaining `align-resume` mention is an intentional
"disabled"/negative/forward-compat note. `npm run check` fully green (manifest, schemas, 15 skills,
eslint, markdownlint, prettier).