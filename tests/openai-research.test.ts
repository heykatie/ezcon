import { researchLumaWithOpenAI, searchLumaEventsWithOpenAI } from '../server/openai-research';

const url = 'https://luma.com/example-event';
const eventJson = JSON.stringify({
  title: 'AI Builders Night', summary: 'Meet local builders',
  start: '2026-11-03T18:00:00-08:00', end: '2026-11-03T20:30:00-08:00',
  timezone: 'America/Los_Angeles', location: 'Example Hall, 1 Market St, San Francisco, CA',
});

function response(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('OpenAI web-search fallback', () => {
  it('does not make a request when no API key is configured', async () => {
    const fetcher = vi.fn();
    const result = await researchLumaWithOpenAI(url, { apiKey: '', fetcher });
    expect(result).toEqual({ status: 'disabled', reason: 'OPENAI_API_KEY is not configured' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a source-linked event as AI-assisted and unconfirmed', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({
      id: 'resp_test', model: 'gpt-5.5', output_text: eventJson,
      usage: { input_tokens: 120, output_tokens: 40 },
      output: [{ type: 'message', content: [{ type: 'output_text', text: eventJson, annotations: [
        { type: 'url_citation', url_citation: { url, title: 'AI Builders Night · Luma' } },
      ] }] }],
    }));
    const result = await researchLumaWithOpenAI(url, { apiKey: 'test-key', creditsConfirmed: true, fetcher, retrievedAt: '2026-10-24T22:00:00.000Z' });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.record).toMatchObject({
      title: 'AI Builders Night', start: '2026-11-03T18:00:00-08:00',
      location: 'Example Hall, 1 Market St, San Francisco, CA',
      source: { via: 'openai-web-search', status: 'unconfirmed' },
    });
    expect(result.sources).toEqual([{ url, title: 'AI Builders Night · Luma' }]);
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 40 });
    const request = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(request.tools).toEqual([{ type: 'web_search' }]);
  });

  it('refuses results without citations or valid scheduled times', async () => {
    const noCitation = vi.fn().mockResolvedValue(response({ id: 'resp_test', output_text: eventJson, output: [], usage: {} }));
    expect((await researchLumaWithOpenAI(url, { apiKey: 'test', creditsConfirmed: true, fetcher: noCitation })).status).toBe('failed');
    const missingTime = JSON.stringify({ ...JSON.parse(eventJson), start: null, end: null });
    const cited = vi.fn().mockResolvedValue(response({ id: 'resp_test', output_text: missingTime, output: [{ type: 'message', content: [{ type: 'output_text', text: missingTime, annotations: [{ type: 'url_citation', url_citation: { url, title: 'Luma event' } }] }] }], usage: {} }));
    expect((await researchLumaWithOpenAI(url, { apiKey: 'test', creditsConfirmed: true, fetcher: cited })).status).toBe('failed');
  });

  it('does not send unbounded prompts or secrets to the browser-facing API', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ id: 'resp_test', output_text: eventJson, output: [{ type: 'message', content: [{ type: 'output_text', text: eventJson, annotations: [{ type: 'url_citation', url_citation: { url, title: 'Luma event' } }] }] }], usage: {} }));
    await researchLumaWithOpenAI(url, { apiKey: 'test-secret', creditsConfirmed: true, fetcher });
    expect(fetcher.mock.calls[0]![0]).toBe('https://api.openai.com/v1/responses');
    expect(fetcher.mock.calls[0]![1].headers.authorization).toBe('Bearer test-secret');
    expect(fetcher.mock.calls[0]![1].body).not.toContain('test-secret');
  });

  it('returns only cited Luma pages for an in-app event search', async () => {
    const eventUrl = 'https://luma.com/ai-builders-night';
    const text = JSON.stringify({ events: [{ title: 'AI Builders Night', url: eventUrl, summary: 'A local AI meetup', start: '2026-11-03T18:00:00-08:00', location: 'San Francisco' }] });
    const fetcher = vi.fn().mockResolvedValue(response({ id: 'resp_search', model: 'gpt-5.5', output_text: text, usage: { input_tokens: 50, output_tokens: 20 }, output: [{ type: 'message', content: [{ type: 'output_text', text, annotations: [{ type: 'url_citation', url_citation: { url: eventUrl, title: 'AI Builders Night · Luma' } }] }] }] }));
    const result = await searchLumaEventsWithOpenAI('AI meetup', { apiKey: 'test', creditsConfirmed: true, fetcher });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.events).toEqual([{ title: 'AI Builders Night', url: eventUrl, summary: 'A local AI meetup', start: '2026-11-03T18:00:00-08:00', location: 'San Francisco', sources: [{ url: eventUrl, title: 'AI Builders Night · Luma' }] }]);
    const request = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(request.input[1].content).toContain('San Francisco Bay Area');
  });

  it('rejects search results that lack a matching cited individual Luma page', async () => {
    const eventUrl = 'https://luma.com/ai-builders-night';
    const text = JSON.stringify({ events: [{ title: 'AI Builders Night', url: eventUrl, summary: null, start: null, location: null }] });
    const fetcher = vi.fn().mockResolvedValue(response({ output_text: text, output: [] }));
    expect((await searchLumaEventsWithOpenAI('AI meetup', { apiKey: 'test', creditsConfirmed: true, fetcher })).status).toBe('failed');
  });

  it('requires a free-credit confirmation before any keyed request', async () => {
    const fetcher = vi.fn();
    const result = await searchLumaEventsWithOpenAI('AI meetup', { apiKey: 'test-key', fetcher });
    expect(result).toMatchObject({ status: 'disabled', reason: expect.stringContaining('free/sponsor credits') });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
