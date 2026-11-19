import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Dread } from '../story/chapters';

// Now and then something crosses the page: a colony of bats, or, on the
// balanced and full settings, a kuyang (the flying head of Kalimantan lore).
// Flights never take pointer events, stop while a dialog is open, and do not
// run at all when motion is reduced.

type Flight = {
  id: number;
  kind: 'bats' | 'kuyang';
  ltr: boolean;
  from: number;
  to: number;
  seconds: number;
  scale: number;
  bats: { x: number; y: number; size: number; delay: number; flap: number }[];
};

let next = 0;
function plan(kind: Flight['kind']): Flight {
  const ltr = Math.random() < 0.5;
  const from = 8 + Math.random() * 55;
  const count = 4 + Math.floor(Math.random() * 4);
  return {
    id: next++,
    kind,
    ltr,
    from,
    to: Math.max(4, Math.min(80, from + (Math.random() - 0.6) * 40)),
    seconds: kind === 'bats' ? 6.5 + Math.random() * 3 : 13 + Math.random() * 4,
    scale: kind === 'bats' ? 0.75 + Math.random() * 0.6 : 0.85 + Math.random() * 0.35,
    bats: Array.from({ length: kind === 'bats' ? count : 0 }, (_, i) => ({
      x: i * (26 + Math.random() * 30) * (Math.random() < 0.5 ? 1 : 1.2),
      y: (Math.random() - 0.5) * 90,
      size: 34 + Math.random() * 26,
      delay: -Math.random() * 1.2,
      flap: 0.15 + Math.random() * 0.09,
    })),
  };
}

function Bat() {
  return (
    <svg viewBox="0 0 64 30" className="bat-art" aria-hidden="true" focusable="false">
      <g className="bat-wing bat-wing-left">
        <path d="M29 13C21 5 11 3 1 7c6 2 8 6 7 10 4-3 7-2 9 2 3-4 7-4 10-1Z" />
      </g>
      <g className="bat-wing bat-wing-right">
        <path d="M35 13c8-8 18-10 28-6-6 2-8 6-7 10-4-3-7-2-9 2-3-4-7-4-10-1Z" />
      </g>
      <path className="bat-body" d="M28.5 9 30 11.5h4L35.5 9l.3 4.5c1.4 1.7 1.4 6.5-3.8 9.5-5.2-3-5.2-7.8-3.8-9.5Z" />
      <circle className="bat-eye" cx="30.6" cy="14.2" r=".9" />
      <circle className="bat-eye" cx="33.4" cy="14.2" r=".9" />
    </svg>
  );
}

/**
 * A kuyang, the flying head of Kalimantan and Malay lore: long hair streaming
 * behind, a pale face half hidden, and the organs that trail beneath it drawn
 * as smouldering, glowing strands rather than anything graphic.
 */
function Kuyang() {
  return (
    <svg viewBox="0 0 300 220" className="kuyang-art" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kuyang-strand" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#040606" />
          <stop offset="0.7" stopColor="#040606" stopOpacity="0.55" />
          <stop offset="1" stopColor="#040606" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="kuyang-ember" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb27a" />
          <stop offset="0.35" stopColor="#e2452a" />
          <stop offset="1" stopColor="#6e0f06" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="kuyang-skin" cx="0.62" cy="0.42" r="0.7">
          <stop offset="0" stopColor="#d9cbbd" />
          <stop offset="0.55" stopColor="#9a8476" />
          <stop offset="1" stopColor="#3b2e2a" />
        </radialGradient>
        <radialGradient id="kuyang-eye">
          <stop offset="0" stopColor="#fff1d0" />
          <stop offset="0.4" stopColor="#ff6a3a" />
          <stop offset="1" stopColor="#ff3a1e" stopOpacity="0" />
        </radialGradient>
        <filter id="kuyang-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Hair streams back along the flight path. */}
      <g className="kuyang-hair" fill="none" stroke="url(#kuyang-strand)" strokeLinecap="round">
        <path d="M222 50C180 34 130 46 92 40 62 36 34 30 6 40" strokeWidth="10" />
        <path d="M224 58C182 54 140 70 100 66 70 63 44 70 14 82" strokeWidth="8" />
        <path d="M222 66c-34 8-70 22-104 24-26 2-50 10-74 24" strokeWidth="6" />
        <path d="M226 44c-32-18-78-20-112-14-24 4-48 0-72-10" strokeWidth="6" />
        <path d="M224 74c-26 14-54 30-84 38-20 5-38 14-54 26" strokeWidth="4" />
      </g>
      {/* What hangs beneath: smouldering strands and drops of light. */}
      <g className="kuyang-trails" filter="url(#kuyang-glow)" fill="none" stroke="url(#kuyang-ember)" strokeLinecap="round">
        <path d="M238 98c-2 24-12 44-28 62" strokeWidth="4.5" />
        <path d="M246 100c4 26 0 48-10 70" strokeWidth="3.5" />
        <path d="M232 96c-12 18-28 30-48 38" strokeWidth="3" />
        <path d="M252 96c10 16 14 34 10 54" strokeWidth="2.6" />
        <path d="M242 100c-4 30-4 56 2 82" strokeWidth="2" />
      </g>
      <g className="kuyang-drops" fill="#ff7a45" filter="url(#kuyang-glow)">
        <circle cx="212" cy="168" r="2.2" />
        <circle cx="238" cy="182" r="1.8" />
        <circle cx="186" cy="140" r="1.6" />
      </g>
      {/* Ragged neck, the face, and hair falling over it. */}
      <path d="M226 90c6 6 20 8 30 2l-2 8c-6 4-20 4-26-1Z" fill="#2a0905" />
      <ellipse cx="242" cy="62" rx="20" ry="27" fill="url(#kuyang-skin)" />
      <path d="M262 64c-2 14-8 24-16 28" stroke="#1c1210" strokeWidth="1.2" fill="none" opacity=".6" />
      <path d="M216 62c-4-28 12-42 30-40 16 2 26 14 24 30-6-8-14-10-22-8 4 8 2 18-4 26-6-10-16-14-28-8Z" fill="#040606" />
      <path d="M244 80c3 2 8 2 11-1" stroke="#1a0604" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g className="kuyang-eyes">
        <circle cx="249" cy="62" r="6" fill="url(#kuyang-eye)" />
        <circle cx="263" cy="61" r="4.6" fill="url(#kuyang-eye)" />
      </g>
    </svg>
  );
}

export function Flyers({ active, dread }: { active: boolean; dread: Dread }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const timer = useRef(0);
  useEffect(() => {
    if (!active) return;
    const launch = (first: boolean) => {
      if (!document.hidden) {
        const kuyang = !first && dread !== 'quiet' && Math.random() < (dread === 'full' ? 0.4 : 0.25);
        setFlights((list) => [...list.slice(-2), plan(kuyang ? 'kuyang' : 'bats')]);
      }
      timer.current = window.setTimeout(() => launch(false), (dread === 'full' ? 9000 : 13000) + Math.random() * 11000);
    };
    timer.current = window.setTimeout(() => launch(true), 4500);
    return () => window.clearTimeout(timer.current);
  }, [active, dread]);
  // Development only: `__fly('kuyang')` in the console sends one across, handy when recording the demo.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const call = (kind: Flight['kind'] = 'bats') => setFlights((list) => [...list, plan(kind)]);
    (window as unknown as { __fly?: typeof call }).__fly = call;
    return () => {
      delete (window as unknown as { __fly?: typeof call }).__fly;
    };
  }, []);
  if (!active && !flights.length) return null;
  return (
    <div className="flyers" aria-hidden="true">
      {flights.map((flight) => (
        <div
          key={flight.id}
          className={'flight flight-' + flight.kind}
          style={
            {
              '--from': flight.from + 'vh',
              '--to': flight.to + 'vh',
              '--start': flight.ltr ? '-18vw' : '112vw',
              '--end': flight.ltr ? '112vw' : '-18vw',
              '--face': flight.ltr ? 1 : -1,
              '--scale': flight.scale,
              animationDuration: flight.seconds + 's',
            } as CSSProperties
          }
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget)
              setFlights((list) => list.filter((item) => item.id !== flight.id));
          }}
        >
          <div className="flight-face">
            {flight.kind === 'kuyang' ? (
              <div className="kuyang">
                <Kuyang />
              </div>
            ) : (
              flight.bats.map((bat, i) => (
                <div
                  key={i}
                  className="bat"
                  style={
                    {
                      left: -bat.x + 'px',
                      top: bat.y + 'px',
                      width: bat.size + 'px',
                      animationDelay: bat.delay + 's',
                      '--flap': bat.flap + 's',
                    } as CSSProperties
                  }
                >
                  <Bat />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
