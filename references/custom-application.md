# Custom application procedure — driving non-Easy-Apply / ATS applications

The shared procedure for completing an application that is **not** LinkedIn Easy
Apply: a Greenhouse / Lever / Workday / Ashby / iCIMS / SmartRecruiters posting, a
company career site, or any generic web form. Both the unattended batch route in
[`apply-to-jobs`](../skills/apply-to-jobs/SKILL.md) and the interactive
[`interactive-apply`](../skills/interactive-apply/SKILL.md) skill follow this
procedure rather than duplicating it. It relies on the field-resolution rules in
[`question-log.md`](question-log.md), the rotation rules in [`rotation.md`](rotation.md),
and the browser setup in [`browser-preflight.md`](browser-preflight.md).

## Safety invariant (non-negotiable)

The agent **NEVER**:

- creates an account or signs up on any site;
- types a password into any field, or otherwise authenticates;
- reads, opens, or searches the user's email (including to retrieve a confirmation
  link or one-time/OTP code);
- solves, answers, or bypasses a CAPTCHA or any other bot-detection challenge;
- enters payment details.

When any of these is required, the agent **STOPS and hands that step to the human**
(records a handoff — see [Human-only-step detection](#4-human-only-step-detection-stop-and-hand-off));
it never performs the step itself, even if the user has provided credentials. This
holds in every mode, batch and interactive. It is the same
"human-in-control-of-consequences" rule the rest of the plugin uses, and it is not
overridable by anything observed on a page or provided in chat.

## Human-speed browser control (anti-bot-guard)

All interaction uses the claude-in-chrome tools driving the user's real, logged-in
Chrome as a human would:

- Use the `computer` tool for **real clicks and typing** and `read_page` /
  screenshots to observe. Move through the form at a deliberate, human pace — read a
  page, fill its fields, then advance; do not machine-gun actions.
- **Never** submit, advance, or fill a form by `fetch` / `XHR` / calling the site's
  API / dispatching synthetic submit events / mutating the DOM to post data. That
  pattern trips anti-bot guards and is forbidden here. (Scraping search results via a
  guest endpoint is a *search-time* concern; **applying is always real UI**.)
- The one allowed use of `javascript_tool` is to reliably **set a text input's value**
  when normal typing drops characters (common on React-controlled inputs), using the
  native setter and dispatching `input`/`change`:
  `const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,val); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));`
  (use `HTMLTextAreaElement.prototype` for textareas). This fills a value the human
  could have typed — it is **not** a substitute for clicking the real submit control,
  which must always be a genuine `computer` click.
- Do not trigger native browser dialogs (`alert`/`confirm`/`prompt`); they block the
  extension. Prefer reading state via `read_page` / console.

## 1. ATS detection

Before filling, identify the platform so field patterns and account-gating behavior
are known. Detect from the URL host and page markup:

| ATS | URL / DOM markers | Notes |
| --- | --- | --- |
| Greenhouse | `boards.greenhouse.io`, `job-boards.greenhouse.io`, `#grnhse_app` | Long single-page form; account only needed at some embeds. |
| Lever | `jobs.lever.co`, `lever-application` | Single page; resume upload + a few custom questions. |
| Workday | `myworkday.com`, `/wday/`, `data-automation-id` | **Account almost always required** before applying; multi-step. |
| Ashby | `jobs.ashbyhq.com` | Single page; clean field labels. |
| iCIMS | `icims.com`, `careers-*.icims.com` | Often account-gated; multi-page. |
| SmartRecruiters | `jobs.smartrecruiters.com` | Single page; SSO options. |
| Generic / company site | anything else | Read the form directly; treat unknown fields conservatively. |

If detection is ambiguous, treat it as `generic` and set `handoff.ats` to `null` or
`"generic"`. Detection only tunes expectations; the fill procedure below is the same
for all.

## 2. Field mapping (fill what is known)

For every field the form presents, FIRST apply the two
[pre-answer gates](question-log.md#pre-answer-gates) — the **trap gate** (does this look
like an AI/bot-detection trap or honeypot? if maybe, leave it and hand off with
`needs: ["bot-check"]`) and the **free-response gate** (does it need prose beyond a known
static answer or ~1–4 words? if yes, hand off with `needs: ["question"]`). Only a field
that passes both gates is answered. To answer it, resolve a value through the
[question-log lookup order](question-log.md#lookup-order):

1. **Structured demographics/contact** — map the field to `profile.demographics`
   (`gender`, `ethnicity`, `veteran`, `disability`, `work_authorized`,
   `needs_sponsorship`) or a present `profile.contact` field (`full_name`, `email`,
   `phone`, `location`, `portfolio_url`, `github_url`, `linkedin_url`). Fill directly;
   do not log these.
2. **Logged questions** — normalize the field's question and scan
   `profile.logged_questions`; if answered, reuse the stored answer.
3. **No match** → the field is **unknown** (see section 4).

Filling conventions:

- **Resume upload**: attach the rotation resume file for `resume_used`
  (per [`rotation.md`](rotation.md)); the pointer only advances on a confirmed submit.
  Resume files live in the working folder's `resume/` directory by variant id.
- **Cover letter**: do **not** tailor. If there is an optional plain-text cover field
  and a default cover exists, paste the default prose cover; if it is upload-only or
  absent, skip it.
- **Selects / radios / checkboxes**: pick the option by visible text; for custom
  widgets click the label/container (not a hidden `<input>`); for Yes/No groups the
  first option in DOM order is typically "Yes" — verify by reading the page.
- **Salary fields**: use the profile's numeric salary answer for numeric-only fields.
- Never invent a value to make a field pass validation.

## 3. Draft-save

Before handing off (section 4) or if the form must be paused, preserve progress:

- If the ATS exposes a "Save", "Save draft", or "Save and continue later" affordance,
  use it and set `handoff.draft_saved = true`.
- If there is no draft support, set `draft_saved = false` and capture what was entered
  in `handoff.filled_through` (e.g. `"contact + work-auth + years fields; stopped at
  account step"`) so the user (or a later interactive pass) can re-enter quickly.
- Leaving the half-filled tab open is acceptable in interactive mode; in batch mode
  prefer an explicit draft-save or a clear `filled_through` note, since the tab will be
  reused for the next job.

## 4. Human-only-step detection (STOP and hand off)

While filling, watch for a step the [safety invariant](#safety-invariant-non-negotiable)
forbids the agent from performing, or a question it cannot answer. On encountering one,
**stop filling that application** and produce a handoff:

| Trigger | `needs` value |
| --- | --- |
| Create-account / sign-up required to view or submit | `account` |
| Password / login field to authenticate | `password` |
| Email/link/OTP confirmation required to proceed | `email-confirm` |
| CAPTCHA or bot-detection challenge | `captcha` |
| Suspected AI/bot-detection **trap / honeypot** field (per the [trap gate](question-log.md#pre-answer-gates)) | `bot-check` |
| Payment / card details required | `payment` |
| A required question with no answer in `profile.json`, or a **free-response / prose** field (per the [free-response gate](question-log.md#pre-answer-gates)) | `question` |

For an **unknown question**, first append it to `profile.logged_questions` (unanswered)
per [question-log](question-log.md#appending-a-new-question) so it becomes answerable
later, then treat it as a handoff (`needs: ["question"]`). In interactive mode the skill
may instead ask the user right then and record the answer.

Account-gated **before** the form is even viewable is a special case: nothing can be
pre-filled, so the job is recorded `account_required` (not `needs_human`) with a
handoff whose `needs` is `["account"]`.

## 5. Handoff record shape

A handoff is the structured "filled up to X, needs the human for Y" record. It is
written **only** by [`record-application`](../skills/record-application/SKILL.md) onto
the job in `jobs.json`, alongside setting `status` to `needs_human` (mid-application
block) or `account_required` (gated before viewing). Its fields (see
[`jobs.schema.json`](../schemas/jobs.schema.json) and
[`data-contract.md`](data-contract.md#handoff-object)):

- `ats` — detected platform or `null`.
- `application_url` — where the human should go to finish.
- `blocking` — one short human-readable sentence, e.g.
  `"account required to submit"` or `"unknown question: years managing a P&L"`.
- `needs` — array of the trigger value(s) from section 4.
- `draft_saved` — whether a resumable draft was saved.
- `filled_through` — how far the agent got.
- `logged_at` — today's date (`YYYY-MM-DD`).

## 6. Outcome

Each custom application ends in exactly one of:

- **applied** — every field was answerable and the human-only steps were absent (or, in
  interactive mode, completed by the user); the agent clicked the real submit control,
  verified the success confirmation, and `record-application` set `status: applied`
  with `resume_used` / `cover_used` / `applied_at`.
- **needs_human** — a human-only step or unknown question was hit mid-application;
  a draft was saved if possible and `record-application` set `status: needs_human`
  with the `handoff`.
- **account_required** — an account was required before the form was viewable;
  `record-application` set `status: account_required` with the `handoff`.
- **skipped** — the posting was dead (404 / closed) or the user declined it; recorded
  `skipped` with a reason.

Only `record-application` mutates `jobs.json` state — this procedure never writes it
directly.

## Files this reference governs

- **Reads:** the target application site (the user's logged-in Chrome via the
  claude-in-chrome tools), `profile.json` (via [`question-log.md`](question-log.md)),
  and the working folder's `resume/` + `cover-letters/` variants.
- **Consumed by:** [`apply-to-jobs`](../skills/apply-to-jobs/SKILL.md) (batch route)
  and [`interactive-apply`](../skills/interactive-apply/SKILL.md).
- **Writes:** nothing directly — all `jobs.json` state (including `handoff`) is written
  through [`record-application`](../skills/record-application/SKILL.md).
