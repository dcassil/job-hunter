---
id: wire-resume-kit-gate-into-setup
level: task
title: "Wire resume-kit gate into setup + document dependency + version bump"
short_code: "JOBHUN-T-0029"
created_at: 2026-08-04T18:42:00.706910+00:00
updated_at: 2026-08-04T18:42:00.706910+00:00
parent: JOBHUN-I-0011
blocked_by: [JOBHUN-T-0028]
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0011
---

# Wire resume-kit gate into setup + document dependency + version bump

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0011]]

## Objective **[REQUIRED]**

Add a resume-kit detection step to `job-hunter-setup` that surfaces the guided-install
hand-off (from [[JOBHUN-T-0028]]) when the plugin is absent — advisory, without aborting the
rest of setup — and document the dependency for humans (`README.md`) and machines (plugin
manifest metadata). Bump the plugin version.

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/job-hunter-setup/SKILL.md` gains a step that detects resume-kit per
      `references/resume-kit.md`; when absent it shows the guided-install instruction and
      records that tailoring is unavailable, but does NOT abort non-tailoring setup.
- [ ] The setup step cites `references/resume-kit.md` rather than restating detection/install
      wording (single source of truth).
- [ ] `README.md` has a "Requirements / dependencies" note explaining `resume-intelligence`
      is a separate install required for resume tailoring, with the `/plugin` step.
- [ ] The plugin manifest (`.claude-plugin/plugin.json`) carries a machine-visible note of
      the dependency (e.g. a `dependencies`/`keywords`/description note — additive, must keep
      the manifest valid per `scripts/validate-plugin.mjs`).
- [ ] Plugin `version` bumped (minor).
- [ ] `npm run check` green; setup skill still validates and registers.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Insert the detection near setup's other preflights (it already gates on working folder and
browser login — mirror that style). Keep the message text in `references/resume-kit.md`;
setup just invokes/cites it. For the manifest, add an additive field that the validator
tolerates (confirm against `scripts/validate-plugin.mjs` before choosing the field).

### Dependencies
Blocked by [[JOBHUN-T-0028]] (needs the reference to cite).

### Recommended Agent
**opus + medium** — multi-file but follows the authored reference. Execution via a **codex**
headless agent under supervision.

### Verification
- `npm run check` green.
- Manual read of the setup skill confirms advisory (non-aborting) behavior and that it cites
  the reference.

## Status Updates **[REQUIRED]**

*To be added during implementation*
