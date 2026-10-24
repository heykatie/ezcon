// Prefer Bright Data provenance: when scripts/verify-sources.ts found the displayed values on
// the Bright Data copy of a page, the source is labeled Bright Data with that retrieval time.
import type { SourceRef } from '../domain/types';
import CHECKS from './source-checks.json';

type Check = { url: string; retrievedAt: string; ok: boolean };

export function checked(id: string, fallback: SourceRef): SourceRef {
  const c = (CHECKS as Record<string, Check>)[id];
  return c?.ok ? { ...fallback, url: c.url, via: 'bright-data', retrievedAt: c.retrievedAt, status: 'verified' } : fallback;
}
