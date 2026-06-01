'use client';

import { useEffect, useState } from 'react';
import { useActionStream } from '@/hooks/useActionStream';
import { REPO_AUDIT_ANALYZE_URL } from '@/lib/api';
import ProgressStream from '@/components/ui/ProgressStream';
import SignalsPanel from '@/components/shared/SignalsPanel';
import LimitationsPanel from '@/components/audit/LimitationsPanel';
import { Zap, AlertCircle, BarChart2, FileText, ChevronDown, ChevronUp, ShieldCheck, ShieldAlert } from 'lucide-react';

/* ─── SVG Radial ring ───────────────────────────────── */
function RingGauge({ pct, color, size = 120, label }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(88,192,200,0.07)" strokeWidth="10" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
        <text x={size/2} y={size/2 + 7}
          textAnchor="middle" fill={color}
          fontSize="22" fontWeight="900" fontFamily="monospace"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}
        >{pct}%</text>
      </svg>
      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</span>
    </div>
  );
}

/* ─── Pillar bar ───────────────────────────────────── */
function PillarBar({ label, score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct > 60 ? '#E06070' : pct > 35 ? '#E8C058' : '#58D0A0';
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{label.replace(/_/g,' ')}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{pct}%</span>
      </div>
      <div style={{ height: '5px', background: 'rgba(88,192,200,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', boxShadow: `0 0 8px ${color}66`, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

export default function UnifiedAuditClient({ owner, name, autoStart = false }) {
  const repoUrl = `https://github.com/${owner}/${name}`;
  const { events, status, result, error, start } = useActionStream(REPO_AUDIT_ANALYZE_URL);
  const [briefOpen, setBriefOpen] = useState(true);

  useEffect(() => {
    if (autoStart && status === 'idle') start({ repo: repoUrl, mode: 'fast' });
  }, [autoStart, status, start, repoUrl]);

  const audit = result?.data ?? result ?? null;
  const slopPct  = audit ? Math.round((audit.slop_index || 0) * 100) : null;
  const riskPct  = audit ? Math.round((audit.unchecked_publish_index || 0) * 100) : null;
  const slopColor  = slopPct  > 60 ? '#E06070' : slopPct  > 35 ? '#E8C058' : '#58D0A0';
  const riskColor  = riskPct  > 60 ? '#E06070' : riskPct  > 35 ? '#E8C058' : '#58D0A0';

  return (
    <div>

      {/* ── HERO ROW: title left, action right ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        gap: '2rem', alignItems: 'center',
        padding: '1.75rem 1.5rem 1.25rem',
        borderBottom: '1px solid rgba(88,192,200,0.08)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '16px', height: '2px', background: '#58D0A0', borderRadius: '1px' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#58D0A0', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Complete Audit</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Cross-module Repository Scan
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0, maxWidth: '520px' }}>
            Heuristic sweep across PRs, commit history, documentation, and source code — producing a unified slop index and publish risk score.
          </p>
        </div>

        {status === 'idle' && (
          <button onClick={() => start({ repo: repoUrl, mode: 'fast' })}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 28px', background: '#58C0C8', border: 'none',
              borderRadius: '12px', color: '#080B18', fontWeight: 800,
              fontSize: '0.9375rem', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 6px 24px rgba(88,192,200,0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(88,192,200,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(88,192,200,0.3)'; }}
          >
            <Zap size={16} /> Launch Full Audit
          </button>
        )}

        {status !== 'idle' && !audit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#58C0C8', fontSize: '0.875rem', fontWeight: 600 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#58C0C8', animation: 'pulse-dot 1s ease infinite' }} />
            Scanning…
          </div>
        )}
      </div>

      {/* ── STREAMING PROGRESS ── */}
      {status !== 'idle' && !audit && (
        <div style={{ padding: '1.5rem' }}>
          <ProgressStream events={events} status={status} />
        </div>
      )}

      {error && (
        <div style={{ margin: '1rem 1.5rem', display: 'flex', gap: '8px', alignItems: 'center', color: '#E06070', fontSize: '0.875rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* ── EMPTY CALL TO ACTION ── */}
      {!audit && status === 'idle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(88,192,200,0.06)', margin: '1.5rem', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(88,192,200,0.08)' }}>
          {[
            { icon: ShieldCheck, label: 'PRs', desc: 'Claim vs diff verification', color: '#58D0A0' },
            { icon: BarChart2,   label: 'Commits', desc: 'AI boilerplate detection', color: '#A090F0' },
            { icon: FileText,    label: 'Docs', desc: 'Ghost API & inconsistency scan', color: '#E8C058' },
            { icon: ShieldAlert, label: 'Code', desc: 'Dead code & secret detection', color: '#78A8F0' },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} style={{ padding: '1.5rem', background: 'rgba(19,24,64,0.4)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `rgba(${color === '#58D0A0' ? '88,208,160' : color === '#A090F0' ? '160,144,240' : color === '#E8C058' ? '232,192,88' : '120,168,240'},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px', color: 'var(--color-text-primary)' }}>{label}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RESULTS ── */}
      {audit && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '0', minHeight: '500px' }}>

          {/* LEFT: pillar bars + brief */}
          <div style={{ padding: '1.75rem 1.5rem', borderRight: '1px solid rgba(88,192,200,0.08)' }}>

            {/* Pillar scores */}
            {audit.pillar_scores && (
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart2 size={12} /> Pillar breakdown
                </div>
                {Object.entries(audit.pillar_scores).map(([k, v]) => (
                  <PillarBar key={k} label={k} score={v} />
                ))}
              </div>
            )}

            {/* Maintainer brief */}
            {audit.maintainer_brief && (
              <div style={{
                background: 'rgba(8,11,24,0.5)',
                border: '1px solid rgba(88,192,200,0.1)',
                borderRadius: '14px', overflow: 'hidden',
              }}>
                <button
                  onClick={() => setBriefOpen(v => !v)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={14} color="#58C0C8" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#58C0C8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Maintainer Briefing</span>
                  </div>
                  {briefOpen ? <ChevronUp size={14} color="var(--color-text-muted)" /> : <ChevronDown size={14} color="var(--color-text-muted)" />}
                </button>
                {briefOpen && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.75, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {audit.maintainer_brief}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <SignalsPanel signals={audit.signals} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <LimitationsPanel limitations={audit.limitations} />
            </div>
          </div>

          {/* RIGHT: ring gauges + verdict banner */}
          <div style={{ padding: '1.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(8,11,24,0.3)' }}>

            {/* Verdict banner */}
            {slopPct !== null && (
              <div style={{
                padding: '12px 16px',
                background: slopPct > 60 ? 'rgba(224,96,112,0.08)' : slopPct > 35 ? 'rgba(232,192,88,0.08)' : 'rgba(88,208,160,0.08)',
                border: `1px solid ${slopColor}44`,
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                {slopPct > 60 ? <ShieldAlert size={18} color={slopColor} /> : <ShieldCheck size={18} color={slopColor} />}
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: slopColor, margin: 0 }}>
                    {slopPct > 60 ? 'HIGH RISK' : slopPct > 35 ? 'MODERATE RISK' : 'LOW RISK'}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    {slopPct > 60 ? 'Significant AI slop detected' : slopPct > 35 ? 'Some concerns found' : 'Repo looks mostly clean'}
                  </p>
                </div>
              </div>
            )}

            {/* Score rings */}
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0' }}>
              <RingGauge pct={slopPct ?? 0} color={slopColor} label="Slop Index" size={110} />
              <RingGauge pct={riskPct ?? 0} color={riskColor} label="Publish Risk" size={110} />
            </div>

            <div style={{ height: '1px', background: 'rgba(88,192,200,0.07)' }} />

            {/* Score legend */}
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>Score legend</div>
              {[['> 60%', '#E06070', 'High risk — do not publish'], ['35–60%', '#E8C058', 'Moderate — review required'], ['< 35%', '#58D0A0', 'Low — generally clean']].map(([range, color, desc]) => (
                <div key={range} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '4px', boxShadow: `0 0 6px ${color}` }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{range} </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
