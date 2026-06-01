'use client';

import { Info } from 'lucide-react';

const DEFAULT_LIMITATIONS = [
  'Heuristic signals indicate patterns — they are not direct proof of AI authorship.',
  'Well-maintained human repos may trigger false positives on documentation templates.',
  'In-depth claim cross-checking requires the Pull Request Checker module.',
];

export default function LimitationsPanel({ limitations = DEFAULT_LIMITATIONS }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'rgba(88,104,152,0.06)',
        border: '1px solid rgba(88,104,152,0.2)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <Info size={15} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
      <div>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Scan caveats
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {limitations.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
