// Re-pull every displayed public fact through Bright Data (via TrueForge) and record whether
// the values the app shows appear on the retrieved page. Writes src/data/source-checks.json.
import { writeFileSync } from 'node:fs';
import { fetchViaBrightData } from '../server/brightdata';

const CHECKS: Array<{ id: string; url: string; expect: string[] }> = [
  { id: 'fort-mason-parking', url: 'https://fortmason.org/visit/directions-parking/', expect: ['$6.00', '$30.00', '7:00 a.m', 'midnight'] },
  { id: 'muni-fare', url: 'https://www.sfmta.com/getting-around/muni/fares', expect: ['$2.85'] },
  { id: 'bay-bridge-toll', url: 'https://www.bayareafastrak.org/en/toll-locations/toll-bridges.shtml', expect: ['8.50'] },
  // Not checkable through Bright Data: api.bart.gov needs account verification (KYC) for Bright Data
  // access, and the Universe catalog/session pages return only a client-side shell.
  { id: 'event-kubecon', url: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/', expect: ['Salt Lake City'] },
  { id: 'event-ignite', url: 'https://www.microsoft.com/en-us/security/blog/2026/09/30/secure-whats-next-your-guide-to-microsoft-security-at-microsoft-ignite-2026/', expect: ['November 17'] },
  { id: 'event-reinvent', url: 'https://aws.amazon.com/events/reinvent/', expect: ['Las Vegas'] },
  { id: 'role-200057324', url: 'https://apply.careers.microsoft.com/careers/job/1970393557004814', expect: ['Forward Deployed Engineer'] },
  { id: 'role-200060976', url: 'https://apply.careers.microsoft.com/careers/job/1970393557027406', expect: ['Forward Deployed Engineer'] },
];

const only = process.argv.slice(2);
import { existsSync, readFileSync } from 'node:fs';
const prior = existsSync('src/data/source-checks.json') ? JSON.parse(readFileSync('src/data/source-checks.json', 'utf8')) : {};
const results: Record<string, { url: string; retrievedAt: string; ok: boolean; missing: string[]; chars: number; error?: string }> = {};
for (const c of CHECKS.filter((x) => !only.length || only.includes(x.id))) {
  try {
    const r = await fetchViaBrightData(c.url, 'scrape_as_markdown');
    const missing = c.expect.filter((e) => !r.text.includes(e));
    results[c.id] = { url: c.url, retrievedAt: r.retrievedAt, ok: missing.length === 0, missing, chars: r.text.length };
  } catch (err) {
    results[c.id] = { url: c.url, retrievedAt: new Date().toISOString(), ok: false, missing: c.expect, chars: 0, error: (err as Error).message };
  }
  const x = results[c.id]!;
  console.log(`${x.ok ? 'OK  ' : 'FAIL'} ${c.id} (${x.chars} chars)${x.missing.length ? ` missing ${x.missing.join(', ')}` : ''}${x.error ? ` ${x.error}` : ''}`);
}
writeFileSync('src/data/source-checks.json', JSON.stringify({ ...prior, ...results }, null, 2) + '\n');
