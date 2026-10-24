// One bounded live research run: `npm run research -- wad-session <url>`.
// Prints the tool trace and extracted fields; writes the result under .cache/research/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { runResearch, type ResearchKind } from '../server/research';

const [kind, url] = process.argv.slice(2) as [ResearchKind, string];
if (!kind || !url) {
  console.error('usage: npm run research -- <wad-session|universe-catalog> <url>');
  process.exit(2);
}
const r = await runResearch(kind, url, {
  baseUrl: process.env.TRUEFORGE_URL ?? 'http://localhost:8790',
  model: process.env.EZCON_MODEL ?? 'openai/gpt-5-4-nano',
});
console.log(`status=${r.status} duration=${(r.durationMs / 1000).toFixed(1)}s model=${r.model} session=${r.sessionId}`);
console.log(`tokens in=${r.usage.inputTokens} out=${r.usage.outputTokens}`);
for (const t of r.trace) console.log(`tool ${t.tool} args=${JSON.stringify(t.args)} response=${t.responseChars} chars`);
if (r.error) console.log(`error: ${r.error}`);
console.log(`records=${r.records.length} rejected=${r.rejected.length}`);
for (const rec of r.records.slice(0, 5)) console.log(`- ${rec.title} | ${rec.start}–${rec.end.slice(11, 16)} | ${rec.location ?? '?'} | ${rec.speakers.map((s) => s.name).join(', ')}`);
mkdirSync('.cache/research', { recursive: true });
const file = `.cache/research/${kind}-${r.retrievedAt.replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify(r, null, 2));
console.log(`saved ${file}`);
