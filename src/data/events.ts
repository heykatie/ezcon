// Verified upcoming events (official pages checked Oct 24, 2026). Past editions such as
// WeAreDevelopers North America 2026 live in the demo/replay data, not here.
import type { EventListing } from '../domain/events';

const checked = '2026-10-24T22:10:00Z';

export const UPCOMING_EVENTS: EventListing[] = [
  {
    id: 'universe26',
    name: 'GitHub Universe 2026',
    startDate: '2026-10-28',
    endDate: '2026-10-29',
    location: 'Fort Mason Center, San Francisco, CA',
    supported: true,
    source: { url: 'https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog', retrievedAt: '2026-10-24T21:05:00Z', via: 'manual-browser', status: 'verified' },
  },
  {
    id: 'kubecon-na-26',
    name: 'KubeCon + CloudNativeCon North America 2026',
    startDate: '2026-11-09',
    endDate: '2026-11-12',
    location: 'Salt Palace Convention Center, Salt Lake City, UT',
    source: { url: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/', retrievedAt: checked, via: 'official-page', status: 'verified' },
  },
  {
    id: 'ignite-26',
    name: 'Microsoft Ignite 2026',
    startDate: '2026-11-17',
    endDate: '2026-11-20',
    location: 'San Francisco, CA and online',
    source: { url: 'https://www.microsoft.com/en-us/security/blog/2026/09/30/secure-whats-next-your-guide-to-microsoft-security-at-microsoft-ignite-2026/', retrievedAt: checked, via: 'official-page', status: 'verified' },
  },
  {
    id: 'reinvent-26',
    name: 'AWS re:Invent 2026',
    startDate: '2026-11-30',
    endDate: '2026-12-04',
    location: 'Las Vegas, NV',
    source: { url: 'https://aws.amazon.com/events/reinvent/', retrievedAt: checked, via: 'official-page', status: 'verified' },
  },
];
