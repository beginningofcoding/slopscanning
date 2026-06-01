'use client';

import SignalsPanel from '@/components/shared/SignalsPanel';

export default function PrReviewSignalsPanel({ result }) {
  if (!result?.signals?.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {result.unchecked_publish_index !== undefined && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            Unchecked Publish Index
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {(result.unchecked_publish_index * 100).toFixed(0)}%
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Higher = more risk that changes were not meaningfully reviewed before publish.
          </p>
        </div>
      )}
      {result.pr_metrics && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          overlap {((result.pr_metrics.description_overlap || 0) * 100).toFixed(0)}% · reviews{' '}
          {((result.pr_metrics.substantive_review_ratio || 0) * 100).toFixed(0)}% substantive
        </div>
      )}
      <SignalsPanel signals={result.signals} title="PR heuristic signals" />
    </div>
  );
}
