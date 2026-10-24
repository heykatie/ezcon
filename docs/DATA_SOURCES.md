# Conference source inventory

Checked October 24, 2026. Public availability is not a license to redistribute media or an assurance of complete coverage. Sources have been inspected manually; one Bright Data playground retrieval has been verified; no ezcon ingestion pipeline exists.

| Source | Established facts | Limits and use |
| --- | --- | --- |
| [WAD 2026 North America archive](https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions) | September 23–25, San José; archive lists 315 sessions | Historical session discovery; do not import 2027 agenda |
| [Sample Docker session](https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-making-works-on-all) | Michael Irwin, Docker; September 23, 10:00–10:30, Stage 1; description and recording link | Speaker/company/session graph and preparation. Recording link does not prove playback access |
| [Text Control exhibitor recap](https://www.textcontrol.com/blog/2026/09/27/wearedevelopers-world-congress-north-america-2026/) | Booth 624, California-themed giveaways, PlayStation 5 raffle | Historical booth/raffle example; exact draw time, conditions and coordinates unverified |
| [WAD main site](https://www.wearedevelopers.com/world-congress-north-america/) | Now promotes September 28–30, 2027; some speakers labeled 2026 | Edition drift: not authoritative for the 2026 timetable |
| [Universe catalog](https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog) | Previously inspected public dynamic catalog | Recheck through Bright Data and compare fields before ingestion |
| [Tailscale Universe page](https://tailscale.com/universe-26) | Gateway Pavilion level 2, demo plushies, keyboard raffle, map link | Precise booth position, draw time and accessible walking edges unverified |

WAD platform login and separate 2026 event-app access are confirmed. The app menu includes Partners, Speakers, Attendees, Goodies and Booth Activities. An Attendees menu does not establish actual attendance or permission to republish participant details. Recording playback and participant contents are not verified. User may need the original ticket-linked event-app invitation. No participant should be labeled attended without check-in evidence; meetings require user confirmation.

For a bounded first dataset, select a small set of complete sessions and represented companies, then verify each linked role on its company careers site. Do not invent a role just to complete the demo story. If no suitable real role is found, show that result and recommend a learning or networking opportunity. Historical replay must display Past event and Replay labels.

## Authenticated event app verified October 24

Event ID 18 is World Congress 2026 North America.

- [Map](https://app.wearedevelopers.com/events/18/map) embeds https://wwc26usa.expofp.com/ with matching September 23–25, 2026 title, Floor 1/Floor 2 selectors, search and directory controls. The standalone Floor 2 plan subsequently rendered and was visually inspected: expo booths, stages, meeting areas, restrooms, food seating and circulation areas are visible. Floor 1 is selectable but not inspected. Routing edges, scale, floor transitions and accessibility still need validation; no live positioning verified.
- [Goodies](https://app.wearedevelopers.com/events/18/goodies) lists Twilio owl plushies/builder sets, SAP items, Entire items, Text Control giveaways, Google Cloud bags/tags/power banks and others. Item listing does not guarantee unconditional availability.
- [Text Control PS5 entry](https://app.wearedevelopers.com/events/18/goodie/265): scan QR at booth 624 to enter; no draw time established in the inspected detail.
- [Booth activities](https://app.wearedevelopers.com/events/18/booth-activities) includes raffles, product demos, hands-on labs and other activities.
- [TuxCare AirPods Pro 3](https://app.wearedevelopers.com/events/18/activity/179): winner announced September 24 at 4 PM at booth 631. This historical listing supports a scheduled raffle replay; entry conditions and mandatory presence are not stated in the inspected detail. Preserve source wording; confirm venue timezone when normalizing.

These pages were inspected using the user's authenticated browser. Do not pass browser cookies or credentials to Bright Data, or label these as verified public/API-accessible sources. Keep authenticated-source captures local unless publication is separately authorized. Test public retrieval separately. A source-backed raffle card is now supported; a small route preview is feasible after manually validating walkable edges and labeling travel estimates. Do not claim optimized or accessible routes until tested.

Bright Data smoke checks: WAD sampled session returned matching title/speaker/company/time/stage through Web Unlocker (HTTP 200). Universe catalog Web Unlocker preview returned only shell content despite HTTP 200; rendered retrieval remains necessary. These checks did not use the authenticated WAD event-app cookies.

## Universe rendered retrieval and extraction check

October 24: direct public catalog rendered 157 entries. Bright Data scraping_browser_navigate succeeded; a transient model connection error interrupted the following step. A subsequent scraping_browser_get_text read retrieved actual session content. Generic flattened-text extraction produced shifted neighboring times; do not use those outputs as data. A structured scraping_browser_snapshot extraction then correctly matched the same DOM session container:

| Field | Browser-verified value |
| --- | --- |
| Title | Beyond correct: Making code quality worth acting on |
| Speaker | Caro Galvin, Senior Product Manager, GitHub |
| Date/time | Wednesday October 28, 2026, 12:10–12:25 PM PDT |
| Venue | Demos & Donuts @ Gateway Pavilion, Level 2 |
| DOM record ID | session-1777658642130001QLdM-1785203706362001xLy6 |

Also independently verified in the direct DOM: Session After Party: Humans set direction. Agents close the loop. — Mario Rodriguez/Evan Boyle, October28 noon–12:30PM PDT, The Speakeasy @ GitHub Central, Festival Pavilion; The Low Orbit Agentic Cannon: Scaling Copilot through internal tooling — Callum Cieciala, October28 12:20–12:35PM PDT, Ship & Tell @ Firehouse. These three neighboring records are regression candidates to catch time shifts. One corrected agent record is not a validated full-catalog pipeline. Extract by each li.catalog-result.session-result container or bounded detail page; preserve source record IDs and timezones.
