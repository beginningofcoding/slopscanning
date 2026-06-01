'use client';

import { useState } from 'react';
import { XCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const SEVERITY_META = {
  critical: { label: 'Critical', color: '#ff1744', bg: 'rgba(255,23,68,0.15)', Icon: XCircle },
  high: { label: 'High', color: '#ff6d00', bg: 'rgba(255,109,0,0.15)', Icon: AlertTriangle },
  medium: { label: 'Medium', color: '#ffab00', bg: 'rgba(255,171,0,0.15)', Icon: AlertCircle },
  low: { label: 'Low', color: '#00e676', bg: 'rgba(0,230,118,0.15)', Icon: Info },
};

export default function SeverityDistribution({ findings, onFilter }) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach((f) => {
    if (counts[f.severity] !== undefined) counts[f.severity]++;
  });

  const total = findings.length;
  const hasIssues = total > 0;

  const severities = ['critical', 'high', 'medium', 'low'];

  if (!hasIssues) return null;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Issue Distribution
        </span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {total} total
        </span>
      </div>

      {/* Stacked bar */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          overflow: 'hidden',
          background: 'var(--color-surface-2)',
          marginBottom: '10px',
        }}
      >
        {severities.map((sev) => {
          const count = counts[sev];
          const pct = total > 0 ? (count / total) * 100 : 0;
          const meta = SEVERITY_META[sev];
          if (count === 0) return null;
          return (
            <div
              key={sev}
              onClick={() => onFilter?.(sev)}
              title={`${meta.label}: ${count}`}
              style={{
                width: `${pct}%`,
                background: meta.color,
                cursor: onFilter ? 'pointer' : 'default',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {severities.map((sev) => {
          const count = counts[sev];
          const meta = SEVERITY_META[sev];
          const Icon = meta.Icon;
          if (count === 0) return null;
          return (
            <button
              key={sev}
              onClick={() => onFilter?.(sev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: meta.bg,
                border: `1px solid ${meta.color}`,
                borderRadius: '100px',
                padding: '3px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: meta.color,
                cursor: onFilter ? 'pointer' : 'default',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.02em',
              }}
            >
              <Icon size={12} />
              {meta.label}
              <span style={{ color: 'var(--color-text-primary)', marginLeft: '2px' }}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
