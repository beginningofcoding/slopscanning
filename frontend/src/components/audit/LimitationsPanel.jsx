'use client';

const DEFAULT_LIMITATIONS = [
  'Heuristic signals are not proof of AI authorship.',
  'Polished human repositories may trigger false positives on doc templates.',
  'Deep claim verification requires the PR Reviewer tab.',
];

export default function LimitationsPanel({ limitations = DEFAULT_LIMITATIONS }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
        Known limitations
      </h3>
      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        {limitations.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
