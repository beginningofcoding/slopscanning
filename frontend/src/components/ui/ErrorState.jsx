import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ message = 'Something went wrong.', subtitle, onRetry }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '400px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '2rem',
        }}
      >
        <AlertCircle size={32} color="var(--critical-red)" />
        <p className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          {message}
        </p>
        {subtitle && (
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {subtitle}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" type="button">
              Back to home
            </Button>
          </Link>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
