# Edit classifier

This reference defines how the [`tailor-resume`](../SKILL.md) worker turns the
output of `align-resume` into a list of **typed, individually reviewable edits**,
how each edit is presented under each review mode, and how a review decision maps
to a learning tally in `resume-prefs.json`.

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

The classifier takes two things:

- the **base** resume — the structured resume for the chosen variant (from
  `extract-resume`, or the base as resolved in the pipeline), and
- the **aligned** resume — `align-resume`'s `aligned_resume` for this job,
  produced under evidence constraints.

`align-resume` is a single opaque rewrite; the worker never trusts it as the final
answer. The classifier exists precisely so the diff can be bounded by freedom,
learned preferences, and truth — none of which a single rewrite provides.

## Diffing aligned vs. base

Compare the aligned resume against the base **section by section** — summary,
skills list, and each employment/project entry with its bullets — and emit one
**change** per discrete difference. A change records: the location (section /
entry / bullet), the before text, the after text, and the assigned edit-type.

## Assigning an edit-type

Assign each change exactly one edit-type from the schema's closed set, by the
nature of the difference:

| Observed difference | Edit-type |
| --- | --- |
| A skill added to the skills list | `skill_add` |
| Wording changed to the job's terminology, same underlying claim | `term_swap` |
| An existing bullet's text rewritten | `bullet_rewrite` |
| A new bullet added to an existing entry | `bullet_add` |
| A whole role/project entry rewritten | `entry_rewrite` |
| The resume summary/objective rewritten | `summary_rewrite` |
| Ordering changed with no substantive content change (skills, bullets, or sections) | `reorder` |

Guidance for edge cases:

- If a change is ambiguous between two types, assign the **higher** ladder type
  (the more consequential one), so the freedom ceiling treats it conservatively.
- A change that both rewrites wording *and* changes the claim is not a
  `term_swap`; classify by the larger effect (`bullet_rewrite` /
  `entry_rewrite`) so it faces the correct ceiling and the truth check.
- A change that adds or alters a whole employment/project **entry's existence** is
  not classifiable as any permitted edit — new employment entries are forbidden at
  every level (see the invariants in
  [`degree-of-freedom.md`](./degree-of-freedom.md#invariants-at-every-level)) —
  and is dropped.

After classification the pipeline drops every change above the freedom ceiling and
every change violating an invariant, then runs the survivors through
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
  Ordering the aligner with `human_in_loop` is appropriate for this mode per
  resume-kit's own option surface.
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
