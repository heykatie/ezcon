// Header event search: a combobox whose dropdown lists verified upcoming events.
// Supported conferences switch the app; listing-only events open their official source.
import { useId, useRef, useState } from 'react';
import { searchEvents, type EventListing } from '../domain/events';
import { UPCOMING_EVENTS } from '../data/events';
import type { ConferenceId } from '../domain/types';
import { Icon } from './Icon';
import { fmtDay } from './ui';

const day = (d: string) => fmtDay(`${d}T12:00:00-08:00`);

export function HeaderSearch({ now, onSelectConference }: { now: string; onSelectConference: (id: ConferenceId) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const results = searchEvents(UPCOMING_EVENTS, q, now);

  const choose = (e: EventListing) => {
    setOpen(false);
    setQ('');
    if (e.supported) onSelectConference(e.id as ConferenceId);
    else window.open(e.source.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="header-search" onBlur={() => (closeTimer.current = setTimeout(() => setOpen(false), 120))} onFocus={() => clearTimeout(closeTimer.current)}>
      <span className="muted header-search-icon" aria-hidden="true">
        <Icon name="search" size={18} />
      </span>
      <input
        type="text"
        role="combobox"
        aria-label="Search conferences & events"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${results[active]!.id}` : undefined}
        placeholder="Search events or cities"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => (setQ(e.target.value), setOpen(true), setActive(0))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') (setOpen(true), setActive((a) => Math.min(a + 1, results.length - 1)), e.preventDefault());
          else if (e.key === 'ArrowUp') (setActive((a) => Math.max(a - 1, 0)), e.preventDefault());
          else if (e.key === 'Enter' && open && results[active]) (choose(results[active]!), e.preventDefault());
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && (
        <div className="header-search-pop">
          <p className="tiny muted" role="status" aria-live="polite" style={{ padding: '4px 12px' }}>
            {q ? `${results.length} verified upcoming ${results.length === 1 ? 'event' : 'events'}` : 'Recommended upcoming events'}
          </p>
          <ul id={listId} role="listbox" aria-label="Upcoming events" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {results.map((e, i) => (
              <li
                key={e.id}
                id={`${listId}-${e.id}`}
                role="option"
                aria-selected={i === active}
                className="header-search-option"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => choose(e)}
                onMouseEnter={() => setActive(i)}
              >
                <span className="between">
                  <b className="small">{e.name}</b>
                  <span className={`badge ${e.supported ? 'good' : ''}`}>{e.supported ? 'Open in ezcon' : 'Official page ↗'}</span>
                </span>
                <span className="tiny muted">
                  {day(e.startDate)}–{day(e.endDate)} · {e.location}
                </span>
              </li>
            ))}
            {results.length === 0 && <li className="tiny muted" style={{ padding: '8px 12px' }}>No verified upcoming events match.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
