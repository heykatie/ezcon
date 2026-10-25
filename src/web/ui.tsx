import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import type { GraphPath } from '../domain/graph-types';
import { Icon, type IconName } from './Icon';
import type { SourceRef } from '../domain/types';

const TZ = 'America/Los_Angeles';
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
export const fmtWhen = (iso: string) => `${fmtDay(iso)} · ${fmtTime(iso)}`;
export const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
export const fmtRange = (start: string, end: string) => `${fmtDay(start)} · ${fmtTime(start)}–${fmtTime(end)}`;
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
/** Venue-local wall clock "YYYY-MM-DDTHH:MM" from an offset ISO string. */
export const localOf = (iso: string) => {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
};

export function Sheet({ title, onClose, children, labelledBy }: { title: string; onClose: () => void; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    opener.current = document.activeElement;
    ref.current?.querySelector<HTMLElement>('button, a, input, textarea, select')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select')].filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) (last.focus(), e.preventDefault());
        else if (!e.shiftKey && document.activeElement === last) (first.focus(), e.preventDefault());
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, []);
  const id = labelledBy ?? `sheet-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="between">
          <h2 id={id}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SourceLine({ source, label = 'Source' }: { source: SourceRef; label?: string }) {
  const via = { 'bright-data': 'Bright Data', 'openai-web-search': 'OpenAI web search', 'official-api': 'official API', 'official-page': 'official page', 'manual-browser': 'browser-verified capture', fixture: 'test fixture' }[source.via];
  let host = source.url;
  try {
    host = new URL(source.url).hostname;
  } catch {
    // keep raw
  }
  return (
    <p className="tiny muted">
      {label}:{' '}
      <a href={source.url} target="_blank" rel="noopener noreferrer">
        {host}
      </a>{' '}
      · {via} · retrieved {fmtStamp(source.retrievedAt)}
      {source.note ? ` · ${source.note}` : ''}
    </p>
  );
}

const KIND_ICON: Record<string, IconName> = { Profile: 'user', Topic: 'tag', Session: 'mic', Person: 'user', Company: 'building', Role: 'briefcase' };

/** Renders a path exactly as the graph store returned it: nodes in order, each edge with its evidence. */
export function PathView({ path }: { path: GraphPath }) {
  const nodeById = new Map(path.nodes.map((n) => [n.id, n]));
  return (
    <ol className="path" aria-label="Graph path">
      {path.nodes.map((n, i) => {
        const e = path.edges[i];
        const forward = e && e.from === n.id;
        return (
          <li key={`${n.id}-${i}`} style={{ listStyle: 'none' }}>
            <div className="path-node">
              <Icon name={KIND_ICON[n.label] ?? 'tag'} size={18} />
              <span className="kind">{n.label}</span>
              <span>{n.name}</span>
            </div>
            {e && (
              <div className="path-edge">
                {forward ? '↓' : '↑'} <b>{e.type}</b> — {e.evidence}
                {e.sourceUrl && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">
                      source
                    </a>
                  </>
                )}
                {e.retrievedAt && ` · ${fmtStamp(e.retrievedAt)}`}
                <span className="sr-only">
                  {' '}
                  from {nodeById.get(e.from)?.name} to {nodeById.get(e.to)?.name}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Toast({ message, action, onAction, onDone }: { message: string; action?: string; onAction?: () => void; onDone: () => void }) {
  // Long enough to act on; paused only while keyboard focus is inside (a touch "hover" never ends).
  // The latest onDone lives in a ref so re-renders don't restart the timer.
  const [paused, setPaused] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => done.current(), 15_000);
    return () => clearTimeout(t);
  }, [paused, message]);
  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span>{message}</span>
      {action && (
        <button className="btn small" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

/** Horizontal tabs use one Tab stop; arrows wrap and activate the adjacent panel. */
export function navigateTabs(e: ReactKeyboardEvent<HTMLDivElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const tabs = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')].filter((tab) => !tab.disabled);
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0 || !tabs.length) return;
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1
    : (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  e.preventDefault();
  tabs[next]!.focus();
  tabs[next]!.click();
}
