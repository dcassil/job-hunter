# Question Log — "ask once, reuse forever"

This reference defines how skills read and append to `profile.json` when an
application form asks a question. It implements the **ask once, reuse forever**
principle: a question already answered anywhere in the profile is never asked again,
and a genuinely new question is logged so a future run can reuse its answer.

It governs **every** application surface identically — LinkedIn Easy Apply and any
custom / non-Easy-Apply (ATS or company-site) form driven via
[`custom-application.md`](./custom-application.md). Custom forms use this same lookup,
append, and answer mechanism; they do NOT invent a separate store. In an unattended
batch a field with no answer here is an unknown that becomes a handoff; in an
interactive run the skill may ask the user and record the answer here on the spot.

All reads and writes conform EXACTLY to
[`data-contract.md`](./data-contract.md) and
[`../schemas/profile.schema.json`](../schemas/profile.schema.json). Where this
document and the schema appear to disagree, the schema wins. Every write MUST leave
`profile.json` valid against its schema (top-level `additionalProperties: false`;
`logged_questions` items forbid additional properties and require `question` +
`answered`).

## Locating profile.json

Resolve the working folder via `config.json` exactly as every skill does (see the
[discovery contract](./data-contract.md#discovery-contract)); `profile.json` lives at
`<working_dir>/profile.json`. If the working folder is not discoverable, gate and
stop — do not create partial state.

## Normalizing the reuse key

Normalize the raw question text into a reuse key before any comparison:

1. **Trim** leading/trailing whitespace.
2. **Collapse** every internal run of whitespace to a single space.
3. **Lowercase** the whole string.

Use this normalized form ONLY for matching. Store the **original** question text
(as presented on the form, at most lightly trimmed) in the `question` field so the
log stays human-readable — normalization is a comparison detail, not stored state.

## Pre-answer gates

Before resolving ANY field through the lookup order below, apply these two gates **to
that field first**. They take priority over the lookup and over any stored answer: if a
gate trips, do NOT fill the field — log it for the user instead. Both gates are
**conservative** — when you are unsure, log it for the user; never guess to get past them.
They apply on every apply surface (LinkedIn Easy Apply and custom / ATS forms alike).

### Gate 1 — Trap gate (AI / bot detection)

Think: **does this field look like it could be an AI / bot-detection trap?** Signals:

- an input hidden from a human (CSS `display:none` / `visibility:hidden`, off-screen or
  zero-size, `aria-hidden`, a classic honeypot such as a stray `website2` / `url2` /
  `homepage` field a real user never sees);
- a label/placeholder that says to leave it blank, or that only a bot would complete;
- an explicit "are you an AI / automated tool / bot?" or "confirm you are human" question;
- anything that otherwise seems designed to trip automation.

If it **maybe** is a trap, do NOT fill it and do NOT try to "pass" the check. Log it for
the user to review — in an unattended batch this is a handoff whose `needs` includes
`bot-check` (see [data-contract handoff](data-contract.md#handoff-object)); in an
interactive run, point it out and let the user handle it. Never attempt to solve or defeat
bot detection.

### Gate 2 — Free-response gate (prose)

Think: **does answering this field require prose beyond a known static answer or roughly
1–4 words?** If yes — an essay, "why this company/role?", "describe a time you…", an open
cover-letter box, or any multi-sentence free-text — do NOT auto-answer. Log it for the
user to provide: batch → a handoff whose `needs` includes `question`; interactive → ask the
user, who writes it in their own voice (offer a draft only if they ask). A short factual
field whose answer is known and brief (e.g. "Years of React?" → `8`) passes this gate and
is filled normally.

Only fields that pass BOTH gates proceed to the lookup order.

## Lookup order

Given a normalized key, resolve an answer in this order and stop at the first hit:

1. **Structured demographics/contact.** Many common questions map directly to
   `profile.demographics` or `profile.contact` rather than to a logged question.
   If the question is a known demographic/contact field, read the value from there:
   - `demographics`: `gender`, `ethnicity`, `veteran`, `disability`,
     `work_authorized` (boolean), `needs_sponsorship` (boolean). These are always
     present (all required by the schema), so a mapped question is always answered
     from here — never log a demographic/contact question into `logged_questions`.
   - `contact`: open object (e.g. `full_name`, `email`) reused on forms. If the
     question maps to a present contact field, use it.
2. **Logged questions.** Scan `profile.logged_questions`. Normalize each stored
   item's `question` with the same rules and compare to the key. On a match:
   - If `answered` is `true` and `answer` is non-null → **reuse** that answer.
   - If `answered` is `false` (answer still `null`) → the question is known but
     unanswered; do NOT append a duplicate. Surface it as needing an answer.
3. **No match anywhere** → the question is genuinely new; append it (below).

## Appending a new question

When the question matches nothing in demographics, contact, or `logged_questions`,
append one item to `profile.logged_questions`:

```json
{
  "question": "Desired salary?",
  "answer": null,
  "source_job": "indeed-1024",
  "answered": false
}
```

- `question` — the original (lightly trimmed) question text.
- `answer` — `null` (not yet answered).
- `source_job` — the `id` of the job whose form first surfaced this question, or
  `null` if unknown.
- `answered` — `false`.

Do not append the same normalized question twice; if it already exists (answered or
not), leave the log as-is.

## Recording an obtained answer

When an answer is later obtained for a logged question (e.g. the user provides it),
update the existing matching item in place — never add a second row:

- Set `answer` to the provided answer string.
- Set `answered` to `true`.
- Leave `question` and `source_job` unchanged.

Only these two fields change; the item still forbids additional properties.

## Writing profile.json

Write the whole `profile.json` object back, preserving `demographics`, `contact`,
and all other `logged_questions` entries untouched. The result MUST validate against
[`../schemas/profile.schema.json`](../schemas/profile.schema.json): no properties
beyond `demographics`, `contact`, `logged_questions` at the top level; `demographics`
complete with its six required fields; every `logged_questions` item carrying at
least `question` and `answered` and nothing outside the allowed four fields.

## Files this reference governs

- **Reads:** `<working_dir>/config.json` (discovery), `<working_dir>/profile.json`
  (demographics, contact, logged_questions), and this schema
  [`../schemas/profile.schema.json`](../schemas/profile.schema.json).
- **Writes:** `<working_dir>/profile.json` only — append a new logged question, or
  update an existing one's `answer`/`answered`. Never touches `jobs.json`,
  `jobs.md`, or `config.json`.
