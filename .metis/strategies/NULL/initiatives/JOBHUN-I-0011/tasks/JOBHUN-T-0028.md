---
id: author-references-resume-kit-md
level: task
title: "Author references/resume-kit.md (detection, guided-install, capability map, gate contract)"
short_code: "JOBHUN-T-0028"
created_at: 2026-08-04T18:41:59.260408+00:00
updated_at: 2026-08-04T18:41:59.260408+00:00
parent: JOBHUN-I-0011
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0011
---

# Author references/resume-kit.md

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0011]]

## Objective **[REQUIRED]**

Create `references/resume-kit.md` — the single authoritative reference for job-hunter's
dependency on the `resume-intelligence` plugin (marketplace id `resume-kit`). It defines how
skills detect the dependency, the exact guided-install hand-off when it is absent, the
capability map binding each tailoring step to a resume-kit MCP tool + CLI subcommand, and the
gate-usage contract that setup and the apply skills follow. This file is cited by
JOBHUN-I-0012/13/14; no other skill restates its contents.

## Acceptance Criteria **[REQUIRED]**

- [ ] `references/resume-kit.md` exists with four sections: Detection, Guided install + stop,
      Capability map, Gate-usage contract.
- [ ] **Detection** states the dependency is satisfied iff tools under
      `mcp__plugin_resume-intelligence_resume-kit__*` are exposed; probing by referencing one
      core tool (e.g. `resume_check_job_match`); absent tools ⇒ resume-kit absent. Documents
      `resume-tool` CLI as the fallback path.
- [ ] **Guided install** gives the exact message naming the plugin (`resume-intelligence`,
      marketplace `resume-kit`), the `/plugin` install step, and the rule: when required but
      absent, STOP with no partial state (mirroring the working-folder / browser-login gates).
- [ ] **Capability map** table binds each tailoring step → resume-kit capability → MCP tool
      name → `resume-tool` CLI subcommand, and flags which need an LLM provider
      (`extract-resume`, `extract-job-description`, `align-resume`) vs the deterministic rest.
      Tool/CLI names match the real resume-kit tools.
- [ ] **Gate-usage contract** states setup uses it advisory (never aborts non-tailoring
      setup) and the apply skills use it blocking, only when tailoring is requested.
- [ ] Markdown lints clean; `npm run check` stays green.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Follow the tone/structure of existing references (`references/data-contract.md`,
`references/custom-application.md`). The real resume-kit MCP tool names are:
`resume_extract`, `job_description_extract`, `resume_check_ats`, `resume_check_job_match`,
`resume_identify_gaps`, `resume_compare_versions`, `resume_select_best`,
`candidate_evidence_build`, `resume_validate_truth`, `resume_align`, `resume_export`. CLI
subcommands: `extract`, `extract-job`, `check-ats`, `match`, `identify-gaps`, `compare`,
`select`, `build-evidence`, `validate-truth`, `align`, `export` (all under `resume-tool`).

### Dependencies
None — this is the foundation. Blocks JOBHUN-T-0029 (setup wiring cites this file).

### Recommended Agent
**opus + high** — load-bearing substrate the other three initiatives cite; getting the tool
names and the gate contract right prevents compounding rework. Execution: authored via a
**codex** headless agent under supervision (small-medium doc task); verify names against the
real tools before merge.

### Verification
- `npm run check` green.
- Grep confirms the eleven MCP tool names + CLI subcommands appear correctly.

## Status Updates **[REQUIRED]**

*To be added during implementation*
