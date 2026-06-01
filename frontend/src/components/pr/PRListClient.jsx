'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { GitPullRequest, GitMerge, XCircle, Search, User } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { PR_STATES } from '@/constants';

function PRStateIcon({ state }) {
  if (state === 'merged') return <GitMerge size={16} color="var(--purple)" />;
  if (state === 'closed') return <XCircle size={16} color="var(--color-red)" />;
  return <GitPullRequest size={16} color="var(--color-green)" />;
}

export default function PRListClient({ prs, owner, name }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return prs.filter((pr) => {
      const matchState = filter === 'all' || pr.state === filter || (filter === 'merged' && pr.merged);
      const matchSearch = !search || pr.title.toLowerCase().includes(search.toLowerCase()) || String(pr.number).includes(search);
      return matchState && matchSearch;
    });
  }, [prs, filter, search]);

  const counts = useMemo(() => ({
    all: prs.length,
    open: prs.filter((p) => p.state === 'open').length,
    closed: prs.filter((p) => p.state === 'closed' && !p.merged).length,
    merged: prs.filter((p) => p.merged).length,
  }), [prs]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Pull Requests
        </h1>
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px',
            minWidth: '240px',
          }}
        >
          <Search size={14} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search PRs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* State tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
        {['all', 'open', 'merged', 'closed'].map((state) => (
          <button
            key={state}
            onClick={() => setFilter(state)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: filter === state ? '2px solid var(--color-accent)' : '2px solid transparent',
              padding: '8px 14px',
              fontSize: '0.8125rem',
              fontWeight: filter === state ? 600 : 400,
              color: filter === state ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'color 0.15s',
              textTransform: 'capitalize',
              marginBottom: '-1px',
            }}
          >
            {state} <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }}>{counts[state]}</span>
          </button>
        ))}
      </div>

      {/* PR list */}
      {filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
          No pull requests found.
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {filtered.map((pr, i) => {
            const state = pr.merged ? 'merged' : pr.state;
            return (
              <Link
                key={pr.number}
                href={`/repo/${owner}/${name}/prs/${pr.number}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'var(--color-surface)',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface)'; }}
              >
                <div style={{ paddingTop: '2px', flexShrink: 0 }}>
                  <PRStateIcon state={state} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {pr.title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                      #{pr.number}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <User size={12} />
                      {pr.user?.login || pr.author}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {pr.created_at && formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                    </span>
                    {pr.labels?.map((label) => (
                      <Badge
                        key={label.name}
                        color={`#${label.color || '888'}`}
                        style={{ fontSize: '0.6875rem' }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}