// Guards for live research runs: every tool call must stay on the approved URL, and one
// deadline bounds the whole run so a stalled SDK call can't block later requests.

export interface CallTrace {
  tool: string;
  args: unknown;
}

/** Calls whose `url` argument differs from the approved URL. Argument-free calls stay on the current page. */
export function offTargetCalls<T extends CallTrace>(calls: T[], approvedUrl: string): T[] {
  return calls.filter((c) => {
    const url = (c.args as { url?: unknown } | null)?.url;
    return url !== undefined && url !== approvedUrl;
  });
}

export function withDeadline<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}
