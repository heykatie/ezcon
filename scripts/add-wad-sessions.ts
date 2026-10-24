// Add more WeAreDevelopers 2026 NA sessions (past event) to the demo snapshot.
// Fetches public session pages directly and extracts them with the tested parser.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseWadSession } from '../src/domain/extract/wad';
import type { SessionRecord } from '../src/domain/types';

const BASE = 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/';
const slugs = process.argv.slice(2);
const file = 'src/data/wad26na.json';
const data = JSON.parse(readFileSync(file, 'utf8')) as { records: SessionRecord[]; run: unknown };

for (const slug of slugs) {
  const url = BASE + slug;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 ezcon-snapshot' } });
  if (!res.ok) {
    console.log(`skip ${slug}: HTTP ${res.status}`);
    continue;
  }
  try {
    const r = parseWadSession(await res.text(), { sourceUrl: url, retrievedAt: new Date().toISOString(), via: 'official-page' });
    data.records = [...data.records.filter((x) => x.id !== r.id), r];
    console.log(`${r.title} | ${r.start} – ${r.end.slice(11, 16)} | ${r.location} | ${r.speakers.map((s) => `${s.name} (${s.company})`).join(', ')}`);
  } catch (err) {
    console.log(`skip ${slug}: ${(err as Error).message}`);
  }
}
data.records.sort((a, b) => a.start.localeCompare(b.start));
writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
