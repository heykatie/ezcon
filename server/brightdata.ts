// Fetch one public page through Bright Data, driven by a TrueForge agent with a single
// allowlisted tool. Returns the raw tool output; callers extract or verify facts in code.
import { TrueForge } from '@truefoundry/trueforge-sdk';
import { withDeadline } from './research-guard';

export type PageTool = 'scrape_as_markdown' | 'scrape_as_html';

export async function fetchViaBrightData(url: string, tool: PageTool, opts = { baseUrl: process.env.TRUEFORGE_URL ?? 'http://localhost:8790', model: process.env.EZCON_MODEL ?? 'openai/gpt-5-4-nano' }) {
  const client = new TrueForge({ baseUrl: opts.baseUrl });
  const run = async () => {
    const session = await client.sessions.create({
      agent: {
        spec: {
          model: { name: opts.model, params: { reasoningEffort: 'low', parallelToolCalls: false } },
          instructions: `Call ${tool} exactly once on the URL in the user message. Do not summarize. Then reply DONE.`,
          mcpServers: [{ name: 'bright-data', enableTools: [tool], preload: true, preloadTools: [tool] }],
          config: { iterationLimit: 3, contextManagement: { largeToolResponse: { enabled: false } } },
        },
      },
      metadata: { app: 'ezcon', purpose: `fetch:${tool}` } as never,
    });
    const id = (session as { data: { id: string } }).data.id;
    for await (const _ of (await client.sessions.createTurnStream(id, { input: [{ type: 'user.message', content: `URL: ${url}` }] } as never)) as AsyncIterable<unknown>) void _;
    const calls: Array<{ args: string }> = [];
    const out: string[] = [];
    for await (const item of (await client.sessions.listEvents(id, {})) as AsyncIterable<{ event?: { type: string; content?: unknown; toolCalls?: Array<{ function?: { arguments: string } }> } }>) {
      const e = item.event;
      if (e?.type === 'tool.response') out.push(String(e.content ?? ''));
      for (const c of e?.toolCalls ?? []) calls.push({ args: c.function?.arguments ?? '' });
    }
    // Reject output if the model called the tool on any other URL.
    if (calls.some((c) => c.args && !c.args.includes(JSON.stringify(url).slice(1, -1)))) throw new Error('tool called on an unapproved URL');
    return { text: out.join('\n'), retrievedAt: new Date().toISOString(), sessionId: id };
  };
  return withDeadline(run(), 120_000, `bright data fetch ${url}`);
}
