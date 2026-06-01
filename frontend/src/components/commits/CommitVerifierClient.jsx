'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import SignalsPanel from '@/components/shared/SignalsPanel';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { GitCommit, AlertTriangle, CheckCircle2, FileText, Loader2, Info } from 'lucide-react';
import { useActionStream } from '@/hooks/useActionStream';
import { COMMITS_VERIFY_ANALYZE_URL } from '@/lib/api';
import ProgressStream from '@/components/pr/ProgressStream';

function SlopScoreBar({ score, label }) {
  const color = score > 0.7 ? 'var(--color-red)' : score > 0.4 ? 'var(--color-yellow)' : 'var(--color-green)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color }}>{Math.round(score * 100)}%</span>
      </div>
      <div style={{ height: '4px', background: 'var(--color-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score * 100}%`, background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function CommitVerifierClient({ initialCommits = [], owner, name }) {
  const { events, status: sseStatus, error: sseError, result: commitResult, start } = useActionStream(COMMITS_VERIFY_ANALYZE_URL);
  const starting = sseStatus === 'streaming';

  const analyzedCommits = commitResult?.data?.commits || [];
  const displayCommits = analyzedCommits.length > 0 ? analyzedCommits : initialCommits;
  const summary = commitResult?.data?.summary || null;

  const [selectedCommitSha, setSelectedCommitSha] = useState(displayCommits[0]?.sha || null);

  useEffect(() => {
    if (displayCommits.length > 0 && !selectedCommitSha) {
      setSelectedCommitSha(displayCommits[0].sha);
    }
  }, [displayCommits]);

  const selectedCommit = displayCommits.find((c) => c.sha === selectedCommitSha) || displayCommits[0] || null;

  async function handleVerify() {
    start({ repo: `https://github.com/${owner}/${name}`, limit: 10 });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Commit Verifier
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Detect AI-generated generic commit messages and hallucinated functionality claims.
          </p>
        </div>
        {!starting && (
          <button
            onClick={handleVerify}
            disabled={starting}
            style={{
              background: 'var(--color-accent)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: starting ? 'wait' : 'pointer',
            }}
          >
            {starting ? 'Analyzing...' : '⚡ Analyze Commits'}
          </button>
        )}
      </div>

      {/* Results Layout (Always visible now) */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '16px', minHeight: '70vh' }}>
        
        {/* Sidebar: Commit List */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            height: 'fit-content',
            position: 'sticky',
            top: '68px',
          }}
        >
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recent Commits
          </div>
          {displayCommits.length === 0 ? (
            <div style={{ padding: '20px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              No commits found.
            </div>
          ) : (
            displayCommits.map((commit) => {
              const isSelected = selectedCommit?.sha === commit.sha;
              const isHallucinated = commit.verdict === 'HALLUCINATED';
              const isGeneric = commit.verdict === 'GENERIC';
              const color = isHallucinated ? 'var(--color-red)' : isGeneric ? 'var(--color-yellow)' : 'var(--color-text-muted)';
              
              return (
                <button
                  key={commit.sha}
                  onClick={() => setSelectedCommitSha(commit.sha)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '12px',
                    background: isSelected ? 'var(--color-surface-3)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <GitCommit size={14} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(commit.message || '').split('\n')[0] || 'No commit message'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {(commit.sha || '').substring(0, 7)} · {commit.author?.login || commit.author || 'Unknown'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Center: Details / Progress Stream */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {sseStatus !== 'idle' && !commitResult ? (
            /* Streaming Progress replaces the details center pane beautifully */
            <div style={{ padding: '2rem' }}>
              <ProgressStream
                events={events}
                status={sseStatus}
                error={sseError}
              />
            </div>
          ) : selectedCommit ? (
            <>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <GitCommit size={16} color="var(--color-text-muted)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    {selectedCommit.sha}
                  </span>
                </div>
                <pre style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '0.9375rem', 
                  color: 'var(--color-text-primary)', 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  {selectedCommit.message}
                </pre>
              </div>
              
              <div style={{ padding: '1.5rem', flex: 1 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI Evaluation
                </h3>
                
                {selectedCommit.verdict ? (
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: '1px solid',
                    borderColor: selectedCommit.verdict === 'HALLUCINATED' ? 'rgba(255, 60, 60, 0.3)' : selectedCommit.verdict === 'GENERIC' ? 'rgba(255, 180, 0, 0.3)' : 'rgba(0, 200, 100, 0.3)',
                    background: selectedCommit.verdict === 'HALLUCINATED' ? 'rgba(255, 60, 60, 0.05)' : selectedCommit.verdict === 'GENERIC' ? 'rgba(255, 180, 0, 0.05)' : 'rgba(0, 200, 100, 0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {selectedCommit.verdict === 'HALLUCINATED' ? (
                        <AlertTriangle size={18} color="var(--color-red)" />
                      ) : selectedCommit.verdict === 'GENERIC' ? (
                        <Info size={18} color="var(--color-yellow)" />
                      ) : (
                        <CheckCircle2 size={18} color="var(--color-green)" />
                      )}
                      <span style={{ 
                        fontWeight: 700, 
                        fontSize: '0.9375rem',
                        color: selectedCommit.verdict === 'HALLUCINATED' ? 'var(--color-red)' : selectedCommit.verdict === 'GENERIC' ? 'var(--color-yellow)' : 'var(--color-green)'
                      }}>
                        {selectedCommit.verdict}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0 }}>
                      {selectedCommit.reason}
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: '1px dashed var(--color-border)',
                    background: 'var(--color-surface-2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Info size={18} color="var(--color-text-muted)" />
                      <span style={{ 
                        fontWeight: 600, 
                        fontSize: '0.9375rem',
                        color: 'var(--color-text-secondary)'
                      }}>
                        Evaluation Not Run
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      AI analysis has not been performed on this repository yet. Click the <strong>⚡ Analyze Commits</strong> button at the top right to start scanning all commits for AI slop and hallucinations.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-text-muted)' }}>
              Select a commit to view details
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!summary ? (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Analysis Summary
              </div>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>
                Run <strong>⚡ Analyze Commits</strong> to generate AI slop scores and executive summary for the repository.
              </p>
            </div>
          ) : (
            <>
              {summary && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Scores
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <SlopScoreBar score={summary.slop_score || 0} label="Slop Score" />
                    <SlopScoreBar score={1 - (summary.quality_score || 0)} label="Quality Issues" />
                  </div>
                </div>
              )}

              {summary?.burst_signals?.length > 0 && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
                  <SignalsPanel signals={summary.burst_signals} title="Commit pattern signals" />
                  {summary.pattern_summary && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                      {summary.pattern_summary}
                    </p>
                  )}
                </div>
              )}

              {summary?.executive_summary && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    AI Summary
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }} className="markdown-body">
                    <style>{`
                      .markdown-body p:last-child { margin-bottom: 0; }
                      .markdown-body strong { color: var(--color-text-primary); }
                      .markdown-body code { font-family: var(--font-mono); background: var(--color-surface-2); padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
                    `}</style>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{summary.executive_summary}</ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}