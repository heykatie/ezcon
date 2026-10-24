# ezcon build brief

Status: approved product direction; implementation and integrations require verification.

## Problem and promise

Conference opportunities are scattered across agendas, speaker pages, company sites and side-event listings. Attendees struggle to decide where to go, whom to meet, what they can afford and how to follow through. ezcon connects evidence to personal goals, creates a feasible plan and remembers what happens next.

## Users and scope

Primary demo: an early-career developer seeking relevant roles, learning and conversations. Secondary fictional founder: hiring, customers and partnerships. Editable local profiles; no registration. Public recordings use fictional profile details and meeting notes. Real personal information stays local and out of Git.

Start with GitHub Universe 2026 and known official source pages; refresh real information and accept a public side-event URL. Do not claim exhaustive event or attendee coverage.

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

## Open decisions

Exact source subset, ranking weights, model and API budgets, latency targets, fallback dataset and hosting remain to be finalized. Pre-event code and multiple-track eligibility are user-directed planning assumptions, not organizer-confirmed rules.
