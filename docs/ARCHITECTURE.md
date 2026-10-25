# Proposed architecture

Status: design, not an implementation inventory.

## Components and data flow

React/TypeScript dashboard → Node/TypeScript application API → TrueForge SDK → OpenAI-powered agent and narrowly scoped MCP tools. For live Luma discovery only, an optional server-side OpenAI Responses API web-search fallback supports direct cited event search and fills gaps when Bright Data cannot extract a usable event.

Research tools retrieve public sources through Bright Data, normalize structured facts and record provenance. The OpenAI web-search fallback returns clickable citations, and its event details remain marked unconfirmed until checked. Validated graph tools write/query FalkorDB. Application code owns money arithmetic, dates, constraints, authorization, profile separation and rewards. Models extract and explain; they do not certify facts or authorize actions.

TrueForge standalone runs locally with SQLite; FalkorDB runs locally with a named Docker volume. Durable domain memory lives in FalkorDB, separate from transient agent conversation. Credentials stay server-side and outside the repository. Shared hosting requires a separate authentication and storage design; do not expose unauthenticated local services publicly.

## Graph

Public entities: Conference, Event, Session, Person, Company, Role, Topic, Venue and Source. Relationships include PART_OF, SPEAKS_AT, HOSTS, EXHIBITS_AT, WORKS_AT, ABOUT and OFFERS_ROLE. Participation claims carry evidence type, source and retrieval time; employer affiliation alone does not imply booth staffing or attendance.

Private entities: Profile, Goal, Plan, Meeting, Note, Action and Achievement. Relationships include HAS_SKILL, PURSUES, SCHEDULED, MET, AT_EVENT, RECORDED and COMPLETED. Every private entity and relationship is scoped to a profile. Queries require validated profile scope; do not let the model choose arbitrary identities.

Recommendation paths link profile goals/skills to roles, companies, representatives and sessions. Output includes supporting paths and explicit tradeoffs, not unsupported claims of hiring likelihood.

## Tool boundaries

- Research: allowlisted source types; public URLs only; prevent private-network fetching and bound requests/costs. Direct OpenAI web search requires a server-side API key and `EZCON_OPENAI_FREE_CREDITS_CONFIRMED=true`; never send keys to the browser.
- Extraction: schema validation, deduplication, source timestamps and unknown fields.
- Graph: parameterized, bounded query templates; separate read and write tools; no unrestricted model-generated Cypher execution.
- Planning: timezone-aware intervals, travel buffers, cost ranges, eligibility and hard constraints.
- Memory: idempotent, profile-scoped meeting/check-in writes.
- Actions: draft and preview only for MVP. External execution requires separate explicit approval.
- Rewards: deterministic achievement IDs; one award per accomplishment; reversible corrections.

## Integration gates (current status in BUILD_HANDOFF.md)

1. Confirm real Qodo review on a meaningful PR; documentation review alone does not verify code review.
2. Universe rendered retrieval works; implement container-scoped session parsing and verify date/time/speaker fields against golden records.
3. Execute an OpenAI-powered TrueForge tool call only after API credits and request budget are confirmed.
4. Integrate graph queries and demonstrate a remembered interaction changing a recommendation.
5. Test a complete flow with isolated fictional fixtures, then record a live demo.

## Evaluation cases

Use a baseline and at least ten cases: missing venue, unknown parking price, forced-entry page failure, conflicting sessions, overnight/timezone boundaries, unsupported attendee claim, unsuitable role, expired role, cross-profile access attempt and duplicate check-in. Evaluate extraction correctness, source support, constraint violations, completion, tool choices, latency and request cost. Initial gates: zero cross-profile leaks, zero duplicate awards, zero knowingly unsupported confirmed facts and zero hard-constraint violations in the fixture set. Model-quality thresholds and latency/cost targets remain to be agreed before AI feature implementation.
