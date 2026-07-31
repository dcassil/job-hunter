# Board registry

The single source of truth for every job board job-hunter supports. `find-jobs` and
`job-hunter-setup` read this registry to decide which boards to offer, how to search
them, how to log in, and how to handle their quirks. Adding a future board should mean
adding a row here (and its id to the `source`/`sites` enums in the schemas) — not editing
many skills.

Each board id is also a valid `source` value in
[`../schemas/jobs.schema.json`](../schemas/jobs.schema.json) and a valid `sites` value in
[`../schemas/config.schema.json`](../schemas/config.schema.json).

## Columns

- **id** — the `source` / `sites` id (kebab-case).
- **category** — `general`, `design`, or `remote`. Drives suggestion:
  - `general` boards are offered by default.
  - `remote` boards are offered only when `config.remote_pref` is `remote` or `both`.
  - `design` boards are offered ONLY after the resume is added and the resume/`job-focus`
    indicates design/creative relevance (e.g. Art Director, designer, creative).
- **adapter** — `dedicated` if a `search-<id>` skill exists; otherwise `generic`, meaning
  `find-jobs` invokes `search-generic-site` seeded with the search-URL template below.
- **search URL template** — `<keywords>` and `<location>` are URL-encoded and
  substituted; drop `<location>` params for remote-only boards.
- **login URL** — where the user signs in, or `none` if browsing needs no login.
- **access notes** — quirks the skills must surface (aggregator, curated/invite,
  third-party login, remote-only, etc.).

## General boards

| id | adapter | search URL template | login URL | access notes |
| --- | --- | --- | --- | --- |
| `linkedin` | dedicated | `https://www.linkedin.com/jobs/search/?keywords=<keywords>&location=<location>` | `https://www.linkedin.com/login` | Frequent auth/anti-bot walls; report as blocked. |
| `indeed` | dedicated | `https://www.indeed.com/jobs?q=<keywords>&l=<location>` | `https://secure.indeed.com/account/login` | Verification walls possible; report as blocked. |
| `glassdoor` | dedicated | `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=<keywords>&locT=&locId=` | `https://www.glassdoor.com/profile/login_input.htm` | Sign-up wall gates results; treat as blocked. |
| `ziprecruiter` | generic | `https://www.ziprecruiter.com/jobs-search?search=<keywords>&location=<location>` | `https://www.ziprecruiter.com/authn/login` | Strong "1-Click Apply"; good regional coverage. |
| `google-jobs` | generic | `https://www.google.com/search?q=<keywords>+jobs+<location>&ibp=htl;jobs` | `none` | Aggregator: listings link out to source boards; native ids are unstable, so build the job `id` from a hash of the canonical URL, and rely on the sink to dedupe against boards already searched. |
| `monster` | generic | `https://www.monster.com/jobs/search?q=<keywords>&where=<location>` | `https://www.monster.com/profile/login` | Older; still decent for regional/on-site roles. |
| `careerbuilder` | generic | `https://www.careerbuilder.com/jobs?keywords=<keywords>&location=<location>` | `https://www.careerbuilder.com/user/sign-in` | Older; regional/on-site coverage. |
| `wellfound` | generic | `https://wellfound.com/jobs?query=<keywords>` | `https://wellfound.com/login` | Startups, more remote. Requires an account; some roles need a completed profile to view/apply — surface this and let the user proceed if they have access, else skip. |

## Design / creative boards

Offer these ONLY when the resume/job-focus indicates design/creative relevance.

| id | adapter | search URL template | login URL | access notes |
| --- | --- | --- | --- | --- |
| `dribbble` | generic | `https://dribbble.com/jobs?keyword=<keywords>&location=<location>` | `https://dribbble.com/session/new` | Designer-focused, portfolio-forward roles. Browsing is open; applying generally needs a login. |
| `behance` | generic | `https://www.behance.net/joblist?search=<keywords>` | `https://www.behance.net` (sign in with an Adobe ID) | Creative/agency roles. Login is via Adobe ID (third-party login) — tell the user. |
| `aiga` | generic | `https://designjobs.aiga.org/jobs/?keywords=<keywords>&location=<location>` | `none` | Professional design-org board; senior/lead roles. Some listing detail may be membership-gated — surface if a wall appears. |
| `coroflot` | generic | `https://www.coroflot.com/design-jobs/search?q=<keywords>&location=<location>` | `https://www.coroflot.com/login` | Long-running creative/design board. |
| `working-not-working` | generic | `https://workingnotworking.com/jobs?search=<keywords>` | `https://workingnotworking.com/login` | Creative freelance + full-time, agency-heavy. Curated / invite-style membership: creating a profile requires acceptance. Job board may be viewable, but applying can require membership — surface this quirk and let the user proceed-if-member or skip. |
| `authentic-jobs` | generic | `https://authenticjobs.com/?search=<keywords>&location=<location>` | `none` | Design/dev roles. |

## Remote-leaning boards

Offer these only when `config.remote_pref` is `remote` or `both`.

| id | adapter | search URL template | login URL | access notes |
| --- | --- | --- | --- | --- |
| `we-work-remotely` | generic | `https://weworkremotely.com/remote-jobs/search?term=<keywords>` | `none` | Remote-only; browse without login. Ignore `<location>`. |
| `remoteok` | generic | `https://remoteok.com/remote-<keywords>-jobs` | `none` | Remote-only; browse without login. Ignore `<location>`; substitute `<keywords>` as a hyphenated slug. |

## Catch-all

| id | adapter | search URL template | login URL | access notes |
| --- | --- | --- | --- | --- |
| `generic` | dedicated | n/a (user supplies a board URL or pastes listings) | n/a | The `search-generic-site` fallback for any board not listed above, or when a dedicated adapter is blocked. |

## How skills use this registry

- **`find-jobs`**: build the offered-boards list by category (general default; remote when
  the remote preference allows; design only when design-relevant). For each chosen board,
  dispatch its dedicated `search-<id>` adapter if `adapter: dedicated`, else invoke
  `search-generic-site` with the search-URL template. Surface access notes; report/skip
  boards that are blocked or gated — never drop them silently.
- **`job-hunter-setup`**: offer the same category-gated list when setting `config.sites`,
  and run [`browser-preflight.md`](browser-preflight.md) against the chosen boards using
  each board's login URL (skipping `login: none`) and surfacing access notes.
