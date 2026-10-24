import { useEffect, useState } from 'react';
import { subscribeActivity, type Activity } from './sponsor-activity';

/** Non-blocking, keyboard-free activity notices; never displace Undo or cover primary actions. */
export function SponsorActivity() {
  const [notices, setNotices] = useState<Activity[]>([]);
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const off = subscribeActivity(event => {
      clearTimeout(timers.get(event.sponsor));
      setNotices(previous => [...previous.filter(n => n.sponsor !== event.sponsor), event]);
      timers.set(event.sponsor, setTimeout(() => {
        setNotices(previous => previous.filter(n => n.sponsor !== event.sponsor));
        timers.delete(event.sponsor);
      }, 4000));
    });
    return () => { off(); for (const timer of timers.values()) clearTimeout(timer); };
  }, []);
  return <aside className="sponsor-activity" role="status" aria-live="polite" aria-atomic="true" aria-label="Tool activity">
    {notices.map(n => <div className="sponsor-notice" key={n.sponsor}>
      <span className={`sponsor-dot ${n.state}`} aria-hidden="true">{n.state === 'done' ? '✓' : n.state === 'failed' ? '!' : '•'}</span>
      <span><strong>{n.sponsor}</strong><span className="sponsor-detail">{n.state === 'failed' ? 'Request failed' : n.detail}{n.state === 'running' ? '…' : n.state === 'done' && n.sponsor !== 'Bright Data' ? ' · done' : ''}</span></span>
    </div>)}
  </aside>;
}
