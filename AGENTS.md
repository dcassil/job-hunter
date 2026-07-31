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
- **Ask once, reuse forever** — never re-ask a question already stored in the profile;
  log genuinely new questions.
- **Stateless plugin** — all state lives in the runtime working folder; skills discover
  it via `config.json`, never via conversation memory.
- **Gates before actions** — every skill checks its preconditions first.

## Definition of done for a task

- The named files exist and are complete (no TODO/placeholder text).
- `npm run check` passes locally.
- The change matches the task's acceptance criteria and the data contract.
