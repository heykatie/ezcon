// Conservative public-profile matching. Accept a LinkedIn result only when it is a personal
// /in/ profile on a real LinkedIn host and it names both the person and their listed company.
// Anything less is "not found" — never a guessed identity.

export type LinkedInMatch = { status: 'found' | 'not-found'; url?: string; title?: string; query: string; checkedAt: string };

interface Organic {
  link?: string;
  title?: string;
  description?: string;
}

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

function organicResults(raw: string): Organic[] {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return [];
  try {
    const data = JSON.parse(raw.slice(start, end + 1)) as { organic?: Organic[] };
    return Array.isArray(data.organic) ? data.organic : [];
  } catch {
    return [];
  }
}

export function pickLinkedIn(raw: string, name: string, company: string, checkedAt: string, query: string): LinkedInMatch {
  const n = norm(name);
  const c = norm(company);
  for (const r of organicResults(raw)) {
    let u: URL;
    try {
      u = new URL(r.link ?? '');
    } catch {
      continue;
    }
    const host = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || !(host === 'linkedin.com' || host.endsWith('.linkedin.com'))) continue;
    if (!/^\/in\/[^/]+\/?$/.test(u.pathname)) continue;
    const title = r.title ?? '';
    if (!norm(title).includes(n)) continue;
    if (!norm(`${title} ${r.description ?? ''}`).includes(c)) continue;
    return { status: 'found', url: `https://${host}${u.pathname.replace(/\/$/, '')}`, title, query, checkedAt };
  }
  return { status: 'not-found', query, checkedAt };
}
