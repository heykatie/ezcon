// Regression tests for Qodo review findings on scripts/check-falkordb.mjs
// (https://github.com/heykatie/ezcon/pull/1#pullrequestreview-5640025345).
import { CHECK_GRAPH, CHECK_PARAMS, SEED_QUERY, describeError } from '../scripts/check-falkordb-lib.mjs';

describe('graph connectivity check', () => {
  it('finding 1: writes only to a dedicated verification graph with check-only ids', () => {
    expect(CHECK_GRAPH).toBe('ezcon_check');
    expect(CHECK_GRAPH).not.toBe('conference');
    const ids = [...SEED_QUERY.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    for (const id of ids) expect(id).toMatch(/^check:/);
  });

  it('finding 2: seeded talk times carry an offset and an IANA timezone', () => {
    expect(CHECK_PARAMS.starts).toBe('2026-09-23T10:00:00-07:00');
    expect(CHECK_PARAMS.ends).toBe('2026-09-23T10:30:00-07:00');
    expect(CHECK_PARAMS.timezone).toBe('America/Los_Angeles');
    expect(Date.parse(CHECK_PARAMS.starts)).toBe(Date.UTC(2026, 8, 23, 17, 0));
    expect(SEED_QUERY).toContain('t.timezone=$timezone');
  });

  it('finding 3: failures keep message and stack but never the URL or credentials', () => {
    const url = 'falkors://alice:s3cr3t-pass@db.example.cloud:6380';
    const err = new Error(`connect failed for ${url} (user alice, password s3cr3t-pass, host db.example.cloud)`);
    err.name = 'ConnectionError';
    (err as Error & { code?: string }).code = 'ECONNREFUSED';
    const out = describeError(err, url);
    expect(out).toContain('ConnectionError');
    expect(out).toContain('ECONNREFUSED');
    expect(out).toContain('connect failed for');
    expect(out).toMatch(/at .*check-falkordb\.test\.ts/); // stack retained
    expect(out).not.toContain('s3cr3t-pass');
    expect(out).not.toContain('alice');
    expect(out).not.toContain('db.example.cloud');
    expect(out).not.toContain(url);
  });

  it('finding 3: assertion failures are described too', () => {
    const out = describeError(Object.assign(new Error('Expected values to be strictly equal'), { name: 'AssertionError' }), 'falkors://u:p@h:1');
    expect(out).toContain('AssertionError: Expected values to be strictly equal');
  });
});
