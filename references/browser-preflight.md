# Browser preflight: connectivity and job-board logins

Reusable procedure that confirms the plugin can drive the user's Chrome via the
claude-in-chrome tools and that the user is logged in to each target job board. The
setup wizard cites this doc; `find-jobs` and `apply-to-jobs` may cite it too so the
same checks run before any browser work.

The plugin only works by driving the user's **own logged-in browser**. If the browser
is unreachable or the user is not logged in to a board, search and apply will fail
later. Run this preflight to catch and fix that up front.

## Principles

- **Never handle credentials.** The user logs in themselves, in their own browser. This
  procedure only opens pages and checks whether a session already exists — it never
  types passwords or submits login forms.
- **Never defeat protections.** If a site shows a CAPTCHA or anti-bot wall, report it
  and let the user resolve it manually; do not try to bypass it.
- **Verify, then continue.** After the user says they installed something or logged in,
  re-check before moving on. Loop until reachable, or the user explicitly skips.
- **Skips are explicit.** The user may choose to skip a board; record the skip in the
  summary — never drop a board silently.

## Loading the tools

The claude-in-chrome tools may be deferred. Load the ones this procedure needs in ONE
ToolSearch call before using them, e.g.:

```text
ToolSearch: select:mcp__claude-in-chrome__list_connected_browsers,mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text
```

## Step 1 — Confirm browser connectivity

1. Call `list_connected_browsers` (or `tabs_context_mcp`) to see whether a Chrome with
   the Claude-in-Chrome extension is connected.
2. **If a browser is connected:** report which one and continue to Step 2.
3. **If none is connected:** walk the user through getting one (prefer Chrome):
   - Ask them to install Google Chrome if they do not have it:
     `https://www.google.com/chrome/`. (Chrome is preferred; the extension also supports
     other Chromium browsers, but recommend Chrome.)
   - Ask them to install the **Claude in Chrome** extension and enable it, then pin it
     and grant it access.
   - Tell the user: **"Let me know once Chrome and the Claude in Chrome extension are
     installed and enabled."**
   - When they confirm, call `list_connected_browsers` / `tabs_context_mcp` again.
     If still not connected, report exactly what you see and repeat this step. Loop
     until a browser is connected or the user chooses to stop.

Do not proceed to Step 2 until a browser is connected (or the user stops setup).

## Step 2 — Confirm a logged-in account per target board

Run this for each board in the target list (the caller passes it; in setup it is
`config.sites`). `generic` needs no login check — skip it and note it as "no login
required".

For each board that needs a login (`linkedin`, `indeed`, `glassdoor`):

1. Open the board's home/jobs page in a new tab (`tabs_create_mcp` + `navigate`) and
   read it (`read_page` / `get_page_text`).
2. **Heuristically determine whether the user is logged in:**
   - Logged in: an account/avatar/profile menu is present, or the page shows
     personalized content, and there is no prominent "Sign in" / "Join now" wall.
   - Not logged in: a sign-in / join wall or a "Sign in" button dominates.
   - **When ambiguous, ask the user to confirm** rather than guessing.
3. **If logged in:** report "✓ <board>: logged in" and move to the next board.
4. **If not logged in:** print the login URL for the user to click in the terminal and
   ask them to sign in **in their browser**, then tell you when done:
   - LinkedIn: `https://www.linkedin.com/login`
   - Indeed: `https://secure.indeed.com/account/login`
   - Glassdoor: `https://www.glassdoor.com/profile/login_input.htm`

   Say: **"Open this link and sign in, then tell me when you're logged in."** Do not
   enter credentials yourself.
5. When the user confirms, reload the board page and re-run the check in step 2. If still
   not logged in, report what you see and repeat. Loop until logged in, or the user
   chooses to **skip** this board.

## Step 3 — Report

Summarize the outcome for every target board:

- `✓ reachable & logged in` — ready to use.
- `⊘ skipped by user` — the user opted out; note that search/apply will exclude it.
- `no login required` — for `generic`.

Return this summary to the caller so it can record skips and decide whether to continue.
Everything that is not skipped must be reachable and logged in before browser-dependent
work (search/apply) runs.
