import type { ReactNode } from 'react';

const shapes = {
  book: (
    <>
      <path d="M12 6C9 4 5 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-1-9 1Zm0 0v14" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4Z" />
      <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4Z" />
      <path d="m16 9 5 6m0-6-5 6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h6m4 0h6M4 17h10m4 0h2" />
      <circle cx="12" cy="7" r="2.5" />
      <circle cx="16" cy="17" r="2.5" />
    </>
  ),
  maze: <path d="M4 20V4h11m5 0v16h-7m-4-1v-4h6V9H9v2" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="m17.5 13 4.5 4.5-4.5 4.5-4.5-4.5Z" />
    </>
  ),
  door: <path d="M3 21h17M6 20V4h11v16M8 4l5-2v20l-5-2m2-7h.1" />,
  play: <path d="m7 4 13 8-13 8Z" stroke="none" fill="currentColor" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
} satisfies Record<string, ReactNode>;
export function Icon({ name }: { name: keyof typeof shapes }) {
  return (
    <svg
      className="ui-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes[name]}
    </svg>
  );
}
