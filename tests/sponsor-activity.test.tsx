// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { observeBackend, subscribeActivity } from '../src/web/sponsor-activity';
import { SponsorActivity } from '../src/web/SponsorActivity';
import type { Backend } from '../src/web/backend';
afterEach(() => { cleanup(); vi.useRealTimers(); });
const backend = (mode: 'live' | 'cached', candidates: () => Promise<unknown> = async () => []) => ({ mode, candidates } as unknown as Backend);
it('reports real calls and completion without changing returned values', async () => {
  const events: string[] = [];
  const off = subscribeActivity(e => events.push(`${e.sponsor}:${e.state}`));
  const value = await observeBackend(backend('live')).candidates('profile:test', 'universe26');
  expect(value).toEqual([]);
  expect(events).toEqual(['FalkorDB:running', 'FalkorDB:done']);
  off();
});
it('does not pretend cached graph operations call sponsor services', async () => {
  const spy = vi.fn(); const off = subscribeActivity(spy);
  await observeBackend(backend('cached')).candidates('profile:test', 'universe26');
  expect(spy).not.toHaveBeenCalled(); off();
});
it('preserves errors and shows failure instead of success', async () => {
  const events: string[] = []; const off = subscribeActivity(e => events.push(e.state));
  await expect(observeBackend(backend('live', async () => { throw Error('offline'); })).candidates('profile:test', 'universe26')).rejects.toThrow('offline');
  expect(events).toEqual(['running', 'failed']); off();
});
it('only credits Bright Data when a returned trace proves a fetch occurred', async () => {
  const events: string[] = []; const off = subscribeActivity(e => events.push(`${e.sponsor}:${e.state}`));
  const b = {mode:'live', research:async()=>({status:'ok',trace:[{tool:'scrape_as_html',responseChars:200}]})} as unknown as Backend;
  await observeBackend(b).research!('wad-session', 'https://example.com');
  expect(events).toContain('Bright Data:done');
  expect(events).not.toContain('Bright Data:running'); off();
});
it('shows a polite transient notice that disappears automatically', async () => {
  vi.useFakeTimers(); render(<SponsorActivity />);
  await act(async () => { await observeBackend(backend('live')).candidates('profile:test', 'universe26'); });
  expect(screen.getByRole('status').textContent).toContain('FalkorDB');
  await act(async () => { vi.advanceTimersByTime(4500); });
  expect(screen.queryByText('FalkorDB')).toBeNull();
});
