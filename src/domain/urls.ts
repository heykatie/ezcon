// URL safety: profile links shown as QR codes, and server-side research fetch targets.

export type LinkKind = 'github' | 'linkedin' | 'personal';
export type LinkResult = { ok: true; url: string } | { ok: false; reason: string };

const HOSTS: Record<Exclude<LinkKind, 'personal'>, string[]> = {
  github: ['github.com', 'www.github.com'],
  linkedin: ['linkedin.com', 'www.linkedin.com'],
};

function isIpLiteral(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[') || host.includes(':');
}

export function validateProfileLink(kind: LinkKind, raw: string): LinkResult {
  const value = raw.trim();
  if (!value) return { ok: false, reason: 'Add a link' };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, reason: 'Enter a full link starting with https://' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: 'Only https:// links are supported' };
  if (u.username || u.password) return { ok: false, reason: 'Links cannot contain a username or password' };
  const host = u.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local') || host === 'localhost' || isIpLiteral(host)) {
    return { ok: false, reason: 'Use a public website address' };
  }
  if (kind !== 'personal' && !HOSTS[kind].includes(host)) {
    return { ok: false, reason: `That isn't a ${kind === 'github' ? 'GitHub' : 'LinkedIn'} link` };
  }
  const href = u.pathname === '/' && !u.search && !u.hash ? u.href.slice(0, -1) : u.href;
  return { ok: true, url: href };
}

// ---- Server-side fetch targets -------------------------------------------------------

function ipv4Private(ip: string) {
  const [a, b] = ip.split('.').map(Number) as [number, number];
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  );
}

function ipv6Private(ip: string) {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (v === '::' || v === '::1') return true;
  if (v.startsWith('::ffff:')) return ipv4Private(v.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v);
}

export function isPrivateAddress(ip: string) {
  return ip.includes(':') ? ipv6Private(ip) : ipv4Private(ip);
}

export type Resolver = (host: string) => Promise<string[]>;

/** Allow only public http(s) hosts whose every resolved address is public. */
export async function isPublicFetchTarget(raw: string, resolve: Resolver): Promise<{ ok: true } | { ok: false; reason: string }> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, reason: 'unsupported scheme' };
  if (u.username || u.password) return { ok: false, reason: 'credentials in URL' };
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.') && !host.includes(':')) {
    return { ok: false, reason: 'private host' };
  }
  if (isIpLiteral(host) || host.includes(':')) {
    return isPrivateAddress(host) ? { ok: false, reason: 'private address' } : { ok: true };
  }
  const addrs = await resolve(host);
  if (addrs.length === 0) return { ok: false, reason: 'host does not resolve' };
  if (addrs.some(isPrivateAddress)) return { ok: false, reason: 'host resolves to a private address' };
  return { ok: true };
}
