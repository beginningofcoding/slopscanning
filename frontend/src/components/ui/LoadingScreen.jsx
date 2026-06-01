'use client';

export default function LoadingScreen({ label = 'Loading…', fullPage = true }) {
  const inner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        position: 'relative',
      }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(var(--scan-red-rgb), 0.15)',
            borderTopColor: 'var(--scan-red)',
            animation: 'spin 0.9s linear infinite',
          }}
        />
        <div
          className="heartbeat"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '8px',
            height: '8px',
          }}
        />
      </div>
      {label && (
        <span
          className="mono"
          style={{
            color: 'var(--scan-red)',
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: 'center',
            maxWidth: '280px',
          }}
        >
          {label}
        </span>
      )}
      <div className="boot-bar-track">
        <div className="boot-bar-fill" />
      </div>
    </div>
  );

  if (!fullPage) return inner;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="scan-line-overlay" style={{ top: '30%' }} aria-hidden="true" />
      {inner}
    </div>
  );
}
