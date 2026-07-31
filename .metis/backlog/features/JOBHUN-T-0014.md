---
id: add-browser-connectivity-and-login
level: task
title: "Add browser-connectivity and login preflight to setup"
short_code: "JOBHUN-T-0014"
created_at: 2026-07-31T02:30:20.969800+00:00
updated_at: 2026-07-31T02:31:23.048752+00:00
parent: 
blocked_by: []
archived: false

tags:
  - "#task"
  - "#feature"
  - "#phase/active"


exit_criteria_met: false
strategy_id: NULL
initiative_id: NULL
---

# Add browser-connectivity and login preflight to setup

## Backlog Item Details

### Type

- [x] Feature - New functionality or enhancement

### Priority

- [x] P1 - High (setup completes but leaves search/apply unusable if the browser or
      logins are not ready)

### Business Justification

- **User Value:** The whole plugin depends on driving the user's logged-in Chrome. If
  the browser isn't connected or the user isn't logged in to the chosen boards, search
  and apply silently fail later. Catching and fixing this during setup makes the plugin
  actually usable end to end.
- **Effort Estimate:** S–M (one reusable reference doc + a new setup step).

## Objective

Add a preflight to `job-hunter-setup` that verifies the plugin can (1) connect to the
user's Chrome via the claude-in-chrome tools, and (2) find a logged-in account for each
chosen job board. If the browser is unreachable, walk the user through installing Chrome
and the Claude-in-Chrome extension (prefer Chrome). For any chosen board where the user
is not logged in, give them the site's login URL to click in the terminal, wait for
confirmation, and re-verify. Loop until everything is reachable and logged in.

Make the procedure a reusable reference so `find-jobs` and `apply-to-jobs` can adopt it
later, and cite it from the setup skill.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria

- [ ] `references/browser-preflight.md` exists: a reusable, ordered procedure that
      (a) checks browser connectivity via the claude-in-chrome tools
      (`list_connected_browsers` / `tabs_context_mcp`); (b) on failure, walks the user
      through installing Chrome (preferred) and the Claude-in-Chrome extension, with a
      "tell me when done" verify-and-retry loop; (c) for each target job site, opens it
      and checks for a logged-in account; (d) on a site not logged in, prints the site's
      login URL for the user to click in the terminal, waits for the user to confirm, and
      re-verifies; (e) loops until browser + all target sites are reachable and logged
      in, or the user explicitly chooses to skip a site.
- [ ] The procedure names the login URLs for `linkedin`, `indeed`, `glassdoor` and
      explains that `generic` needs no login check.
- [ ] The procedure never attempts to defeat anti-bot / captcha and never handles the
      user's credentials — the user logs in themselves in their own browser.
- [ ] `skills/job-hunter-setup/SKILL.md` gains a new step that runs the preflight against
      the sites in `config.sites` (after sites are known, before the final report), citing
      `references/browser-preflight.md` (no duplication), and confirms all chosen sites
      are reachable before finishing — reporting any the user chose to skip.
- [ ] The preflight is non-destructive and does not block completing setup if the user
      chooses to skip a site (the skip is recorded in the run summary, not silently).
- [ ] `npm run check` passes.

## Implementation Notes

### Technical Approach

Reference the claude-in-chrome tools by name (they load via ToolSearch at runtime):
`list_connected_browsers`, `tabs_context_mcp`, `tabs_create_mcp`, `navigate`,
`read_page`/`get_page_text`. Detect "logged in" heuristically per site (e.g. presence of
an account/avatar element or absence of a sign-in wall) — keep it best-effort and ask the
user to confirm when ambiguous. Login URLs: LinkedIn `https://www.linkedin.com/login`,
Indeed `https://secure.indeed.com/account/login`, Glassdoor
`https://www.glassdoor.com/profile/login_input.htm`. Follow the claude-in-chrome
dialog-avoidance guidance. This is an instruction file, not runtime code.

### Dependencies

Modifies `skills/job-hunter-setup/SKILL.md` and adds `references/browser-preflight.md`.
Independent of other work.

### Risk Considerations

Risk: false "not logged in" detection → confirm with the user rather than looping
forever; allow an explicit skip. Risk: scope creep into find-jobs/apply-to-jobs → this
task only wires the preflight into setup; adopting it in search/apply is future work.

### Recommended Agent

opus + medium — new reusable procedure plus a careful edit to the load-bearing setup
skill; the interactive install/login loop needs sound reasoning.

## Status Updates

*To be added during implementation*