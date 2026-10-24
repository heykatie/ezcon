# ezcon screen and interaction plan

Status: layout direction approved; detailed wireframes and demo dataset remain reviewable proposals. This is a screen contract, not implemented UI.

## Entry and navigation

Try the demo → Today with a clearly labeled fictional profile and cached data notice on the public site. Make it yours → companion/profile setup, no registration. Main navigation: Today, My Day, People, Quests, Side Quests, Passport. Keep all six visible with labels; mobile layout must wrap or otherwise avoid cramped tap targets. Companion portrait opens profile/customization; My QR remains in the header. Chat is optional; every core task has a visible button. Desktop expands the same hierarchy into Today content plus day timeline; mobile keeps one main column.

## Today

- Greeting with small companion and conference/edition. Past/replay and upcoming modes never merge silently.
- What would make today a win? Four optional multi-select goal chips from BUILD_BRIEF.md. Selection updates recommendations; no full-screen onboarding gate.
- Next Up: title, time, location, next action. Nothing scheduled: Let’s plan your first stop.
- For your goals: 2–3 opportunities with short reason, time/location, known cost or unknown status, Save and Why this fits.
- Side quests: optional relevant booth/raffle/social activity; disclose commitment and eligibility unknowns. Never outrank a hard schedule constraint.
- Passport strip: latest stamp/progress; tap opens Passport.

## Opportunity and comparison

Open from a card into a mobile sheet or desktop detail panel. Show goal match, company/person relationship, time/location, source and retrieval date, evidence status, cost/travel range, eligibility and a single Add to My Day action. Why this fits expands an actual graph path with source-backed edges. No job match unless a represented company and real suitable opening are verified. A session does not guarantee access to its speaker.

If options clash, compare them directly: goal relevance, full cost, travel, fixed commitments and unique value. User chooses; no silent removal. Unknown costs produce an unconfirmed estimate, not a within-budget guarantee.

## Getting there

Event details and My Day offer Cheapest overall / Closest practical parking / Best transit option, with no duplicate filler. Include all daily legs, known cost ranges, walking, waits, date/time restrictions and return feasibility. Show unconfirmed status when inputs or evidence are missing. Follow TRAVEL_PLAN.md.

## My Day and preparation

Chronological fixed commitments with realistic buffers; flexible booth stops distinct. Add/remove/undo with explicit conflict response. One prep card: prerequisite/tool, question to ask, role research or introduction. Optional route preview only after verified walking edges. Public cached demo can simulate planning locally but cannot claim fresh research or real background reminders.

## People and meeting check-in

People list is bounded to sourced speakers/participants; listed is not attended or met. After a planned event: Met someone / Went, didn’t connect / Skipped, with Later. Pick person or add privately, optional short note, explicit confirmation. Save scoped meeting; then offer one editable follow-up draft. Never send automatically. Undo/correct meeting also reverses dependent achievements.

## Passport

Collected event stamps, self-confirmed achievements and companion accessory. One award per achievement; show available next steps without locked-screen pressure, leaderboards, streak penalties or prize-value scoring. Compact animation with reduced-motion alternative. Side quests stay optional.

## Profile and networking card

Four companion choices, name/color, goals, skills, budget, availability and transport; progressive disclosure for details. More preferences is optional, but feasibility cannot be certified without required constraints. My QR: LinkedIn/GitHub switch, large URL QR, Open profile, Copy link; no OAuth. No real QR or private contact details in public fixtures without authorization.

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
- My Day shows the full day at a glance: outbound journey and arrival, fixed commitments, flexible booth/networking stops, breaks/open time, between-event travel and return home. Mark estimated/unconfirmed segments and show full-day cost. Date selector prevents mixing historical days. Prep/details expand without replacing the overview.
- Quests is the relevant-opportunities catalog: sessions, workshops, hackathons and career/networking opportunities. Filters use selected goals and constraints; compare and add to My Day.
- Side Quests is a separate optional fun catalog: social events, parties, happy hours, raffles, booth goodies and games. Apply the same eligibility, date/time, budget, travel and conflict validation; never let the label bypass constraints. Use one canonical event ID if an item qualifies for both catalogs. No duplicate scheduled entries or reward farming.
- Today keeps compact summaries and links to these catalogs; do not cram every opportunity into the home screen.

First build: one public-profile enrichment example with honest missing fields, Want to meet/Met views, one sourced main quest, one sourced raffle side quest and full-day overview. Extensive people enrichment and arbitrary event discovery are later coverage, not assumed complete.
