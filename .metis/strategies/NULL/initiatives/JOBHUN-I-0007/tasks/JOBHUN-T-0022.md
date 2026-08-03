---
id: wiring-docs-preflight-version-bump
level: task
title: "Wiring, docs, preflight, version bump, validation"
short_code: "JOBHUN-T-0022"
created_at: 2026-08-01T17:37:16+00:00
updated_at: 2026-08-01T22:02:38.314161+00:00
parent: JOBHUN-I-0007
blocked_by: [JOBHUN-T-0020, JOBHUN-T-0021]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0007
---

# Wiring, docs, preflight, version bump, validation

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0007]]

## Objective **[REQUIRED]**

Finish the initiative: wire the new capability into the surrounding docs and preflight,
bump the plugin version, and confirm the whole plugin still validates — so the feature is
discoverable and shippable.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `references/browser-preflight.md` gains a note covering human-speed control and the
      handoff model (what the agent will pause on and hand to the user).
- [x] `job-hunter-setup` (and any run summaries) mention that external/custom applications
      are supported via handoff and that `interactive-apply` clears the backlog.
- [x] `README.md` and `AGENTS.md` document the two new flows (`apply-to-jobs` custom route,
      `interactive-apply`) and the safety invariant (no account/password/email/CAPTCHA).
- [x] `.claude-plugin/plugin.json` and `package.json` version bumped (0.2.0 → 0.3.0).
- [x] All skills validate and are registered; `npm run check` passes clean.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Pure wiring/documentation and a version bump — no new logic. Keep doc edits consistent with
the existing README/AGENTS voice. Confirm the new `interactive-apply` skill is picked up by
`validate:skills`. Land this only after T-0020 and T-0021 exist so the docs describe shipped
behavior.

**Recommended Agent: sonnet + medium** — mechanical, single-purpose edits across docs +
manifests following stated patterns; all reasoning choices are already fixed by the earlier
tasks.

## Verification **[REQUIRED]**

- [x] `npm run check` passes (validate:plugin, validate:schemas, validate:skills, lint,
      format).
- [x] `grep` the version in both manifests shows `0.3.0`.
- [x] README/AGENTS mention both new flows and the safety invariant.