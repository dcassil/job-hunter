# Degree-of-freedom ladder

This reference defines the **degree-of-freedom ladder** for the
[`tailor-resume`](../SKILL.md) worker: the mapping from the caller-supplied
`freedom` number (0–10) to the subset of edit-types the worker is permitted to
apply, and the invariants that hold at **every** freedom level.

The edit-types named here are exactly the closed set in
[`../../../schemas/resume-prefs.schema.json`](../../../schemas/resume-prefs.schema.json)
(`edit_prefs` keys) and are described in prose in
[`../../../references/data-contract.md`](../../../references/data-contract.md#resume-prefsjson).
This document does not introduce a new edit-type vocabulary; where it and the
schema appear to disagree, the schema wins. Resume-kit capability names are cited
from [`../../../references/resume-kit.md`](../../../references/resume-kit.md); they
are not restated here.

## What the ladder is for

The freedom number is how far the user has authorized the worker to reshape the
resume for a job. It is **not** enforced by asking a content tool nicely — it is
enforced by typing every candidate edit the no-LLM path produces (from
`inject-keywords` / `update-terminology`; see
[`edit-classifier.md`](./edit-classifier.md)) and **dropping every edit whose type
is above the freedom ceiling** before any apply or review. The
ladder is the ceiling; learned preferences and review mode (see
[`tailoring-pipeline.md`](./tailoring-pipeline.md)) may narrow what is applied
*within* the ceiling, but never widen it.

## The ladder (0–10)

The permitted set is **cumulative**: each band adds its edit-types to every band
below it. A `freedom` of `N` permits every edit-type listed at or below `N`.

| Freedom | Permitted edit-types (cumulative) |
| --- | --- |
| 0 | none (equivalent to "do not tailor") |
| 1–2 | `skill_add` (vetted only), `reorder` (skills) |
| 3–4 | + `term_swap` |
| 5–6 | + `bullet_rewrite`, reorder bullets |
| 7–8 | + `bullet_add`, `summary_rewrite` |
| 9–10 | + `entry_rewrite`, section reordering |

Reading the ladder:

- **0** — no edits are permitted. The worker does not tailor; it resolves to the
  base variant. (The match-gate and once-per-variant structural fix in
  [`tailoring-pipeline.md`](./tailoring-pipeline.md) may still run, but no
  content edits are proposed, applied, or reviewed.)
- **1–2** — only `skill_add` (and only for a skill already vetted into
  `resume-prefs.json.skills`; see the skills-vetting flow in
  [`tailoring-pipeline.md`](./tailoring-pipeline.md#step-6--vet-injectable-keywords))
  and `reorder` limited to the skills list.
- **3–4** — additionally `term_swap`: swap wording to the job's terminology
  without changing the underlying claim.
- **5–6** — additionally `bullet_rewrite` and reordering of bullets within an
  entry.
- **7–8** — additionally `bullet_add` (a new bullet, still evidence-supported)
  and `summary_rewrite`.
- **9–10** — additionally `entry_rewrite` (rewrite a whole role/project entry)
  and section reordering.

`reorder` is the schema edit-type that covers every ordering-only change; the
ladder scopes *what* may be reordered by band (skills at 1–2, bullets at 5–6,
sections at 9–10). An ordering change of a scope not yet unlocked is above the
ceiling and is dropped.

## Invariants at every level

These hold at **every** freedom level, including the highest. They are not relaxed
by a high freedom number and are enforced independently of the ceiling:

- **Never fabricate.** No edit invents experience, employers, dates, titles,
  metrics, or claims. Freedom governs *how much of the true resume may be
  reshaped*, never whether something untrue may be added.
- **Never claim a skill absent from `resume-prefs.json.skills`.** A `skill_add`
  (or any keyword injection implying a skill) is permitted only for a skill the
  user has explicitly confirmed into `skills`. An implied-but-unknown skill is
  vetted first; a disclaimed skill is never injected (see
  [`tailoring-pipeline.md`](./tailoring-pipeline.md#step-6--vet-injectable-keywords)).
- **Always pass `validate-resume-truth`.** Every edit that survives the ceiling is
  validated against the evidence built from the master resume plus confirmed
  skills; any edit the truth check reports as unsupported or contradicted is
  dropped and never shipped — regardless of freedom level or learned acceptance.
- **No new employment entries.** No freedom level authorizes adding a role,
  employer, or project the resume did not already contain. `entry_rewrite` at
  9–10 rewrites an existing entry; it never creates one.

An edit is applied only if it passes **all three** filters in order: within the
freedom ceiling, permitted by the invariants, and truth-passing. Failing any one
drops the edit.
