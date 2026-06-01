'use client';

import Link from 'next/link';
import { Target, Fingerprint, Eye, ScanLine, ChevronRight, Scan, Home } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { PROJECT_NAME } from '@/lib/project';

const TABS = [
  { key: 'audit', label: 'Repository Audit', icon: Scan, href: (o, n) => `/repo/${o}/${n}/audit` },
  { key: 'pr-review', label: 'Pull Request Check', icon: Target, href: (o, n) => `/repo/${o}/${n}/pr-review` },
  { key: 'commits', label: 'Commit Inspector', icon: Fingerprint, href: (o, n) => `/repo/${o}/${n}/commits` },
  { key: 'docs', label: 'Docs Inspector', icon: Eye, href: (o, n) => `/repo/${o}/${n}/docs` },
  { key: 'code-review', label: 'Source Scanner', icon: ScanLine, href: (o, n) => `/repo/${o}/${n}/code-review` },
];

export default function RepoNav({ owner, name, active }) {
  return (
    <nav
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--nav-border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Top strip: logo + breadcrumb */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '44px',
          borderBottom: '1px solid rgba(88,192,200,0.06)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <Logo size={22} style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(var(--scan-red-rgb), 0.35))' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {PROJECT_NAME}
          </span>
        </Link>

        <ChevronRight size={13} color="var(--text-dim)" />
        <Home size={13} color="var(--text-muted)" />
        <ChevronRight size={13} color="var(--text-dim)" />

        <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--scan-red)', fontWeight: 500 }}>
          {owner}
        </span>
        <ChevronRight size={13} color="var(--text-dim)" />
        <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--scan-red)', fontWeight: 600 }}>
          {name}
        </span>
      </div>

      {/* Bottom strip: module tabs */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          height: '40px',
          overflowX: 'auto',
        }}
      >
        {TABS.map(({ key, label, icon: Icon, href }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href(owner, name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                fontSize: '0.78rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--scan-red)' : 'var(--text-secondary)',
                textDecoration: 'none',
                borderRadius: '8px',
                background: isActive ? 'rgba(88,192,200,0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(88,192,200,0.18)' : '1px solid transparent',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(88,192,200,0.05)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={13} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
