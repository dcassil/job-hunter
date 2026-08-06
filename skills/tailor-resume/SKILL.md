---
name: tailor-resume
description: A non-interactive-by-default worker skill invoked by the apply orchestrators one job at a time to tailor a resume variant to a specific posting. It is NEVER run directly by the user. Given { working_dir, resume_variant_id, job, freedom, review_mode } it runs the resume-kit pipeline under a strict degree-of-freedom ceiling, truthful evidence constraints, and the caller's review mode, then returns an envelope telling the caller to use the base as-is (skipped-strong / declined) or to use a tailored resume file (tailored-pass / tailored-best-effort). It never opens a browser, never submits, and never writes jobs.json; it writes only resume-prefs.json and resume/tailored/ files, and invokes update-resumes only on a confirmed structural replace of a base variant.
---

# tailor-resume

The resume-tailoring **worker**. The apply orchestrators
([`apply-to-jobs`](../apply-to-jobs/SKILL.md),
[`interactive-apply`](../interactive-apply/SKILL.md)) invoke it once per job to
turn a rotation-selected base resume into either "already strong — use the base
as-is" or a per-job tailored resume file, plus the record of what changed and the
updated learning state. It is a worker, not an orchestrator: it does not open a
browser, does not fill or submit forms, and never writes `jobs.json` / `jobs.md`.
The caller owns discovery of which job to tailor and the apply run itself; this
skill owns the one `{ resume variant, job }` transformation.

The mechanics live in the references — read them; this document orchestrates and
cites:

- pipeline order, score gates, structural fix, skills-vetting, best-effort
  fallback, degrade rules →
  [`references/tailoring-pipeline.md`](./references/tailoring-pipeline.md);
- the freedom → permitted-edit-type ladder and the every-level invariants →
  [`references/degree-of-freedom.md`](./references/degree-of-freedom.md);
- handling the typed edits emitted by the no-LLM content path (`inject-keywords`,
  `update-terminology`), presenting per review mode, and the tally updates →
  [`references/edit-classifier.md`](./references/edit-classifier.md).

Resume-kit capability/tool names come from
[`../../references/resume-kit.md`](../../references/resume-kit.md); the edit-type
enum and learning-state shape come from
[`../../schemas/resume-prefs.schema.json`](../../schemas/resume-prefs.schema.json)
(explained in
[`../../references/data-contract.md`](../../references/data-contract.md#resume-prefsjson)).
This document does not restate tool names, the enum, or the ladder. Where this
document and a schema disagree, the schema wins.

## Principles (non-negotiable)

- **Never fabricate.** No edit invents experience, employers, dates, titles,
  metrics, or claims. The freedom number governs how much of the *true* resume may
  be reshaped, never whether something untrue may be added.
- **Never claim an unconfirmed skill.** A skill is injected only if it is in
  `resume-prefs.json.skills`. An implied-but-unknown skill is vetted with the user
  first; a disclaimed skill is never injected and never re-asked.
- **Everything shipped passes `validate-resume-truth`.** Every surviving edit is
  validated against evidence built from the master resume plus confirmed skills;
  unsupported or contradicted edits are dropped, regardless of freedom or learned
  acceptance.
- **Freedom is enforced by typing each candidate edit, no matter its source.**
  Edits from `inject-keywords` / `update-terminology` above the caller's freedom
  ceiling are dropped before any apply or review.
- **Human-in-control.** The user's `review_mode` strictly bounds interaction, and a
  sub-target ("best-effort") tailoring is never silently shipped — the user is
  asked, or automatic mode falls back to base.
- **No edits ⇒ no pause.** Interactive / review-after surface a pause ONLY when
  there is at least one permitted, truth-passing edit to present; `skipped-strong`
  and an empty post-gating edit set return with no interaction. The worker's review
  mode is independent of the caller's apply run mode; the worker never submits and
  never consults the run mode.
- **Single-writer boundaries.** The worker writes only `resume-prefs.json` and
  `resume/tailored/` files, and invokes `update-resumes` only on a confirmed
  structural replace of a base variant. It NEVER writes `jobs.json` / `jobs.md`
  (only `record-application` does) and never writes `config.json`.
- **Defensive, never fabricating to recover.** A resume-kit error degrades to a
  clear message and a safe fallback (use the base as-is); a failed terminology or
  index-growth step is skipped with a noted reason. The content path is fully
  no-LLM, so there is no provider-configuration failure mode. Never a guessed or
  partial resume.
- **Gate before acting.** Confirm the resume-kit dependency and a valid working
  folder before doing any tailoring work.

## Call contract

Invoked by the apply orchestrator with:

```json
{
  "working_dir": "/abs/path/to/working-folder",
  "resume_variant_id": "resume-a",
  "job": { "id": "linkedin-3891", "title": "…", "company": "…", "url": "…" },
  "freedom": 5,
  "review_mode": "interactive"
}
```

- `working_dir` — the working folder (discovered by the caller via `config.json`).
- `resume_variant_id` — the base variant the caller's rotation selected; this is
  returned unchanged as `resume_used`.
- `job` — the job object (as in
  [`data-contract.md`](../../references/data-contract.md#jobsjsonjson)); `job.id`
  names the tailored output file.
- `freedom` — 0–10, mapped to permitted edit-types by
  [`degree-of-freedom.md`](./references/degree-of-freedom.md).
- `review_mode` — one of `interactive`, `review-after`, `automatic`.

Returns the envelope:

```json
{
  "outcome": "skipped-strong | tailored-pass | tailored-best-effort | declined",
  "tailored_path": "<working_dir>/resume/tailored/linkedin-3891.pdf",
  "resume_used": "resume-a",
  "original_score": 61,
  "final_score": 84,
  "changes_applied": [
    { "type": "skill_add", "detail": "…" },
    { "type": "term_swap", "detail": "…" }
  ],
  "learning_updated": true
}
```

- `outcome` — `skipped-strong` (base ≥ 90, no tailoring); `tailored-pass`
  (tailored ≥ 80 and > original); `tailored-best-effort` (tailored below the gate,
  user asked or automatic fell back to base); `declined` (freedom 0 / no permitted
  edits / degraded to base as-is).
- `tailored_path` — present only when a tailored file was written and is the one to
  use; absent for `skipped-strong`, `declined`, and best-effort fallback to base.
- `resume_used` — always the base `resume_variant_id` (rotation-consistent for the
  caller), noting it was tailored when `tailored_path` is present.
- `original_score` / `final_score` — the pre- and post-tailor
  `check-resume-job-match` scores (`final_score = original_score` when tailoring
  was skipped).
- `changes_applied` — the typed edits that shipped (empty when none).
- `learning_updated` — whether `resume-prefs.json` was written this run.

The caller uses `outcome` + `tailored_path` to decide which resume to attach and
never re-derives tailoring itself.

## Gate: resume-kit + working folder

Before any tailoring work:

1. **Resume-kit gate (blocking).** Probe the dependency per
   [`resume-kit.md` detection](../../references/resume-kit.md#detection). If absent,
   emit the exact
   [guided-install hand-off](../../references/resume-kit.md#guided-install--stop)
   and stop with no partial state (REQ-002).
2. **Working folder.** Confirm `config.json` at `working_dir` validates against
   [`../../schemas/config.schema.json`](../../schemas/config.schema.json). If not,
   do not guess or create state — report that setup must run first, and stop.

## Procedure

Run the ordered pipeline in
[`tailoring-pipeline.md`](./references/tailoring-pipeline.md). In brief, per job:

1. **Gate** resume-kit + working folder (above).
2. **Resolve** the base variant file for `resume_variant_id` under
   `<working_dir>/resume/`.
3. **Convert once + bootstrap alias index** — convert the base resume to a
   `ResumeDocument` once per job via the agent-driven `resume-to-json` skill
   (subagent; not `resume_extract`) and the job via `job-to-json`, reused across
   this job's calls (REQ-006). Ensure `<working_dir>/resume-kit/config.json`
   (`alias_file` → `learning/synonyms.json`) and the empty-shell
   `learning/synonyms.json` exist (create if absent; shell + pointer only) (REQ-001).
4. **Once-per-variant structural fix** — if
   `resume-prefs.json.variants[<id>].ats_fixed` is not already `true`, run
   `check-ats-structure` (structure-only, no `alias_file`) on the converted
   document; if structural issues exist, produce a fix via `export-resume`, show the
   user, and replace the **base** variant only with explicit confirmation via
   [`update-resumes`](../update-resumes/SKILL.md), then set `ats_fixed` (REQ-003).
5. **Match-gate** — `check-resume-job-match` (with `alias_file`) on the base is
   `original_score`; if `>= 90`, return `skipped-strong` with no tailoring and **no
   interaction** (REQ-004, REQ-010). At `freedom 0`, propose no edits and return
   with the base.
6. **Gaps** — `identify-resume-gaps` (with `alias_file`; base as tailored, master
   as full, job).
7. **Skills vetting** — vet injectable keywords against `skills` /
   `disclaimed_skills`; an unknown implied skill triggers **"Do you have <X>
   experience?"**; yes → append to `skills`, no → append to `disclaimed_skills`
   (never injected, never re-asked) (REQ-005).
8. **Grow the alias index** (interactive / review-after only; **skipped in
   automatic**) — dispatch `manage-synonyms` (subagent) with the candidate
   `(missing keyword, resume term)` pairs + the `resume-kit/config.json` path; on
   user-confirmed appends, re-run match / gaps with `alias_file` so new synonyms
   count this run (REQ-004). `manage-synonyms` is the sole writer of `synonyms.json`.
9. **Evidence** — `build-candidate-evidence` from the master resume + confirmed
   `skills`.
10. **Inject missing-but-true keywords** — dispatch `inject-keywords` (subagent)
    with the injectable gaps + confirmed `skills` + evidence; it emits `skill_add` /
    `bullet_add` candidate edits, never for unknown/disclaimed skills (REQ-009).
11. **Mirror employer wording** — `resume_suggest_terminology` (with `alias_file`)
    yields `term_swap` candidate edits; apply each accepted, surviving one with
    `resume_align_terminology` (engine truth-gated) (REQ-003).
12. **Classify + gate by freedom + order by prefs** — take the already-typed edits
    from the inject and mirror steps
    ([`edit-classifier.md`](./references/edit-classifier.md)), drop everything above
    the freedom ceiling and every invariant violation (REQ-006), then order /
    auto-apply / defer by learned `edit_prefs` and `review_mode` (REQ-009).
13. **Truth check** — `validate-resume-truth`; drop every unsupported/contradicted
    edit (REQ-007). Re-validate any `accept-with-edits` text before it ships.
14. **Rescore** — apply survivors, then `check-resume-job-match` (with `alias_file`)
    on the result for `final_score` (REQ-008).
15. **Rescore gate** — `final_score >= 80` AND `> original_score` ⇒
    `tailored-pass`; else `tailored-best-effort`: **ask** whether to use the
    tailored resume or fall back to base (interactive / review-after), or **fall
    back to base** unattended (automatic). Never silently ship a sub-target resume
    (REQ-008).
16. **Export** — `export-resume` to
    `<working_dir>/resume/tailored/<job-id>.<ext>` (REQ-011). Never touch
    `jobs.json` / `jobs.md`.
17. **Learning + return** — write `edit_prefs` tallies (one counter per human
    decision), any `skills` / `disclaimed_skills` / `ats_fixed` changes, and return
    the envelope.

Review-mode behavior (interactive per-edit, review-after single final pass,
automatic unattended with fallback), the "no edits ⇒ no pause" guarantee, and the
degrade rules (resume-kit error → clear message + safe fallback to base; a failed
terminology / growth step is skipped with a noted reason; never a fabricated
resume) are all specified in the references and MUST be followed exactly (REQ-010,
NFR-002, NFR-003).

## Files this skill reads and writes

- **Reads:** `<working_dir>/config.json` (discovery / working folder),
  `<working_dir>/resume/` (the base variant file for `resume_variant_id`),
  `<working_dir>/resume-prefs.json` (confirmed `skills`, `disclaimed_skills`,
  `variants[...].ats_fixed`, `edit_prefs` tallies),
  `<working_dir>/resume-kit/config.json` + `<working_dir>/resume-kit/learning/synonyms.json`
  (the project alias index, passed as `alias_file`), `<working_dir>/profile.json`
  and `<working_dir>/job-focus.md` (advisory context), the `job` object passed in,
  and the references/schemas above; resume-kit capabilities per
  [`resume-kit.md`](../../references/resume-kit.md).
- **Writes directly:** `<working_dir>/resume-prefs.json` only — `skills` /
  `disclaimed_skills` (from explicit user answers to "do you have X?"),
  `variants[<id>].ats_fixed` (once-per-variant structural fix), and `edit_prefs`
  tallies (one counter per human decision) — always leaving the file valid against
  [`../../schemas/resume-prefs.schema.json`](../../schemas/resume-prefs.schema.json);
  `<working_dir>/resume/tailored/<job-id>.<ext>` via `export-resume`; and — only to
  bootstrap them if absent — the empty-shell
  `<working_dir>/resume-kit/learning/synonyms.json` + `resume-kit/config.json`
  pointer (never its content; `manage-synonyms` is the sole content writer).
- **Writes via workers:** the base variant file, ONLY on a confirmed structural
  replace, exclusively through [`update-resumes`](../update-resumes/SKILL.md).
- **Never writes:** `jobs.json` / `jobs.md` (only `record-application` does) and
  `config.json` (the rotation pointer is the caller's concern).
- **Never performs:** browser interaction, form-filling, or submission — the caller
  owns those.
