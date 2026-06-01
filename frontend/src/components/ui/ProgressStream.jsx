'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { PROGRESS_STAGE_LABELS } from '@/constants';

export default function ProgressStream({ events, status, error }) {
  const completedStages = new Set(events.slice(0, -1).map((e) => e.step || e.stage));
  const lastEvent = events[events.length - 1];
  const currentPct = lastEvent?.percent ?? lastEvent?.pct ?? 0;

  const stages = events.map((e) => e.step || e.stage).filter(Boolean);
  if (currentPct === 100 && !stages.includes('complete') && !stages.includes('Done')) {
    stages.push('complete');
  }

  return (
    <div className="glass-card terminal" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <span className="mono text-red-accent" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {status === 'complete' ? 'Analysis complete' : status === 'error' ? 'Analysis failed' : 'Scanning…'}
        </span>
        <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {status !== 'error' && `${currentPct}%`}
        </span>
      </div>

      <div
        style={{
          height: '4px',
          background: 'var(--bg-secondary)',
          borderRadius: '2px',
          marginBottom: '1.25rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${currentPct}%`,
            background:
              status === 'error'
                ? 'var(--critical-red)'
                : status === 'complete'
                  ? 'linear-gradient(90deg, var(--scan-red), var(--health-green))'
                  : 'linear-gradient(90deg, var(--scan-red), var(--health-green))',
            transition: 'width 0.4s ease',
            borderRadius: '2px',
            boxShadow: status !== 'error' ? '0 0 8px rgba(var(--scan-red-rgb), 0.4)' : 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stages.map((stage) => {
          const done = completedStages.has(stage);
          const isLast = lastEvent?.step === stage || lastEvent?.stage === stage;
          const isCurrent = isLast && status === 'streaming';

          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {done && stage !== 'complete' ? (
                <CheckCircle2 size={15} color="var(--health-green)" />
              ) : (stage === 'complete' || stage === 'Done') && status === 'complete' ? (
                <CheckCircle2 size={15} color="var(--health-green)" />
              ) : isCurrent ? (
                <Loader2
                  size={15}
                  color="var(--scan-red)"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              ) : status === 'error' && isLast ? (
                <XCircle size={15} color="var(--critical-red)" />
              ) : (
                <Circle size={15} color="rgba(var(--scan-red-rgb), 0.2)" />
              )}
              <span
                className="mono"
                style={{
                  fontSize: '0.8125rem',
                  color: done || isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {PROGRESS_STAGE_LABELS[stage] || stage}
              </span>
              {isCurrent && (
                <span
                  className="text-red-accent"
                  style={{
                    fontSize: '0.7rem',
                    marginLeft: 'auto',
                    animation: 'scanPulse 1.5s ease infinite',
                    letterSpacing: '0.08em',
                  }}
                >
                  scanning
                </span>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div
          className="badge-critical"
          style={{
            marginTop: '1rem',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
