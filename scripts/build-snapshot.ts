// Build the cached public-demo snapshot from verified captures:
// - Universe sessions: container-scoped parse of the browser-verified catalog capture
//   (live Bright Data retrieval of the catalog currently returns only the shell).
// - WAD session: the latest successful live Bright Data research run in .cache/research.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseUniverseCatalog } from '../src/domain/extract/universe';
import type { SessionRecord } from '../src/domain/types';

const UNIVERSE_URL = 'https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog';
const universe = parseUniverseCatalog(readFileSync('tests/fixtures/universe-catalog.html', 'utf8'), {
  sourceUrl: UNIVERSE_URL,
  retrievedAt: '2026-10-24T21:05:00Z',
  via: 'manual-browser',
  year: 2026,
});
writeFileSync('src/data/universe26.json', JSON.stringify(universe.records, null, 2) + '\n');
console.log(`universe26: ${universe.records.length} sessions, ${universe.rejected.length} rejected`);

const runs = (existsSync('.cache/research') ? readdirSync('.cache/research') : [])
  .filter((f) => f.startsWith('wad-session-'))
  .sort()
  .reverse()
  .map((f) => JSON.parse(readFileSync(`.cache/research/${f}`, 'utf8')) as { status: string; records: SessionRecord[]; trace: unknown[]; sessionId: string; durationMs: number; model: string; usage: unknown });
const ok = runs.find((r) => r.status === 'ok');
if (ok) {
  writeFileSync(
    'src/data/wad26na.json',
    JSON.stringify({ records: ok.records, run: { model: ok.model, durationMs: ok.durationMs, usage: ok.usage, trace: ok.trace } }, null, 2) + '\n',
  );
  console.log(`wad26na: ${ok.records.length} session from live run`);
} else {
  console.log('wad26na: no successful live research run found; src/data/wad26na.json left unchanged');
}
