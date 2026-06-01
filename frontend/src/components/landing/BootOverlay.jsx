'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PROJECT_NAME } from '@/lib/project';
import Logo from '@/components/ui/Logo';

const BOOT_TEXT = 'INITIALIZING RED SCAN ENGINE…';
const PHASE_LOGO = 400;
const PHASE_TYPEWRITER = 1200;
const PHASE_BOOT = 2000;

export default function BootOverlay({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState('');
  const [skipped, setSkipped] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSkipped(true);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      finish();
      return undefined;
    }

    const t1 = setTimeout(() => setPhase(1), PHASE_LOGO);
    const t2 = setTimeout(() => setPhase(2), PHASE_TYPEWRITER);
    const t3 = setTimeout(() => setPhase(3), PHASE_BOOT);
    const t4 = setTimeout(() => finish(), PHASE_BOOT + 200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [finish]);

  useEffect(() => {
    if (phase !== 2 || skipped) return undefined;

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(BOOT_TEXT.slice(0, i));
      if (i >= BOOT_TEXT.length) clearInterval(interval);
    }, 28);

    return () => clearInterval(interval);
  }, [phase, skipped]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') finish();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  if (skipped) return null;

  return (
    <div
      role="dialog"
      aria-label="System initializing"
      onClick={finish}
      onKeyDown={(e) => e.key === 'Enter' && finish()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)',
        cursor: 'pointer',
      }}
    >
      <div className="scan-line-overlay" aria-hidden="true" />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <Logo
          size={72}
          style={{
            color: '#0a0f14',
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.92)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            filter: 'drop-shadow(0 0 24px rgba(var(--scan-red-rgb), 0.45))',
          }}
        />

        <h1
          className="animate-fade-in"
          style={{
            fontSize: 'clamp(2rem, 8vw, 3.5rem)',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <span style={{ color: 'var(--text-primary)' }}>
            {PROJECT_NAME.replace(/Scanning$/i, '')}
          </span>
          <span className="hero-logo-gradient">Scanning</span>
        </h1>

        <p
          className="mono"
          style={{
            fontSize: '0.75rem',
            color: 'var(--scan-red)',
            letterSpacing: '0.1em',
            minHeight: '1.2em',
            opacity: phase >= 2 ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {phase >= 2 ? (
            <>
              {typed}
              <span style={{ animation: 'typewriter-cursor 1s step-end infinite' }}>|</span>
            </>
          ) : (
            '\u00a0'
          )}
        </p>

        <div
          className="boot-bar-track"
          style={{
            width: '240px',
            opacity: phase >= 3 ? 1 : phase >= 2 ? 0.5 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          <div className={phase >= 3 ? 'boot-bar-fill-once' : 'boot-bar-fill'} />
        </div>
      </div>

      <button
        type="button"
        onClick={finish}
        style={{
          position: 'absolute',
          bottom: '2rem',
          right: '2rem',
          background: 'transparent',
          border: '1px solid rgba(var(--scan-red-rgb), 0.25)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          padding: '6px 14px',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
        }}
      >
        SKIP
      </button>
    </div>
  );
}
