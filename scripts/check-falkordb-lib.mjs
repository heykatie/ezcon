// Pure pieces of the FalkorDB connectivity check, kept separate so they can be tested.

// Dedicated graph: the check must never touch application graphs such as `ezcon`
// or the earlier `conference` setup graph.
export const CHECK_GRAPH = 'ezcon_check';

export const CHECK_PARAMS = {
  source: 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-making-works-on-all',
  // Venue-local times for San José with their offset, plus the IANA zone they came from.
  starts: '2026-09-23T10:00:00-07:00',
  ends: '2026-09-23T10:30:00-07:00',
  timezone: 'America/Los_Angeles',
};

export const SEED_QUERY = `MERGE (a:Attendee {id:'check:attendee'}) SET a.name='Check attendee (fictional)', a.synthetic=true
    MERGE (t:Talk {id:'check:talk'}) SET t.name='Making Works on All Machines Work for Agent Environments', t.source=$source, t.starts=$starts, t.ends=$ends, t.timezone=$timezone
    MERGE (s:Speaker {id:'check:speaker'}) SET s.name='Michael Irwin', s.company='Docker', s.source=$source
    MERGE (topic:Topic {id:'check:topic'}) SET topic.name='Agent environments', topic.evidence='derived from session description'
    MERGE (r:Room {id:'check:room'}) SET r.name='Stage 1', r.source=$source
    MERGE (s)-[:PRESENTS]->(t) MERGE (t)-[:ABOUT]->(topic) MERGE (t)-[:IN_ROOM]->(r) MERGE (a)-[:INTERESTED_IN]->(topic)`;

/** Remove the connection URL and each of its credential/host parts from text. */
export function redact(text, url) {
  let out = String(text ?? '').split(url).join('<redacted>');
  let creds = [];
  let hosts = [];
  try {
    const u = new URL(url);
    creds = [u.username, u.password, safeDecode(u.username), safeDecode(u.password)];
    hosts = [u.host, u.hostname];
    if (u.username || u.password) out = out.split(`${u.username}:${u.password}@`).join('<redacted>@');
  } catch {
    // not a parseable URL; the raw string was already redacted
  }
  // Credentials are always redacted; short ones only where they stand alone, so ordinary words survive.
  for (const c of [...new Set(creds.filter(Boolean))].sort((a, b) => b.length - a.length)) {
    out = c.length >= 4 ? out.split(c).join('<redacted>') : out.replace(new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(c)}(?![A-Za-z0-9])`, 'g'), '<redacted>');
  }
  for (const h of hosts.filter((x) => x && x.length >= 3)) out = out.split(h).join('<redacted>');
  return out;
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Name, code, message and stack of a failure, with connection details redacted. */
export function describeError(error, url) {
  const head = [error?.name ?? 'Error', error?.code ? `(${error.code})` : ''].filter(Boolean).join(' ');
  const message = error?.message ? `: ${error.message}` : '';
  const stack = error?.stack ? `\n${String(error.stack).split('\n').slice(1).join('\n')}` : '';
  const cause = error?.cause ? `\nCaused by: ${describeError(error.cause, url)}` : '';
  return redact(`${head}${message}${stack}${cause}`, url);
}
