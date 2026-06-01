'use client';

import Link from 'next/link';
import { Star, GitFork, Target, Fingerprint, Eye, ScanLine, ExternalLink, Scan } from 'lucide-react';
import RepoNav from './RepoNav';

const MODULE_ICONS = {
  audit: { color: 'var(--health-green)', bg: 'rgba(var(--health-green-rgb), 0.12)' },
  prs: { color: 'var(--scan-red)', bg: 'rgba(var(--scan-red-rgb), 0.12)' },
  commits: { color: 'var(--purple)', bg: 'rgba(var(--purple-rgb), 0.12)' },
  docs: { color: 'var(--warning-amber)', bg: 'rgba(var(--warning-amber-rgb), 0.12)' },
  scan: { color: 'var(--info-blue)', bg: 'rgba(var(--info-blue-rgb), 0.12)' },
};

export default function RepoDashboard({ repoInfo, owner, name }) {
  const repo = repoInfo || {};

  const modules = [
    {
      key: 'audit',
      href: `/repo/${owner}/${name}/audit`,
      icon: Scan,
      title: 'Full Repository Audit',
      desc: 'Unified Slop Index across PRs, commits, docs, and code — heuristic signals plus maintainer brief.',
      cta: 'Run full audit →',
      highlight: true,
    },
    {
      key: 'prs',
      href: `/repo/${owner}/${name}/prs`,
      icon: Target,
      title: 'PR Reviewer',
      desc: 'Detect fake PR claims and misleading summaries via diff fingerprinting and claim verification.',
      cta: 'Review PRs →',
    },
    {
      key: 'commits',
      href: `/repo/${owner}/${name}/commits`,
      icon: Fingerprint,
      title: 'Commit Verifier',
      desc: 'Scan repository commit history for generic AI slop, hallucinations, and lazy descriptions using Fireworks AI.',
      cta: 'Verify Commits →',
    },
    {
      key: 'docs',
      href: `/repo/${owner}/${name}/docs`,
      icon: Eye,
      title: 'Docs Verifier',
      desc: 'Find hallucinated documentation, repetitive slop, inconsistent terminology, and outdated setup guides.',
      cta: 'Verify Docs →',
    },
    {
      key: 'scan',
      href: `/repo/${owner}/${name}/scan`,
      icon: ScanLine,
      title: 'Code Scanner',
      desc: 'Scan codebase for dead code, fake implementations, hardcoded secrets, duplicate logic, and AI coding artifacts.',
      cta: 'Scan Code →',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <RepoNav owner={owner} name={name} active={null} />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
                {owner}/<span className="text-red-accent">{name}</span>
              </h1>
              {repo.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '600px', lineHeight: 1.5 }}>
                  {repo.description}
                </p>
              )}
            </div>
            <a
              href={`https://github.com/${owner}/${name}`}
              target="_blank"
              rel="noreferrer"
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <ExternalLink size={13} />
              View on GitHub
            </a>
          </div>

          {(repo.stars !== undefined || repo.forks !== undefined) && (
            <div className="mono" style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {repo.stars !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Star size={13} color="var(--warning-amber)" /> {repo.stars?.toLocaleString()}
                </span>
              )}
              {repo.forks !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <GitFork size={13} /> {repo.forks?.toLocaleString()}
                </span>
              )}
              {repo.language && <span>{repo.language}</span>}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {modules.map(({ key, href, icon: Icon, title, desc, cta, highlight }) => {
            const accent = MODULE_ICONS[key] || MODULE_ICONS.prs;
            return (
              <Link
                key={href}
                href={href}
                className="glass-card"
                style={{
                  display: 'block',
                  padding: '1.5rem',
                  textDecoration: 'none',
                  borderColor: highlight ? 'rgba(var(--health-green-rgb), 0.35)' : undefined,
                  boxShadow: highlight ? '0 0 20px rgba(var(--health-green-rgb), 0.08)' : undefined,
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    background: accent.bg,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <Icon size={18} color={accent.color} />
                </div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {title}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                  {desc}
                </p>
                <span className="text-red-accent mono" style={{ fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                  {cta}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
