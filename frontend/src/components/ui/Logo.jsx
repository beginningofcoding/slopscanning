'use client';

/**
 * SlopScan brand mark — code window with scan line and inspection lens.
 */
export default function Logo({ size = 28, className, style }) {
  const id = 'slopscan-logo';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SlopScan"
      className={className}
      style={style}
    >
      <rect width="40" height="40" rx="9" fill={`url(#${id}-bg)`} />
      <rect
        x="9"
        y="13"
        width="22"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2.2"
        fill="none"
        opacity="0.95"
      />
      <path d="M13 17h14M13 21h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <path
        d="M9 20h22"
        stroke={`url(#${id}-scan)`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="29" cy="12" r="5.2" stroke="currentColor" strokeWidth="2" fill={`url(#${id}-bg)`} />
      <path d="M33 16.2l3.2 3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id={`${id}-bg`} x1="8" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#58C0C8" />
          <stop offset="1" stopColor="#2A7080" />
        </linearGradient>
        <linearGradient id={`${id}-scan`} x1="9" y1="20" x2="31" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="transparent" />
          <stop offset="0.35" stopColor="#0D1028" />
          <stop offset="0.65" stopColor="#0D1028" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}
