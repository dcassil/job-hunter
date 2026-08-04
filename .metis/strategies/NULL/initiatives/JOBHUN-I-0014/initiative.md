---
id: apply-skill-integration-per-run
level: initiative
title: "Apply-skill integration: per-run tailoring prompt and tailor-resume wiring"
short_code: "JOBHUN-I-0014"
created_at: 2026-08-04T18:00:14.078274+00:00
updated_at: 2026-08-04T19:02:16.832945+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0013]
archived: false

tags:
  - "#initiative"
  - "#phase/decompose"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: apply-skill-integration-per-run
---

# Apply-skill integration Initiative

## Context **[REQUIRED]**

JOBHUN-I-0013 delivers `tailor-resume` as a standalone worker. This initiative wires it into
the two apply orchestrators so a real apply run actually tailors resumes. It adds the
per-run tailoring prompt (asked every run, no config fields — per the approved design) and
calls `tailor-resume` per job at the point where materials are resolved, using its result to
decide what resume file to attach.

The wiring must respect the existing structure of both orchestrators. `apply-to-jobs` is the
batch/automated orchestrator with its `auto`/`human` run mode and defensive per-job loop;
`interactive-apply` is the collaborative one-at-a-time backlog-clearer. Tailoring slots into
each without disturbing the human-in-control-of-consequences invariant, the single-status-
writer rule (`record-application`), or the rotation resolver. The tailoring **review mode**
(interactive / review-after / automatic) is distinct from the apply **run mode**
(auto / human); this initiative defines how the two compose sensibly.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Add a per-run tailoring prompt block to both apply skills, asked before the per-job loop:
  **tailor resumes this run? (y/n)** → if yes: **freedom (0–10)?** and **review mode
  (interactive / review-after / automatic)?**. Nothing is stored in `config.json`.
- Gate the run on resume-kit (`references/resume-kit.md`, JOBHUN-I-0011) **only when
  tailoring is requested**; if resume-kit is absent, surface the guided-install hand-off and
  let the user either install it or continue the run without tailoring.
- In each per-job step, after the rotation resolver returns `{ resume_used, cover_used }`,
  call `tailor-resume` with `{ working_dir, resume_variant_id: resume_used, job, freedom,
  review_mode }` and act on its envelope: attach the tailored file on `tailored-pass`; on
  `skipped-strong` attach the base; on `tailored-best-effort`/`declined` follow the skill's
  user decision or fall back to base.
- Define **run-mode × review-mode composition** precisely. In `apply-to-jobs` `auto` run
  mode with tailoring review mode `interactive`, the run stays fully automated **per job**
  unless that job's resume actually needs changes:
  - If the base resume already scores at/above the skip threshold (`>= 90`, `skipped-strong`
    from `tailor-resume`), there is nothing to review — the job proceeds fully `auto` with no
    pause.
  - If the resume **requires changes** (score below the threshold, so edits are proposed),
    **only the edit-approval portion becomes interactive**: the run holds for the user to
    approve/reject/edit the proposed changes. Once the tailored resume is settled (approved
    or the user falls back to base), the run **returns to `auto`** for the rest of that job —
    field fill and the normal `auto` submit gate — and for subsequent jobs that don't need
    changes.
  - `automatic` review mode under `auto` never pauses. In `human` run mode any review mode is
    fine. In `interactive-apply`, tailoring is naturally interactive/review-after alongside
    the co-fill.
- Keep `resume_used` recorded via `record-application` as the **base variant id** (tailored
  files are attachments, not variants), with the tailoring outcome captured in the run
  summary (and optionally the job `notes`).
- Update the run summaries to report tailoring outcomes per job (skipped-strong / tailored to
  score X / best-effort / not tailored).
- Update docs: `README.md`, `AGENTS.md`, and the apply skills' "Files this skill reads and
  writes" sections to include `resume-prefs.json` and `resume/tailored/`.

**Non-Goals:**
- No tailoring logic (owned by JOBHUN-I-0013), no schema changes (JOBHUN-I-0012), no
  gate/reference authoring (JOBHUN-I-0011) — this initiative only composes them into the
  orchestrators.
- No new config fields (tailoring prefs are asked every run by decision).
- No change to how submission, rotation-pointer persistence, or `record-application` work,
  beyond passing the tailored attachment and outcome through.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: Both `apply-to-jobs` and `interactive-apply` MUST ask the per-run tailoring
    prompt (tailor y/n → freedom 0–10 → review mode) before the per-job loop, every run, with
    no persisted defaults.
  - REQ-002: The resume-kit dependency MUST be checked only when tailoring is requested; if
    absent, the skills MUST present the guided-install hand-off and offer to continue the run
    untailored (never silently drop a requested feature).
  - REQ-003: For each job, after materials resolution, the skills MUST call `tailor-resume`
    and MUST attach the returned tailored file on `tailored-pass`, the base on
    `skipped-strong`, and follow the skill's user decision on `tailored-best-effort` /
    `declined`.
  - REQ-004: `record-application` MUST still receive the **base** `resume_used` variant id;
    the tailored file is an attachment only. Tailoring outcome MUST appear in the run summary.
  - REQ-005: Run-mode × review-mode composition MUST be explicit and documented. Under an
    `auto` apply run with `interactive` review mode: a job whose base resume scores `>= 90`
    (`skipped-strong`) MUST proceed fully `auto` with NO pause; a job that requires changes
    MUST pause ONLY for the edit-approval step (approve/reject/edit the proposed changes) and,
    once the tailored resume is settled, MUST resume `auto` behavior for the rest of that
    job's application (fill + the normal `auto` submit gate). An `automatic` review mode MUST
    never pause.
  - REQ-006: The human-in-control-of-consequences invariant MUST be preserved: tailoring never
    submits; the existing submit/defer gates are unchanged; tailoring only affects which
    resume file is attached before those gates run.
  - REQ-007: One failure in tailoring MUST NOT abort the run — a tailoring error for a job
    degrades to attaching the base resume (with a noted reason) and the loop continues.
- **Non-Functional Requirements:**
  - NFR-001: No duplication of tailoring logic in the orchestrators — they only prompt, call
    the worker, and act on its envelope.
  - NFR-002: The apply skills' documented read/write file lists stay accurate (add
    `resume-prefs.json`, `resume/tailored/`).
  - NFR-003: `npm run check` stays green; both edited skills validate.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Automated run with automatic tailoring
- **Actor:** the job seeker running `apply-to-jobs`.
- **Scenario:** run mode `auto`; at the prompt they choose tailor=yes, freedom 7, review
  mode automatic. For each fully-answerable job the resume is tailored unattended within
  bounds and the tailored file is attached before the existing auto-submit gate.
- **Expected Outcome:** applications go out with per-job tailored resumes; the summary shows
  each job's tailoring outcome and score; deferred/unanswerable jobs behave exactly as today.

### Use Case 2: Human run with interactive tailoring
- **Actor:** the job seeker running `apply-to-jobs` in `human` mode (or `interactive-apply`).
- **Scenario:** tailor=yes, freedom 5, review mode interactive. Per job, the user approves
  each edit, then reviews the filled form before submitting themselves.
- **Expected Outcome:** the user controls both the tailoring edits and the final submit;
  learning accumulates in `resume-prefs.json`.

### Use Case 3: Tailoring requested but resume-kit missing
- **Actor:** the job seeker.
- **Scenario:** they ask to tailor but `resume-intelligence` is not installed.
- **Expected Outcome:** the skill shows the `/plugin` install instruction and asks whether to
  install-and-restart or continue the run without tailoring — no silent skip, no crash.

### Use Case 4: Tailoring declines to skip on an already-strong resume
- **Actor:** the job seeker.
- **Scenario:** a job whose base resume already scores `>= 90`.
- **Expected Outcome:** `tailor-resume` returns `skipped-strong`; the base resume is
  attached; the summary notes "already a strong match".

## Detailed Design **[REQUIRED]**

`apply-to-jobs`: add a new sub-step after Step 2 (run mode) — "Step 2b: tailoring choice" —
that asks the three questions and, if tailoring is on, runs the resume-kit gate. In Step 4a
(resolve materials), after the rotation resolver returns the variant ids, call
`tailor-resume` and hold the returned attachment + outcome; use the attachment in 4c/4x where
the resume is attached; keep passing the base `resume_used` to `record-application` in 4f.
Extend the Step 5 summary to include the tailoring outcome column. Define the run-mode ×
review-mode composition in the principles/steps: under `auto` + `interactive`, the submit
gate stays `auto`; the ONLY thing that can pause is the edit-approval step, and only when
`tailor-resume` actually proposes changes (never on `skipped-strong`). After edits are
settled the job continues on the `auto` path. Concretely, the Step 4a `tailor-resume` call is
passed the interactive review mode so any pause happens inside the worker during edit
approval; the orchestrator's own submit/defer logic remains governed by the `auto` run mode.

`interactive-apply`: add the same per-run tailoring prompt in Step 1/2, gate on resume-kit
when requested, and in Step 4b (resolve materials) call `tailor-resume`; because this skill
is inherently collaborative, interactive/review-after modes compose directly with the co-fill
loop. Attach the tailored file in 4c; record base `resume_used` in 4e.

Update `references/data-contract.md` cross-links are already handled by I-0012; here update
the two skills' "Files this skill reads and writes" sections and the human-facing docs
(`README.md`, `AGENTS.md`) to mention tailoring, `resume-prefs.json`, and `resume/tailored/`.
Bump the plugin version and run `npm run check`.

## Alternatives Considered **[REQUIRED]**

- **Persist tailoring prefs in `config.json` with a per-run override (like
  `automation_default`).** Considered; the user chose "ask every run" for tailoring, so no
  config fields are added. (If this proves annoying, a later initiative can add defaults.)
- **Make tailoring a separate user-invoked step before applying.** Rejected — the request is
  for tailoring *as part of* the apply flow, per job, using each job's description; a separate
  pre-step loses the per-job targeting and doubles the user's work.
- **Treat the tailored resume as the recorded `resume_used`.** Rejected — breaks rotation
  accounting and the variant-id contract; tailored files are attachments, base id is recorded.
- **Silently downgrade to base when resume-kit is missing.** Rejected — the approved gate
  requires surfacing the install hand-off; the user decides install-or-continue.

## Implementation Plan **[REQUIRED]**

Human-in-the-loop: task decomposition pending Daniel's approval. Planned decomposition:

1. **Wire tailoring into `apply-to-jobs`** (Step 2b prompt + resume-kit gate, Step 4a call,
   attachment use in 4c/4x, base-id recording in 4f, Step 5 summary, run-mode × review-mode
   composition). *Recommended Agent: opus + medium* — integration across a consequential
   orchestrator; must preserve human-in-control and defensive-loop invariants.
2. **Wire tailoring into `interactive-apply`** (per-run prompt, gate, Step 4b call,
   attachment in 4c, base-id in 4e). *Recommended Agent: opus + medium* — parallel integration
   in the collaborative orchestrator.
3. **Docs, file-list updates, version bump, `npm run check`** (`README.md`, `AGENTS.md`,
   both skills' read/write sections, manifest version). *Recommended Agent: sonnet + medium*
   — mechanical, follows the wiring.

`blocked_by`: JOBHUN-I-0013 (the `tailor-resume` worker). Transitively depends on I-0011 and
I-0012.