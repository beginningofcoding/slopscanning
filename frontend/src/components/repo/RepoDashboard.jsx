'use client';

import { useState } from 'react';

import Link from 'next/link';
import { Star, GitFork, ExternalLink, Scan, Target, Fingerprint, Eye, ScanLine, ArrowRight, Shield, Activity } from 'lucide-react';
import RepoNav from './RepoNav';

const MODULES = [
  {
    key: 'audit', href: (o, n) => `/repo/${o}/${n}/audit`,
    icon: Scan, label: 'Complete Audit', shortLabel: 'Audit',
    desc: 'Unified slop index across PRs, commits, docs, and source code.',
    color: '#58D0A0', rgb: '88,208,160',
    tag: 'Recommended',
  },
  {
    key: 'prs', href: (o, n) => `/repo/${o}/${n}/prs`,
    icon: Target, label: 'Pull Request Checker', shortLabel: 'PRs',
    desc: 'Surface fabricated PR claims using diff fingerprinting.',
    color: '#E06070', rgb: '224,96,112',
  },
  {
    key: 'commits', href: (o, n) => `/repo/${o}/${n}/commits`,
    icon: Fingerprint, label: 'Commit Inspector', shortLabel: 'Commits',
    desc: 'Detect AI-generated boilerplate and hallucinated features in git history.',
    color: '#A090F0', rgb: '160,144,240',
  },
  {
    key: 'docs', href: (o, n) => `/repo/${o}/${n}/docs`,
    icon: Eye, label: 'Documentation Inspector', shortLabel: 'Docs',
    desc: 'Find ghost API references, outdated guides, and inconsistent terminology.',
    color: '#E8C058', rgb: '232,192,88',
  },
  {
    key: 'scan', href: (o, n) => `/repo/${o}/${n}/scan`,
    icon: ScanLine, label: 'Source Code Scanner', shortLabel: 'Code',
    desc: 'Hunt dead code, stub functions, embedded secrets, and AI anti-patterns.',
    color: '#78A8F0', rgb: '120,168,240',
  },
];

export default function RepoDashboard({ repoInfo, owner, name }) {
  const repo = repoInfo || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <RepoNav owner={owner} name={name} active={null} />

      {/* ── REPO HEADER ── */}
      <div style={{
        borderBottom: '1px solid rgba(88,192,200,0.08)',
        background: 'rgba(19,24,64,0.25)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 2rem 1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={13} color="#58C0C8" />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#58C0C8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                ready to scan
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 8px', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{owner} /</span>{' '}
              <span style={{ color: '#58C0C8' }}>{name}</span>
            </h1>
            {repo.description && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: '500px', lineHeight: 1.6, margin: '0 0 12px' }}>
                {repo.description}
              </p>
            )}
            {(repo.stars !== undefined || repo.forks !== undefined || repo.language) && (
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {repo.stars !== undefined && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} color="#E8C058" /> {repo.stars?.toLocaleString()}</span>}
                {repo.forks !== undefined && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><GitFork size={12} /> {repo.forks?.toLocaleString()}</span>}
                {repo.language && <span>{repo.language}</span>}
              </div>
            )}
          </div>
          <a href={`https://github.com/${owner}/${name}`} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(19,24,64,0.8)', border: '1px solid rgba(88,192,200,0.12)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '0.8rem', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(88,192,200,0.4)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(88,192,200,0.12)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            <ExternalLink size={13} /> View on GitHub
          </a>
        </div>
      </div>

      {/* ── MAIN: vertical nav left + feature detail right ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* LEFT: vertical module nav */}
        <div style={{
          position: 'sticky', top: '96px',
          background: 'rgba(19,24,64,0.4)',
          border: '1px solid rgba(88,192,200,0.1)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(88,192,200,0.07)', fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
            Modules
          </div>
          {MODULES.map(({ key, href, icon: Icon, shortLabel, color }) => (
            <Link
              key={key}
              href={href(owner, name)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '11px 14px',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(88,192,200,0.05)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `rgba(${MODULES.find(m=>m.key===key).rgb},0.08)`; e.currentTarget.style.paddingLeft = '18px'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.paddingLeft = '14px'; }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `rgba(${MODULES.find(m=>m.key===key).rgb},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={color} />
              </div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{shortLabel}</span>
              <ArrowRight size={12} color="var(--color-text-muted)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
            </Link>
          ))}
        </div>

        {/* RIGHT: module cards stacked vertically with alternating layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Highlight: Full audit — wide card */}
          {(() => {
            const m = MODULES[0];
            const Icon = m.icon;
            return (
              <Link href={m.href(owner, name)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: '1.5rem', alignItems: 'center',
                  padding: '1.75rem 2rem',
                  background: `rgba(${m.rgb},0.05)`,
                  border: `1px solid rgba(${m.rgb},0.2)`,
                  borderRadius: '16px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(${m.rgb},0.12)`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `rgba(${m.rgb},0.2)`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* bg number */}
                <div style={{ position: 'absolute', right: '100px', top: '-10px', fontSize: '7rem', fontWeight: 900, color: `rgba(${m.rgb},0.05)`, fontFamily: 'var(--font-mono)', pointerEvents: 'none', lineHeight: 1 }}>01</div>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `rgba(${m.rgb},0.12)`, border: `1px solid rgba(${m.rgb},0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={24} color={m.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>{m.tag}</div>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>{m.label}</h2>
                    <p style={{ fontSize: '0.8375rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{m.desc}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: m.color, fontWeight: 700, fontSize: '0.8rem', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  Launch <ArrowRight size={14} />
                </div>
              </Link>
            );
          })()}

          {/* Other 4 modules: 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {MODULES.slice(1).map((m, i) => {
              const Icon = m.icon;
              return (
                <Link key={m.key} href={m.href(owner, name)}
                  style={{
                    padding: '1.375rem',
                    background: `rgba(${m.rgb},0.04)`,
                    border: `1px solid rgba(${m.rgb},0.12)`,
                    borderRadius: '14px',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px rgba(${m.rgb},0.1)`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `rgba(${m.rgb},0.12)`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* watermark number */}
                  <div style={{ position: 'absolute', bottom: '-8px', right: '12px', fontSize: '5rem', fontWeight: 900, color: `rgba(${m.rgb},0.06)`, fontFamily: 'var(--font-mono)', pointerEvents: 'none', lineHeight: 1 }}>0{i + 2}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `rgba(${m.rgb},0.12)`, border: `1px solid rgba(${m.rgb},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={m.color} />
                    </div>
                    <ArrowRight size={14} color={m.color} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.015em', margin: '0 0 4px' }}>{m.label}</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.55 }}>{m.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
