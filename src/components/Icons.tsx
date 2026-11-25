import type { ReactNode } from 'react';

export type IconName =
  | 'terminal'
  | 'book'
  | 'check'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'copy'
  | 'reset'
  | 'trash'
  | 'search'
  | 'menu'
  | 'close'
  | 'external'
  | 'shield'
  | 'sparkle'
  | 'chevron'
  | 'flag'
  | 'clock'
  | 'play'
  | 'stop'
  | 'grid'
  | 'arrow-left'
  | 'arrow-right'
  | 'award';

const paths: Record<IconName, ReactNode> = {
  terminal: <path d="M4 17l6-5-6-5M12 19h8" />,
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3 3l18 18M10.6 10.6a2 2 0 003 3" />
      <path d="M9.9 5.2A10.6 10.6 0 0112 5c5 0 9 4.5 9 7 0 1.1-.9 2.6-2.3 3.8M6.2 6.4C4.3 7.7 3 9.6 3 12c0 2.5 4 7 9 7 1.6 0 3-.5 4.2-1.3" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </>
  ),
  reset: <path d="M3 12a9 9 0 1015.5-6.2M3 4v5h5" />,
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  external: <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" />,
  shield: (
    <>
      <path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  flag: (
    <>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  play: <path d="M8 5l11 7-11 7V5z" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  'arrow-left': <path d="M19 12H5m6 7l-7-7 7-7" />,
  'arrow-right': <path d="M5 12h14m-6-7l7 7-7 7" />,
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14L7 22l5-3 5 3-1.5-8" />
    </>
  ),
};

export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon"
    >
      {paths[name]}
    </svg>
  );
}
