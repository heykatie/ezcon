# ezcon screen and interaction plan

Status: the first-build screens and core interactions are implemented in `src/web/`; this document records the approved product contract and deferred coverage, not a claim that every listed behavior is complete. Verify against the code and `BUILD_HANDOFF.md` before extending scope.

## Entry and navigation

Try the demo → Today with a clearly labeled fictional profile and cached data notice on the public site. Make it yours → companion/profile setup, no registration. Bottom navigation: Today, Discover, Schedule, People. Discover contains Quests / Side Quests. Passport opens from Today’s progress strip or companion menu; companion menu includes My companion, Passport, Profile & preferences. My QR stays directly accessible in the header. Companion portrait opens profile/customization; My QR remains in the header. Chat is optional; every core task has a visible button. Desktop expands the same hierarchy into Today content plus day timeline; mobile keeps one main column.

## Today

- Greeting with small companion and conference/edition. Past/replay and upcoming modes never merge silently.
- What would make today a win? Four optional multi-select goal chips from BUILD_BRIEF.md. Selection updates recommendations; no full-screen onboarding gate.
- Next Up: title, time, location, next action. Nothing scheduled: Let’s plan your first stop.
- For your goals: 2–3 opportunities with short reason, time/location, known cost or unknown status, Save and Why this fits. When Career is selected, put verified hiring connections first and label them clearly as a role plus the related conference touchpoint.
- Side quests: optional relevant booth/raffle/social activity; disclose commitment and eligibility unknowns. Never outrank a hard schedule constraint.
- Passport strip: latest stamp/progress; tap opens Passport.

## Opportunity and comparison

Open from a card into a mobile sheet or desktop detail panel. Show goal match, company/person relationship, time/location, source and retrieval date, evidence status, cost/travel range, eligibility and a single Add to Schedule action. Why this fits expands an actual graph path with source-backed edges. No job match unless a represented company and real suitable opening are verified. A session does not guarantee access to its speaker.

### Career opportunity card

Make the career use case explicit in Today and Quests. A hiring connection pairs **a currently open role** with **a relevant conference touchpoint**: a company booth/event, or a talk/workshop/event whose verified host or speaker is affiliated with that hiring company. Show the role title and company, a clear `Open role` status with when it was checked, the named booth/session/person and time/location, one sentence explaining the evidence-backed connection, and a direct `View role & apply` link to the employer's application page. Keep `Add event to Schedule` separate from the application link. `Why this fits` must show the source path from event → company/person → role; don't imply a person is hiring, can refer the attendee or will be available unless that is separately confirmed.

Only call a role open when the official job listing is still live and has a working application URL at retrieval time. Show the employer source and retrieval time. If the role is closed, stale, inaccessible or not verified, don't present a hiring connection or invent an apply link; the event can still appear as a learning/networking match with that status clearly separated. Never auto-apply or submit profile data.

If options clash, compare them directly: goal relevance, full cost, travel, fixed commitments and unique value. User chooses; no silent removal. Unknown costs produce an unconfirmed estimate, not a within-budget guarantee.

## Getting there

Event details and Schedule offer Cheapest overall / Closest practical parking / Best transit option, with no duplicate filler. Include all daily legs, known cost ranges, walking, waits, date/time restrictions and return feasibility. Show unconfirmed status when inputs or evidence are missing. Follow TRAVEL_PLAN.md.

## Schedule and preparation

Chronological fixed commitments with realistic buffers; flexible booth stops distinct. Add/remove/undo with explicit conflict response. One prep card: prerequisite/tool, question to ask, role research or introduction. Optional route preview only after verified walking edges. Public cached demo can simulate planning locally but cannot claim fresh research or real background reminders.

## People and meeting check-in

People list is bounded to sourced speakers/participants; listed is not attended or met. After a planned event: Met someone / Went, didn’t connect / Skipped, with Later. Pick person or add privately, optional short note, explicit confirmation. Save scoped meeting; then offer one editable follow-up draft. Never send automatically. Undo/correct meeting also reverses dependent achievements.

## Passport

Collected event stamps, self-confirmed achievements and companion accessory. One award per achievement; show available next steps without locked-screen pressure, leaderboards, streak penalties or prize-value scoring. Compact animation with reduced-motion alternative. Side quests stay optional.

## Profile and networking card

Four companion choices, name/color, goals, skills, budget, availability and transport; progressive disclosure for details. More preferences is optional, but feasibility cannot be certified without required constraints. My QR: GitHub / LinkedIn / Personal or Portfolio switch, large URL QR, Open link, Copy link; editable HTTPS URLs, no OAuth. Hide missing-link options or offer Add link; do not generate a QR for a blank or invalid URL. No real QR or private contact details in public fixtures without authorization.

## Acceptance checkpoints

1. Demo opens Today without requiring customization; goals work by tap and keyboard.
2. Hard constraints beat goal score; no raffle prizes offset costs.
3. Evidence panel renders the actual graph path, with unsupported fields left unknown.
4. Meeting persists across a fresh session and changes the next recommendation.
5. Duplicate completion cannot duplicate rewards; undo updates memory and rewards.
6. QR encodes the validated intended URL; unsafe schemes rejected.
7. Public fixtures contain no private notes, ticket images, credentials or actual meeting claims.
8. Cached/public versus live/local and replay clock labels remain visible.
9. Primary controls accessible without chat, hover or long typing; no prompts interrupt entry/camera.
10. Failed research preserves labeled cached results without claiming freshness.

## Proposed build cuts

Protect source retrieval, returned graph path, schedule constraints, persistent meeting and follow-up. Cut order: founder switch, route preview, photo extraction, extra accessories, extra quests. Keep one raffle card, QR and one sticker simple. These do not justify delaying the main sponsor evidence.

## Review baseline

- Opening story: fictional React/Python developer, career motivation, learning/networking journey; no suitable verified job required for demo success.
- Budget: free/pass-covered admission, $20/day round-trip transport, lowest-cost preference, food separate and unknowns visible.
- Comparison: up to three qualifying choices, no filler.
- Save: immediate with Undo if conflict-free; otherwise Keep existing / Replace / Cancel.
- Preparation: one Get ready action with More tips.
- Check-in: Met someone / Went, didn’t connect / Skipped / Later.
- Passport: Explorer, Connection, Follow-through; first Connection unlocks one accessory, no XP economy.

The linked in-conversation wireframe is an interaction preview. Its state and illustrative comparison records are not a real itinerary, database integration or evidence of current availability. Final source subset still requires verification.

## Approved navigation expansion

- Passport prominently shows the chosen companion, name, equipped/unlocked accessory, stamps and Customize action.
- People has Want to meet and Met lists; detail includes public professional bio, role/company, topics/projects, relevant conference presence, professional links, why relevant, sources and retrieval times. Private meeting notes, where/when met and next action are separate from scraped public facts. A confirmed meeting moves the person into Met and remains editable/undoable.
- Enrichment uses Bright Data on supported public sources such as official bios, company pages, personal websites and publicly accessible LinkedIn information where permitted. No guarantee every LinkedIn page is accessible. No authentication bypass, private data harvesting, guessed identity merge or fabricated fields. Resolve duplicate identities conservatively. LinkedIn profile existence alone never proves attendance, booth staffing or availability. Missing fields stay missing. User can correct or add information privately. Public demo uses selected public professional fields and fictional meeting context.
- Schedule shows the full day at a glance: outbound journey and arrival, fixed commitments, flexible booth/networking stops, breaks/open time, between-event travel and return home. Mark estimated/unconfirmed segments and show full-day cost. Date selector prevents mixing historical days. Prep/details expand without replacing the overview.
- Quests is the relevant-opportunities catalog: sessions, workshops, hackathons and career/networking opportunities. Filters use selected goals and constraints; compare and add to Schedule.
- Side Quests is a separate optional fun catalog: social events, parties, happy hours, raffles, booth goodies and games. Apply the same eligibility, date/time, budget, travel and conflict validation; never let the label bypass constraints. Use one canonical event ID if an item qualifies for both catalogs. No duplicate scheduled entries or reward farming.
- Raffle capture saves a typed ticket number or locally resized photo as soon as either is added. Then ask the attendee to choose a reminder time or enter the draw time; ezcon schedules the reminder 15 minutes before a supplied draw time. A due reminder appears in ezcon and can use browser alerts after the attendee enables them. If the app was closed at the due time, show the overdue reminder next time it opens. Draw times remain unknown until a source or attendee provides one. Historical raffles never create active reminders. Ticket images and reminder details remain on the current device/profile.
- Today keeps compact summaries and links to these catalogs; do not cram every opportunity into the home screen.

First build: one public-profile enrichment example with honest missing fields, Want to meet/Met views, one sourced main quest, one sourced raffle side quest and full-day overview. Extensive people enrichment and arbitrary event discovery are later coverage, not assumed complete.

## Navigation and networking card update

Approved bottom navigation is Today / Discover / Schedule / People. Schedule replaces the label Schedule everywhere in product copy. Quests means goal-directed learning, career and networking opportunities; Side Quests means optional social/fun discoveries. Both live inside Discover; overlapping items share one record with both labels. Passport is secondary through companion menu and Today strip.

My QR supports three equally accessible destinations: GitHub, LinkedIn, Personal / Portfolio. The third accepts an editable personal-site or portfolio HTTPS URL; it does not require an account connection. QR generation, displayed destination, Open link and Copy link must agree with the selected option. Validate URLs and preserve per-profile isolation; do not expose private contact details. Network requests are not needed to generate the QR. A user can leave any link blank. Offline availability remains a verification requirement.

### Sponsor activity feedback

Live service calls show a small, non-blocking notice in the upper-right corner for four seconds: FalkorDB graph requests and TrueForge + OpenAI research. Completion and request failure update the notice. Bright Data receives a completed-fetch notice only when the returned research trace contains a supported scrape tool with response content; the current API does not stream tool-level progress. Cached operations never claim a live sponsor call. Qodo operates in the repository review workflow, not in the app runtime. Notices use a polite status region and respect reduced motion.

### Preparation and badge terminology

Preparation controls say “Mark prep complete” before completion and “✓ Prep complete” afterward. They are reversible toggles and only describe preparation, never event attendance. The collection is labeled “Badge collection”; rewards are badges. Existing internal reward keys remain unchanged to preserve saved progress.
