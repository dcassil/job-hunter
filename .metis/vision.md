---
id: job-hunter
level: vision
title: "job-hunter"
short_code: "JOBHUN-V-0001"
created_at: 2026-07-30T23:55:05.050017+00:00
updated_at: 2026-07-30T23:56:04.687087+00:00
archived: false

tags:
  - "#vision"
  - "#phase/published"


exit_criteria_met: false
strategy_id: NULL
initiative_id: NULL
---

# job-hunter Vision

## Purpose **[REQUIRED]**

job-hunter is a Claude Code plugin that turns the tedious, repetitive parts of a
job search into a guided, agent-assisted workflow. It helps a single job seeker
discover relevant openings across LinkedIn, Indeed, Glassdoor, and other boards;
compile them into one managed list; and apply to them using rotating resumes and
cover letters plus a saved bank of answers to the demographic, work-authorization,
and screening questions that every application re-asks.

The plugin exists because job hunting is high-effort and low-leverage: the same
information is entered dozens of times, listings are scattered across sites behind
logins and anti-bot walls, and it is hard to keep a coherent picture of what has
been found, applied to, and heard back on. job-hunter centralizes that state and
automates the mechanical work while keeping the human in control of consequential
actions (what to apply to, what to submit).

## Product/Solution Overview **[CONDITIONAL: Product/Solution Vision]**

**Target audience:** an individual job seeker (initially Daniel) running Claude
Code with the claude-in-chrome browser tools available.

**Shape of the solution:** two cleanly separated concerns.

1. **Plugin source** — a reusable set of skills and a manifest that encode *how*
   to search, apply, and manage a job hunt. This is what lives in the repo and is
   version-controlled.
2. **Working folder** — a per-user data directory (created at runtime wherever the
   user chooses) holding *their* config, profile answers, resumes, cover letters,
   and the job list. The plugin is stateless; all state lives here.

The user interacts through a small set of orchestrator skills (setup, find jobs,
apply to jobs, review resume, update job focus, update resumes), which in turn
call non-interactive worker sub-skills (per-site search adapters, add-job-to-list,
record-application).

**Key benefit:** the user answers each screening question and provides each resume
*once*; the plugin reuses them across every application, rotates materials for A/B
testing or domain targeting, and keeps a single source of truth for the whole hunt.

## Current State **[REQUIRED]**

Today there is no tooling. A job search means manually visiting each board, logging
in, running searches, eyeballing results, copying interesting listings somewhere
ad hoc (browser tabs, a notes doc, a spreadsheet), and then re-typing the same
name/contact/demographic/work-authorization answers into every application form.
Resume and cover-letter selection is manual and inconsistent, there is no record
of which variant was sent where, and application questions that need the user's
input are answered on the fly with no memory for next time. Nothing is reusable
between sessions.

## Future State **[REQUIRED]**

The user runs a one-time setup wizard that captures their working-folder location,
resumes, cover letters, rotation strategy, remote/local preference, target job
types (inferred from the resume and confirmed), and their standard screening
answers. From then on:

- "Let's find jobs" runs a search across chosen sites (via the user's logged-in
  browser), dedupes results, and appends them to a single managed list with a
  status per job.
- "Let's apply" walks the new listings, picks the right resume/cover per the
  rotation strategy, fills applications from the saved profile, logs any *new*
  question for the user to answer (and remembers the answer), and — per the user's
  per-run choice — either submits automatically or stops for human review.
- Maintenance skills let the user refine target job types, review/replace resumes
  and cover letters, and re-analyze their materials as their search evolves.

The user always sees a coherent, up-to-date picture of the hunt and never re-enters
information the plugin already knows.

## Major Features **[CONDITIONAL: Product Vision]**

- **Setup wizard** — creates the working folder (`jobs/`, `resume/`,
  `cover-letters/`), ingests resumes and cover letters (by path or copy-in, with an
  "add another?" loop), determines rotation strategy when there is more than one,
  captures remote/local preference and screening answers, reviews the resume to
  propose target job types, and records all choices for future sessions.
- **Find jobs** — orchestrates a search run: per-run automated-vs-human choice,
  site selection, dispatch to per-site adapters, dedupe, and append to the list.
- **Apply to jobs** — orchestrates applying: material selection by rotation
  strategy, form fill from the saved profile, logging of new questions, and status
  updates, with a per-run automated-vs-human-in-the-loop choice.
- **Site adapters** — `search-linkedin`, `search-indeed`, `search-glassdoor`, and
  a `search-generic-site` fallback, driving the user's browser.
- **List management** — `add-job-to-list` (append + dedupe) and
  `record-application` (status transitions), backing a structured `jobs.json` with
  a human-readable `jobs.md` mirror.
- **Maintenance** — `review-resume`, `update-job-focus`, `update-resumes`.

## Success Criteria **[REQUIRED]**

- A user can go from zero to a completed setup (working folder + resumes + cover
  letters + profile + confirmed job focus) in a single guided session.
- A search run produces a deduped list of relevant listings appended to `jobs.json`
  without losing or duplicating existing entries.
- Applying to a job never asks the user a question already stored in `profile.json`;
  genuinely new questions are captured and reused thereafter.
- Rotation strategy (round-robin, domain-targeted, or both) is honored and the
  resume/cover variant used is recorded per job.
- Consequential actions (final submit) never happen without the user's chosen
  level of oversight for that run.
- All state survives across sessions purely from the working folder — no reliance
  on conversation memory.

## Principles **[REQUIRED]**

- **Human in control of consequences.** Discovery and form-filling are automated;
  the user decides per run whether final submission is automated or reviewed.
- **Ask once, reuse forever.** Any answer, resume, or preference is captured once
  and reused; new questions are logged, not re-asked.
- **Plugin is stateless; the working folder holds all state.** Skills discover the
  working folder and never assume conversation memory.
- **Respect the sites.** Use the user's own logged-in browser sessions rather than
  scraping infrastructure; avoid actions that risk account bans.
- **Small, single-purpose skills.** Interactive orchestrators are thin; workers are
  non-interactive and composable.
- **Gates before actions.** Every skill verifies its preconditions (setup exists,
  jobs are in the right status) before doing work.

## Constraints **[REQUIRED]**

- Requires Claude Code with the claude-in-chrome browser tools and the user logged
  in to the relevant job sites.
- Job boards actively block automation and change their markup; adapters are
  best-effort and must degrade gracefully (fall back to `search-generic-site` or
  manual paste).
- Single-user, single-machine scope. No multi-user accounts, no hosted service, no
  shared database.
- Must not automate anything that materially violates a site's terms in a way that
  risks the user's account; final-submit automation is opt-in per run.
- Built and planned entirely within Metis per the user's global workflow rules.