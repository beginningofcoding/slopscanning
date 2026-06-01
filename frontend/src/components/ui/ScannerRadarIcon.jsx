'use client';

import { useEffect, useState } from 'react';

export default function ScannerRadarIcon({ size = 320, className, style }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let frame;
    const animate = () => {
      setRotation((r) => (r + 0.4) % 360);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ ...style, display: 'block' }}
    >
      {/* Radar rings */}
      <circle cx="100" cy="100" r="90" stroke="rgba(88,192,200,0.15)" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="70" stroke="rgba(88,192,200,0.12)" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="50" stroke="rgba(88,192,200,0.10)" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="30" stroke="rgba(88,192,200,0.08)" strokeWidth="0.5" />

      {/* Crosshairs */}
      <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(88,192,200,0.08)" strokeWidth="0.5" />
      <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(88,192,200,0.08)" strokeWidth="0.5" />

      {/* Sweeping line */}
      <g transform={`rotate(${rotation}, 100, 100)`}>
        <line x1="100" y1="100" x2="190" y2="10" stroke="rgba(88,192,200,0.4)" strokeWidth="1" />
        <polygon
          points="100,100 190,10 180,5"
          fill="url(#radar-gradient)"
          opacity="0.3"
        />
      </g>

      {/* Blips */}
      <circle cx="140" cy="60" r="3" fill="#58C0C8" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="130" r="2" fill="#58C0C8" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="150" r="2.5" fill="#58C0C8" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
      </circle>

      <defs>
        <linearGradient id="radar-gradient" x1="100" y1="100" x2="190" y2="10">
          <stop offset="0%" stopColor="#58C0C8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#58C0C8" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
