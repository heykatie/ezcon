// Demo fixtures. Every public fact carries its source; fictional data is labeled fictional.
import type { Conference, ConferenceId, Goal, RoleRecord, SessionRecord, SourceRef } from '../domain/types';
import type { ParkingRule, TravelOption } from '../domain/travel';
import universe from './universe26.json';
import wad from './wad26na.json';
import roles from './roles.json';
import { checked } from './checked';

export const SNAPSHOT_DATE = '2026-10-24';

export const SESSIONS: Record<ConferenceId, SessionRecord[]> = {
  universe26: universe as SessionRecord[],
  wad26na: wad.records as SessionRecord[],
};

export const WAD_RUN = wad.run;
export const ROLES = (roles as RoleRecord[]).map((r) => {
  const c = checked(`role-${r.source.note?.replace(/\D/g, '')}`, r.source);
  return c.via === 'bright-data' ? { ...r, source: { ...r.source, note: `${r.source.note}; listing page also retrieved via Bright Data ${c.retrievedAt.slice(0, 16).replace('T', ' ')} UTC` } } : r;
});

export const CONFERENCES: Record<ConferenceId, Conference> = {
  universe26: {
    id: 'universe26',
    name: 'GitHub Universe',
    edition: '2026',
    timezone: 'America/Los_Angeles',
    startDate: '2026-10-28',
    endDate: '2026-10-29',
    venue: 'Fort Mason Center, 2 Marina Blvd, San Francisco',
    mode: 'upcoming',
    source: { url: 'https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog', retrievedAt: '2026-10-24T21:05:00Z', via: 'manual-browser', status: 'verified' },
  },
  wad26na: {
    id: 'wad26na',
    name: 'WeAreDevelopers World Congress North America',
    edition: '2026',
    timezone: 'America/Los_Angeles',
    startDate: '2026-09-23',
    endDate: '2026-09-25',
    venue: 'San José',
    mode: 'past',
    source: { url: 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions', retrievedAt: '2026-10-24T21:30:41Z', via: 'bright-data', status: 'verified' },
  },
};

export interface DemoProfile {
  id: string;
  name: string;
  fictional: boolean;
  headline: string;
  interests: string[];
  goals: Goal[];
  maxYearsExperience: number;
  budgetCents: number;
  origin: string;
  companion: CompanionKind;
  companionName: string;
  color: string;
  links: { github: string; linkedin: string; personal: string };
}

export type CompanionKind = 'robot' | 'duck' | 'cat' | 'fox';

export const COMPANIONS: Record<CompanionKind, string> = {
  robot: 'Pocket robot',
  duck: 'Rubber duck',
  cat: 'Pixel cat',
  fox: 'Circuit fox',
};

export const DEMO_PROFILE: DemoProfile = {
  id: 'profile:demo',
  name: 'Riley',
  fictional: true,
  headline: 'Early-career React & Python developer exploring AI tools',
  interests: ['AI: Agents', 'AI: MCP and other integrations', 'Accessibility', 'Developer experience (DX)'],
  goals: ['career', 'learn'],
  maxYearsExperience: 1,
  budgetCents: 2000,
  origin: 'Downtown Oakland (fictional demo origin)',
  companion: 'robot',
  companionName: 'Bolt',
  color: '#7c6cf2',
  // The demo persona is fictional; its QR shares the ezcon creator's real public profile (approved by the owner).
  links: { github: 'https://github.com/heykatie', linkedin: 'https://www.linkedin.com/in/katieleonght/', personal: '' },
};

export const BLANK_PROFILE: DemoProfile = {
  ...DEMO_PROFILE,
  id: 'profile:me',
  name: '',
  fictional: false,
  headline: '',
  goals: [],
  companionName: 'Bolt',
  origin: '',
  links: { github: '', linkedin: '', personal: '' },
};

export const INTEREST_OPTIONS = [
  'AI: Agents',
  'AI: MCP and other integrations',
  'AI: Models',
  'Accessibility',
  'Developer experience (DX)',
  'Code quality, review, and completion',
  'Tech debt',
  'DevOps and DevSecOps',
];

// ---- Side quest: one sourced raffle ---------------------------------------------------

export interface SideQuest {
  id: string;
  title: string;
  host: string;
  where: string;
  prize: string;
  entry: string;
  unknowns: string[];
  conference: ConferenceId;
  source: SourceRef;
  draw?: string;
  historical?: boolean;
  sampleTicket?: string;
}

export const WAD_GOODIES_SOURCE: SourceRef = {
  url: 'https://app.wearedevelopers.com/events/18/goodies',
  retrievedAt: '2026-10-24T23:08:02Z',
  via: 'manual-browser',
  status: 'verified',
  note: 'Inspected in the signed-in attendee app with the owner’s permission to show these event listings publicly; past-event replay, not a current offer.',
};

export const SIDE_QUESTS: SideQuest[] = [
  {
    id: 'sidequest:universe26:tailscale-keyboard-raffle',
    title: 'Tailscale keyboard raffle',
    host: 'Tailscale',
    where: 'Tailscale booth, Gateway Pavilion, Level 2',
    prize: 'One of three 8BitDo Retro 87 mechanical keyboards',
    entry: 'Watch a booth demo and grab a raffle ticket',
    unknowns: ['Draw time not published', 'Whether you must be present is not stated'],
    conference: 'universe26',
    source: { url: 'https://tailscale.com/universe-26', retrievedAt: '2026-10-24T21:45:00Z', via: 'manual-browser', status: 'verified' },
  },
  {
    id: 'sidequest:wad26na:tuxcare-airpods',
    title: 'Day 1 Raffle to win Apple AirPods Pro 3',
    host: 'TuxCare',
    where: 'Booth 631',
    prize: 'Apple AirPods Pro 3',
    entry: 'The event listing does not state how to enter.',
    unknowns: ['Entry conditions and whether the winner had to be present were not stated'],
    conference: 'wad26na',
    source: { ...WAD_GOODIES_SOURCE, url: 'https://app.wearedevelopers.com/events/18/activity/179' },
    draw: 'Winner announced September 24, 2026 at 4:00 PM PDT',
    historical: true,
    sampleTicket: 'DEMO-0427',
  },
  {
    id: 'sidequest:wad26na:textcontrol-ps5',
    title: 'Win a PlayStation 5',
    host: 'Text Control',
    where: 'Booth 624',
    prize: 'PlayStation 5',
    entry: 'Scan the QR code at booth 624 to enter.',
    unknowns: ['Draw time and whether the winner had to be present were not stated'],
    conference: 'wad26na',
    source: { ...WAD_GOODIES_SOURCE, url: 'https://app.wearedevelopers.com/events/18/goodie/265' },
    historical: true,
  },
];

/** Curated items visibly listed in the authenticated WAD attendee app's Goodies catalog. */
export const WAD_GOODIES = [
  { name: 'Owl Plushie', host: 'Twilio' },
  { name: 'Owl Builder Set', host: 'Twilio' },
  { name: 'Get Inked!', host: 'SAP' },
  { name: 'Unique Smart Tag', host: 'SAP' },
  { name: 'Beats Solo 4 Headset', host: 'SAP' },
  { name: 'Lego Pacman Arcade', host: 'SAP' },
  { name: 'Desk Cable Organizer', host: 'SAP' },
  { name: 'Quack! Quack!', host: 'SAP' },
  { name: 'Webcam cover', host: 'SAP' },
  { name: 'Laptop Stickers', host: 'Entire' },
  { name: 'Entire Tees', host: 'Entire' },
  { name: 'Tote bag', host: 'Entire' },
  { name: 'Free yo-yos!', host: 'Text Control' },
  { name: 'California Calling: Grab a Frisbee!', host: 'Text Control' },
  { name: 'LavinMQ book', host: 'LavinMQ' },
  { name: 'Stickers', host: 'LavinMQ' },
  { name: 'Wooden cup', host: 'LavinMQ' },
  { name: 'Pen', host: 'LavinMQ' },
  { name: 'RabbitMQ book', host: 'LavinMQ' },
];

// ---- Getting there: Downtown Oakland → Fort Mason Center, Wed Oct 28 -------------------

const FORT_MASON_SOURCE: SourceRef = checked('fort-mason-parking', {
  url: 'https://fortmason.org/visit/directions-parking/',
  retrievedAt: '2026-10-24T21:20:00Z',
  via: 'manual-browser',
  status: 'verified',
  note: 'Event-day rates; the page says fees may increase on high-attendance dates.',
});

export const FORT_MASON_LOT: ParkingRule = {
  id: 'fort-mason-center',
  name: 'Fort Mason Center lot (event-day rate)',
  windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '07:00', end: '24:00', pricing: { type: 'tiered', tiersCents: [600, 1200, 1800, 2400, 3000] } }],
  outsideWindows: 'free',
  closesAt: '24:00', // overnight parking not permitted
  source: FORT_MASON_SOURCE,
};

const BART: SourceRef = { url: 'https://api.bart.gov/api/sched.aspx?cmd=fare&orig=12th&dest=embr&date=10/28/2026', retrievedAt: '2026-10-24T21:15:00Z', via: 'official-api', status: 'verified', note: 'Clipper adult fare 12th St Oakland ↔ Embarcadero on Oct 28, 2026' };
const MUNI: SourceRef = checked('muni-fare', { url: 'https://www.sfmta.com/getting-around/muni/fares', retrievedAt: '2026-10-24T21:50:00Z', via: 'manual-browser', status: 'verified', note: 'Adult Clipper single ride; a $2.85 inter-agency transfer discount may apply and is not counted' });
const TOLL: SourceRef = { url: 'https://mtc.ca.gov/about-mtc/authorities/bay-area-toll-authority/2026-toll-increase-high-occupancy-vehicle-hov-policy-updates', retrievedAt: '2026-10-24T21:50:00Z', via: 'manual-browser', status: 'verified', note: 'Two-axle toll $8.50 from Jan 1, 2026; Bay Bridge collects westbound only' };

export const UNIVERSE_TRAVEL: TravelOption[] = [
  {
    id: 'transit',
    name: 'BART + Muni 30 Stockton',
    mode: 'transit',
    outboundMinutes: [60, 80],
    returnMinutes: [60, 85],
    walkMinutes: 10,
    fares: [
      { label: 'BART 12th St → Embarcadero', cost: { kind: 'known', cents: 450 }, direction: 'outbound', source: BART },
      { label: 'Muni to Fort Mason', cost: { kind: 'known', cents: 285 }, direction: 'outbound', source: MUNI },
      { label: 'Muni to Embarcadero', cost: { kind: 'known', cents: 285 }, direction: 'return', source: MUNI },
      { label: 'BART Embarcadero → 12th St', cost: { kind: 'known', cents: 450 }, direction: 'return', source: BART },
    ],
    lastReturnDeparture: '2026-10-29T00:22', // last listed Embarcadero → 12th St departure (BART API)
    notes: ['Ride times are estimates from static schedules, not live departures.', 'Fort Mason Center lists Muni lines 28, 30, 30X, 43 and 49.'],
    sources: [BART, MUNI],
  },
  {
    id: 'drive',
    name: 'Drive + Fort Mason Center lot',
    mode: 'drive',
    outboundMinutes: [30, 55],
    returnMinutes: [30, 50],
    walkMinutes: 4,
    fares: [
      { label: 'Fuel, ~28 mi round trip (estimate: 25 mpg, $4.80/gal)', cost: { kind: 'known', cents: 540 }, direction: 'round-trip' },
      { label: 'Bay Bridge toll (westbound only)', cost: { kind: 'known', cents: 850 }, direction: 'one-way', source: TOLL },
    ],
    parking: [{ rule: FORT_MASON_LOT, commitmentIds: [] }], // filled with the day's commitments at evaluation time
    notes: ['Fort Mason Center says fees may increase on high-attendance dates, so this total could exceed the budget.', 'No parking space is guaranteed.', 'Fuel is an estimate; traffic is not modeled.'],
    sources: [FORT_MASON_SOURCE, TOLL],
  },
];

/** Fictional finished day at WAD NA 2026 for the demo profile (real session listings). */
export const DEMO_PAST: Array<{ eventId: string; checkin: 'went' | 'met' | 'skipped'; met?: { name: string; company: string; note: string } }> = [
  { eventId: 'wad26na:1917', checkin: 'met', met: { name: 'Michael Irwin', company: 'Docker', note: 'reproducible agent sandboxes with Docker' } },
  { eventId: 'wad26na:1919', checkin: 'went' },
  { eventId: 'wad26na:1921', checkin: 'skipped' },
  { eventId: 'wad26na:1870', checkin: 'went' },
];

export const DEMO_CLOCKS = [
  { id: 'real', label: 'Real time', now: undefined as string | undefined },
  { id: 'wed-0800', label: 'Wed Oct 28, 8:00 AM (simulated)', now: '2026-10-28T08:00:00-07:00' },
  { id: 'wed-1315', label: 'Wed Oct 28, 1:15 PM (simulated)', now: '2026-10-28T13:15:00-07:00' },
];
