'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import SignalsPanel from '@/components/shared/SignalsPanel';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { GitCommit, AlertTriangle, CheckCircle2, Info, Zap, Activity, Hash, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useActionStream } from '@/hooks/useActionStream';
import { COMMITS_VERIFY_ANALYZE_URL } from '@/lib/api';
import ProgressStream from '@/components/pr/ProgressStream';

/* ─── verdict config ───────────────────────────────── */
const VERDICT_CONFIG = {
  HALLUCINATED: { color: '#E06070', bg: 'rgba(224,96,112,0.08)', border: 'rgba(224,96,112,0.25)', label: 'Hallucinated', icon: AlertTriangle },
  GENERIC:      { color: '#E8C058', bg: 'rgba(232,192,88,0.08)',  border: 'rgba(232,192,88,0.25)',  label: 'Generic AI',    icon: Info },
  CLEAN:        { color: '#58D0A0', bg: 'rgba(88,208,160,0.08)',  border: 'rgba(88,208,160,0.25)', label: 'Clean',         icon: CheckCircle2 },
};

function getVerdict(commit) {
  return commit.verdict || null;
}

/* ─── Horizontal commit rail chip ──────────────────── */
function CommitChip({ commit, selected, onClick }) {
  const verdict = getVerdict(commit);
  const vc = verdict ? VERDICT_CONFIG[verdict] : null;
  const isSelected = selected;

  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        background: isSelected ? 'rgba(88,192,200,0.12)' : 'rgba(19,24,64,0.6)',
        border: `1px solid ${isSelected ? '#58C0C8' : vc ? vc.border : 'rgba(88,192,200,0.1)'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        minWidth: '180px',
        maxWidth: '200px',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(88,192,200,0.35)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = vc ? vc.border : 'rgba(88,192,200,0.1)'; }}
    >
      {vc && (
        <div style={{
          position: 'absolute', top: '6px', right: '8px',
          width: '7px', height: '7px', borderRadius: '50%',
          background: vc.color,
          boxShadow: `0 0 6px ${vc.color}`,
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
        <GitCommit size={11} color="#58C0C8" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#58C0C8', fontWeight: 600 }}>
          {(commit.sha || '').substring(0, 7)}
        </span>
      </div>
      <p style={{
        fontSize: '0.72rem', color: 'var(--color-text-primary)',
        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontWeight: 500, maxWidth: '160px',
      }}>
        {(commit.message || 'No message').split('\n')[0]}
      </p>
      <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '3px 0 0', fontFamily: 'var(--font-mono)' }}>
        {commit.author?.login || commit.author || '—'}
      </p>
    </button>
  );
}

/* ─── Radial score ring ─────────────────────────────── */
function ScoreRing({ pct, color, label, size = 90 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(88,192,200,0.08)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fill={color}
          fontSize="16" fontWeight="800" style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
          fontFamily="monospace"
        >{pct}%</text>
      </svg>
      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────── */
export default function CommitVerifierClient({ initialCommits = [], owner, name }) {
  const { events, status: sseStatus, error: sseError, result: commitResult, start } = useActionStream(COMMITS_VERIFY_ANALYZE_URL);
  const starting = sseStatus === 'streaming';

  const analyzedCommits = commitResult?.data?.commits || [];
  const displayCommits = analyzedCommits.length > 0 ? analyzedCommits : initialCommits;
  const summary = commitResult?.data?.summary || null;

  const [selectedSha, setSelectedSha] = useState(null);
  const [expandedSummary, setExpandedSummary] = useState(false);

  useEffect(() => {
    if (displayCommits.length > 0 && !selectedSha) setSelectedSha(displayCommits[0]?.sha);
  }, [displayCommits]);

  const selected = displayCommits.find(c => c.sha === selectedSha) || displayCommits[0] || null;
  const verdict = selected ? getVerdict(selected) : null;
  const vc = verdict ? VERDICT_CONFIG[verdict] : null;
  const VIcon = vc?.icon || null;

  const slopPct = summary ? Math.round((summary.slop_score || 0) * 100) : null;
  const qualPct = summary ? Math.round((1 - (summary.quality_score || 0)) * 100) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── TOP: Title + KPI bar + button ── */}
      <div style={{
        padding: '1.5rem 1.5rem 1rem',
        borderBottom: '1px solid rgba(88,192,200,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '16px', height: '2px', background: '#A090F0', borderRadius: '1px' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#A090F0', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Commit Inspector</span>
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            {displayCommits.length} commit{displayCommits.length !== 1 ? 's' : ''} indexed
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* KPI chips */}
          {[
            { label: 'Total', val: displayCommits.length, color: '#58C0C8' },
            { label: 'Flagged', val: displayCommits.filter(c => c.verdict && c.verdict !== 'CLEAN').length, color: '#E8C058' },
            { label: 'Critical', val: displayCommits.filter(c => c.verdict === 'HALLUCINATED').length, color: '#E06070' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              padding: '6px 14px', background: 'rgba(19,24,64,0.8)',
              border: '1px solid rgba(88,192,200,0.1)', borderRadius: '10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{val}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}

          {!starting && (
            <button onClick={() => start({ repo: `https://github.com/${owner}/${name}`, limit: 10 })}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 20px', background: '#58C0C8', border: 'none',
                borderRadius: '10px', color: '#080B18', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(88,192,200,0.25)',
              }}>
              <Zap size={14} /> Inspect Commits
            </button>
          )}
        </div>
      </div>

      {/* ── HORIZONTAL COMMIT RAIL ── */}
      {displayCommits.length > 0 && (
        <div style={{
          padding: '14px 1.5rem',
          borderBottom: '1px solid rgba(88,192,200,0.06)',
          background: 'rgba(8,11,24,0.4)',
        }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
            Commit Rail — click to inspect
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
            {displayCommits.map(c => (
              <CommitChip key={c.sha} commit={c} selected={selectedSha === c.sha} onClick={() => setSelectedSha(c.sha)} />
            ))}
          </div>
        </div>
      )}

      {/* ── STREAMING PROGRESS ── */}
      {sseStatus !== 'idle' && !commitResult && (
        <div style={{ padding: '2rem 1.5rem' }}>
          <ProgressStream events={events} status={sseStatus} error={sseError} />
        </div>
      )}

      {/* ── MAIN BODY: 60/40 split (detail | verdict) ── */}
      {selected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', minHeight: '420px' }}>

          {/* LEFT: Commit detail */}
          <div style={{ padding: '1.75rem 1.5rem', borderRight: '1px solid rgba(88,192,200,0.08)' }}>
            {/* SHA row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(88,192,200,0.07)', border: '1px solid rgba(88,192,200,0.15)', borderRadius: '8px' }}>
                <Hash size={13} color="#58C0C8" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#58C0C8', fontWeight: 600 }}>
                  {(selected.sha || '').substring(0, 12)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                <User size={12} />
                {selected.author?.login || selected.author || '—'}
              </div>
            </div>

            {/* Commit message */}
            <div style={{
              background: 'rgba(8,11,24,0.6)',
              border: '1px solid rgba(88,192,200,0.1)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>commit message</div>
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0 }}>
                {selected.message || 'No message'}
              </pre>
            </div>

            {/* If no analysis yet */}
            {!verdict && (
              <div style={{
                padding: '1.25rem',
                background: 'rgba(88,192,200,0.03)',
                border: '1px dashed rgba(88,192,200,0.12)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <Activity size={20} color="rgba(88,192,200,0.4)" />
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', margin: '0 0 3px' }}>No verdict yet</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>Hit <strong style={{ color: '#58C0C8' }}>Inspect Commits</strong> to run the AI analysis pipeline on this repository.</p>
                </div>
              </div>
            )}

            {/* Verdict reason */}
            {verdict && vc && (
              <div style={{
                padding: '1.25rem',
                background: vc.bg,
                border: `1px solid ${vc.border}`,
                borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  {VIcon && <VIcon size={16} color={vc.color} />}
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: vc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{vc.label}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', lineHeight: 1.65, margin: 0 }}>
                  {selected.reason || 'No detailed reasoning available.'}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Score rings + summary */}
          <div style={{ padding: '1.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(8,11,24,0.3)' }}>

            {/* Score rings */}
            {summary ? (
              <>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                  Repository scores
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <ScoreRing pct={slopPct} color={slopPct > 60 ? '#E06070' : slopPct > 35 ? '#E8C058' : '#58D0A0'} label="Slop" />
                  <ScoreRing pct={qualPct} color={qualPct > 60 ? '#E06070' : '#E8C058'} label="Issues" />
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed rgba(88,192,200,0.2)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={22} color="rgba(88,192,200,0.25)" />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Scores appear after analysis</p>
              </div>
            )}

            <div style={{ height: '1px', background: 'rgba(88,192,200,0.07)' }} />

            {/* Verdict legend */}
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                Verdict legend
              </div>
              {Object.entries(VERDICT_CONFIG).map(([k, v]) => {
                const count = displayCommits.filter(c => c.verdict === k).length;
                const VIc = v.icon;
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <VIc size={13} color={v.color} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', flex: 1 }}>{v.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: v.color }}>{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Expandable executive summary */}
            {summary?.executive_summary && (
              <div style={{ background: 'rgba(160,144,240,0.06)', border: '1px solid rgba(160,144,240,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedSummary(v => !v)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#A090F0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Summary</span>
                  {expandedSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSummary && (
                  <div style={{ padding: '0 12px 12px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{summary.executive_summary}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {displayCommits.length === 0 && sseStatus === 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
          <GitCommit size={40} color="rgba(88,192,200,0.2)" />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>No commits loaded yet.</p>
        </div>
      )}
    </div>
  );
}