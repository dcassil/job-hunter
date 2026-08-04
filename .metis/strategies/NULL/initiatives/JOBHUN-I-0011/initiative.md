---
id: resume-kit-dependency-and-guided
level: initiative
title: "resume-kit dependency and guided-install gate"
short_code: "JOBHUN-I-0011"
created_at: 2026-08-04T18:00:14.078274+00:00
updated_at: 2026-08-04T18:49:47.719596+00:00
parent: JOBHUN-V-0001
blocked_by: []
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: S
strategy_id: NULL
initiative_id: resume-kit-dependency-and-guided
---

# resume-kit dependency and guided-install gate Initiative

## Context **[REQUIRED]**

The next capability we are adding to job-hunter — per-job resume tailoring (initiatives
JOBHUN-I-0012, JOBHUN-I-0013, JOBHUN-I-0014) — is built entirely on the
`resume-intelligence` plugin (marketplace id `resume-kit`). That plugin exposes eleven
capabilities as MCP tools (`mcp__plugin_resume-intelligence_resume-kit__*`) and an
equivalent `resume-tool` CLI: extract-resume, extract-job-description, check-resume-ats,
check-resume-job-match, identify-resume-gaps, compare-resume-versions, select-best-resume,
build-candidate-evidence, validate-resume-truth, align-resume, and export-resume.

job-hunter therefore has a hard runtime dependency on a **separate** plugin. Claude Code
plugins cannot programmatically install one another, and there is no dependency-resolution
field in the plugin manifest that auto-installs a sibling plugin. So "require it" has to be
implemented as a **detection gate plus a guided-install hand-off**: any skill that needs
resume-kit checks whether its tools are reachable, and if not, tells the user exactly how to
install `resume-intelligence` (via `/plugin`) and stops without creating partial state —
the same gate discipline the plugin already uses for the working folder and for a logged-in
browser tab.

This initiative builds that dependency substrate once, so the tailoring initiatives can
simply cite it. It is deliberately small and has no behavioral dependencies of its own; it
is the foundation the other three initiatives block on.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Add a single shared reference, `references/resume-kit.md`, that is the one authoritative
  place describing: (a) how to **detect** whether resume-kit is available (probe for the
  `mcp__plugin_resume-intelligence_resume-kit__*` tools, falling back to the `resume-tool`
  CLI), (b) the exact **guided-install** message and stop behavior when it is absent, and
  (c) the **capability map** — which resume-kit capability each tailoring step calls, with
  the MCP tool name and CLI equivalent — so downstream skills reference names from one file.
- Gate `job-hunter-setup` on resume-kit at setup time: detect it, and if missing, walk the
  user through installing `resume-intelligence` before setup continues (setup may still
  complete the rest of the wizard, but it must clearly surface that tailoring will be
  unavailable until the plugin is installed).
- Document the dependency for humans: a "Requirements / dependencies" note in `README.md`
  and a machine-visible note in the plugin manifest metadata.
- Provide the reusable "resume-kit gate" wording that JOBHUN-I-0013 / I-0014 will invoke
  from the apply skills (gate only when tailoring is actually requested for the run).

**Non-Goals:**
- No resume tailoring logic here — that is JOBHUN-I-0013. This initiative only makes the
  dependency detectable, installable-by-the-user, and documented.
- No new working-folder state files (those belong to JOBHUN-I-0012).
- No attempt to auto-install, vendor, or shell out to install another plugin — installation
  is always a user action through `/plugin`.
- No change to the apply skills' behavior yet beyond what is needed to add the gate hook
  point; the actual per-run tailoring prompt and wiring land in JOBHUN-I-0014.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: `references/resume-kit.md` MUST define a deterministic detection procedure: a
    skill probes for the resume-kit MCP tools (namespace
    `mcp__plugin_resume-intelligence_resume-kit__*`); if the harness exposes them the
    dependency is satisfied; if not, the skill treats resume-kit as **absent**. The doc MUST
    also state the `resume-tool` CLI as the documented fallback invocation path.
  - REQ-002: The reference MUST specify the exact guided-install hand-off: name the plugin
    (`resume-intelligence`, marketplace `resume-kit`), instruct the user to install it via
    `/plugin`, and require the calling skill to **stop without creating partial state** when
    the dependency is required but absent.
  - REQ-003: The reference MUST contain a capability map: for each tailoring step, the
    resume-kit capability, its MCP tool name, and its `resume-tool` CLI subcommand, plus the
    one-line note that most capabilities are deterministic (no LLM provider) while
    `extract-*` and `align-resume` optionally use an LLM provider.
  - REQ-004: `job-hunter-setup` MUST detect resume-kit during setup and, when absent,
    surface the guided-install instruction and record that tailoring is unavailable — without
    aborting the parts of setup that do not need resume-kit.
  - REQ-005: The dependency MUST be documented in `README.md` (human) and noted in the
    plugin manifest metadata (machine-visible), including that it is a separate install.
- **Non-Functional Requirements:**
  - NFR-001: Detection MUST be side-effect-free and fast — a capability probe, never an
    install attempt or a network call from job-hunter.
  - NFR-002: There is exactly **one** source of truth for detection + install + capability
    names (`references/resume-kit.md`); no other skill restates the tool names or the
    install message — they cite the reference.
  - NFR-003: `npm run check` stays green; the new reference and edited skills validate and
    register.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Setup when resume-kit is not installed
- **Actor:** a new job-hunter user running `job-hunter-setup`.
- **Scenario:** setup probes for the resume-kit tools and finds none. It tells the user
  that per-job resume tailoring needs the `resume-intelligence` plugin, shows the `/plugin`
  install step, and notes that the rest of setup will proceed but tailoring stays off until
  they install it.
- **Expected Outcome:** the user knows precisely what to install and how; setup does not
  fabricate a dependency or silently disable a feature they asked about.

### Use Case 2: Setup when resume-kit is already installed
- **Actor:** a returning user who already has `resume-intelligence`.
- **Scenario:** setup probes, finds the tools, and simply confirms tailoring is available.
- **Expected Outcome:** no friction; the gate is invisible when the dependency is present.

### Use Case 3: A downstream skill needs the gate wording
- **Actor:** the apply skills (JOBHUN-I-0014), when a run requests tailoring.
- **Scenario:** the apply skill cites `references/resume-kit.md` to run the same detection
  and, if absent, the same guided-install stop.
- **Expected Outcome:** consistent behavior and wording everywhere the dependency is
  required, defined in exactly one place.

## Detailed Design **[REQUIRED]**

Add `references/resume-kit.md` with four sections:

1. **Detection.** The canonical check: the dependency is satisfied iff the harness exposes
   tools under `mcp__plugin_resume-intelligence_resume-kit__*`. A skill probes by attempting
   to reference/load one core tool (e.g. `resume_check_job_match`). Absent tools ⇒ resume-kit
   is not installed for this session. Document the `resume-tool` CLI as the fallback the user
   or a future non-MCP path can call.
2. **Guided install + stop.** The exact message: "Resume tailoring needs the
   `resume-intelligence` plugin (marketplace `resume-kit`). Install it with `/plugin`, then
   re-run." The rule: when a skill *requires* resume-kit and it is absent, STOP with no
   partial state (mirrors the working-folder and browser-login gates already in the plugin).
3. **Capability map.** A table binding each tailoring step to a resume-kit capability, its
   MCP tool name, and its CLI subcommand, and flagging which need an LLM provider
   (`extract-resume`, `extract-job-description`, `align-resume`) versus the deterministic
   rest.
4. **Gate-usage contract.** How `job-hunter-setup` (always, advisory) and the apply skills
   (only when tailoring is requested, blocking) invoke this gate.

Then edit `job-hunter-setup/SKILL.md` to add a resume-kit detection step that emits the
guided-install hand-off when absent (advisory — does not abort non-tailoring setup), and add
the dependency to `README.md` and the plugin manifest metadata. Bump the plugin version.

## Alternatives Considered **[REQUIRED]**

- **A manifest "dependencies" field that auto-installs resume-kit.** Rejected — no such
  auto-install mechanism exists for Claude Code plugins; a plugin cannot install another.
  Detection + guided user install is the only workable path.
- **Vendoring resume-kit's logic into job-hunter.** Rejected — duplicates a separately
  maintained plugin, drifts from its schemas, and defeats the point of reusing it.
- **Silently skipping tailoring when resume-kit is absent (no gate).** Rejected by the
  approved design — the user explicitly chose a gate + guided install so a requested feature
  never fails silently.
- **Hard-gating all of setup on resume-kit.** Rejected — setup does far more than tailoring;
  blocking the whole wizard on an optional-until-you-tailor dependency is user-hostile. The
  gate is advisory in setup and blocking only where tailoring is actually invoked.
- **Restating tool names in each skill.** Rejected — guarantees drift; one reference is the
  single source of truth (NFR-002).

## Implementation Plan **[REQUIRED]**

Human-in-the-loop: task decomposition is pending Daniel's approval before tasks are created.
Planned decomposition (each task will carry a `Recommended Agent` profile):

1. **Author `references/resume-kit.md`** (detection, guided-install, capability map,
   gate-usage contract). *Recommended Agent: opus + high* — load-bearing substrate the other
   three initiatives cite; getting the tool names and gate contract right prevents
   compounding rework.
2. **Wire the gate into setup + document the dependency** (setup detection step, README
   dependencies note, manifest metadata note, version bump, `npm run check`).
   *Recommended Agent: opus + medium* — multi-file but follows the reference authored in
   task 1.

No `blocked_by`; this initiative is the foundation. JOBHUN-I-0013 and JOBHUN-I-0014 depend
on it.