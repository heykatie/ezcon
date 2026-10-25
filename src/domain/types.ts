// Shared domain types. Application code (not models) owns every value here.

/** How a fact is supported. Only `verified` facts may be presented as confirmed. */
export type EvidenceStatus = 'verified' | 'derived' | 'estimated' | 'unconfirmed' | 'fictional';

export type RetrievalChannel = 'bright-data' | 'openai-web-search' | 'official-api' | 'official-page' | 'manual-browser' | 'fixture';

export interface SourceRef {
  url: string;
  retrievedAt: string; // ISO timestamp
  via: RetrievalChannel;
  status: EvidenceStatus;
  note?: string;
}

export type ConferenceId = 'universe26' | 'wad26na';

export interface Conference {
  id: ConferenceId;
  name: string;
  edition: string;
  timezone: string; // IANA
  startDate: string; // YYYY-MM-DD, local
  endDate: string;
  venue: string;
  mode: 'upcoming' | 'past';
  source: SourceRef;
}

export interface Speaker {
  name: string;
  title?: string;
  company?: string;
  /** Public speaker photo only when supplied by the authoritative conference page. */
  photoUrl?: string;
}

export type Catalog = 'quest' | 'side-quest';

export interface SessionRecord {
  /** Canonical ezcon id; one id per scheduled time slot. */
  id: string;
  conference: ConferenceId;
  /** Id of the DOM container or page the fields came from. */
  sourceRecordId: string;
  title: string;
  summary?: string;
  start: string; // ISO with offset
  end: string;
  timezone: string;
  location?: string;
  speakers: Speaker[];
  topics: string[];
  sessionType?: string;
  url: string;
  catalogs: Catalog[];
  source: SourceRef;
}

/** Public standalone event imported from a provider, not falsely assigned to a conference. */
export type ExternalEventRecord = Omit<SessionRecord, 'conference'> & { conference: 'external' };
export type EventRecord = SessionRecord | ExternalEventRecord;

export interface ExtractionReject {
  sourceRecordId: string;
  reason: string;
}

export interface ExtractionResult {
  records: SessionRecord[];
  rejected: ExtractionReject[];
}

export interface ExternalExtractionResult {
  records: ExternalEventRecord[];
  rejected: ExtractionReject[];
}

export type Goal = 'career' | 'learn' | 'meet' | 'fun';

export const GOAL_LABELS: Record<Goal, string> = {
  career: 'Find my next opportunity',
  learn: 'Learn & build',
  meet: 'Meet people',
  fun: 'Explore & have fun',
};

/** A job listing checked on the employer's own careers system. */
export interface RoleRecord {
  id: string;
  title: string;
  company: string;
  location: string;
  listingUrl: string;
  /** Employer application page; never an aggregator. */
  applyUrl: string;
  minYearsExperience: number | null;
  requirementSummary: string;
  status: 'open' | 'closed' | 'unverified';
  checkedAt: string;
  postedAt?: string;
  source: SourceRef;
}
