'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PROJECT_NAME } from '@/lib/project';

/* ── Boot log lines ───────────────────────────────────── */
const BOOT_LINES = [
  { t: 30,  text: '▶ SlopScanning v1.0 — AI Code Quality Engine', color: '#58C0C8', bold: true },
  { t: 120, text: '  Loading analysis modules...', color: '#586898' },
  { t: 250, text: '  ✓ PR fingerprinting engine     [OK]', color: '#58D0A0' },
  { t: 380, text: '  ✓ Commit heuristic scanner     [OK]', color: '#58D0A0' },
  { t: 500, text: '  ✓ Documentation verifier       [OK]', color: '#58D0A0' },
  { t: 620, text: '  ✓ Source code static analyzer  [OK]', color: '#58D0A0' },
  { t: 750, text: '', color: '' },
  { t: 860, text: '  Connecting to Fireworks AI...', color: '#586898' },
  { t: 980, text: '  ✓ LLM inference backend        [CONNECTED]', color: '#58D0A0' },
  { t: 1080, text: '', color: '' },
  { t: 1160, text: '  System status:', color: '#586898' },
  { t: 1240, text: '    Slop detection rate   ████████████  98.4%', color: '#A090F0' },
  { t: 1340, text: '    False positive rate   ██            6.1%', color: '#A090F0' },
  { t: 1440, text: '    Avg. scan time        ─────────────  ~12s', color: '#A090F0' },
  { t: 1540, text: '', color: '' },
  { t: 1620, text: '▶ All systems nominal. Launching interface...', color: '#58C0C8', bold: true },
];

const TOTAL_DURATION = 2200;

export default function BootOverlay({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress]         = useState(0);
  const [phase, setPhase]               = useState('boot'); // 'boot' | 'flash' | 'done'
  const [skipped, setSkipped]           = useState(false);
  const finishedRef                     = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSkipped(true);
    onComplete();
  }, [onComplete]);

  /* ── skip on any key / click ── */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  /* ── reduced motion: skip instantly ── */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
  }, [finish]);

  /* ── schedule each boot line ── */
  useEffect(() => {
    if (skipped) return;
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines(v => Math.max(v, i + 1)), line.t)
    );
    return () => timers.forEach(clearTimeout);
  }, [skipped]);

  /* ── progress bar ── */
  useEffect(() => {
    if (skipped) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / TOTAL_DURATION) * 100));
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [skipped]);

  /* ── flash → done ── */
  useEffect(() => {
    if (skipped) return;
    const t1 = setTimeout(() => setPhase('flash'), TOTAL_DURATION);
    const t2 = setTimeout(() => finish(), TOTAL_DURATION + 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [skipped, finish]);

  if (skipped) return null;

  return (
    <div
      role="dialog"
      aria-label="System initializing"
      onClick={finish}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: phase === 'flash' ? '#58C0C8' : '#050810',
        display: 'flex', flexDirection: 'column',
        transition: 'background 0.15s ease',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
      }}
    >
      {/* ── scanline ── */}
      <style>{`
        @keyframes boot-scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes boot-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes boot-flicker {
          0%, 100% { opacity: 1; }
          92%      { opacity: 1; }
          93%      { opacity: 0.4; }
          94%      { opacity: 1; }
          97%      { opacity: 0.8; }
          98%      { opacity: 1; }
        }
        .boot-screen {
          animation: boot-flicker 4s ease infinite;
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, #58C0C8, transparent)',
        animation: 'boot-scanline 3s linear infinite',
        zIndex: 2, opacity: 0.4,
      }} />

      {/* ── TOP BAR: like a terminal title bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 20px',
        borderBottom: '1px solid rgba(88,192,200,0.15)',
        background: 'rgba(8,11,24,0.8)',
        flexShrink: 0, position: 'relative', zIndex: 3,
      }}>
        {['#E06070','#E8C058','#58D0A0'].map((c, i) => (
          <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.8 }} />
        ))}
        <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#586898', letterSpacing: '0.06em' }}>
          slopscanning — boot sequence
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#58D0A0', boxShadow: '0 0 6px #58D0A0' }} />
          <span style={{ fontSize: '0.65rem', color: '#58D0A0', fontWeight: 700, letterSpacing: '0.05em' }}>INITIALIZING</span>
        </div>
      </div>

      {/* ── MAIN TERMINAL BODY ── */}
      <div className="boot-screen" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '2rem 2.5rem', gap: '0',
        position: 'relative', zIndex: 3,
        maxWidth: '780px', margin: '0 auto', width: '100%',
        justifyContent: 'center',
      }}>

        {/* Log lines */}
        <div style={{ marginBottom: '2rem' }}>
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: '0.8125rem',
                color: line.color || 'transparent',
                fontWeight: line.bold ? 700 : 400,
                lineHeight: line.text ? 1.9 : 0.8,
                letterSpacing: '0.02em',
                animation: 'none',
              }}
            >
              {line.text || '\u00a0'}
              {/* blinking cursor on last line */}
              {i === visibleLines - 1 && line.text && (
                <span style={{ animation: 'boot-cursor 0.8s step-end infinite', color: '#58C0C8' }}>█</span>
              )}
            </div>
          ))}
        </div>

        {/* ── PROGRESS SECTION ── */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(88,192,200,0.04)',
          border: '1px solid rgba(88,192,200,0.12)',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.7rem', color: '#586898', letterSpacing: '0.08em' }}>SYSTEM BOOT PROGRESS</span>
            <span style={{ fontSize: '0.7rem', color: '#58C0C8', fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
              {progress}%
            </span>
          </div>

          {/* Main progress bar */}
          <div style={{ height: '4px', background: 'rgba(88,192,200,0.08)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #58C0C8, #A090F0)',
              boxShadow: '0 0 12px rgba(88,192,200,0.6)',
              transition: 'width 0.1s linear',
            }} />
          </div>

          {/* Sub-progress rows */}
          {[
            { label: 'PR Engine',       pct: Math.min(100, progress * 1.2), color: '#58D0A0' },
            { label: 'Commit Scanner',  pct: Math.min(100, Math.max(0, progress * 1.1 - 10)), color: '#A090F0' },
            { label: 'Doc Verifier',    pct: Math.min(100, Math.max(0, progress - 15)), color: '#E8C058' },
            { label: 'Code Analyzer',   pct: Math.min(100, Math.max(0, progress - 25)), color: '#78A8F0' },
          ].map(({ label, pct, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#586898', width: '100px', flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: '2px', background: 'rgba(88,192,200,0.06)', borderRadius: '1px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '1px', transition: 'width 0.1s linear' }} />
              </div>
              <span style={{ fontSize: '0.62rem', color, width: '32px', textAlign: 'right', fontWeight: 700 }}>{Math.round(pct)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        borderTop: '1px solid rgba(88,192,200,0.1)',
        background: 'rgba(8,11,24,0.8)',
        flexShrink: 0, position: 'relative', zIndex: 3,
      }}>
        <span style={{ fontSize: '0.65rem', color: '#58C0C8', letterSpacing: '0.08em', fontWeight: 700 }}>
          {PROJECT_NAME.toUpperCase()}
        </span>
        <span style={{ fontSize: '0.65rem', color: '#586898', letterSpacing: '0.05em' }}>
          press any key or click to skip
        </span>
        <span style={{ fontSize: '0.65rem', color: '#586898', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
          v1.0.0 · AI Code Quality Engine
        </span>
      </div>
    </div>
  );
}
