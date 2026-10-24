# ezcon implementation handoff

Current checkpoint: October 24, 2026. This replaces earlier chronological notes. Requirements are approved; app implementation is not complete.

## Repository and first action

Repo: https://github.com/heykatie/ezcon . Local checkout: /Users/ktl/.codex/.chatgpt-projects/g-p-6ac0ad85292c819193bd2cb8455afc50/ezcon . Branch: docs/ezcon-build-plan. Existing PR: https://github.com/heykatie/ezcon/pull/1 . Verify cwd, remote, branch and working tree before editing; preserve unrelated work. Do not merge/rewrite history without authorization. Read applicable AGENTS.md, then BUILD_BRIEF.md, SCREEN_PLAN.md, TRAVEL_PLAN.md, ARCHITECTURE.md, DATA_SOURCES.md and DEMO.md. This document is the implementation entry point; latest approved decisions here and in those contracts override earlier proposals.

Only official FalkorDB client and a cloud verification script are implemented. There is no React frontend, application API, ingestion pipeline, agent-to-graph connector or Vercel deployment. The root package has falkordb 6.9.2 and npm run check:graph. All other features below are planned.

## Problem and demo story

Conference information is scattered; attendees must decide which opportunities matter, fit them into a realistic affordable day, and turn conversations into next steps while busy on the go. ezcon connects goals to evidence, explains recommendations and remembers interactions. Career is the motivation; learning/networking is the dependable core journey.

Use a fictional early-career React/Python developer interested in AI tools. Real career listings only when verified suitable and tied to a represented company; no invented openings. Developer experience first; founder is optional later. No signup. Real personal notes stay local; public demo data and meeting history are fictional and labeled.

## Approved MVP and UI

Warm companion dashboard plus Adventure passport rewards. Bottom tabs: Today / Discover / Schedule / People. My QR in header. Companion menu: My companion / Passport / Profile & preferences. Passport also opens from a small Today progress strip.

- Try the demo opens Today with fictional preconfigured profile. Make it yours opens companion/profile setup. Use robot as a provisional demo default; editable, not a gate.
- Four approved soft 3D companion concepts: pocket robot, rubber duck, pixel cat, circuit fox. Same abilities, name/color customization, one accessory.
- Today: companion and optional goal chips, Next Up, up to three qualifying recommendations, optional side-quest summary, passport strip. Empty schedule: Let’s plan your first stop.
- Goals: Find my next opportunity / Learn & build / Meet people / Explore & have fun. Multi-select, optional; developer starts career + learning.
- Discover: Quests for goal-directed learning/career/networking; Side Quests for parties, happy hours, goodies, games and raffles. Shared canonical event IDs, no duplicate schedule/reward records.
- Schedule: entire day at a glance, including departure, arrival/check-in, fixed and flexible stops, breaks/open time, between-event travel and return. One Get ready action; More tips expands.
- Add immediately if conflict-free, with Undo. If time/travel conflicts: Keep existing / Replace / Cancel. Never silently rearrange.
- People: Want to meet / Met. One bounded professional enrichment flow from supported public sources; official bios, personal/company pages or accessible LinkedIn. Source and timestamp per fact; no guessed identity merges, private-data scraping or inferred attendance/staffing/availability. Private notes are separate.
- Check-in: Met someone / Went, didn’t connect / Skipped / Later. Optional note, editable follow-up draft, never send automatically.
- Passport shows companion and Explorer / Connection / Follow-through stamps. First Connection unlocks one accessory. Idempotent, reversible awards; no XP economy, penalties, spending or winning rewards.
- My QR: GitHub / LinkedIn / Personal or Portfolio. Optional validated HTTPS links. QR, open and copy agree with selection; no OAuth. Verify scanning and offline display.

Large tap targets, visible keyboard focus, reduced-motion alternative, no hover-only controls. Prompts are optional/nonblocking and do not interrupt camera/typing. Core actions never require chat.

## Travel and parking are core

Free/pass-covered admission. $20/day maximum for round-trip transport, gas/tolls/parking; food separate. Lowest cost preferred within hard constraints; show extra travel time. Unknown costs cannot certify feasibility; prizes never offset costs.

Every scheduled event/day exposes best verified options found: Cheapest overall / Closest practical parking / Best transit. One candidate can have multiple labels. Include door-to-door time, station access, waits/transfers, walking, full-day total, actual parking date/time rules and garage closure/return-transit feasibility. Compare leaving car parked vs moving it; avoid double-counting shared parking. No guaranteed space or universal-cheapest claims. Implement one bounded sourced day comparison first. TRAVEL_PLAN.md provides required edge cases.

## Architecture and storage

React/TypeScript → Node/TypeScript API → TrueForge SDK/OpenAI + scoped tools → Bright Data research and FalkorDB. Application code owns money, dates, constraints, profile identity/scope, authorization and rewards. Model interprets/extracts/explains; schema-validate outputs. Use parameterized bounded graph templates, not arbitrary generated Cypher. Preserve source URL, retrieved_at, valid_for and evidence status; normalize relative links against the fetched URL, not localhost.

Cloud graph is available; local persistent graph is fallback. TrueForge conversation SQLite is not domain memory. Private entities must be profile scoped; no arbitrary profile ID from the model. Public cached demo state may live in browser-local storage with fictional fixtures; do not imply cross-device persistence. No public unauthenticated access to local TrueForge or graph. Avoid additional orchestration/memory frameworks for first build.

Proposed tools: research_source, find_opportunities, explain_path, compare_travel, plan_schedule, record_meeting, draft_followup. Narrow read/write separation; explicit confirmation for consequential external actions. MVP drafts only, no messages, applications, bookings or purchases. User-supplied URLs require SSRF defenses and private-network rejection.

## Sponsor setup and build order

1. **Qodo first and throughout.** GitHub app installed for ezcon only (installation 174723440). Summary posting works, but every attempted /agentic_review has failed provider-side, including latest code PR retry. Portal sign-in now works, but onboarding still requests Git connection. GitHub owner reauthentication completed. Installation confirmed active with ezcon-only access, but Qodo portal shows no GitHub connection. A possible reinstall to reconcile the workspace link requires owner approval; do not uninstall without it. Do not expand repo access or buy plans. Inspect license/review preset/configuration; run a meaningful review and preserve finding → fix → regression test evidence. If still failing, report concrete blocker and ask sponsor support; do not invent review success or manufacture bugs. Do not let repeated retries consume the build.
2. **FalkorDB.** Run npm ci and npm run check:graph. FALKORDB_URL exists only in local ignored .env, mode 0600; never display it. Official Node client 6.9.2 verified with full falkors:// TLS URL, timeout/no reconnect loop. Cloud graph conference has five fixture nodes/five edges, real returned path and synthetic MET surviving reconnect. Repeated seed is idempotent. Cloud lab expires 48 hours after provisioning: export before expiry if retaining new work. Local ezcon-falkordb has named volume ezcon-falkordb-data and loopback ports 6379/3000; snapshot survived restart. Do not delete either database. Fixture is public session + derived topic + fictional attendee/meeting, not a real meeting or production recommendation.
3. **Bright Data.** Account/connector configured; 5,000 free credits were visible at earlier checkpoint. $50 patch50 promo redemption unverified. Current free tier covers shared research requests; Browser API is metered at 5 credits/MB. Recheck balance before calls. WAD page via Web Unlocker returned matching fields. Universe Web Unlocker returned shell only. Rendered-browser navigation and text retrieval now work, but generic flattened extraction misassociated neighboring times. Use per-session DOM container/detail parsing and golden records, not blanket LLM extraction. See DATA_SOURCES.md for current evidence.
4. **OpenAI + TrueForge.** TrueForge 0.180.0 local localhost:8790; saved OpenAI provider and Bright Data connector configured privately. API grant $50 received Oct23, expires Nov22; observed Oct24 before calls. Only confirmed free/sponsor credits, no personal spending. gpt-5-4-nano produced a response and live WAD tool retrieval with correct fields (~32 seconds, one page fetch, multiple discovery steps). This is UI workflow verification, not SDK integration proof. Server can stop between turns: restart cached official CLI if needed. Wire SDK to API, enable only necessary tools, bound iterations and external requests. Universe browser navigation succeeded; a transient model connection error interrupted follow-up and read was recovered without renavigation.
5. **One vertical slice.** Fresh source → validated facts → graph write/query returning path → recommendation UI → schedule/prep → confirmed meeting → reload/new session → changed recommendation and follow-up. Then add QR, stamp/accessory and one sourced raffle. Test-first behavior changes; do not build broad catalogs before core works.
6. **Public link/video.** Approved deployment: Vercel cached fictional demo; video shows live local integrations. Vercel import page is open but app is not deployed. Frontend contains no secrets (including no VITE_* keys/graph URLs). Label cached data and snapshot date. Interactive planning/meeting demo can be browser-local with Reset demo. No false live integrations. Record 3–5 minutes, ~30s problem, target4:30. Upload unlisted YouTube or link-viewable Drive and verify signed-out access. Do not change sharing or upload private notes/credentials without appropriate authorization.

## Sources and demo proof

- WAD North America2026, Sept23–25, San José. Public archive has315 sessions; main site has rolled to2027, so preserve edition.
- https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-making-works-on-all : Michael Irwin, Docker, Sept23 10–10:30, Stage1. Retrieved/checked through Bright Data.
- Authenticated WAD app event18: https://app.wearedevelopers.com/events/18/map ; Floor2 map rendered. Walkable edges/scale/accessibility unverified. Do not transmit cookies to Bright Data or assume permission to publish authenticated data/media.
- TuxCare raffle https://app.wearedevelopers.com/events/18/activity/179 : Sept24 4PM booth631, AirPods Pro3. Entry/presence requirement unknown. TextControl PS5 booth624 needs scan; drawtime unknown.
- Universe2026 public catalog https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog :157 entries observed. Rendered retrieval works; field grouping needs validation. No attendee list or guaranteed speaker availability implied.

Video must show actual returned graph path, cross-session memory changing output, live tool trace/source freshness, deterministic budget/schedule checks and real Qodo review/fix evidence. Founder, advanced routes, ticket OCR, extra accessories and exhaustive data collection are cuts. Distinguish live/cached/synthetic/replay throughout. Historical replay sends no real reminders.

## Evaluation and completion gates

Baseline: deterministic filtering and source lookup. Use same golden cases after model integration. Test source/edition/timezone matching, session boundary parsing, missing venue/rates, parking enforcement changes, garage closure, unavailable return transit, conflicts, unsuitable/expired role, duplicate identity/meeting/award, undo, profile leaks, unsafe URLs, failed retrieval and cached status. Zero confirmed unsupported facts, profile leaks, duplicate rewards or hard-constraint violations in the fixtures.

Targets, not measurements: cached interaction <2s; bounded research <60s or explicit partial/failure; max5 external requests/refresh, max8 agent steps initially; no unlimited retry. Record observed latency/cost/tokens; stop before credit exhaustion. Do not use project budget alerts as assumed hard spending enforcement.

Inspect running responsive UI, keyboard flow, phone QR scanning, reload persistence and actual displayed totals. Final handoff back to owner must list implemented vs simulated vs unverified, tests run, sponsor evidence links, live URL, video link and remaining blockers. Never claim deployment, review, model output or integration success without evidence. Ask only for genuinely blocking secrets/owner actions or material product decisions; approved choices do not need reapproval.

## Last pre-handoff checks

Universe structured browser snapshot extraction matched one session's actual DOM-contained title, speaker, time and venue; see DATA_SOURCES.md for golden record and neighboring regression candidates. This resolves source-access uncertainty, not full-catalog extraction quality. Qodo portal sign-in now reaches onboarding, but existing installation configuration prompts GitHub Confirm access. User completed reauthentication. GitHub confirms active ezcon-only installation; Qodo Integrations still shows Add installation and no linked GitHub account. Reinstall repair proposed; user approval pending. No permissions expanded, no plan purchased. Latest review failure: https://github.com/heykatie/ezcon/pull/1#issuecomment-6389331252 .
