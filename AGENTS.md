# Agent Rules for the job-hunter repo

Every agent (human or AI) working in this repo MUST follow these rules. They are
non-negotiable guardrails. Violating them fails review.

## Hard rules

1. **Never loosen the guardrails.** Do not edit ESLint rules, the markdownlint config,
   the Prettier config, the JSON schemas, or the validator scripts to make your change
   pass. Fix the code/content instead. If you believe a rule is genuinely wrong, STOP
   and raise it — do not change it yourself.
2. **No escape hatches.** No `eslint-disable`, no `// prettier-ignore`, no
   markdownlint disable comments, no deleting a fixture or schema to dodge validation.
3. **`npm run check` must pass before you consider work done.** It runs manifest,
   schema, skill, ESLint, markdown, and format checks. Run it and paste the result.
4. **Stay in scope.** Only touch files your task names. Do not refactor unrelated code.
5. **Follow the data contract.** All working-folder file shapes are defined by the JSON
   schemas in `schemas/` and documented in `references/data-contract.md`. Skills that
   read/write `config.json`, `profile.json`, or `jobs.json` MUST conform to them.

## What this plugin is

A Claude Code plugin. Its "code" is mostly **skills**: each skill is a directory under
`skills/<name>/` containing a `SKILL.md` with YAML frontmatter (`name`, `description`)
and Markdown instructions. Skills are prompts/instructions, not a runtime program.

- Orchestrator skills are interactive (they ask the user questions and coordinate).
- Worker sub-skills are non-interactive (invoked by orchestrators; they do one job).

## SKILL.md requirements (enforced by `scripts/validate-skills.mjs`)

- Frontmatter delimited by `---` with a kebab-case `name` **matching the directory
  name** and a `description` (20–1024 chars) that says *when* to use the skill.
- A substantive Markdown body: purpose, explicit gates/preconditions, an ordered
  procedure, and the exact files it reads/writes.

## Principles to encode in the skills you write

- **Human in control of consequences** — final application submission respects the
  user's per-run automated-vs-human choice.
- **Human owns the prohibited + consequential steps** — no skill may create an account,
  enter a password, read the user's email (including for a confirmation link/OTP), solve
  a CAPTCHA, or enter payment details. On a custom / non-Easy-Apply application these
  become a **handoff** to the user (job status `needs_human` / `account_required`), never
  an action a skill performs. This is not overridable, even with credentials supplied.
- **Human-speed UI only for applying** — drive applications with real clicks/typing at a
  deliberate pace; never submit or fill via `fetch`/XHR/DOM injection (anti-bot-guard).
  `apply-to-jobs` (batch, with handoff) and `interactive-apply` (collaborative) share
  [`references/custom-application.md`](references/custom-application.md). Both can, per run,
  tailor each job's resume via the [`tailor-resume`](skills/tailor-resume/SKILL.md) worker
  (freedom 0–10 + review mode), which requires the separate `resume-intelligence`
  (`resume-kit`) plugin; see [`references/resume-kit.md`](references/resume-kit.md).
- **Pre-answer gates on every field** — before answering, apply the
  [pre-answer gates](references/question-log.md#pre-answer-gates): a suspected
  AI/bot-detection trap/honeypot and any free-response/prose field are logged for the user
  (`needs: ["bot-check"]` / `["question"]`), never filled by the agent. Conservative: when
  unsure, log for the user.
- **Read-only on the inbox** — `check-email-status` only *reads* Gmail to update the list:
  it never sends, replies to, drafts, or forwards mail, never opens attachments or clicks
  links, never changes labels/archive/read state. All list writes go through
  `record-application`; ambiguous email→job matches are confirmed with the user, never
  guessed. See [`references/email-status.md`](references/email-status.md).
- **Ask once, reuse forever** — never re-ask a question already stored in the profile;
  log genuinely new questions.
- **Stateless plugin** — all state lives in the runtime working folder; skills discover
  it via `config.json`, never via conversation memory.
- **Gates before actions** — every skill checks its preconditions first.

## Definition of done for a task

- The named files exist and are complete (no TODO/placeholder text).
- `npm run check` passes locally.
- The change matches the task's acceptance criteria and the data contract.
