'use client';

import { useEffect } from 'react';
import { useActionStream } from '@/hooks/useActionStream';
import { REPO_AUDIT_ANALYZE_URL } from '@/lib/api';
import ProgressStream from '@/components/ui/ProgressStream';
import SignalsPanel from '@/components/shared/SignalsPanel';
import LimitationsPanel from '@/components/audit/LimitationsPanel';

function SlopGauge({ value, label }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct > 60 ? 'var(--color-red)' : pct > 35 ? 'var(--color-yellow)' : 'var(--color-green)';
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '2rem', fontWeight: 800, color }}>{pct}%</p>
    </div>
  );
}

export default function UnifiedAuditClient({ owner, name, autoStart = false }) {
  const repoUrl = `https://github.com/${owner}/${name}`;
  const { events, status, result, error, start } = useActionStream(REPO_AUDIT_ANALYZE_URL);

  useEffect(() => {
    if (autoStart && status === 'idle') {
      start({ repo: repoUrl, mode: 'fast' });
    }
  }, [autoStart, status, start, repoUrl]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Full repository audit</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
          Cross-track heuristic scan: PRs, commits, docs, and code. Did anyone check this before publish?
        </p>
      </div>

      {status === 'idle' && (
        <button
          type="button"
          onClick={() => start({ repo: repoUrl, mode: 'fast' })}
          style={{
            padding: '10px 20px',
            background: 'var(--color-accent)',
            color: '#000',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Run full audit
        </button>
      )}

      {(status === 'streaming' || events.length > 0) && (
        <div style={{ marginTop: '1rem' }}>
          <ProgressStream events={events} status={status} />
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-red)', marginTop: '1rem' }}>{error}</p>
      )}

      {result && (() => {
        const audit = result.data ?? result;
        return (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              padding: '20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <SlopGauge value={audit.slop_index} label="Slop Index" />
            <SlopGauge value={audit.unchecked_publish_index} label="Unchecked Publish Index" />
          </div>

          {audit.pillar_scores && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {Object.entries(audit.pillar_scores).map(([pillar, score]) => (
                <div
                  key={pillar}
                  style={{
                    padding: '10px',
                    background: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    {pillar}
                  </p>
                  <p style={{ fontWeight: 700 }}>{Math.round((score || 0) * 100)}%</p>
                </div>
              ))}
            </div>
          )}

          {audit.maintainer_brief && (
            <div
              style={{
                padding: '16px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Maintainer brief</h3>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{audit.maintainer_brief}</p>
            </div>
          )}

          <SignalsPanel signals={audit.signals} />
          <LimitationsPanel limitations={audit.limitations} />
        </div>
        );
      })()}
    </div>
  );
}
