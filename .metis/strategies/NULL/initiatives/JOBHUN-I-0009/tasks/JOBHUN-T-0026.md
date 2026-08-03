---
id: wire-check-email-status-into-docs
level: task
title: "Wire check-email-status into docs + ship"
short_code: "JOBHUN-T-0026"
created_at: 2026-08-03T19:21:15+00:00
updated_at: 2026-08-03T19:26:10.747207+00:00
parent: JOBHUN-I-0009
blocked_by: [JOBHUN-T-0025]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0009
---

# Wire check-email-status into docs + ship

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0009]]

## Objective **[REQUIRED]**

Make the new skill discoverable and shippable: document it in the surrounding docs, wire
the "offer to feed find-jobs" hand-off wording, bump the version, and confirm the plugin
validates.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `README.md` lists `check-email-status` among the orchestrator skills with a one-line
      description (reads inbox read-only, updates the list on real status changes, reports
      important ones).
- [x] `AGENTS.md` notes the read-only-on-inbox principle for the status skill (never
      send/reply/draft; all list writes via `record-application`).
- [x] `job-hunter-setup`'s final report (and/or the relevant skill cross-links) mention
      that the user can run `check-email-status` to fold email updates into the pipeline.
- [x] The recommendation→`find-jobs` hand-off is documented (how the offered postings pass
      to `find-jobs`), consistent with what the skill from T-0025 emits.
- [x] `.claude-plugin/plugin.json` and `package.json` version bumped (0.4.0 → 0.5.0).
- [x] All skills validate; `npm run check` passes clean.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Pure wiring/documentation + version bump — no new logic. Keep edits consistent with the
existing README/AGENTS voice. Land after T-0025 so the docs describe shipped behavior.

**Recommended Agent: opus + medium** — small cross-file doc/manifest edits, but they must
stay consistent with the skill's actual emitted behavior and the plugin's conventions.

## Verification **[REQUIRED]**

- [x] `npm run check` passes (validate:plugin, validate:schemas, validate:skills, lint,
      format).
- [x] `grep` the version in both manifests shows `0.5.0`.
- [x] README lists `check-email-status`; AGENTS states the read-only principle.