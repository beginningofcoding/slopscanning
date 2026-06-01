'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { BookOpen, AlertTriangle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { useActionStream } from '@/hooks/useActionStream';
import { DOCS_VERIFY_ANALYZE_URL, getScanFileContent } from '@/lib/api';
import ProgressStream from '@/components/pr/ProgressStream';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const DOC_PROGRESS_STAGES = ['fetch_docs', 'phrase_analysis', 'embedding', 'consistency', 'llm_summary', 'complete'];

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

function HighlightedMarkdown({ content, findings }) {
  // Build a set of suspicious line indices
  const suspiciousLines = new Set();
  (findings || []).forEach((f) => {
    if (f.line_start) {
      for (let i = f.line_start; i <= (f.line_end || f.line_start); i++) {
        suspiciousLines.add(i);
      }
    }
  });

  return (
    <div
      style={{
        fontSize: '0.9375rem',
        lineHeight: 1.8,
        color: 'var(--color-text-primary)',
      }}
      className="markdown-body"
    >
      <style>{`
        .markdown-body h1,.markdown-body h2,.markdown-body h3 { font-weight:700; letter-spacing:-0.02em; margin:1.5em 0 0.5em; }
        .markdown-body h1 { font-size:1.5rem; }
        .markdown-body h2 { font-size:1.25rem; }
        .markdown-body h3 { font-size:1rem; }
        .markdown-body p { margin:0 0 1em; }
        .markdown-body code { font-family:var(--font-mono); font-size:0.875em; background:var(--color-surface-2); padding:2px 6px; border-radius:4px; }
        .markdown-body pre { background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; padding:1rem; overflow-x:auto; margin:1em 0; }
        .markdown-body pre code { background:none; padding:0; }
        .markdown-body ul,.markdown-body ol { padding-left:1.5em; margin:0 0 1em; }
        .markdown-body li { margin:0.25em 0; }
        .markdown-body a { color:var(--color-blue); }
        .markdown-body blockquote { border-left:3px solid var(--color-border); padding-left:1em; color:var(--color-text-secondary); }
        .markdown-body table { width:100%; border-collapse:collapse; margin:1em 0; }
        .markdown-body th,.markdown-body td { padding:8px 12px; border:1px solid var(--color-border); text-align:left; font-size:0.875rem; }
        .markdown-body th { background:var(--color-surface-2); font-weight:600; }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
    </div>
  );
}

export default function DocsVerifierClient({ initialDocs = [], owner, name }) {
  const { events, status: sseStatus, error: sseError, result: docsResult, start } = useActionStream(DOCS_VERIFY_ANALYZE_URL);
  const starting = sseStatus === 'streaming';

  const analyzedDocs = docsResult?.data?.files || docsResult?.data?.documents || [];
  const displayDocs = analyzedDocs.length > 0 ? analyzedDocs : initialDocs;
  const summary = docsResult?.data?.summary || null;

  const [selectedDocPath, setSelectedDocPath] = useState(displayDocs[0]?.path || null);
  const [activeView, setActiveView] = useState('rendered');
  
  // Cache fetched raw file contents
  const [docContents, setDocContents] = useState({});
  const [loadingDoc, setLoadingDoc] = useState(false);

  useEffect(() => {
    if (displayDocs.length > 0 && !selectedDocPath) {
      setSelectedDocPath(displayDocs[0].path);
    }
  }, [displayDocs]);

  const selectedDoc = displayDocs.find((d) => d.path === selectedDocPath) || displayDocs[0] || null;

  useEffect(() => {
    if (!selectedDoc) return;
    
    // If the selected doc already has content (e.g. from docsResult), use that
    if (selectedDoc.content) return;
    
    // If we already fetched it, do nothing
    if (docContents[selectedDoc.path] !== undefined) return;
    
    async function loadContent() {
      setLoadingDoc(true);
      try {
        const res = await getScanFileContent(owner, name, selectedDoc.path);
        setDocContents((prev) => ({ ...prev, [selectedDoc.path]: res.content }));
      } catch (err) {
        console.error("Failed to fetch doc content:", err);
        setDocContents((prev) => ({ ...prev, [selectedDoc.path]: "Failed to load document content." }));
      } finally {
        setLoadingDoc(false);
      }
    }
    
    loadContent();
  }, [selectedDoc, owner, name, docContents]);

  async function handleVerify() {
    start({ repo: `https://github.com/${owner}/${name}` });
  }

  const docFindings = selectedDoc?.findings || [];
  const selectedDocContent = selectedDoc?.content || docContents[selectedDoc?.path] || '';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Documentation Inspector
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Surface AI-generated filler, hallucinated features, and inconsistencies across your docs.
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
            {starting ? 'Starting…' : '⚡ Inspect Docs'}
          </button>
        )}
      </div>

      {/* Results layout (Always visible now) */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 300px', gap: '16px', minHeight: '70vh' }}>

        {/* Sidebar: doc list */}
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
            Documents ({displayDocs.length})
          </div>
          {displayDocs.length === 0 ? (
            <div style={{ padding: '20px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              No documentation files found.
            </div>
          ) : (
            displayDocs.map((doc) => {
              const isSelected = selectedDoc?.path === doc.path;
              const hasIssues = (doc.findings || []).length > 0;
              return (
                <button
                  key={doc.path}
                  onClick={() => setSelectedDocPath(doc.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '9px 12px',
                    background: isSelected ? 'var(--color-surface-3)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <FileText size={13} color={hasIssues ? 'var(--color-yellow)' : 'var(--color-text-muted)'} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.path.split('/').pop()}
                  </span>
                  {hasIssues && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--color-yellow)', flexShrink: 0 }}>
                      {doc.findings.length}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Center: doc content / progress stream */}
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
          {sseStatus !== 'idle' && !docsResult ? (
            /* Progress stream displays in the center area while running */
            <div style={{ padding: '2rem' }}>
              <ProgressStream
                events={events}
                status={sseStatus}
                error={sseError}
              />
            </div>
          ) : selectedDoc ? (
            <>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-surface-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', flex: 1 }}>
                  {selectedDoc.path}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['rendered', 'raw'].map((v) => (
                    <button key={v} onClick={() => setActiveView(v)} style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: activeView === v ? 600 : 400, color: activeView === v ? 'var(--color-text-primary)' : 'var(--color-text-muted)', background: activeView === v ? 'var(--color-surface-3)' : 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', textTransform: 'capitalize' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                {loadingDoc ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <LoadingSpinner label="Fetching document content…" fullPage={false} />
                  </div>
                ) : activeView === 'rendered' ? (
                  <HighlightedMarkdown content={selectedDocContent} findings={docFindings} />
                ) : (
                  <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {selectedDocContent}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-text-muted)' }}>
              Choose a document to preview
            </div>
          )}
        </div>

        {/* Right: findings + summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!summary ? (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Inspection Overview
              </div>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>
                Run <strong>⚡ Inspect Docs</strong> to scan documentation for AI slop, ghost API references, and inconsistencies.
              </p>
            </div>
          ) : (
            <>
              {/* Scores */}
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

              {/* Findings for selected doc */}
              {docFindings.length > 0 && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Issues ({docFindings.length})
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {docFindings.map((finding, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--color-border-subtle)',
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <AlertTriangle size={13} color="var(--color-yellow)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                            {finding.type?.replace(/_/g, ' ')}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            {finding.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {summary?.executive_summary && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    AI Overview
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

              {/* Actionable Fixes */}
              {summary?.actionable_fixes?.length > 0 && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Suggested Fixes
                  </div>
                  <ul style={{ paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {summary.actionable_fixes.map((fix, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        <CheckCircle2 size={13} color="var(--color-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        {fix}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}