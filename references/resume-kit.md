# Resume-kit dependency

This is the single source of truth for job-hunter's dependency on the
`resume-intelligence` plugin, marketplace id `resume-kit`. Resume tailoring skills
cite this reference for dependency detection, the guided-install hand-off, capability
names, and gate behavior.

The dependency is external to job-hunter. job-hunter does not install it, vendor it,
or make network calls to resolve it.

## Detection

Resume-kit is available if and only if the current Claude Code harness exposes tools
under this namespace:

```text
mcp__plugin_resume-intelligence_resume-kit__*
```

A skill probes the dependency by attempting to reference or load one core MCP tool,
typically:

```text
mcp__plugin_resume-intelligence_resume-kit__resume_check_job_match
```

If that tool namespace is exposed, the dependency is satisfied for the current
session. If the tools are absent, treat resume-kit as not installed for this session.
Detection is a side-effect-free capability probe only: never attempt installation,
package download, network access, or working-folder mutation as part of the check.

The documented non-MCP fallback path is the `resume-tool` CLI. When a future skill or
manual workflow uses the CLI instead of MCP, it calls the subcommands listed in the
[Capability map](#capability-map). The CLI fallback does not change the gate: when a
job-hunter skill requires resume-kit and no supported resume-kit path is available,
the skill stops.

## Guided install + stop

When resume-kit is required but absent, use this exact hand-off message:

```text
Resume tailoring needs the `resume-intelligence` plugin (marketplace `resume-kit`). Install it with `/plugin`, then re-run.
```

Then stop without creating partial state. This mirrors the working-folder and
browser-login gates: do not create or modify tailoring output, do not update job
state, and do not continue a requested tailoring flow with a silent downgrade.

## Capability map

Most resume-kit capabilities are deterministic and do not require an LLM provider.
`extract-resume`, `extract-job-description`, and `align-resume` may use an LLM
provider when configured; follow resume-kit's own mode and provider behavior.

| Tailoring step | Resume-kit capability | MCP tool | CLI subcommand |
| --- | --- | --- | --- |
| Extract a structured resume from a resume file | `extract-resume` | `mcp__plugin_resume-intelligence_resume-kit__resume_extract` | `resume-tool extract` |
| Extract a structured job description from a posting | `extract-job-description` | `mcp__plugin_resume-intelligence_resume-kit__job_description_extract` | `resume-tool extract-job` |
| Score ATS compatibility | `check-resume-ats` | `mcp__plugin_resume-intelligence_resume-kit__resume_check_ats` | `resume-tool check-ats` |
| Score resume-to-job match | `check-resume-job-match` | `mcp__plugin_resume-intelligence_resume-kit__resume_check_job_match` | `resume-tool match` |
| Identify injectable and non-injectable keyword gaps | `identify-resume-gaps` | `mcp__plugin_resume-intelligence_resume-kit__resume_identify_gaps` | `resume-tool identify-gaps` |
| Compare resume versions against a job | `compare-resume-versions` | `mcp__plugin_resume-intelligence_resume-kit__resume_compare_versions` | `resume-tool compare` |
| Select the best resume for a job | `select-best-resume` | `mcp__plugin_resume-intelligence_resume-kit__resume_select_best` | `resume-tool select` |
| Build candidate evidence records | `build-candidate-evidence` | `mcp__plugin_resume-intelligence_resume-kit__candidate_evidence_build` | `resume-tool build-evidence` |
| Validate resume claims against evidence | `validate-resume-truth` | `mcp__plugin_resume-intelligence_resume-kit__resume_validate_truth` | `resume-tool validate-truth` |
| Align a resume to a job description | `align-resume` | `mcp__plugin_resume-intelligence_resume-kit__resume_align` | `resume-tool align` |
| Export a tailored resume artifact | `export-resume` | `mcp__plugin_resume-intelligence_resume-kit__resume_export` | `resume-tool export` |

## Gate-usage contract

- `job-hunter-setup` runs the detection gate every time setup runs. The result is
  advisory: if resume-kit is absent, setup surfaces the guided-install hand-off,
  records in the setup summary that tailoring is unavailable, and continues any
  setup work that does not require tailoring.
- Apply skills run the detection gate only when resume tailoring is requested for
  that run. The result is blocking: if resume-kit is absent, the skill uses the
  guided-install hand-off and stops without creating partial tailoring or
  application state.
- Skills that do not request or perform resume tailoring do not gate on resume-kit.

## Files this reference governs

- **Reads:** the current harness tool list or available MCP tool namespace; optional
  `resume-tool` CLI availability for non-MCP workflows.
- **Consumed by:** setup and any future resume-tailoring apply flow.
- **Writes:** nothing.
