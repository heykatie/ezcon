# ezcon build and handoff

Checkpoint: October 24, 2026. The first implementation is complete and PR #1 is merged. The active local worktree contains follow-up UI polish and an owner-authorized replay of historical WeAreDevelopers (WAD) goodies and raffle listings; these follow-up changes are not yet committed, reviewed, deployed, recorded or submitted.

Repository: https://github.com/heykatie/ezcon. Local checkout: `/Users/ktl/.codex/.chatgpt-projects/g-p-6ac0ad85292c819193bd2cb8455afc50/ezcon`. Branch: `docs/ezcon-build-plan`, currently based on `b8bf04e`. PR #1 (`https://github.com/heykatie/ezcon/pull/1`) is closed and merged at `3d7c9f3`; do not push new work to that merged branch. Create a follow-up branch and PR for the current changes.

## Product and current behavior

ezcon helps a busy conference attendee connect a real opportunity to the right person or event, make a realistic plan within time and travel limits, prepare, and remember the next action. The strongest distinct demo is an open employer role connected by an explainable graph path to a conference speaker/session, followed by a feasible travel plan and a remembered follow-up. The app is no-sign-up; private profile and meeting data stay in the current browser/profile scope. A public demo uses a fictional profile and clearly labeled cached or replay data.

The app is a React/TypeScript/Vite frontend with a loopback-only Node/TypeScript API. The API connects to FalkorDB and TrueForge; TrueForge can call a tightly bounded Bright Data source tool. The graph stores conference relationships and profile-scoped meeting memory. Deterministic application code owns dates, budget, conflicts, identity and rewards; model output is schema-validated evidence extraction or explanation. The public Vercel build is static/cached and has no secret keys.

The four bottom tabs are Today, Explore, Schedule and People. Today shows the next step and a compact plan/progress strip. Explore separates goal-driven Quests from optional Side Quests. Schedule shows the full day, preparation and travel options. People separates people to meet from confirmed meetings and follow-ups. Companion/profile and Passport are opened from contextual controls; My QR is in the header. The interface uses short labels and direct actions for on-the-go use.

Career connections use roles checked against the employer's careers source and link directly to the employer application page. Only jobs tied through graph relationships to a represented speaker/company are shown. Travel offers deterministic, sourced budget/time comparisons. Historical WAD raffle/goodies listings are read-only; raffle entry, presence requirements or stock are not inferred. A clearly fictional ticket example never claims a real entry, photograph, reminder or prize.

## Sponsor integration status

- **FalkorDB:** the local API uses the cloud lab for graph-backed recommendations and meeting memory. Prior verification covered actual returned multi-hop paths, a meeting changing later recommendations across reconnect, profile isolation, invalid input and undo. Local Docker-backed contract tests use only `ezcon_test`; the cloud check uses only the dedicated `ezcon_check` graph. Do not delete either graph or the persistent volume.
- **TrueForge + OpenAI:** SDK workflow is wired in the API. The user has explicitly limited calls to confirmed free/sponsor grants; no personal charges. Latest bounded live research completed on October 24: TrueForge model `openai/gpt-5-4-nano` invoked Bright Data `scrape_as_html` once for the approved WAD session URL; response was 81,827 characters and ezcon extracted the correct title, speaker, time and stage. Run metadata: session `01m5r302phbd5a0qpxx9gxk8ak`, 12.2 seconds. This demonstrates the bounded tool path for that source, not an exhaustive conference crawler.
- **Bright Data:** its `scrape_as_html` tool supplied the WAD source content in that run. The user reported entering a Bright Data API key into TrueForge; never copy credentials or browser cookies into repo/config output. The Universe dynamic catalog’s generic Web Unlocker result was shell-only; rendered/structured extraction was separately verified in the browser, but the complete catalog pipeline is not validated.
- **Qodo:** installed for `heykatie/ezcon`; Qodo reviewed PR #1 and produced findings that were triaged and fixed with regression tests across review rounds. The first merged PR provides real review evidence. The current follow-up must be reviewed as a new PR; do not claim Qodo reviewed the uncommitted follow-up until a completed review is visible.

## Current local follow-up changes

The uncommitted change set updates the navigation to four tabs, separates Quests/Side Quests, refreshes the UI styling, and adds historical WAD goodies/raffle replay data with explicit source and uncertainty labels. The WAD event app’s historical listings were inspected while authenticated. On October 24, the owner authorized public display of historical listing content only; no attendee list, private profile, real ticket photo, barcode or ticket entry is used. TuxCare’s listing says AirPods Pro 3 winner announced Sept 24, 2026 at 4 PM at booth 631; entry and mandatory presence are unstated. Text Control’s PS5 listing directs attendees to scan a QR at booth 624; draw time is unknown. Current test coverage asserts the sample ticket (`DEMO-0427`) remains fictional and cannot be recorded as a real entry. Source inventory and boundaries are in `DATA_SOURCES.md`.

Latest local checks before the final pass: `npm test` passed 146 tests; `npm run build` passed; targeted app tests passed 18 tests. These were run after the follow-up UI and data changes. Re-run all relevant checks before commit, including the graph contract suite if local Docker is available, and inspect the actual changed files. Do not claim the app has been visually verified against this exact local build unless the updated page is opened and inspected.

## Current deployment and submission state

- Existing public cached demo: https://ezcon-six.vercel.app . It was previously verified signed out, but currently serves the prior deployment and does not yet contain the follow-up UI/WAD replay changes.
- After checks, deploy the built `dist/` to the existing Vercel project only. The earlier project deployment used the Vercel CLI as `heykatie`; verify the linked project before running production deployment. Do not create a second Vercel project from the open “New Project” page. Frontend build must remain free of credentials and private profile data.
- The required 3–5 minute demo video has not been recorded or uploaded. Capture the changed flow with fictional data; explain the problem in about 30 seconds, then show the solution and clearly attribute TrueForge/OpenAI, Bright Data, FalkorDB and Qodo to the real evidence each produced. Historical WAD content must be labeled as a replay. Do not show participant details or a real ticket.
- Upload a viewable video (unlisted YouTube or link-viewable Drive was authorized earlier), verify it in a signed-out session, then submit both the live URL and video URL through the organizer’s actual submission portal. The public PTC page establishes the October 24 event and 5:30 PM judging time, but no submission destination has been verified in this workspace. Do not submit to an inferred or arbitrary destination; locate the organizer’s actual portal or ask Katie for it once the links are ready.
- Optional: add Katie’s LinkedIn URL to My QR only after she provides the exact URL. GitHub and portfolio links are already supported.

## Recording priorities

1. State the specific problem: conference job boards, session agendas and travel research are disconnected, so an attendee on a tight budget cannot tell which real opportunity is worth attending or how to act on it.
2. Show a verified role connected to an event/person, with the actual graph-returned path and source/application link.
3. Add the event, show preparation and deterministic commute/parking cost-time choices, and demonstrate the schedule constraint.
4. Record a fictional meeting and show the persisted graph relationship changing the follow-up/recommendation.
5. Show one bounded live TrueForge → Bright Data call and its returned source fields, then Qodo’s real review/fix evidence. Clearly label which content is cached, live or historical replay.
6. Use raffle/goodies replay briefly as a special attendee insight only if the extra time supports the core story. Explain that the historical raffle’s entry/presence terms remain unknown.

The audience should see the tool doing useful work, not just a list of logos: the exact Bright Data source fetch, TrueForge’s bounded call, a real FalkorDB graph path that drives an answer, and a Qodo finding followed by a fix and passing test. Do not describe the authenticated event-app listing as a Bright Data scrape; the WAD goodies/raffle replay was manually inspected in the user’s authenticated browser with owner authorization.

## Remaining completion gates

- Finish final code/docs verification and inspect the updated UI on a phone-sized viewport and keyboard path.
- Create a follow-up branch/PR, request Qodo review, address actionable findings with regression tests, and merge only after the review is ready and checks pass.
- Deploy the checked build to the existing Vercel project; confirm the public URL serves the new version signed out and contains no secret/private state.
- Record, upload and signed-out verify the demo video; locate the real organizer submission portal and submit both links before the deadline if it remains open.
- Report verified versus simulated behavior, URLs, review/test evidence and any submission/deadline blocker accurately.

No personal spending is authorized. Use confirmed free/sponsor credits only; fail closed if a call might incur a personal charge.
