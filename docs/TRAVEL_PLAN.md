# Getting there: product and verification contract

Status: approved feature direction; no travel research engine implemented. Every scheduled event and My Day must expose getting-there options. A saved event can remain transport-unconfirmed; never fabricate feasibility.

## What the attendee sees

Up to three best verified options found: Cheapest overall, Closest practical parking, Best transit option. One option may win multiple labels; do not duplicate it to fill cards. Display round-trip cost range, door-to-door duration, walk distance/time, departure/arrival buffer, evidence age and availability/unknowns. Lowest cost is the demo preference subject to constraints; admission must be free or pass-covered, transport <= $20/day. Food is separate. No universal-cheapest or guaranteed-space claims.

Event details → Getting there → compare → select → update My Day. My Day includes home-to-first-event, between-event and return legs, and totals each cost once. Different dates reset the daily cap. A same-venue booth/session does not create another commute or parking fee. Confirm an origin area privately only when needed; exact home address is optional and never public fixture data. Walking/accessibility preferences must be editable.

## Research and normalization

- Confirm venue address/entrance, event date, timezone, arrival and departure; distinguish venue from recommended parking entrance.
- Parking evidence: exact lot/garage or block and side, enforcement days/hours, meter/time limits, street cleaning, permit/event exceptions, garage opening/closing and overnight access, validated rates/fees, reservation window, re-entry and cancellation where applicable. On-street availability remains unknown unless actually supplied. Posted signs govern conflicts with online data.
- Transit: correct travel day, station access, initial drive/parking if needed, walking, expected wait range, ride, transfers, fare, service hours and viable return. No claim of realtime traffic or departures from static schedules.
- Driving: route distance, fuel price/efficiency assumptions, directional tolls, parking duration/rate/fees and walking. State estimates; total using deterministic code.
- Public data retrieved with Bright Data where supported; retain source URL, fetched_at, valid_for date/time and status. Prefer city/transport/operator sources; venue guidance and aggregators remain separately labeled.
- No source may certify free parking solely from proximity, neighborhood reputation or an event ending after enforcement stops. No private contact location may be disclosed to a third party without consent.

## Day-level planning

Compare keep-car-parked + walk/transit with move-car, accounting for every new entry fee, time limit, closure and return path. Do not sum independent round trips for each event. Late arrival can be offered only with the missed agenda segment and saving shown; user chooses. It cannot bypass check-in deadlines or critical commitments silently. If nothing fits, report that and suggest feasible changes rather than ranking an invalid option as suitable.

## Required cases

1. Arrive 5 PM, free after 6 PM: include pre-6 cost and any time limit; not all-free.
2. Saturday: evaluate Saturday rules, not weekday defaults.
3. Free two-hour street parking and eight-hour event: reject unless legal relocation is explicitly feasible and accepted.
4. Garage closes before departure: reject unless documented late retrieval is possible.
5. Two events sharing garage: charge once if valid, not twice.
6. Move car to second lot: include both charges and travel.
7. Transit outbound works but last return does not: mark infeasible or show explicit alternative cost.
8. No verified rate or sign conflict: mark unconfirmed, never $0.
9. Toll applies one direction: count once.
10. Predicted prize/free food cannot reduce transportation cost.
11. Lowest-cost trip arrives late: not eligible without explicit late-arrival choice.
12. Public cached demo: show recorded prices/dates and no live-space promise.

## Hackathon boundary

Implement one bounded, sourced venue/day comparison and day totals first, with a fictional public origin and recorded estimates. Reusable research across arbitrary cities, live occupancy, bookings and unrestricted routing are later work. Unknown/stale cost paths are part of the demo, not hidden behind fabricated figures. Route optimization inside the conference remains a separate optional feature.
