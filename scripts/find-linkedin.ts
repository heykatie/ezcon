// Look up public LinkedIn profiles for listed speakers (People tab) through TrueForge + Bright Data.
// Writes src/data/people-links.json; only matches that name the person and company are kept as found.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { findLinkedIn } from '../server/people';
import { personId } from '../src/domain/ids';
import type { SessionRecord } from '../src/domain/types';
import type { LinkedInMatch } from '../src/domain/people';

const sessions = [
  ...(JSON.parse(readFileSync('src/data/universe26.json', 'utf8')) as SessionRecord[]),
  ...(JSON.parse(readFileSync('src/data/wad26na.json', 'utf8')) as { records: SessionRecord[] }).records,
];
const file = 'src/data/people-links.json';
const out: Record<string, LinkedInMatch & { name: string; company: string }> = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const people = new Map<string, { name: string; company: string }>();
for (const s of sessions) for (const sp of s.speakers) if (sp.company) people.set(personId(sp.name, sp.company), { name: sp.name, company: sp.company });

for (const [id, p] of people) {
  if (out[id]) continue; // already looked up
  try {
    const { raw: _raw, ...m } = await findLinkedIn(p.name, p.company, { baseUrl: process.env.TRUEFORGE_URL ?? 'http://localhost:8790', model: 'openai/gpt-5-4-nano' });
    out[id] = { ...m, ...p };
    console.log(`${m.status.padEnd(9)} ${p.name} (${p.company}) ${m.url ?? ''}`);
  } catch (err) {
    console.log(`error     ${p.name}: ${(err as Error).message}`);
  }
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
}
console.log(`done: ${Object.values(out).filter((m) => m.status === 'found').length}/${people.size} found`);
