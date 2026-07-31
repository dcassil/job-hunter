# Resume / Cover Rotation Resolver

This reference defines how skills choose which resume variant and which matching
cover-letter variant to use for a given job application. It is a pure resolver
consumed by `apply-to-jobs` (which then passes the chosen ids to
[`../skills/record-application/SKILL.md`](../skills/record-application/SKILL.md) as
`resume_used` / `cover_used`).

All inputs and outputs conform EXACTLY to
[`data-contract.md`](./data-contract.md) and
[`../schemas/config.schema.json`](../schemas/config.schema.json). Where this
document and a schema appear to disagree, the schema wins.

## Inputs

- `config.resume_strategy` — one of `single`, `round-robin`, `domain`, `both`
  (required; see the [config contract](./data-contract.md#configjson)).
- **Available variant ids** — the resume variant ids present in the working folder's
  `resume/` directory, expressed as ids per
  [variant naming](./data-contract.md#variant-naming) (`resume-<label>`). The caller
  supplies this list (e.g. discovered by listing `resume/`), in a stable, sorted
  order so the round-robin index is deterministic across runs.
- `config.resume_domains` — optional map of variant id → array of domain strings the
  variant targets (e.g. `{ "resume-a": ["fintech"], "resume-b": ["healthcare"] }`).
- `config.round_robin_pointer` — optional integer (≥ 0), the index of the **next**
  variant to use in round-robin rotation. Absent means treat as `0`.
- **The job** — its `title`, `company`, and any inferable domain signal (from
  `title`/`company`/`notes` and `job-focus.md` context) used for domain matching.

## Output

A pair of ids:

```json
{ "resume_used": "resume-b", "cover_used": "cover-b" }
```

- `resume_used` is the chosen resume variant id.
- `cover_used` is its paired cover variant, derived by the pairing rule below.
- Either may be `null` when no variant is available (empty `resume/` directory or
  no cover counterpart exists); the caller passes the `null` through unchanged.

## Cover-letter pairing rule

Cover letters are paired to resumes by shared label per
[variant naming](./data-contract.md#variant-naming): the cover for `resume-<label>`
is `cover-<label>`. Once the resume variant is chosen, derive the cover id by
replacing the `resume-` prefix with `cover-` (e.g. `resume-b` → `cover-b`). If no
cover file exists for that label in `cover-letters/`, set `cover_used` to `null`;
never substitute a cover from a different label.

## Strategy resolution

### `single`

There is exactly one resume variant. Return that variant id (and its paired cover).
If the available list somehow has more than one, use the first in the stable sorted
order. The pointer is neither read nor advanced.

### `round-robin`

Rotate evenly across all available variants.

1. Let `n` be the number of available variant ids (stable sorted order). If `n == 0`,
   return `{ "resume_used": null, "cover_used": null }`.
2. Read `config.round_robin_pointer` (absent → `0`). Normalize the index as
   `i = pointer mod n` so an out-of-range pointer wraps safely.
3. The chosen resume is the variant at index `i`.
4. **Advance and persist:** compute `next = (i + 1) mod n`, set
   `config.round_robin_pointer = next`, and write `config.json` back so the next run
   continues the rotation. See [Pointer persistence](#pointer-persistence).

### `domain`

Pick the best domain match from `config.resume_domains`.

1. Determine the job's domain signal from its `title`/`company`/`notes`.
2. For each variant id in `resume_domains`, check whether any of its listed domain
   strings matches the job's signal (case-insensitive substring/keyword match).
   Choose the variant with the strongest match (most specific / most terms matched);
   break ties by the stable sorted order of variant ids.
3. If **no** variant's domains match the job, fall back to the first available
   variant in stable sorted order (a deterministic default), so an application is
   never blocked for lack of a domain hit.
4. The pointer is neither read nor advanced under `domain`.

### `both`

Domain match first, else round-robin.

1. Run the `domain` match (steps 1–2 above). If a variant's domains match the job,
   use it. The pointer is **not** advanced in this case.
2. If no domain matches, fall back to the `round-robin` procedure: choose the
   variant at the normalized pointer, then advance and persist the pointer per
   [Pointer persistence](#pointer-persistence). This makes the pointer track only
   the applications that actually consumed a round-robin slot.

## Pointer persistence

There is a single persist point for `round_robin_pointer` to prevent desync:

- The pointer is advanced and written **only** when a round-robin slot is actually
  consumed — i.e. by the `round-robin` strategy on every resolve, and by the `both`
  strategy only when it falls through to round-robin. It is never advanced by
  `single`, `domain`, or by `both` when a domain match wins.
- Persist by updating the `round_robin_pointer` field in `config.json` and writing
  the file back so it still validates against
  [`../schemas/config.schema.json`](../schemas/config.schema.json) (integer ≥ 0,
  all other fields untouched). This is the ONLY field this resolver may write; it
  changes nothing else in `config.json`.
- Advance exactly once per consumed slot, immediately after selecting the variant
  and before returning, so a crash after return cannot double-advance or skip.
