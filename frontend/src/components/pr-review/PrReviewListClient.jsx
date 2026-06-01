'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { GitPullRequest, GitMerge, XCircle, Search, User, Clock, ArrowUpRight } from 'lucide-react';

const STATE_CONFIG = {
  open:   { color: '#58D0A0', bg: 'rgba(88,208,160,0.08)',  border: 'rgba(88,208,160,0.2)',  label: 'Open',   icon: GitPullRequest },
  merged: { color: '#A090F0', bg: 'rgba(160,144,240,0.08)', border: 'rgba(160,144,240,0.2)', label: 'Merged', icon: GitMerge },
  closed: { color: '#E06070', bg: 'rgba(224,96,112,0.08)',  border: 'rgba(224,96,112,0.2)',  label: 'Closed', icon: XCircle },
};

function getPRState(pr) {
  return pr.merged ? 'merged' : pr.state;
}

export default function PrReviewListClient({ prs, owner, name }) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState('board'); // 'board' | 'list'

  const filtered = useMemo(() =>
    prs.filter(pr => !search || pr.title.toLowerCase().includes(search.toLowerCase()) || String(pr.number).includes(search)),
    [prs, search]
  );

  const byState = useMemo(() => ({
    open:   filtered.filter(p => !p.merged && p.state === 'open'),
    merged: filtered.filter(p => p.merged),
    closed: filtered.filter(p => !p.merged && p.state === 'closed'),
  }), [filtered]);

  const totals = useMemo(() => ({
    open: prs.filter(p => !p.merged && p.state === 'open').length,
    merged: prs.filter(p => p.merged).length,
    closed: prs.filter(p => !p.merged && p.state === 'closed').length,
  }), [prs]);

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{
        padding: '1.5rem 0 1rem',
        borderBottom: '1px solid rgba(88,192,200,0.08)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Left: title + stat chips */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '16px', height: '2px', background: '#58D0A0', borderRadius: '1px' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#58D0A0', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Pull Requests</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px' }}>
              {prs.length} pull request{prs.length !== 1 ? 's' : ''}
            </h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(totals).map(([state, count]) => {
                const sc = STATE_CONFIG[state];
                const Icon = sc.icon;
                return (
                  <div key={state} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '8px' }}>
                    <Icon size={12} color={sc.color} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sc.color, fontFamily: 'var(--font-mono)' }}>{count}</span>
                    <span style={{ fontSize: '0.72rem', color: sc.color, opacity: 0.7, textTransform: 'capitalize' }}>{state}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: search + view toggle */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', background: 'rgba(8,11,24,0.6)', border: '1px solid rgba(88,192,200,0.12)', borderRadius: '10px' }}>
              <Search size={13} color="var(--color-text-muted)" />
              <input
                type="text" placeholder="Search PRs…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text-primary)', fontSize: '0.8125rem', width: '180px' }}
              />
            </div>
            <div style={{ display: 'flex', background: 'rgba(8,11,24,0.6)', border: '1px solid rgba(88,192,200,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
              {['board', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '8px 14px', background: view === v ? 'rgba(88,192,200,0.12)' : 'transparent',
                  border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: view === v ? 700 : 400,
                  color: view === v ? '#58C0C8' : 'var(--color-text-muted)', textTransform: 'capitalize', transition: 'all 0.15s',
                }}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOARD VIEW: 3 columns by state ── */}
      {view === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'start' }}>
          {(['open', 'merged', 'closed']).map(state => {
            const sc = STATE_CONFIG[state];
            const Icon = sc.icon;
            const items = byState[state];
            return (
              <div key={state}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px',
                  background: sc.bg, border: `1px solid ${sc.border}`,
                  borderRadius: '12px 12px 0 0',
                  borderBottom: 'none',
                }}>
                  <Icon size={14} color={sc.color} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sc.color, textTransform: 'capitalize' }}>{sc.label}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: sc.color }}>{items.length}</span>
                </div>

                {/* Column body */}
                <div style={{
                  background: 'rgba(19,24,64,0.3)',
                  border: `1px solid ${sc.border}`,
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  overflow: 'hidden',
                  minHeight: '120px',
                }}>
                  {items.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                      No {state} PRs
                    </div>
                  ) : (
                    items.map((pr, i) => (
                      <Link
                        key={pr.number}
                        href={`/repo/${owner}/${name}/pr-review/${pr.number}`}
                        style={{
                          display: 'block',
                          padding: '12px 14px',
                          textDecoration: 'none',
                          borderBottom: i < items.length - 1 ? `1px solid ${sc.border}33` : 'none',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = sc.bg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8375rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                            {pr.title}
                          </span>
                          <ArrowUpRight size={13} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: sc.color, fontWeight: 600 }}>#{pr.number}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            <User size={10} /> {pr.user?.login || pr.author}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            <Clock size={10} />
                            {pr.created_at && formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW: compact timeline rows ── */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No matching pull requests.</div>
          )}
          {filtered.map(pr => {
            const state = getPRState(pr);
            const sc = STATE_CONFIG[state] || STATE_CONFIG.open;
            const Icon = sc.icon;
            return (
              <Link
                key={pr.number}
                href={`/repo/${owner}/${name}/pr-review/${pr.number}`}
                style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr auto',
                  gap: '12px', alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(19,24,64,0.4)',
                  border: '1px solid rgba(88,192,200,0.08)',
                  borderLeft: `3px solid ${sc.color}`,
                  borderRadius: '10px',
                  textDecoration: 'none', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = sc.bg; e.currentTarget.style.borderColor = sc.color; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(19,24,64,0.4)'; e.currentTarget.style.borderColor = 'rgba(88,192,200,0.08)'; e.currentTarget.style.borderLeftColor = sc.color; }}
              >
                <Icon size={16} color={sc.color} />
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{pr.title}</span>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>#{pr.number}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{pr.user?.login || pr.author}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{pr.created_at && formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <ArrowUpRight size={14} color="var(--color-text-muted)" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}