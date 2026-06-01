'use client';

import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, var(--scan-red), var(--scan-red-dim))',
    color: '#000',
    border: 'none',
    fontWeight: 700,
    boxShadow: '0 4px 15px rgba(var(--scan-red-rgb), 0.3)',
  },
  secondary: {
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(var(--scan-red-rgb), 0.15)',
    fontWeight: 600,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--scan-red)',
    border: '1px solid transparent',
    fontWeight: 500,
  },
};

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  style = {},
  ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        letterSpacing: '-0.01em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
        opacity: isDisabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
        ...v,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      {...props}
    >
      {loading && (
        <Loader2
          size={14}
          color="var(--scan-red)"
          style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
        />
      )}
      {children}
    </button>
  );
}
