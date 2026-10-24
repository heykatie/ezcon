# ezcon implementation handoff

## Start here

Read BUILD_BRIEF.md, ARCHITECTURE.md, DEMO.md and DATA_SOURCES.md. Product requirements are approved direction; they do not establish implementation. Repository: heykatie/ezcon. Continue docs/ezcon-build-plan and existing PR #1 unless user chooses another branch. Do not merge, overwrite unrelated work, or publish private profile data. At this checkpoint the repo contains documentation, README and license; no application implementation.

## First implementation milestone

One developer journey: edit local profile → research a bounded conference → explain a recommendation through real graph paths → compare feasible options → schedule and prepare → confirm meeting → remember it and draft a follow-up. Add networking QR and one reversible sticker. Founder, elaborate avatar, route replay and raffle photo flow remain extensions unless user explicitly reprioritizes.

Use React/TypeScript with a Node/TypeScript API, TrueForge SDK and OpenAI, Bright Data research and the official FalkorDB Node client. Prefer a small local app and a local demo recording before hosting. Vercel is not a prerequisite; do not expose local databases or TrueForge without authentication. Pin SDK/package versions when adding dependencies, then verify interoperability. Avoid extra orchestration/memory frameworks initially.

## Minimal screens and interactions

1. **Today:** companion greeting; persistent Next Up; relevant opportunity cards; day timeline. My QR and Edit profile always reachable. Chat is an optional drawer.
2. **Opportunity detail:** why it fits, source/time, company/person evidence, estimated cost/travel, Add to plan. Show unknown costs and eligibility clearly.
3. **Plan:** conflict-aware timeline; comparison of transport options and full cost; one preparation action.
4. **Meeting check-in:** Met / Not yet / Later; choose a public listed person or add one privately, optional note, editable follow-up. Undo available.
5. **Profile:** goals, skills, budget, availability, transport, companion name/color/character, GitHub/LinkedIn URLs. No signup.
6. **My QR:** one large locally generated URL QR, GitHub/LinkedIn toggle, Open profile, Copy link. Test phone scanning and offline display.

Use large tap targets, visible focus, labeled controls, short text and no hover-only interactions. Prompts are nonblocking, dismissible and suppressed during typing/camera use. Never require chat for basic actions.

## Integration verification order

1. Read-only Bright Data request against one selected public source; compare normalized fields with browser evidence. Confirm credits and spending controls first.
2. OpenAI-powered TrueForge call to one bounded tool; capture actual trace and usage without secrets. A configured provider is not proof a call works.
3. Query FalkorDB for real relationship paths. Write a profile-scoped synthetic meeting, reload and verify it changes retrieval.
4. Build a meaningful PR, receive a completed Qodo review, evaluate findings, fix valid ones and add regression tests.
5. Exercise the complete UI and record a 3–5 minute demonstration. Label cached, synthetic and replay data.

## Checkpoint evidence

- October 24: WeAreDevelopers sign-in confirmed in browser; separate event app ID 18 now verified with goodies and booth activity details; Floor 2 map rendered and visually inspected; walking graph, scale and accessibility remain unverified.
- October 24: Docker restarted; ezcon-falkordb running, restart unless-stopped, volume ezcon-falkordb-data mounted at /var/lib/falkordb/data, ports bound to 127.0.0.1. Read-only query returned 3 synthetic setup nodes after restart. This is not application integration proof.
- TrueForge 0.180.0 is present in local npm cache. Saved OpenAI key previously entered by user; credits and successful model execution remain unverified. Restarted and browser verified at localhost:8790/settings; UI shows OpenAI Connected. No model request made.
- Qodo generated a PR summary, but its code review reported a server-side failure: https://github.com/heykatie/ezcon/pull/1#issuecomment-6388415240 . A manual retry also failed on the provider side. Do not count the summary as completed code review; try a meaningful code PR, then provider support or Toolbox if it still fails.
- Bright Data dashboard shows 5,000/5,000 free credits, renewal November 1, 2026. The $50 hackathon promo, product coverage and API retrieval remain unverified. No personal API spending is authorized.

## Evaluation and acceptance

Write failing behavior tests before implementation. Use at least the ten cases in ARCHITECTURE.md plus unsafe profile URLs, QR link correctness, private note isolation and reward reversal. Baseline: source-supported lookup with deterministic filtering, before model ranking. Compare the same cases after adding the agent.

Proposed initial targets, to confirm before AI implementation: cached interactions under 2 seconds; bounded research completes within 60 seconds or returns an explicit partial/failure state; maximum 5 external research requests per refresh, maximum 8 agent steps, no automatic retries that exceed the cap. Record observed latency, tokens and provider cost; stop when confirmed credit budget is exhausted. These are design targets, not measured performance.

Hard gates: zero cross-profile leaks, duplicate rewards, unsupported confirmed attendance/parking/hiring claims or hard-constraint violations in fixtures. Monetary calculations and route/schedule arithmetic are deterministic. Model outputs are schema-validated. Unknown remains unknown. No automated messages, applications, bookings or purchases.

## Business and launch

Initial audience: budget-conscious attendees who need relevant conversations and follow-through. Validate with a short task: choose an affordable outing, identify a person to meet and retrieve the next action after a meeting. Distribution starts with conference communities and side-event hosts. Monetization and commercial launch are deferred until repeat value is demonstrated; do not turn this demo into a paid service.

## Decisions or owner actions still required

- Confirmed by user: free/sponsor credits only; no personal charges. Verify product coverage and stop before exceeding credits.
- Proposed: one sourced raffle card demonstrates research and graph use; defer photo extraction and routing until core works. User asked about sponsor value; final inclusion priority is still pending.
- Redeem/check Bright Data credits privately; confirm OpenAI sponsor credit access privately. Do not paste credentials into chat or Git.
- WAD event app is https://app.wearedevelopers.com/events/18/map ; authenticated access verified. See DATA_SOURCES.md for concrete raffle source and routing limitations.
- User confirmed all four tracks can be entered. Whether one project can win multiple prizes remains distinct; pre-event-code rules and exact submission mechanics still require organizer confirmation.

This document is a handoff for work in the existing repository, not authorization to create another Codex task.

## Organizer timing verified October 24

[Official schedule](https://www.wemakedevs.org/hackathons/ptc/schedule): build/submit block ends at 5:30 PM Pacific; presentations 5:30–6:30 PM, winners 6:30 PM, wrap 7 PM. Exact submission mechanics/cutoff still need organizer confirmation. [Overview](https://www.wemakedevs.org/hackathons/ptc) says OpenAI credits are claimed at the venue; Bright Data promo is patch50. It does not establish multiple-track winning eligibility or pre-event-code permission.

## Additional verification October 24

Separate synthetic graph ezcon_handoff_check: an unmet-speaker query initially returned synthetic-person; after MERGE of a profile-scoped MET relationship it returned no unmet person. This verifies database query behavior, not app-level authorization or recommendation quality. FalkorDB rejected traversal-pattern EXISTS syntax; use OPTIONAL MATCH plus m IS NULL for this tested query. SAVE succeeded. Keep this fixture separate from public conference facts.

Bright Data current free-tier documentation confirms Web Unlocker, SERP, Scraper and Browser APIs share the allowance; Browser API uses 5 credits per MB. See https://docs.brightdata.com/general/account/billing-and-pricing/free-tier . Free allowance is not 5,000 equivalent browser requests.

## Bright Data playground smoke tests

October 24, two manually triggered Web Unlocker requests using the existing authenticated playground and confirmed free-credit allowance:

1. WAD Docker session page: HTTP 200; returned title, Michael Irwin, Docker, September 23 10:00–10:30, Stage 1, matching previously inspected public browser fields. Retrieval works in provider playground; no ezcon API/SDK wiring yet.
2. Universe session catalog: HTTP 200, but preview only exposed page header/footer and no sessions. Treat as incomplete content, not successful catalog extraction. Next: test Browser API/rendered retrieval or an official data endpoint. No repeated requests made.

OpenAI billing page remained on browser verification; user handoff required before balance verification. No OpenAI model requests made and no personal funds authorized. Qodo remains blocked by previously observed provider review errors; do not repeatedly retry documentation reviews.

## OpenAI credit and connectivity verification

October 24: billing UI showed $50 available API credit in Personal organization. Credit Grants showed received October 23, 2026, state Available, balance $50/$50, expires November 22, 2026. No payment method was added.

TrueForge local UI: selected gpt-5-4-nano and sent a synthetic connectivity-only prompt with no tools. Response was EZCON_OK, displayed about two seconds after submission. This verifies one model response through the saved provider, not a sponsor workflow, tool call, model evaluation or measured billing cost. Trace/session remains local. Next step is a bounded real tool call through the application integration. No secrets or personal profile data were transmitted in this test.

## TrueForge + OpenAI + Bright Data verified together

October 24, 12:35:37–12:36:09 Pacific: user connected Bright Data using private key entry; settings showed Connected. New TrueForge chat selected gpt-5-4-nano with Bright Data attached. Agent trace showed tool listing, three tool-schema lookups and one scrape_as_markdown call. Retrieved source response and final output matched all requested session fields: title, Michael Irwin, Docker, September 23 10:00–10:30, Stage 1 and source URL. One external page retrieval observed; no research retries. Approximately 32 seconds end-to-end from displayed timestamps, not a performance benchmark; exact tokens/provider cost not measured.

This verifies live model-driven research in TrueForge UI. It does not verify the ezcon SDK/API, structured-output enforcement, graph ingestion or complete application. Discovery overhead should be reduced with a small enabled tool list and an explicit extraction schema. The markdown preview resolves relative links against localhost in the harness UI; normalize source links against the fetched page URL in application code. Do not copy harness-rendered localhost links into source records.
