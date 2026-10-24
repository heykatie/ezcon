# Demo plan: 3–5 minutes

Judging emphasis: problem statement and demonstration. Target recording: four minutes. All integrations shown as live must be live; label cached, fictional and post-event-preview data.

## Conference selection

Use GitHub Universe for upcoming research, relevant current opportunities, preparation and future scheduling. Prefer a completed WeAreDevelopers edition for meeting recall, historical agenda/route replay, event recap, follow-up and passport progress when verified public data supports those features. Choose maps, booths and raffles by source completeness rather than conference preference. Verified historical edition: World Congress 2026 North America, September 23–25 in San José. The public archive lists 315 sessions, with sampled session time/stage/speaker/company fields. Its authenticated app now provides goodies and timed booth activities; Floor 2 booth/stage layout is visually verified; walking edges, travel estimates and participant contents remain unverified. Show an explicit conference switch and time/status label; fictional interactions and a replay clock remain labeled. Keep one user-goal story across the switch rather than implying both conferences are one itinerary.

## Recording storyboard: target 4 minutes 30 seconds

| Time | Story | Visible proof |
| --- | --- | --- |
| 0:00–0:30 | I cannot research every company, locate every booth and remember every conversation while attending a conference on a budget | One goal, availability and budget; no feature-list introduction |
| 0:30–1:10 | Companion researches one useful opportunity | Live TrueForge/OpenAI call to Bright Data; source, retrieval time and extracted fields. Use a tested source; label historical WAD data |
| 1:10–2:00 | Why this person and booth? | Run a bounded multi-hop FalkorDB query returning p. Highlight actual returned nodes/edges in the app; briefly show graph browser/query as verification. Explain one specific relationship chain in plain language |
| 2:00–2:35 | Make the opportunity feasible | Deterministic cost/conflict check, one preparation action. Include one sourced timed raffle only if built; unknown presence rules stay unknown. Route preview optional and labeled estimated |
| 2:35–3:25 | Remember what happened and change the next recommendation | Mark a fictional meeting, reload/start a fresh conversation, query persisted MET relationship; person moves from meet-next to follow-up. Show the new graph path and editable action |
| 3:25–3:40 | Make networking easy | My QR and one reversible achievement; skip founder switch unless time remains |
| 3:40–4:15 | Show engineering improvement | One or two real Qodo findings, fixes and passing regression tests, with PR links. Installation or generated summary is not completed review evidence |
| 4:15–4:30 | Close on attendee value | A relevant person, feasible plan and remembered next action; compact four-tool contribution recap |

If only three minutes, preserve the problem, real source retrieval, graph path and cross-session memory; cut founder, avatar, QR and routes first. For five minutes, add one honest failure/unknown-data recovery. Do not pad with setup screens.

## FalkorDB track: required evidence

Checked against https://labs.falkordb.cloud/labs/ptc on October 24, 2026.

- **Graph at the core:** the app must consume graph query results for recommendations and memory. A decorative graph visualization does not satisfy this.
- **Explainable answers:** return the real path p and render its nodes/relationships. Every highlighted edge must come from the query response, not a model-generated rationale.
- **Real conference problem:** demonstrate a person/booth relevant to the user's goals, with schedule/budget constraints and source-backed participation. Do not invent a job to complete the story.
- **Working demonstration:** execute the path query live and show a persisted meeting changing a subsequent query after reload/new conversation. A prerecorded output fixture must be labeled cached/synthetic.

Candidate career path: Profile → matching skill/topic → Role → Company → Person → Session/Event. Use only verified edges; missing suitable roles must produce an honest alternative. Candidate booth path: Profile → Interest ← Activity → Booth → Company, with activity time and source. Private meeting path: Profile → MET → Person → WORKS_AT → Company, tied to event and user confirmation. These are proposed domain paths, not existing application queries.

Before recording, verify: nonempty real path response; displayed graph matches response; source links remain correct; fresh conversation sees saved memory; profile isolation; failure states; no secrets/ticket barcodes/private notes on screen. Keep a labeled cached fallback and avoid re-fetching a full catalog during the video.

## Recording script and checklist (final, October 24, 2026)

Target 4:30. Record the **local live** app (`http://localhost:5173`, badge “Live local · FalkorDB Cloud (TLS)”). Use https://ezcon-six.vercel.app only for the closing shot, and say it is the cached public demo.

### Pre-flight (5 minutes before recording)

- [ ] `npm run check:roles` first — roles must have been checked within 72 hours or Hiring connections hide them.
- [ ] Then start (or restart) the ezcon API (`npm run dev:api`) so it seeds the graph with the rechecked roles; web (`npm run dev`) and TrueForge on localhost:8790 running.
- [ ] Companion menu → Reset demo data, then Try the demo. Demo clock: Real time.
- [ ] Close `.env`, terminals with secrets, the TrueForge settings page and personal tabs. No real names beyond public speaker listings.
- [ ] Tabs ready: ezcon local; TrueForge UI; FalkorDB Cloud graph browser (graph `ezcon`); PR #1 review and triage comment; terminal with `npm test` / `npm run test:graph` output.

### Positioning

Lead with the career opportunity plan, not generic session recommendations. The distinctive chain on screen: verified open role → company connected to the conference (speaker/session) → direct employer application link with an honest fit caveat → that touchpoint added to the schedule → one concise prep step → cost- and time-aware commute comparison. Why it is more actionable than a generic recommender: it ends in concrete next steps (apply, attend this talk, read this listing, leave at this time for $14.70), each backed by a source, instead of a list of interesting talks. Learning/networking picks appear as “Also worth your time” and stay secondary.

### Beats

| Time | Show | Say (short) | Live or cached |
| --- | --- | --- | --- |
| 0:00–0:30 | Title card “Turn a conference into a practical career opportunity plan”, then Today | “I go to conferences hoping for my next role, but the pieces are scattered: job boards don’t know who’s speaking, agendas don’t know who’s hiring, and I’m on a $20 travel budget. Plenty of apps recommend sessions. ezcon answers a sharper question: which open job here connects to a person I can actually go see, and how do I get there prepared and on budget?” | — |
| 0:30–1:05 | Today with *Find my next opportunity* on → Hiring connections card | Open Microsoft role, checked time, the talk by a speaker listed with Microsoft, “not a referral”, *View role & apply* (employer page) kept separate from *Add event to Schedule*. | Roles: live check via Microsoft’s official careers API (`npm run check:roles`), **not** Bright Data. Sessions: browser-verified Universe capture. |
| 1:05–1:35 | *Why this fits* sheet → FalkorDB browser running `MATCH p=(s:Session)<-[:SPEAKS_AT]-(:Person)-[:WORKS_AT]->(:Company)-[:OFFERS_ROLE]->(:Role) RETURN p LIMIT 5` | **FalkorDB’s job:** holds sessions, speakers, companies, roles and my private meetings as one graph; the app renders the exact path the parameterized query returned. | Live (FalkorDB Cloud). |
| 1:35–2:20 | *Getting there* on the event → up to three choices; *Add event to Schedule* → Undo toast; add an overlapping session → Keep existing / Replace / Cancel; Schedule tab → day timeline, Get ready, More tips, day travel cards | Deterministic code owns money and time: BART + Muni $14.70, drive + park $19.90 with the high-attendance warning; conflicts are never rearranged silently. | Fares/rules recorded Oct 24 from official sources; times are estimates. |
| 2:20–3:00 | Discover → *Research a source (live)* → Run live research; then TrueForge UI showing the same session | **TrueForge/OpenAI’s job:** runs the agent (gpt-5.4-nano) with only one Bright Data tool enabled, bounded steps and a deadline. **Bright Data’s job:** fetches the hard-to-scrape page (≈82K chars). ezcon’s own parser extracts the fields — the model never supplies facts; tool calls off the approved URL are rejected. | Live. Mention: Universe catalog via Bright Data returned only the shell, so Universe sessions in the app come from a verified browser capture. |
| 3:00–3:40 | Companion menu → Demo clock *Wed Oct 28, 1:15 PM (simulated)*; Schedule → *How did it go?* on “Build once…” → Met Andrea Griffiths (fictional demo meeting) → menu → *Start a fresh session* → Today now ranks the accessibility panel “You met Andrea Griffiths (GitHub); Ed Summers… speaks here” → Why this fits shows MET → WORKS_AT → WORKS_AT → SPEAKS_AT; People → Met → follow-up draft (copy only, never sent) | Memory lives in FalkorDB, survives a reconnect and changes the next recommendation. | Live graph; meeting and clock are labeled fictional/simulated. |
| 3:40–4:15 | PR #1: Qodo review 5640206642 findings → triage comment → commit 1d8c077 → terminal `npm test` (123 passed) and `npm run test:graph` (9 passed) → re-review if it completed | **Qodo’s job:** reviewed the real PR; e.g. concurrent check-ins could duplicate meetings — the new test reproduced it on FalkorDB, an atomic MERGE fixed it. One finding was declined with a reason. | Real PR evidence. |
| 4:15–4:30 | Discover → Search conferences & events (type “San Francisco”); Today → *Coming next* card; then ezcon-six.vercel.app | Close: relevant role + talk, an affordable plan, a remembered next step. Coming next items are concept previews; the public link is the cached demo. | Search: verified official pages. Previews: not working features. Vercel: cached snapshot. |

If short on time, cut the search and Coming next shots first; keep the problem, live research, graph path, memory change and Qodo loop.

### After recording

Upload unlisted to YouTube (or link-viewable Drive), open the link in a signed-out/private window, then submit the video link and https://ezcon-six.vercel.app.
