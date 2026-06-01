'use client';

import Link from 'next/link';
import { Target, Fingerprint, Eye, ScanLine, ChevronRight, Scan } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { PROJECT_NAME } from '@/lib/project';

const TABS = [
  { key: 'audit', label: 'Full Audit', icon: Scan, href: (o, n) => `/repo/${o}/${n}/audit` },
  { key: 'prs', label: 'PR Reviewer', icon: Target, href: (o, n) => `/repo/${o}/${n}/prs` },
  { key: 'commits', label: 'Commit Verifier', icon: Fingerprint, href: (o, n) => `/repo/${o}/${n}/commits` },
  { key: 'docs', label: 'Docs Verifier', icon: Eye, href: (o, n) => `/repo/${o}/${n}/docs` },
  { key: 'scan', label: 'Code Scanner', icon: ScanLine, href: (o, n) => `/repo/${o}/${n}/scan` },
];

export default function RepoNav({ owner, name, active }) {
  return (
    <nav
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--nav-border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          height: '52px',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            marginRight: '1rem',
            flexShrink: 0,
          }}
        >
          <Logo size={28} style={{ color: '#0a0f14', flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(var(--scan-red-rgb), 0.35))' }} />
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {PROJECT_NAME}
          </span>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginRight: '1.5rem',
            paddingRight: '1.5rem',
            borderRight: '1px solid rgba(var(--scan-red-rgb), 0.12)',
            flexShrink: 0,
          }}
        >
          <ChevronRight size={14} color="var(--text-muted)" />
          <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--scan-red)' }}>
            {owner}/{name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '100%' }}>
          {TABS.map(({ key, label, icon: Icon, href }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={href(owner, name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  height: '100%',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--scan-red)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  borderBottom: isActive ? '2px solid var(--scan-red)' : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                  boxSizing: 'border-box',
                }}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
