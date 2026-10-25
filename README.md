# ezcon

**Turn a conference into a practical career opportunity plan.**

ezcon connects an employer-listed role to a conference session and speaker, explains the relationship, helps you prepare and plan around time and travel costs, and remembers confirmed meetings for your next step.

[Try the demo](https://ezcon-six.vercel.app) · [Demo walkthrough](#demo-walkthrough) · [Run locally](#run-locally) · [Sponsor integrations](#sponsor-integrations)

Built for [WeMakeDevs’ Patch the Conference hackathon](https://www.wemakedevs.org/hackathons/ptc), October 24, 2026.

> **Demo status:** The public Vercel site runs a cached conference snapshot with browser-local storage. It does not make live sponsor API calls. The local development API implements FalkorDB persistence and TrueForge/OpenAI research through Bright Data. Fictional profiles, simulated clocks, historical replay, and recorded research results are labeled in the interface.

## The problem

A conference agenda tells you what is happening. A job board tells you who is hiring. Neither makes it easy to answer: **Which opportunity is worth my limited time, who connects to it, how do I prepare, and can I afford to get there?** After the conference, notes and follow-ups often become another disconnected list.

This is especially costly for early-career developers and job seekers attending on a budget. A company logo does not establish that a recruiter will be available, an interesting talk may clash with another commitment, and an inexpensive trip can become expensive once return fares, tolls, and parking are included.

ezcon brings those decisions into one attendee workflow. Its primary audience is developers seeking career connections; learning-focused attendees and people organizing their networking and side activities can use the same schedule and meeting tools.

## From discovery to follow-through

1. **Choose your goals and interests.** Start with the fictional demo profile or a separate personal profile; select the conference and customize your preferences.
2. **Find a useful connection.** Explore hiring connections and interest-based sessions. Inspect the source, role requirements, application link, and the graph path behind a suggestion.
3. **Build a feasible day.** Add a session to Schedule, resolve time conflicts, complete a preparation step, and compare the available commute options against your budget.
4. **Remember what happened.** Confirm a visit or meeting, save a note, and draft an editable follow-up from People. Meeting memory can influence later recommendations.
5. **Keep optional activities organized.** Explore sourced raffles and giveaways without treating potential prizes as money available for the trip.

The four main tabs are **Today**, **Explore**, **Schedule**, and **People**. Profile/companion controls, the Badge collection, and My QR support the main workflow.

## Implemented features

| Feature | What the application does | Boundary |
| --- | --- | --- |
| Hiring connections | Connects a session, listed speaker, company, and employer role; displays an explanation, requirements, fit caveat, and employer application link. | Current role refresh covers two tracked Microsoft positions. A speaker’s company affiliation is not a referral, hiring authority, or promise to meet. |
| Explainable recommendations | Retrieves relationship paths, then ranks candidates deterministically using interests and remembered company connections; filters past, scheduled, or conflicting sessions. | Uses a bounded dataset and scoring rules, not a comprehensive matching service. |
| Schedule and preparation | Supports adding/removing sessions, conflict choices, undo, day views, and preparation checklists. | Travel buffers are application rules, not measured indoor navigation. |
| Travel comparisons | Compares sourced/estimated cost and time, return-trip costs, parking constraints, and budget fit; preserves unknown costs. | Current options are curated examples, not live routing, inventory, or guaranteed prices. |
| People and memory | Records profile-scoped meetings and notes, prevents duplicate meeting writes, supports undo and reconnect, and offers editable follow-up drafts. | Meetings are self-reported; ezcon never sends the drafts. |
| Applications and badges | Tracks self-reported applications, visits, preparation, and follow-through with deterministic badges. | These are personal progress records, not employer or organizer confirmations. |
| My QR | Generates a QR code locally for a selected HTTPS profile link. | It is a plain URL QR, not a conference identity or admission credential. |
| Raffle tickets and reminders | Saves a ticket number and/or resized photo on the device; accepts a reminder time or a draw time with a reminder 15 minutes before. | Manual number entry; no OCR or organizer entry submission. Reminders need the app open; overdue reminders can appear on reopening. System alerts require browser support and permission. |
| Historical side quests | Displays sourced WAD North America 2026 raffle and giveaway examples with unknown conditions called out. | Read-only replay. Fictional sample tickets do not create entries, reminders, or rewards. |
| Research evidence | Local mode can show tool calls, elapsed time, source URL, retrieval time, and parsed session fields. | Public cached mode displays a recorded result, not a new fetch. |
| Live event search | Local mode can search cited upcoming Luma events in the Bay Area, pull event details, show their source links, open current Google Maps commute routes, and add selected events to Schedule. | Search requires a privately configured OpenAI API key and confirmed free/sponsor credits. OpenAI-assisted details are marked unconfirmed. External event commute links open Maps; ezcon does not claim live fares, drive times, parking prices, or availability. |

Implementation: [UI workflows](src/web/screens.tsx), [application state](src/web/App.tsx), [recommendation rules](src/domain/recommend.ts), [career checks](src/domain/careers.ts), [travel rules](src/domain/travel.ts), and [rewards](src/domain/rewards.ts).

## Sponsor integrations

### FalkorDB: relationships that drive recommendations and memory

The [local graph adapter](server/graph.ts) uses the FalkorDB Node client and fixed, parameterized Cypher templates. It seeds conferences, sessions, people, companies, topics, and roles, then queries paths used by the interface:

```text
Profile → INTERESTED_IN → Topic ← ABOUT ← Session
Session ← SPEAKS_AT ← Person → WORKS_AT → Company → OFFERS_ROLE → Role
Profile → MET → Person → WORKS_AT → Company ← WORKS_AT ← Other speaker → SPEAKS_AT → Session
```

The last path connects a remembered meeting to another speaker at the same company. Graph-returned nodes, edges, and provenance support “Why this fits”; the model does not invent the path. Meeting writes use profile scope and idempotent identifiers, and the reconnect action reopens the store to demonstrate persistence beyond a connection.

The public demo substitutes the [in-browser MemoryGraph](src/domain/memory-graph.ts), which follows the same store interface. It demonstrates the workflow but is not a hosted FalkorDB connection.

### Bright Data: public source retrieval

[Research](server/research.ts) exposes source-specific Bright Data tools through TrueForge:

- WAD session pages use `scrape_as_html`.
- The dynamic Universe catalog uses browser navigation, scrolling, and HTML retrieval tools.
- A separate [speaker-link script](scripts/find-linkedin.ts) uses public search results to identify candidate LinkedIn URLs; it does not scrape profile contents.

Session facts are extracted from raw tool responses using [source-specific parsers](src/domain/extract), rather than accepting the model’s summary as evidence. Records preserve the source URL, retrieval time, and retrieval method. Invalid or incomplete containers can be rejected.

Saved local research artifacts include successful WAD retrievals. Full Universe catalog ingestion is not established as reliable: a successful HTTP response can still contain only the page shell. Historical authenticated WAD goodies listings were manually inspected; they are not represented as Bright Data scrapes. See [data sources and access boundaries](docs/DATA_SOURCES.md).

### TrueFoundry TrueForge + OpenAI: a bounded research agent

The application uses `@truefoundry/trueforge-sdk` to create a research session, configure an OpenAI model, expose a narrow Bright Data MCP tool set, run the turn, and inspect stored tool events. The default model identifier in the code is `openai/gpt-5-4-nano`; availability depends on the configured TrueForge instance.

The agent handles retrieval tool calls. Deterministic code parses session fields and owns ranking, dates, scheduling, money arithmetic, and rewards. Session research validates approved HTTPS hosts and public network targets, limits iterations and duration, and discards results when recorded calls target a different URL. This is bounded retrieval, not an autonomous conference crawler or a guarantee against every downstream redirect/tool failure.

For real-event discovery, a separate optional local-only integration calls the OpenAI Responses API with its native `web_search` tool. Search candidates are restricted to individual Luma URLs with matching clickable citations and a future date. When Bright Data cannot return usable event details (including a venue), OpenAI can fill a schedule-ready record only when it finds a valid time, timezone, venue and citations; the record remains **unconfirmed** and needs user review. The API key stays in the local Node server environment. The API does not call OpenAI unless both `OPENAI_API_KEY` is present and `EZCON_OPENAI_FREE_CREDITS_CONFIRMED=true`; it also limits direct requests to 20 per local API process per day. That in-process brake resets on restart, so it is not a substitute for a hard spend limit in the OpenAI project dashboard. The repository has no direct API key configured and cannot verify the account's available credits. The static Vercel build does not host this local API or make these calls.

Local saved traces and the [recorded UI result](src/web/screens.tsx) provide evidence of the TrueForge → OpenAI → Bright Data path. No paid research call is required to explore the public demo or run the default tests.

### Qodo: review feedback applied to real pull requests

Qodo reviewed repository pull requests. For example, its [PR #2 review](https://github.com/heykatie/ezcon/pull/2#discussion_r4368900745) identified a giveaway source link pointing at an unrelated raffle. The current UI uses a dedicated Goodies catalog source, and a regression assertion in [the app tests](tests/app.test.tsx) checks the destination. Qodo also flagged stale handoff instructions.

This is development-workflow evidence, not a runtime integration or a claim that every commit received a complete review.

## Technical architecture

```text
React + TypeScript + Vite
  ├─ Schedule, budgets, preparation, drafts, QR, tickets, reminders
  │    └─ Browser-local state, separated by profile keys
  └─ Backend interface
       ├─ Public/static mode → MemoryGraph + cached JSON + browser storage
       └─ Local development → Vite /api proxy → Node API (127.0.0.1:8787)
            ├─ FalkorDB: public relationships, profiles, interests, meetings/notes
            ├─ Employer careers checks: tracked Microsoft roles
            └─ TrueForge → OpenAI → Bright Data MCP → raw HTML
                 └─ Deterministic parser → session records → FalkorDB
```

**Stack:** React 18, TypeScript, Vite, Node.js, FalkorDB, TrueForge SDK, Zod, node-html-parser, qrcode, Vitest, and Testing Library. The public frontend is hosted on Vercel.

The [backend interface](src/web/backend.ts) attempts the local API only in development and otherwise uses cached mode. [Vite configuration](vite.config.ts) supplies the development proxy. `npm run build` emits a static frontend; it does not deploy the Node API or provision sponsor services.

The local API seeds the bundled sessions and roles at startup. Role checks run on startup and every six hours, retaining previous records when no open refreshed role is available. Live career filtering applies a 72-hour freshness limit. Cached mode evaluates role freshness against the snapshot check time, so **a cached “open” listing is not proof that the job remains open today**.

Successful session research seeds FalkorDB, but the current UI still looks up session details in its bundled dataset. Fetching a new page does not provide a general-purpose dynamic catalog refresh.

### Storage and trust boundaries

- The public demo needs no account or sponsor credentials. Browser data persists on that device when storage is available; it is not cross-device sync or encrypted private storage.
- In local live mode, profile interests and meeting notes are sent to the local API and stored in FalkorDB. Schedule, preparation, follow-up drafts, ticket photos/numbers, and preferences remain browser-local.
- Profile IDs scope graph queries, but are **not authentication**. The API binds to loopback and must not be exposed publicly without a separate authentication and authorization design.
- Credentials belong in ignored local configuration or the configured TrueForge service. Never put secrets in frontend variables or commit `.env`, ticket photos, browser cookies, or personal notes.
- Attendance, applications, and meetings are self-reported. A public speaker listing does not establish actual attendance, availability, or permission to republish attendee records.

## Run locally

### Cached demo: no service credentials

Requires **Node.js 22.14 or newer** and npm.

```bash
git clone https://github.com/heykatie/ezcon.git
cd ezcon
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. With no local API available, development falls back to cached mode. Check the mode label before demonstrating sponsor behavior.

```bash
npm test             # default unit/component/contract suite; no live sponsor calls
npm run typecheck    # TypeScript checks
npm run build        # typecheck + production frontend build
npm run preview      # preview the static build locally
```

### Local live mode

1. Provision FalkorDB, either locally or through a TLS cloud endpoint.
2. Copy `.env.example` to `.env` and privately set the database URL.
3. For research, separately run/configure a TrueForge service with access to an OpenAI model and a Bright Data MCP server named `bright-data`. Enable the tools described above. This repository contains the SDK client, not a complete TrueForge service installer or credential configuration.
4. Start the local API, then Vite in another terminal. Reload the app and confirm the **Live local** label.

Example local database with a persistent Docker volume:

```bash
docker run -d --name ezcon-graph -p 127.0.0.1:6379:6379 \
  -v ezcon-graph-data:/data falkordb/falkordb
cp .env.example .env
```

Use `FALKORDB_URL=redis://127.0.0.1:6379` for that local instance, or the private `falkors://` URL supplied by your cloud provider. Do not overwrite an existing configured `.env`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `FALKORDB_URL` | Required database connection URL for the local API | None |
| `EZCON_GRAPH` | Application graph name | `ezcon` |
| `EZCON_API_PORT` | API listen port; update Vite’s proxy too if changed | `8787` |
| `TRUEFORGE_URL` | Independently configured TrueForge service | `http://localhost:8790` |
| `EZCON_MODEL` | Model identifier available in that service | `openai/gpt-5-4-nano` |
| `OPENAI_API_KEY` | Optional direct OpenAI key for cited live Luma search and fallback; keep only in ignored local `.env` | None |
| `EZCON_OPENAI_FREE_CREDITS_CONFIRMED` | Must be `true` to permit any direct OpenAI request; set only after confirming free/sponsor credits and no personal billing | `false` |
| `EZCON_OPENAI_MODEL` | Direct Responses API model with web-search support | `gpt-5.5` |
| `FALKORDB_TEST_URL` | Optional connection for graph integration tests | `redis://127.0.0.1:6379` |

```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev
```

The graph workflow can run without TrueForge; research needs the separate service and confirmed provider access. Starting the API also makes direct employer-role requests. Use only confirmed sponsor/free credits for research; OpenAI web search has a local per-process request cap, but the repository does not enforce a dollar spending cap.

Optional diagnostics:

```bash
npm run check:graph   # TLS cloud check; writes synthetic data to ezcon_check
npm run test:graph    # real FalkorDB contract; creates/deletes ezcon_test only
npm run check:roles   # checks tracked employer listings and updates the role snapshot
npm run research -- wad-session https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-making-works-on-all
```

Use a disposable test database for graph tests. The research command makes provider calls and saves its result under ignored `.cache/research/`. `npm run snapshot:data` rebuilds Universe data from the checked-in HTML fixture and WAD data from successful local research artifacts; inspect the output before committing it.

## Demo walkthrough

1. Open the [public demo](https://ezcon-six.vercel.app) and select the fictional profile if prompted. Confirm the cached-mode label.
2. Select **GitHub Universe 2026**, open **Explore → Quests**, and inspect a hiring connection. Open its source/application link and “Why this fits.” Explain the session → speaker → company → role path and fit caveat.
3. Add a session, open **Schedule**, complete one preparation step, and compare travel costs and unknowns. Demonstrate a conflict choice if applicable.
4. Use **People** to inspect saved meeting memory and an editable follow-up draft. For upcoming-session check-ins, use the explicitly simulated conference clock in the companion menu; do not describe simulated attendance as real.
5. Open **Explore → Side quests**. Show local ticket/reminder controls for an upcoming raffle. Switch to **WAD NA 2026 · Past** to show historical listings and the fictional ticket example; that replay does not accept entries.
6. For the sponsor demo, run local live mode. Show an actual FalkorDB path and meeting across reconnect, then one bounded live research trace. A recorded trace on the public site demonstrates a past run, not a live one.
7. Show Qodo’s concrete review finding, the corrected source link, and its regression assertion.

Use fictional names, notes, and tickets in recordings. Do not show credentials, personal barcodes, or unrelated authenticated pages. The longer [demo storyboard](docs/DEMO.md) is useful preparation, but check its older UI/status notes against the current implementation.

### Hackathon judging alignment

The [official PTC criteria](https://www.wemakedevs.org/hackathons/ptc) require a working live stage demo and evaluate each sponsor track separately. ezcon’s evidence maps to those tracks as follows; this is a demonstration guide, not a claim of eligibility or an award.

| Track | Evidence to demonstrate |
| --- | --- |
| FalkorDB: graph centrality, explanation, conference usefulness | Show the returned relationship path driving a recommendation and a remembered meeting changing later candidates. |
| Bright Data: live web data, quality, usefulness | Fetch an approved page live, inspect the tool result, and compare parsed fields with the source. Explain rejected/incomplete data. |
| TrueForge + OpenAI: harness, model, conference problem | Show the actual configured model and bounded MCP tool trace producing usable conference evidence. |
| Qodo: real PR reviews, clear changes, demonstrated fixes | Open the review, corresponding fix, and regression test. Avoid equating installation with completed review. |

## Verification and limitations

README inspection checkpoint: **October 24, 2026**, against repository commit `6e7d114`. The public demo returned HTTP 200 and rendered its cached/fictional labels and four-tab interface. That confirms public frontend availability, not a deployed live backend.

The default suite passes **173 tests**, including raffle autosave, draw-time reminders, continuous note entry, dialog focus restoration, and keyboard tab navigation. The production build, including TypeScript checks, passed, and `git diff --check` found no whitespace errors. Graph integration and live provider checks were not rerun for these UI/documentation updates; the default suite does not establish live provider reliability.

Other current limits:

- Coverage is a curated snapshot of Universe 2026 and WAD North America 2026, not every conference/session/person. Historical WAD interactions are fictional demo history.
- Employer checks cover specific roles and can become stale. Experience filtering is a narrow heuristic, not a full assessment of qualifications, location, work authorization, or hiring likelihood.
- Live extraction is source-specific. Full Universe catalog ingestion, continuous source freshness, and arbitrary conference import remain incomplete.
- Follow-ups are editable drafts, not AI messaging automation. No email, application, registration, raffle entry, or prize claim is submitted by ezcon.
- Reminders are browser timers, not background push or guaranteed alarms. Storage limits, cleared site data, browser throttling, and unsupported alerts can affect persistence or delivery.
- Phone-width (320px and 390px) and keyboard smoke checks cover the main screens, raffle form, note editing, and dialogs. These checks and component tests do not establish full accessibility conformance; physical-device and screen-reader testing remain outstanding.
- No hosted authenticated backend, cross-device sync, live indoor positioning, or validated accessible booth routing is implemented.

### Roadmap / concept previews

The interface explicitly labels **booth route optimization**, **ticket photo auto-reading**, and **attendee list sync** as concepts that are not working yet. Reliable complete-catalog ingestion, authenticated shared hosting, and durable background reminders would require additional implementation and verification.

## Repository guide

| Path | Purpose |
| --- | --- |
| [`src/web/`](src/web) | React screens, state, backend selection, QR, ticket/reminder UI |
| [`src/domain/`](src/domain) | Graph contract, deterministic rules, parsers, scheduling and travel |
| [`src/data/`](src/data) | Cached sessions, roles, provenance, profiles, and replay fixtures |
| [`server/`](server) | Loopback API, FalkorDB adapter, research and employer checks |
| [`scripts/`](scripts) | Research, snapshots, source/role checks, and graph diagnostics |
| [`tests/`](tests) | Extraction, rules, UI regressions, and graph contracts |
| [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) | Source provenance and access/redistribution boundaries |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Original proposed architecture; includes design goals beyond the current implementation |
| [`docs/BUILD_HANDOFF.md`](docs/BUILD_HANDOFF.md) | Historical implementation checkpoints; some branch, test, and raffle details predate current code |

## License

[MIT](LICENSE).
