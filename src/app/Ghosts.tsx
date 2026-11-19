import type { CSSProperties } from 'react';

// Original silhouettes drawn for IndoGhost. They live behind the content at low
// opacity, so the page reads as a dark place with someone in it, never as clutter.
// Shapes animate with transform and opacity only, which stay on the compositor.

function Defs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="ghost-gown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2f8" />
          <stop offset="0.45" stopColor="#d6dde8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#c4ccd8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ghost-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9b3a6" />
          <stop offset="1" stopColor="#8b6f64" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="ghost-ember">
          <stop offset="0" stopColor="#ffd6a8" />
          <stop offset="0.35" stopColor="#ff7a45" />
          <stop offset="1" stopColor="#ff4a2a" stopOpacity="0" />
        </radialGradient>
        {/* Frays the hem and hair so the figures dissolve at their edges. */}
        <filter id="ghost-wisp" x="-15%" y="-5%" width="130%" height="115%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.05" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="16" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <filter id="ghost-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
    </svg>
  );
}

/** A kuntilanak: white gown, long black hair hanging over the face, arms at her sides. */
function Kuntilanak() {
  return (
    <svg viewBox="0 0 220 560" className="ghost-art" aria-hidden="true" focusable="false">
      <g filter="url(#ghost-wisp)">
        <path
          fill="url(#ghost-gown)"
          d="M88 112C70 122 63 148 61 188c-3 52-9 110-17 170-8 60-18 112-26 182 14-18 22-6 30 10 10-22 20-16 28 4 12-24 20-18 30 6 10-26 20-22 30 2 10-24 20-20 30 0 9-22 18-18 28 4 2-58-6-118-16-180-9-60-15-118-18-170-3-40-10-66-28-76-14 6-34 6-50-2Z"
        />
        <path
          fill="url(#ghost-gown)"
          d="M66 140c-8 50-13 98-11 146l-5 12 5 1 2-7 2 10 3-10 3 8 2-9 2 6c4-46 8-96 15-146ZM154 140c8 50 13 98 11 146l5 12-5 1-2-7-2 10-3-10-3 8-2-9-2 6c-4-46-8-96-15-146Z"
        />
        <ellipse cx="110" cy="74" rx="22" ry="27" fill="url(#ghost-skin)" />
        <path
          fill="#050807"
          d="M84 74c-2-30 14-38 26-38 20 0 30 10 30 36 2 46 6 110 1 196-2 30-8 48-14 54-2-36-4-80-8-118-2 42-6 86-12 118-4-34-6-76-8-112-2 38-4 74-10 100-4-40-5-112-5-236Z"
        />
      </g>
    </svg>
  );
}

/** A tuyul: a bald child-spirit, crouched, ears pricked, two ember eyes. */
function Tuyul() {
  return (
    <svg viewBox="0 0 180 170" className="ghost-art" aria-hidden="true" focusable="false">
      <g filter="url(#ghost-soft)" fill="url(#ghost-skin)">
        <ellipse cx="53" cy="64" rx="9" ry="13" />
        <ellipse cx="127" cy="64" rx="9" ry="13" />
        <circle cx="90" cy="62" r="36" />
        <path d="M58 94c-12 20-14 46-6 70h76c8-24 6-50-6-70-10 8-54 8-64 0Z" />
        <ellipse cx="66" cy="140" rx="16" ry="20" />
        <ellipse cx="114" cy="140" rx="16" ry="20" />
      </g>
      <g className="ghost-eyes">
        <circle cx="76" cy="64" r="9" fill="url(#ghost-ember)" />
        <circle cx="104" cy="64" r="9" fill="url(#ghost-ember)" />
      </g>
    </svg>
  );
}

/** Just a pair of eyes in the dark. */
function Eyes() {
  return (
    <svg viewBox="0 0 60 20" className="ghost-art" aria-hidden="true" focusable="false">
      <g className="ghost-eyes">
        <circle cx="12" cy="10" r="9" fill="url(#ghost-ember)" />
        <circle cx="48" cy="10" r="9" fill="url(#ghost-ember)" />
      </g>
    </svg>
  );
}

type Spot = { kind: 'kuntilanak' | 'tuyul' | 'eyes'; className: string; delay?: number };
const scenes: Record<'bestiary' | 'encounters', Spot[]> = {
  bestiary: [
    { kind: 'kuntilanak', className: 'ghost-kunti-far' },
    { kind: 'tuyul', className: 'ghost-tuyul-low', delay: -4 },
    { kind: 'eyes', className: 'ghost-eyes-gap', delay: -2 },
  ],
  encounters: [
    { kind: 'tuyul', className: 'ghost-tuyul-ledge', delay: -9 },
    { kind: 'eyes', className: 'ghost-eyes-corner', delay: -5 },
    { kind: 'kuntilanak', className: 'ghost-kunti-edge', delay: -11 },
  ],
};
const art = { kuntilanak: Kuntilanak, tuyul: Tuyul, eyes: Eyes };

export function GhostLayer({ scene, defs = false }: { scene: keyof typeof scenes; defs?: boolean }) {
  return (
    <div className="ghost-layer" aria-hidden="true">
      {defs && <Defs />}
      {scenes[scene].map(({ kind, className, delay = 0 }) => {
        const Art = art[kind];
        return (
          <div
            key={className}
            className={'ghost ghost-' + kind + ' ' + className}
            style={{ '--ghost-delay': delay + 's' } as CSSProperties}
          >
            <div className="ghost-motion">
              <Art />
            </div>
          </div>
        );
      })}
    </div>
  );
}
