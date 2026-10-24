// Soft, rounded companion illustrations (pocket robot, rubber duck, pixel cat, circuit fox).
// Same abilities for all; only look, name and accent color differ.
import { useId } from 'react';
import type { CompanionKind } from '../data/demo';

interface Props {
  kind: CompanionKind;
  color: string;
  size?: number;
  scarf?: boolean;
  label?: string;
}

export function Companion({ kind, color, size = 72, scarf = false, label }: Props) {
  const id = useId().replace(/:/g, '');
  const body = `url(#b${id})`;
  const shade = (
    <defs>
      <radialGradient id={`b${id}`} cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="35%" stopColor={color} stopOpacity="0.85" />
        <stop offset="100%" stopColor={color} />
      </radialGradient>
      <radialGradient id={`s${id}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
  const eyes = (y: number, gap = 14) => (
    <g fill="#2a2433">
      <circle cx={50 - gap} cy={y} r="5" />
      <circle cx={50 + gap} cy={y} r="5" />
      <circle cx={50 - gap + 1.6} cy={y - 1.8} r="1.6" fill="#fff" />
      <circle cx={50 + gap + 1.6} cy={y - 1.8} r="1.6" fill="#fff" />
    </g>
  );
  const blush = (y: number) => (
    <g fill="#ff8fa3" opacity="0.55">
      <ellipse cx="27" cy={y} rx="5" ry="3" />
      <ellipse cx="73" cy={y} rx="5" ry="3" />
    </g>
  );
  const scarfShape = scarf ? (
    <g>
      <path d="M26 74 Q50 84 74 74 L72 82 Q50 92 28 82 Z" fill="#ffcf4a" stroke="#e0a800" strokeWidth="1.5" />
      <path d="M62 82 l6 12 l-8 -2 Z" fill="#ffcf4a" stroke="#e0a800" strokeWidth="1.5" />
      <text x="44" y="83" fontSize="7" fill="#b07900">★</text>
    </g>
  ) : null;

  let art: JSX.Element;
  if (kind === 'robot') {
    art = (
      <g>
        <line x1="50" y1="10" x2="50" y2="22" stroke="#7a7290" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="9" r="5" fill="#ffcf4a" />
        <rect x="18" y="22" width="64" height="58" rx="22" fill={body} />
        <rect x="26" y="34" width="48" height="30" rx="14" fill="#fdfbff" opacity="0.92" />
        {eyes(48, 11)}
        <path d="M44 56 Q50 60 56 56" stroke="#2a2433" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="14" cy="52" r="6" fill={color} />
        <circle cx="86" cy="52" r="6" fill={color} />
      </g>
    );
  } else if (kind === 'duck') {
    art = (
      <g>
        <ellipse cx="50" cy="66" rx="36" ry="24" fill={body} />
        <circle cx="50" cy="40" r="24" fill={body} />
        <path d="M66 44 Q84 46 78 54 Q70 56 62 50 Z" fill="#ff9f43" />
        {eyes(36, 10)}
        {blush(46)}
        <path d="M20 62 Q34 54 40 66" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    );
  } else if (kind === 'cat') {
    art = (
      <g shapeRendering="crispEdges">
        <path d="M22 26 L22 10 L36 22 Z M78 26 L78 10 L64 22 Z" fill={color} />
        <rect x="18" y="22" width="64" height="58" rx="14" fill={body} />
        <g fill="#2a2433">
          <rect x="32" y="42" width="8" height="8" />
          <rect x="60" y="42" width="8" height="8" />
          <rect x="46" y="56" width="8" height="4" />
        </g>
        {blush(60)}
        <g stroke="#2a2433" strokeWidth="2">
          <line x1="8" y1="56" x2="24" y2="58" />
          <line x1="92" y1="56" x2="76" y2="58" />
        </g>
      </g>
    );
  } else {
    art = (
      <g>
        <path d="M20 30 L26 6 L42 24 Z M80 30 L74 6 L58 24 Z" fill={color} />
        <path d="M18 34 Q50 14 82 34 Q86 70 50 84 Q14 70 18 34 Z" fill={body} />
        <path d="M30 58 Q50 92 70 58 Q60 66 50 66 Q40 66 30 58 Z" fill="#fdfbff" opacity="0.92" />
        {eyes(46, 13)}
        <circle cx="50" cy="62" r="3.5" fill="#2a2433" />
        <g stroke="#ffe08a" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M30 30 h8 v6" />
          <path d="M70 30 h-8 v6" />
          <circle cx="38" cy="36" r="1.6" fill="#ffe08a" />
          <circle cx="62" cy="36" r="1.6" fill="#ffe08a" />
        </g>
      </g>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ?? 'Companion'}>
      {shade}
      <ellipse cx="50" cy="94" rx="30" ry="5" fill={`url(#s${id})`} />
      {art}
      {scarfShape}
    </svg>
  );
}
