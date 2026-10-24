// Recheck tracked roles on the employer's own careers system. A role is "open" only if the
// official position API returns it and its public application page loads.
import type { RoleRecord } from '../src/domain/types';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ezcon-role-check';

// Microsoft careers position ids chosen for the fictional early-career React/Python persona:
// no minimum years required; Python is an accepted language.
const MICROSOFT_IDS = ['1970393557004814', '1970393557027406'];

const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();

export async function checkMicrosoft(id: string): Promise<RoleRecord> {
  const checkedAt = new Date().toISOString();
  const page = `https://apply.careers.microsoft.com/careers/job/${id}`;
  const base = { id: `role:microsoft:${id}`, company: 'Microsoft', listingUrl: page, applyUrl: page, checkedAt };
  try {
    const api = await fetch(`https://apply.careers.microsoft.com/api/pcsx/position_details?position_id=${id}&domain=microsoft.com`, {
      headers: { 'user-agent': UA, accept: 'application/json' },
    });
    const pageRes = await fetch(page, { headers: { 'user-agent': UA }, redirect: 'follow' });
    const d = api.ok ? ((await api.json()) as { data?: Record<string, unknown> }).data : undefined;
    if (!d?.name || !pageRes.ok) throw new Error(`api ${api.status}, page ${pageRes.status}`);
    const text = strip(String(d.jobDescription ?? ''));
    const req = /Required(?:\/Minimum)? Qualifications\s*(.*?)(?:Additional Requirements|Other Requirements|Preferred Qualifications|$)/.exec(text)?.[1]?.trim() ?? '';
    const years = /(\d+)\+\s*years?/.exec(req);
    return {
      ...base,
      title: String(d.name),
      location: `${(d.locations as string[] | undefined)?.[0] ?? 'Location not stated'}${d.workLocationOption ? ` (${d.workLocationOption})` : ''}`,
      minYearsExperience: years ? Number(years[1]) : /equivalent experience/i.test(req) ? 0 : null,
      requirementSummary: req.slice(0, 280),
      status: 'open',
      postedAt: typeof d.postedTs === 'number' ? new Date(d.postedTs * 1000).toISOString() : undefined,
      source: { url: page, retrievedAt: checkedAt, via: 'official-api', status: 'verified', note: `Microsoft job ${d.displayJobId ?? id}` },
    };
  } catch (err) {
    return {
      ...base,
      title: 'Unverified role',
      location: '',
      minYearsExperience: null,
      requirementSummary: '',
      status: 'unverified',
      source: { url: page, retrievedAt: checkedAt, via: 'official-api', status: 'unconfirmed', note: (err as Error).message },
    };
  }
}


export async function checkRoles(): Promise<RoleRecord[]> {
  const roles: RoleRecord[] = [];
  for (const id of MICROSOFT_IDS) {
    roles.push(await checkMicrosoft(id));
    await new Promise((r) => setTimeout(r, 1500)); // stay well under the careers API rate limit
  }
  return roles;
}
