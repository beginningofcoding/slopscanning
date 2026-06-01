'use client';

/**
 * Animated radar sweep SVG for hero background decoration.
 */
export default function ScannerRadarIcon({ size = 400, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Radar scanner"
      className={className}
      style={{ ...style, opacity: 0.12, pointerEvents: 'none' }}
    >
      {/* Outer rings */}
      <circle cx="100" cy="100" r="90" stroke="rgba(255,26,26,0.15)" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="70" stroke="rgba(255,26,26,0.12)" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="50" stroke="rgba(255,26,26,0.10)" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="30" stroke="rgba(255,26,26,0.08)" strokeWidth="0.5" />

      {/* Crosshairs */}
      <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(255,26,26,0.08)" strokeWidth="0.5" />
      <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255,26,26,0.08)" strokeWidth="0.5" />

      {/* Rotating sweep wedge */}
      <g className="animate-radar-sweep" style={{ transformOrigin: '100px 100px' }}>
        <path
          d="M100,100 L100,10 A90,90 0 0,1 190,100 Z"
          fill="url(#radar-gradient)"
          opacity="0.25"
        />
        <line x1="100" y1="100" x2="190" y2="10" stroke="rgba(255,26,26,0.4)" strokeWidth="1" />
      </g>

      {/* Ping dots */}
      <circle cx="140" cy="60" r="3" fill="#ff1a1a" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="130" r="2" fill="#ff1a1a" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0;0.5" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="150" r="2.5" fill="#ff1a1a" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>

      <defs>
        <linearGradient id="radar-gradient" x1="100" y1="100" x2="190" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff1a1a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ff1a1a" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
