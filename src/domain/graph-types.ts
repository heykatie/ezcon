// Contract shared by the FalkorDB store (local API) and the in-browser store (cached demo).
import type { ConferenceId, RoleRecord, SessionRecord } from './types';

export type NodeLabel = 'Profile' | 'Topic' | 'Session' | 'Person' | 'Company' | 'Role';
export type EdgeType = 'INTERESTED_IN' | 'ABOUT' | 'SPEAKS_AT' | 'WORKS_AT' | 'MET' | 'OFFERS_ROLE';

export interface PathNode {
  id: string;
  label: NodeLabel;
  name: string;
}

export interface PathEdge {
  type: EdgeType;
  from: string;
  to: string;
  /** What supports this edge, e.g. "catalog topic badge" or "user-confirmed meeting (fictional)". */
  evidence: string;
  sourceUrl?: string;
  retrievedAt?: string;
}

/** A path exactly as returned by the store, in traversal order. */
export interface GraphPath {
  nodes: PathNode[];
  edges: PathEdge[];
}

export type CandidateKind = 'topic-match' | 'same-company-as-met';

export interface Candidate {
  sessionId: string;
  kind: CandidateKind;
  path: GraphPath;
}

export interface MeetingInput {
  meetingId: string;
  personId: string;
  eventId: string;
  at: string;
  fictional: boolean;
  note?: string;
}

export interface Meeting extends MeetingInput {
  personName: string;
}

export interface ProfileInput {
  id: string;
  interests: string[];
  fictional: boolean;
  name?: string;
}

export interface GraphStore {
  seedPublic(records: SessionRecord[]): Promise<void>;
  /** Public employer listings; only status "open" roles produce hiring paths. */
  seedRoles(roles: RoleRecord[]): Promise<void>;
  /** Session ← speaker → company → open role paths for a conference. */
  hiringPaths(conference: ConferenceId): Promise<GraphPath[]>;
  upsertProfile(profile: ProfileInput): Promise<void>;
  candidates(profileId: string, conference: ConferenceId): Promise<Candidate[]>;
  recordMeeting(profileId: string, meeting: MeetingInput): Promise<{ created: boolean }>;
  removeMeeting(profileId: string, meetingId: string): Promise<{ removed: boolean }>;
  meetings(profileId: string): Promise<Meeting[]>;
  /** A new store over the same persisted data (a fresh connection or a reloaded page). */
  reopen(): Promise<GraphStore>;
}

export const EVIDENCE = {
  interest: 'profile interest (user-selected)',
  topic: 'catalog topic badge',
  speaker: 'listed speaker in catalog',
  affiliation: 'affiliation listed in catalog speaker pill',
  meeting: 'user-confirmed meeting',
  role: 'listing on employer careers site',
} as const;
