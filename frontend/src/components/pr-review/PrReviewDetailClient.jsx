'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, GitMerge, GitPullRequest, XCircle, User, Clock, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import DiffViewer from './DiffViewer';
import ProgressStream from '@/components/ui/ProgressStream';
import PrReviewResultsPanel from './PrReviewResultsPanel';
import Badge from '@/components/ui/Badge';
import { useAnalyzeSse } from '@/hooks/useAnalyzeSse';
import { getPrReviewAnalyzeUrl } from '@/lib/api';

export default function PrReviewDetailClient({ prDetail, owner, name }) {
  const [activeTab, setActiveTab] = useState('diff');
  const { events, status: sseStatus, error: sseError, result: reviewResult, start } = useAnalyzeSse(getPrReviewAnalyzeUrl);
  const starting = sseStatus === 'streaming';
  
  useEffect(() => {
    if (reviewResult) setActiveTab('review');
  }, [reviewResult]);

  async function handleReview() {
    start({ repo: `https://github.com/${owner}/${name}`, prNumber: prDetail.number });
    setActiveTab('progress');
  }

  if (!prDetail) return null;

  const state = prDetail.merged ? 'merged' : prDetail.state;
  const StateIcon = state === 'merged' ? GitMerge : state === 'closed' ? XCircle : GitPullRequest;
  const stateColor = state === 'merged' ? 'var(--purple)' : state === 'closed' ? 'var(--color-red)' : 'var(--color-green)';

  const tabs = [
    { key: 'diff', label: 'File Changes' },
    { key: 'commits', label: `Commits ${prDetail.commits?.length ? `(${prDetail.commits.length})` : ''}` },
    { key: 'comments', label: `Discussion ${prDetail.comments?.length ? `(${prDetail.comments.length})` : ''}` },
    ...(sseStatus !== 'idle' ? [{ key: 'progress', label: 'Scan Progress' }] : []),
    ...(reviewResult ? [{ key: 'review', label: '⚡ AI Review' }] : []),
  ];

  return (
    <div>
      {/* Back nav */}
      <Link
        href={`/repo/${owner}/${name}/prs`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          textDecoration: 'none',
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={14} /> Back to pull requests
      </Link>

      {/* PR header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <StateIcon size={20} color={stateColor} style={{ flexShrink: 0, marginTop: '3px' }} />
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', flex: 1 }}>
            {prDetail.title}
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '8px' }}>
              #{prDetail.number}
            </span>
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge color={stateColor} bg={`${stateColor}22`} style={{ textTransform: 'capitalize' }}>
            {state}
          </Badge>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            <User size={13} />
            {prDetail.user?.login || prDetail.author}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            <Clock size={13} />
            {prDetail.created_at && formatDistanceToNow(new Date(prDetail.created_at), { addSuffix: true })}
          </span>
          {prDetail.changed_files !== undefined && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              {prDetail.changed_files} file{prDetail.changed_files !== 1 ? 's' : ''} changed
            </span>
          )}
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-green)' }}>+{prDetail.additions || 0}</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-red)' }}>−{prDetail.deletions || 0}</span>
        </div>
      </div>

      {/* Description */}
      {prDetail.body && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Description
          </div>
          {prDetail.body}
        </div>
      )}

      {/* Review button */}
      {sseStatus === 'idle' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleReview}
            disabled={starting}
            style={{
              background: 'var(--color-accent)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 24px',
              fontSize: '0.9375rem',
              fontWeight: 700,
              cursor: starting ? 'wait' : 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            {starting ? 'Running analysis…' : '⚡ Analyse This PR'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', display: 'flex', gap: '0' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-accent)' : '2px solid transparent',
              padding: '8px 14px',
              fontSize: '0.8125rem',
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'diff' && <DiffViewer files={prDetail.files || []} />}

      {activeTab === 'commits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(prDetail.commits || []).map((commit, i) => (
            <div
              key={commit.sha || i}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <code style={{ fontSize: '0.75rem', color: 'var(--color-blue)', fontFamily: 'var(--font-mono)', flexShrink: 0, paddingTop: '2px' }}>
                {(commit.sha || '').slice(0, 7)}
              </code>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{commit.message || commit.commit?.message}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {commit.author?.login || commit.commit?.author?.name}
                  {commit.commit?.author?.date && ` · ${formatDistanceToNow(new Date(commit.commit.author.date), { addSuffix: true })}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'comments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(prDetail.comments || []).length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>No comments on this PR yet.</p>
          )}
          {(prDetail.comments || []).map((comment, i) => (
            <div
              key={comment.id || i}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <User size={13} color="var(--color-text-muted)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{comment.user?.login}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {comment.created_at && formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'progress' && (
        <div style={{ maxWidth: '560px' }}>
          <ProgressStream events={events} status={sseStatus} error={sseError} />
        </div>
      )}

      {activeTab === 'review' && reviewResult && (
        <PrReviewResultsPanel result={reviewResult.data} />
      )}
    </div>
  );
}