# ezcon build brief

Status: approved product direction; implementation and integrations require verification.

## Problem and promise

Conference opportunities are scattered across agendas, speaker pages, company sites and side-event listings. Attendees struggle to decide where to go, whom to meet, what they can afford and how to follow through. ezcon connects evidence to personal goals, creates a feasible plan and remembers what happens next.

## Users and scope

Primary demo: an early-career developer seeking relevant roles, learning and conversations. Secondary fictional founder: hiring, customers and partnerships. Editable local profiles; no registration. Public recordings use fictional profile details and meeting notes. Real personal information stays local and out of Git.

Use a conference card and known official source pages; refresh real information and accept a public side-event URL. GitHub Universe 2026 is the default for upcoming discovery, current role research, preparation and future scheduling. Use a completed WeAreDevelopers conference edition for retrospective features when its verified published data is richer. Select the exact edition/date and verify each source before ingestion; no assumption that maps, attendee lists or raffle times are public. Do not claim exhaustive event or attendee coverage.

Each feature may use the conference that best demonstrates it. Conference/edition and Past event or Upcoming labels stay visible. Retrospective memories use genuine user-authorized notes or clearly fictional demo interactions, never inferred meetings. Distinguish currently open roles from historical openings; present-day hiring is not evidence a role existed at the past event. Do not silently combine venue maps, booth locations, schedules or attendee records across conferences. A demonstration replay uses an explicit simulated clock and never sends real reminders.

## Core journey

1. Customize companion character, name and color; edit goals, skills, budget, availability and transport preferences.
2. Research sessions, speakers, workshop hosts, represented companies, side events and official job openings.
3. Explain recommendations through evidence paths. Roles must connect to companies represented at the event; sponsorship, employee participation and booth presence are distinct facts.
4. Compare relevant events and full itineraries by admission, gas/tolls/parking or transit, likely food spending and travel buffers. Enforce hard constraints. Unknown cost means feasibility is unconfirmed; prizes do not offset expenses.
5. Add to a schedule and offer one preparation step: tools/prerequisites, role research, introduction practice or questions.
6. Post-event: Went / Met someone / Skipped; optional quick note. Persist meetings and suggest editable next actions.
7. Award a passport sticker and companion progress once per confirmed achievement. Self-reported attendance is labeled; corrections reverse awards; no penalties or daily streak requirement.

Goal modes: Find opportunities, Learn & build, Meet & explore. Developer demo starts with career and learning goals; modes remain editable.

## Demo MVP

One conference week, 5–10 selected events, a bounded people/company graph, a few current roles, one parking comparison, one persistent interaction and one follow-up draft. Companion dashboard: opportunity cards, timeline and chat drawer. One accessory unlock. No automatic email, applications, purchases or bookings. Full arbitrary-conference discovery and elaborate avatar creation are deferred.

## Product validation and business

Initial audience: budget-conscious conference attendees. Test whether users can choose a relevant feasible outing and complete a useful next action with less research. Initial distribution: conference communities and side-event hosts. Monetization remains undecided; validate repeat usefulness before introducing paid features. No paid subscription or sponsor API spending is authorized by this brief.

## Success criteria

- Every consequential public claim has a source, retrieval time and evidence status.
- Recommendations expose real graph paths rather than invented model explanations.
- Missing evidence never becomes confirmed attendance, hiring or free parking.
- Conflicting events, timezone boundaries, admission restrictions and return travel are handled.
- Profile switching never exposes another profile's notes, meetings or plans.
- A meeting survives reload and changes the next query; rewards cannot duplicate.
- Failures preserve a usable result with clearly marked stale/cache status.

## Judging evidence

FalkorDB: multi-hop queries, explainable paths and memory. Bright Data: fresh difficult-to-retrieve public data, provenance and failure handling. TrueForge/OpenAI: actual agent tool execution and explanations. Qodo: substantive PR reviews and fixes throughout development. These are targets, not implemented claims.

## On-the-go mode and venue routes

Use a companion dashboard with a persistent Next Up card, large thumb-reachable controls and optional nonblocking bottom-sheet prompts. Each contextual prompt has at most three primary choices and Later/Dismiss, preserves entered state, supports undo, and never interrupts typing, camera use or another prompt. Default prompts: leave for a fixed commitment, mark arrival/skip/replan, confirm a raffle reminder, and a deferred post-event meeting check-in. Quiet mode and grouped overdue prompts prevent alert fatigue. In-app timing does not imply background notification delivery or live location tracking.

Map and timeline represent the same itinerary. Fixed talks/workshops/meetings/raffles constrain flexible booth stops. Offer Best opportunities, Least walking and Balanced routes with tradeoffs; compute paths over verified walkable edges, accounting for floors and accessibility. Use manual current-location selection and Arrived in MVP. Public campus images and sponsor building/floor statements do not establish exact booth coordinates, accessible paths or indoor positioning. If detailed verified geography is unavailable, use a visibly labeled schematic and estimated travel buffers; do not claim turn-by-turn or live indoor navigation.

Research evidence checked October 24, 2026: https://tailscale.com/universe-26 publicly identifies Gateway Pavilion level 2, links a campus-map image and advertises demo-related plushies and a keyboard raffle. Draw time and precise booth position were not established. Public availability does not establish redistribution permission for the map asset. Verify asset usage rights before embedding.

## Booth discoveries, raffles and meeting recall

Product scope includes booth giveaways, demos and raffles with sourced booth locations, eligibility, closing/draw times, timezone and whether physical presence is required. Unknown schedules are not invented. Save a ticket photo privately, extract its number and associated draw, and require user confirmation before scheduling a reminder. Preserve the original image for correction; ticket identifiers and photos never enter public source data or Git. Photos may contain barcodes or redeemable codes and should not appear in public recordings. Local in-app reminders are distinct from background/device notifications; delivery while closed or asleep is not promised until tested and supported by the chosen deployment.

After a scheduled event, load available authorized/public participant records with their evidence status. Registered, RSVP accepted, publicly listed, checked-in and user-confirmed met are separate states. An event ending does not establish who attended. If verified check-in data is unavailable, show publicly listed participants and explain the limitation. Users can privately mark whom they met or add someone absent from the list; do not use photo face recognition. Ask the user to resolve duplicate names.

Passport rewards include a booth discovery sticker, one raffle-participation sticker per confirmed draw, and a follow-through badge. Do not award points for uploading duplicate tickets, spending, winning or collecting personal information. Optional reminders and corrections are easy to dismiss or undo. Keep reward value modest so raffles do not override the user's learning, career, time and budget goals.

Hackathon delivery: these are approved product requirements; use one bounded raffle flow as a candidate demo extension after the recommendation/memory core. Comprehensive booth schedules, verified check-in imports and reliable background notifications remain unimplemented until individually verified.

## Remaining decisions

Exact source subset, ranking weights, model and API budgets, latency targets, fallback dataset and hosting remain to be finalized. User confirms all four tracks can be entered. Multiple-prize eligibility and pre-event-code permission are separate and remain unverified.

## Quick networking card

Keep My QR reachable in one tap from the dashboard. Store editable GitHub, LinkedIn and optional portfolio HTTPS URLs in the local profile. Generate QR codes locally, with large labeled LinkedIn/GitHub toggles, Open profile and Copy link. These are ordinary URL QR codes generated by ezcon, not platform-issued identity codes. No OAuth, account import or registration in MVP. Cache the card for offline display after setup; verify offline behavior before claiming support. Validate links and reject executable or unsupported URL schemes. Public demo uses fictional or explicitly approved public links.
