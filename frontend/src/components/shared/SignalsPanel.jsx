'use client';

import Badge from '@/components/ui/Badge';

const SEV_COLORS = {
  critical: 'var(--color-red)',
  high: 'var(--color-red)',
  medium: 'var(--color-yellow)',
  low: 'var(--color-text-muted)',
};

export default function SignalsPanel({ signals = [], title = 'Detected Signals' }) {
  if (!signals?.length) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        No pattern signals flagged for this scan.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{title}</h3>
      {signals.map((s) => (
        <div
          key={s.id || s.title}
          style={{
            padding: '12px 14px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
            <Badge color={SEV_COLORS[s.severity] || 'var(--color-text-muted)'}>
              {(s.severity || 'info').toUpperCase()}
            </Badge>
            {s.pillar && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.pillar}</span>
            )}
            {s.score !== undefined && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                confidence {(s.score * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>{s.title}</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {s.evidence}
          </p>
          {s.id && (
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
              {s.id}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
