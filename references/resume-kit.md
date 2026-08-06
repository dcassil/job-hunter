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
As of resume-kit **v0.3.0**, the LLM auto-rewrite path (`align-resume`) is
**disabled / not surfaced** — resume-kit directs truthful tailoring through the
no-LLM `inject-keywords` + `update-terminology` path instead (see
[Terminology mirroring & the alias index](#terminology-mirroring--the-alias-index)).
The raw extract tools (`resume_extract`, `job_description_extract`) remain
callable over CLI/MCP but are likewise no longer surfaced as skills; resume-kit
prefers the agent-driven `resume-to-json` / `job-to-json` conversions, which need
no provider. Follow resume-kit's own mode and provider behavior where an LLM path
is still invoked directly.

| Tailoring step | Resume-kit capability | MCP tool | CLI subcommand | Takes `alias_file`? |
| --- | --- | --- | --- | --- |
| Extract a structured resume from a resume file | `resume-to-json` (agent) / `extract-resume` (raw) | `mcp__plugin_resume-intelligence_resume-kit__resume_extract` | `resume-tool extract` | No |
| Extract a structured job description from a posting | `job-to-json` (agent) / `extract-job-description` (raw) | `mcp__plugin_resume-intelligence_resume-kit__job_description_extract` | `resume-tool extract-job` | No |
| Score ATS structure (parse/format, job-independent) | `check-ats-structure` | `mcp__plugin_resume-intelligence_resume-kit__resume_check_ats_structure` | `resume-tool check-ats-structure` | No (structure-only) |
| Score keyword-aware ATS compatibility | `check-resume-ats` | `mcp__plugin_resume-intelligence_resume-kit__resume_check_ats` | `resume-tool check-ats` | Yes |
| Score resume-to-job match | `check-keyword-match` | `mcp__plugin_resume-intelligence_resume-kit__resume_check_job_match` | `resume-tool match` | Yes |
| Identify injectable and non-injectable keyword gaps | `identify-resume-gaps` | `mcp__plugin_resume-intelligence_resume-kit__resume_identify_gaps` | `resume-tool identify-gaps` | Yes |
| Surface missing-but-true keywords (truth-gated, agent-driven) | `inject-keywords` | — (agent edits) | — | n/a |
| Analyze + apply employer-wording mirrors for alias hits | `update-terminology` | `resume_suggest_terminology` (analyze) / `resume_align_terminology` (apply) | `resume-tool suggest-terminology` / `align-terminology` | Yes (on analyze) |
| Grow the project alias index (truth-gated, agent-driven) | `manage-synonyms` | — (agent appends) | — | writes it |
| Compare resume versions against a job | `compare-resume-versions` | `mcp__plugin_resume-intelligence_resume-kit__resume_compare_versions` | `resume-tool compare` | No |
| Select the best resume for a job | `select-best-resume` | `mcp__plugin_resume-intelligence_resume-kit__resume_select_best` | `resume-tool select` | No |
| Build candidate evidence records | `build-candidate-evidence` | `mcp__plugin_resume-intelligence_resume-kit__candidate_evidence_build` | `resume-tool build-evidence` | No |
| Validate resume claims against evidence | `validate-resume-truth` | `mcp__plugin_resume-intelligence_resume-kit__resume_validate_truth` | `resume-tool validate-truth` | No |
| Align a resume to a job description (LLM) | `align-resume` — **DISABLED in v0.3.0** | `mcp__plugin_resume-intelligence_resume-kit__resume_align` | `resume-tool align` | No |
| Export a tailored resume artifact | `export-resume` | `mcp__plugin_resume-intelligence_resume-kit__resume_export` | `resume-tool export` | No |

Reserved-but-unbuilt (do NOT invoke): `check-resume-consistency`,
`score-resume-bullet`, `improve-resume-section`, `create-job-specific-resume`,
`check-cover-letter-job-match`, `align-cover-letter`, `audit-application-package`
— these names have no engine, CLI, or MCP implementation in v0.3.0.

## Terminology mirroring & the alias index

resume-kit v0.3.0 adds a deterministic, truth-gated terminology surface plus a
project-local synonym index that keyword scoring UNIONs over its packaged seed
lexicon:

- **Working-dir convention.** resume-kit state lives under `resume-kit/` in the
  project: `config.json` (holds `active_resume`, `active_job`, and an optional
  `alias_file` pointer), `resumes/`, `jobs/`, `working/<session-id>/`, and
  `learning/`. The alias index defaults to `resume-kit/learning/synonyms.json`
  (format `{"version":1,"aliases":{canonical:[alias,...]}}`), resolved against the
  `resume-kit/` dir. No Python package opens `config.json`; the *agent* reads the
  pointer and passes the resolved path to each `alias_file`-aware tool.
- **Terminology mirroring** (`update-terminology`): when a JD keyword the resume
  already satisfies appears under a different surface form (an *alias hit* — resume
  "k8s", JD "Kubernetes"), `resume_suggest_terminology` proposes mirroring the
  employer's exact wording and `resume_align_terminology` applies accepted mirrors.
  Truth-gated by the engine regardless. A JD keyword with NO match is a GAP and is
  never rewritten in.
- **Alias-index growth** (`manage-synonyms`, agent-driven): proposes → truth-gates
  → asks the user → appends justified `{canonical, alias, why}` entries to the
  project `synonyms.json`. It is the **only** writer of that file. Once grown, the
  synonym counts deterministically on the next `alias_file`-aware run with no LLM.

## Delegable resume-kit skills (run as subagents)

Several resume-kit capabilities are **agent-driven skills**, not single MCP calls. job-hunter
dispatches each as a **subagent** (per resume-kit's own "run me in a subagent" guidance), hands it
the relevant file paths, and consumes only what it returns — never streaming full resume/job text
back into the main context:

- **`resume-to-json`** — convert a PDF/DOCX/MD/text resume into a faithful `ResumeDocument` JSON.
  Use this for the once-per-job base conversion (not the raw `resume_extract` tool).
- **`job-to-json`** — convert a posting into a `JobDescription` JSON (with `requirements` +
  `keywords`) so deterministic scoring works with no provider (not the raw
  `job_description_extract` tool).
- **`inject-keywords`** — truth-gated surfacing of missing-but-true keywords the candidate genuinely
  has; emits discrete edits (`skill_add` / `bullet_add`). No MCP tool.
- **`update-terminology`** — the review loop over `resume_suggest_terminology` /
  `resume_align_terminology`; presents wording mirrors per section for accept/skip (job-hunter
  drives the underlying tools directly when it needs its own freedom/review/learning governance).
- **`manage-synonyms`** — grows the project alias index; the **only** writer of
  `learning/synonyms.json` (proposes → truth-gates → asks the user → appends justified entries).

## Export returns artifact bytes

`resume_export` (`export-resume`) returns the tailored artifact as **bytes** (base64-encoded over
MCP). The caller MUST decode the payload and write it to disk itself — for the tailoring pipeline
that destination is `<working_dir>/resume/tailored/<job-id>.<ext>`. There is no server-side file
write; the envelope carries the bytes, not a path.

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
