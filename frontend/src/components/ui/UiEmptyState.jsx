import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, message = 'Nothing here yet.', action }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        gap: '12px',
        color: 'var(--text-muted)',
      }}
    >
      <Icon size={32} color="var(--scan-red)" style={{ opacity: 0.6 }} />
      <p
        className="mono"
        style={{
          fontSize: '0.8125rem',
          textAlign: 'center',
          maxWidth: '360px',
          lineHeight: 1.5,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {message}
      </p>
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}
