// Public LinkedIn lookup for listed speakers. TrueForge runs one Bright Data search; ezcon
// accepts a result only when its title names the person AND their listed company. Only the
// profile URL is stored — no profile contents are scraped.
import { TrueForge } from '@truefoundry/trueforge-sdk';
import { withDeadline } from './research-guard';
import { pickLinkedIn, type LinkedInMatch } from '../src/domain/people';

export async function findLinkedIn(name: string, company: string, opts: { baseUrl: string; model: string }): Promise<LinkedInMatch & { raw?: string }> {
  const query = `${name} ${company} LinkedIn`;
  const client = new TrueForge({ baseUrl: opts.baseUrl });
  const run = async () => {
    const session = await client.sessions.create({
      agent: {
        spec: {
          model: { name: opts.model, params: { reasoningEffort: 'low', parallelToolCalls: false } },
          instructions: 'Call search_engine exactly once with the query in the user message (engine google). Do not summarize results. Then reply DONE.',
          mcpServers: [{ name: 'bright-data', enableTools: ['search_engine'], preload: true, preloadTools: ['search_engine'] }],
          config: { iterationLimit: 3, contextManagement: { largeToolResponse: { enabled: false } } },
        },
      },
      metadata: { app: 'ezcon', purpose: 'people:linkedin' } as never,
    });
    const id = (session as { data: { id: string } }).data.id;
    for await (const _ of (await client.sessions.createTurnStream(id, { input: [{ type: 'user.message', content: `Query: ${query}` }] } as never)) as AsyncIterable<unknown>) void _;
    const out: string[] = [];
    for await (const item of (await client.sessions.listEvents(id, {})) as AsyncIterable<{ event?: { type: string; content?: unknown } }>) {
      if (item.event?.type === 'tool.response') out.push(String(item.event.content ?? ''));
    }
    return out.join('\n');
  };
  const raw = await withDeadline(run(), 90_000, 'linkedin lookup');
  return { ...pickLinkedIn(raw, name, company, new Date().toISOString(), query), raw };
}
