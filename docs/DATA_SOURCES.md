# Conference source inventory

Checked October 24, 2026. The app includes bounded source-specific retrieval/parsing through TrueForge and Bright Data, plus cached conference snapshots. It does not provide exhaustive catalog coverage. Public availability is not a license to redistribute media or an assurance of complete coverage.

Live Luma event search and details import are available only in local live mode. A direct OpenAI Responses API `web_search` fallback can search cited upcoming Luma pages or fill a gap Bright Data cannot extract. Its facts remain unconfirmed; source citations are displayed for review. The fallback requires a server-side `OPENAI_API_KEY` and the explicit local flag `EZCON_OPENAI_FREE_CREDITS_CONFIRMED=true`, and is capped at 20 calls per local API process per day. No API request has been run from this checkout because no direct key is configured and the account's credit balance has not been verified. On the public static Vercel site, live search is unavailable; manual entry stays marked unconfirmed. External-event directions open Google Maps, while prices/times and parking availability remain unknown unless separately sourced.

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
- The owner explicitly authorized public display of historical event-app listings on October 24, 2026. This does not authorize publishing attendee identities, private profile details, ticket photos/barcodes, or claiming the owner entered or won.

The WAD replay uses a clearly fictional sample ticket ID (`DEMO-0427`) only to illustrate the interface. It is not a real entry, photo, reminder or reward. The historical raffle UI is read-only and sends no reminders.

The Goodies catalog visibly listed these items; the catalog does not guarantee remaining stock or state each item's entry conditions: Owl Plushie and Owl Builder Set (Twilio); Get Inked!, Unique Smart Tag, Beats Solo 4 Headset, Lego Pacman Arcade, Desk Cable Organizer, Quack! Quack! and Webcam cover (SAP); Laptop Stickers, Entire Tees and Tote bag (Entire); Free yo-yos! and California Calling: Grab a Frisbee! (Text Control); LavinMQ book, Stickers, Wooden cup, Pen and RabbitMQ book (LavinMQ).

These pages were inspected using the user's authenticated browser. Do not pass browser cookies or credentials to Bright Data, or label these as verified public/API-accessible sources. The owner separately authorized displaying the listed historical event content, but no attendee records or personal ticket data are included. A source-backed raffle and goodies replay is implemented; route optimization still requires manually validated walkable edges and estimated travel labels. Do not claim optimized or accessible routes until tested.

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
