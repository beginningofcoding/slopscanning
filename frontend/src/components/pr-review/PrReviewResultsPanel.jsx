'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
import PrReviewSignalsPanel from './PrReviewSignalsPanel';
import Badge from '@/components/ui/Badge';
import { VERDICT_COLORS, VERDICT_BG, CLAIM_VERDICT_COLORS } from '@/constants';

function VerdictIcon({ verdict, size = 16 }) {
  if (verdict === 'TRUSTWORTHY') return <CheckCircle2 size={size} color="var(--color-green)" />;
  if (verdict === 'MISLEADING') return <XCircle size={size} color="var(--color-red)" />;
  if (verdict === 'SUSPICIOUS') return <AlertCircle size={size} color="var(--color-yellow)" />;
  return <HelpCircle size={size} color="var(--color-text-muted)" />;
}

function ClaimRow({ claim }) {
  const color = CLAIM_VERDICT_COLORS[claim.verdict] || 'var(--color-text-muted)';
  return (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ paddingTop: '2px', flexShrink: 0 }}>
        {claim.verdict === 'VERIFIED' && <CheckCircle2 size={15} color="var(--color-green)" />}
        {claim.verdict === 'MISMATCH' && <XCircle size={15} color="var(--color-red)" />}
        {claim.verdict === 'UNVERIFIABLE' && <HelpCircle size={15} color="var(--color-text-muted)" />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', marginBottom: '4px' }}>{claim.claim}</p>
        {claim.reason && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{claim.reason}</p>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
          <Badge color={color}>{claim.verdict}</Badge>
          {claim.confidence !== undefined && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {Math.round(claim.confidence * 100)}% confidence
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrReviewResultsPanel({ result }) {
  const [subTab, setSubTab] = useState('brief');
  if (!result) return null;
  const { actual_summary, claims = [], verdict, confidence_score, flags = [] } = result;
  const hasSignals = result.signals?.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'slide-in 0.25s ease' }}>

      {hasSignals && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {['brief', 'signals'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubTab(key)}
              style={{
                padding: '6px 12px',
                fontSize: '0.8125rem',
                fontWeight: subTab === key ? 600 : 400,
                background: subTab === key ? 'var(--color-surface-2)' : 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              {key === 'brief' ? 'Brief' : 'Signals'}
            </button>
          ))}
        </div>
      )}

      {subTab === 'signals' && hasSignals ? (
        <PrReviewSignalsPanel result={result} />
      ) : (
        <>

      {/* Overall verdict */}
      <div
        style={{
          padding: '16px 20px',
          background: VERDICT_BG[verdict] || 'var(--color-surface)',
          border: `1px solid ${VERDICT_COLORS[verdict] || 'var(--color-border)'}44`,
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <VerdictIcon verdict={verdict} size={22} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: VERDICT_COLORS[verdict] || 'var(--color-text-primary)' }}>
              {verdict || 'UNKNOWN'}
            </span>
            {confidence_score !== undefined && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {Math.round(confidence_score * 100)}% confidence
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {verdict === 'TRUSTWORTHY' && 'PR description accurately reflects the actual code changes.'}
            {verdict === 'SUSPICIOUS' && 'Some claims may not fully match the actual implementation.'}
            {verdict === 'MISLEADING' && 'PR description significantly misrepresents the actual code changes.'}
          </p>
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {flags.map((flag, i) => (
            <Badge key={i} color="var(--color-yellow)" bg="var(--color-yellow-dim)">
              ⚠ {flag}
            </Badge>
          ))}
        </div>
      )}

      {/* Actual summary */}
      {actual_summary && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            AI-Generated Actual Summary
          </div>
          <div style={{ padding: '14px 16px', fontSize: '0.9375rem', color: 'var(--color-text-primary)', lineHeight: 1.7 }}>
            {actual_summary}
          </div>
        </div>
      )}

      {/* Claims table */}
      {claims.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Claim-by-Claim Verification ({claims.length})
          </div>
          {claims.map((claim, i) => (
            <ClaimRow key={i} claim={claim} />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}