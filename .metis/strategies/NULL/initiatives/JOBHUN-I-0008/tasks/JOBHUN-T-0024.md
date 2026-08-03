---
id: wire-pre-answer-gates-into-apply
level: task
title: "Wire pre-answer gates into apply skills + ship"
short_code: "JOBHUN-T-0024"
created_at: 2026-08-01T22:17:19+00:00
updated_at: 2026-08-01T22:22:35.633249+00:00
parent: JOBHUN-I-0008
blocked_by: [JOBHUN-T-0023]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0008
---

# Wire pre-answer gates into apply skills + ship

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0008]]

## Objective **[REQUIRED]**

Make every apply flow actually run the two pre-answer gates, referencing the shared
definitions from T-0023, and ship the change (docs + version + validation).

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `apply-to-jobs` applies both gates before answering any field, in BOTH the Easy Apply
      path (step 4c/4d) and the custom `4x` route: a suspected trap → do not fill, record a
      handoff `needs: ["bot-check"]` (batch); a prose/free-response field → do not
      auto-answer, record `needs: ["question"]`. Both reference `question-log.md`'s
      `Pre-answer gates` rather than restating them.
- [x] `interactive-apply` applies both gates in its co-fill step (4c/4d): a suspected trap
      or a prose field → PAUSE and ask/point the user to it rather than filling.
- [x] The gate behavior is added to each skill's principles/relevant step, phrased as
      "conservative — when unsure, log for the user."
- [x] `README.md` and `AGENTS.md` note the two apply-time gates (bot-trap detection and
      free-response) as part of the safety model.
- [x] `.claude-plugin/plugin.json` and `package.json` version bumped (0.3.0 → 0.4.0).
- [x] All skills validate; `npm run check` passes clean.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Reference the shared gate definitions; do not duplicate the signal lists across skills.
Touch the minimum: the two apply skills, README, AGENTS, and the two manifests. Land after
T-0023 so the referenced section and enum value exist.

**Recommended Agent: opus + medium** — focused edits across two orchestrator skills plus
docs/manifests, following the shared definitions from T-0023.

## Verification **[REQUIRED]**

- [x] `grep` shows both apply skills reference the `Pre-answer gates` section and the
      `bot-check` / `question` handoff outcomes.
- [x] `grep` the version in both manifests shows `0.4.0`.
- [x] `npm run check` passes.