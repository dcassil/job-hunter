# Edit classifier

This reference defines how the [`tailor-resume`](../SKILL.md) worker handles the
**typed, individually reviewable edits** produced by the no-LLM content path, how
each edit is presented under each review mode, and how a review decision maps to a
learning tally in `resume-prefs.json`.

The edit-types are exactly the closed set in
[`../../../schemas/resume-prefs.schema.json`](../../../schemas/resume-prefs.schema.json)
(`edit_prefs` keys); their meanings are pinned in
[`../../../references/data-contract.md`](../../../references/data-contract.md#resume-prefsjson).
Resume-kit capability names come from
[`../../../references/resume-kit.md`](../../../references/resume-kit.md). The
freedom ceiling that filters the classified list is defined in
[`degree-of-freedom.md`](./degree-of-freedom.md). None of those are restated here;
where this document and the schema disagree, the schema wins.

## Input to the classifier

The classifier takes a set of **already-typed candidate edits** emitted by the
no-LLM content path (see
[`tailoring-pipeline.md`](./tailoring-pipeline.md)):

- from `inject-keywords` (Step 8a): `skill_add` edits (a confirmed skill added to
  the skills list) and `bullet_add` edits (a genuinely-held keyword woven into an
  existing bullet), each produced under the Step 7 evidence constraints, and
- from `update-terminology` / `resume_suggest_terminology` (Step 8b): `term_swap`
  edits (mirror the employer's exact wording for an alias the resume already
  satisfies).

Each edit already records its location (section / entry / bullet), its before
text, its after text, and its edit-type — the tools emit discrete edits, so there
is **no opaque rewrite to diff**. The classifier's job is to bound those edits by
freedom, learned preferences, and truth before any of them ship.

## The edit-type set

Every edit carries exactly one edit-type from the schema's closed set. The no-LLM
path generates only this subset:

| Edit produced by the no-LLM path | Edit-type |
| --- | --- |
| A skill added to the skills list (`inject-keywords`) | `skill_add` |
| A new bullet weaving in a genuinely-held keyword (`inject-keywords`) | `bullet_add` |
| Wording changed to the job's terminology, same underlying claim (`update-terminology`) | `term_swap` |

The remaining schema/ladder edit-types — `bullet_rewrite`, `entry_rewrite`,
`summary_rewrite`, and free-form `reorder` — required the LLM `align-resume`
rewrite that is disabled in resume-kit v0.3.0, so **they are not produced by the
current pipeline**. The schema and the freedom ladder deliberately keep them for
forward-compatibility (a future LLM-rewrite initiative would re-enable them); until
then no step emits them, and any stray edit that would map to one is dropped.

Validation notes that still apply:

- A `term_swap` that both rewrites wording *and* changes the underlying claim is
  not a truthful mirror — the engine truth-gate (`resume_align_terminology` /
  `validate-resume-truth`) rejects it, and it never ships.
- An edit that would add or alter a whole employment/project **entry's existence**
  is forbidden at every level (see the invariants in
  [`degree-of-freedom.md`](./degree-of-freedom.md#invariants-at-every-level)) and
  is dropped.

After typing, the pipeline drops every edit above the freedom ceiling and every
edit violating an invariant, then runs the survivors through
`validate-resume-truth` (see
[`tailoring-pipeline.md`](./tailoring-pipeline.md)).

## Presenting a change in each review mode

The `review_mode` the caller passes governs how surviving, truth-passing changes
are surfaced. A change is presented as: its edit-type, its location, and a
before → after diff.

- **interactive** — present changes **one at a time**, in learned-preference
  order (below). For each, ask the user to **accept** / **accept-with-edits** /
  **reject**. `accept-with-edits` lets the user modify the after-text before it is
  applied; the modified text is what ships (and is itself re-validated for truth).
  For `term_swap` edits this per-suggestion accept/skip mirrors
  `update-terminology`'s own review loop, but the worker drives it here so the swap
  stays bound by the freedom ceiling, learned `edit_prefs`, and the truth gate.
- **review-after** — apply the permitted, truth-passing, high-acceptance changes
  first (see learning below), then present a **single final diff pass** of
  everything applied so the user can accept the batch or send specific changes
  back. Only surface this pass when there is at least one applied change.
- **automatic** — no per-change interaction. Apply the permitted, truth-passing
  changes the learned tallies mark as high-acceptance; **defer** (do not ship,
  report only) the permitted types the tallies mark as poor-acceptance, even
  though they are within the freedom ceiling.

**No edits ⇒ no pause.** In every mode, if there are no permitted, truth-passing
changes to present (including the `skipped-strong` case where tailoring was
skipped at score ≥ 90), the worker surfaces **no** pause and returns. This is the
guarantee that lets a caller compose an interactive review under an automatic apply
run without interrupting jobs that need no changes (see
[`tailoring-pipeline.md`](./tailoring-pipeline.md#review-modes) and REQ-010).

## Learned-preference ordering and auto-apply/defer

Each edit-type has a tally in `resume-prefs.json.edit_prefs` with `accepted`,
`accepted_with_edits`, and `rejected` counters (schema-defined). The worker uses
these tallies to:

- **Order** proposals in interactive and review-after modes — types with a higher
  acceptance rate are presented first.
- **Auto-apply vs. defer** in review-after and automatic modes — a permitted type
  with a strong acceptance history auto-applies; a permitted type with a poor
  acceptance history is deferred (reported, not shipped) even within the freedom
  ceiling. A type with no history is treated neutrally (presented/applied per the
  mode's default), never inflated.

Tallies inform ordering and auto-apply/defer only; they never widen the freedom
ceiling and never override the truth check or the invariants.

## Mapping a decision to a tally update

On each reviewed change, increment **exactly one** counter on the tally for that
change's edit-type, per
[`data-contract.md`](../../../references/data-contract.md#resume-prefsjson):

- user accepts the proposed edit as-is → increment `accepted`;
- user accepts after modifying the edit → increment `accepted_with_edits`;
- user rejects the proposed edit → increment `rejected`.

In **automatic** mode there is no user decision: an auto-applied change is not a
user acceptance and does **not** increment a tally, and a deferred change is not a
rejection and does **not** increment a tally. Tallies record human decisions only,
so the learning signal stays a true record of user preference. (A deferred change
is reported in the envelope so a later human pass can decide on it.)

Every tally write MUST leave `resume-prefs.json` valid against
[`../../../schemas/resume-prefs.schema.json`](../../../schemas/resume-prefs.schema.json):
counters are integers ≥ 0 and the `edit_prefs` object carries only the schema's
allowed keys.
