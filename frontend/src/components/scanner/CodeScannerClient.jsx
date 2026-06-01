'use client';

import { useState, useEffect } from 'react';
import { FileSearch, FolderOpen, Folder, File, AlertTriangle, XCircle, AlertCircle, Info, ChevronRight, ChevronDown, Zap, Loader2 } from 'lucide-react';
import { useActionStream } from '@/hooks/useActionStream';
import { CODE_SCAN_ANALYZE_URL, fetchCodeReviewSummary } from '@/lib/api';
// getScanFileContent remains from old api
import { getScanFileContent } from '@/lib/api';
import ProgressStream from '@/components/pr/ProgressStream';
import Badge from '@/components/ui/Badge';
import SeverityDistribution from '@/components/scanner/SeverityDistribution';
import GroupedIssuePanel from '@/components/scanner/GroupedIssuePanel';
import { SEVERITY_COLORS, SEVERITY_BG, FINDING_TYPE_LABELS, FINDING_TYPE_COLORS } from '@/constants';
import ReactMarkdown from 'react-markdown';

const SCAN_STAGES = ['clone', 'index', 'static_analysis', 'embedding', 'llm_summary', 'complete'];

// ── File tree ──────────────────────────────────────────────────
function buildTree(files) {
  const root = {};
  (files || []).forEach((f) => {
    const parts = f.file_path.split('/');
    let node = root;
    parts.forEach((part, i) => {
      if (!node[part]) node[part] = i === parts.length - 1 ? { __file: f } : {};
      node = node[part];
    });
  });
  return root;
}

function TreeNode({ name, node, depth = 0, onSelect, selectedPath, issueMap }) {
  const isFile = node.__file !== undefined;
  const [open, setOpen] = useState(depth < 2);
  const filePath = node.__file?.file_path;
  const issueCount = isFile ? (issueMap[filePath] || 0) : 0;
  const isSelected = isFile && selectedPath === filePath;

  if (isFile) {
    return (
      <div
        onClick={() => onSelect(node.__file)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: `4px 8px 4px ${depth * 12 + 8}px`,
          cursor: 'pointer',
          background: isSelected ? 'var(--color-surface-3)' : 'transparent',
          borderRadius: '4px',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
      >
        <File size={13} color={issueCount > 0 ? 'var(--color-yellow)' : 'var(--color-text-muted)'} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {name}
        </span>
        {issueCount > 0 && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-yellow)', flexShrink: 0 }}>{issueCount}</span>
        )}
      </div>
    );
  }

  const children = Object.entries(node).sort(([ak, av], [bk, bv]) => {
    const aIsFile = av.__file !== undefined;
    const bIsFile = bv.__file !== undefined;
    if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
    return ak.localeCompare(bk);
  });

  const childIssues = children.reduce((sum, [, v]) => {
    if (v.__file) return sum + (issueMap[v.__file.file_path] || 0);
    return sum;
  }, 0);

  return (
    <div>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: `4px 8px 4px ${depth * 12 + 8}px`,
          cursor: 'pointer',
          userSelect: 'none',
          borderRadius: '4px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {open ? <ChevronDown size={13} color="var(--color-text-muted)" /> : <ChevronRight size={13} color="var(--color-text-muted)" />}
        {open ? <FolderOpen size={13} color="var(--color-blue)" /> : <Folder size={13} color="var(--color-blue)" />}
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', flex: 1 }}>{name}</span>
        {childIssues > 0 && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-yellow)' }}>{childIssues}</span>
        )}
      </div>
      {open && children.map(([k, v]) => (
        <TreeNode key={k} name={k} node={v} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} issueMap={issueMap} />
      ))}
    </div>
  );
}

// ── Code viewer with highlighted regions ───────────────────────
function CodeViewer({ content, findings }) {
  if (!content) return (
    <div style={{ padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
      Select a file to view its contents.
    </div>
  );

  const lines = content.split('\n');
  const highlightedLines = new Set();
  const lineFindings = {};

  findings.forEach((f) => {
    for (let i = (f.line_start || 1); i <= (f.line_end || f.line_start || 1); i++) {
      highlightedLines.add(i);
      if (!lineFindings[i]) lineFindings[i] = [];
      lineFindings[i].push(f);
    }
  });

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
        <tbody>
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightedLines.has(lineNum);
            const fds = lineFindings[lineNum] || [];
            return (
              <tr
                key={lineNum}
                style={{
                  background: isHighlighted ? 'rgba(255,204,0,0.07)' : 'transparent',
                  borderLeft: isHighlighted ? '2px solid var(--color-yellow)' : '2px solid transparent',
                }}
                title={fds.map((f) => f.explanation).join(' | ')}
              >
                <td
                  style={{
                    padding: '0 12px 0 8px',
                    color: 'var(--color-text-muted)',
                    userSelect: 'none',
                    textAlign: 'right',
                    minWidth: '40px',
                    verticalAlign: 'top',
                    paddingTop: '1px',
                  }}
                >
                  {lineNum}
                </td>
                <td style={{ padding: '0 16px 0 4px', color: 'var(--color-text-primary)', whiteSpace: 'pre', lineHeight: '1.6' }}>
                  {line || ' '}
                </td>
                {isHighlighted && fds.length > 0 && (
                  <td style={{ padding: '0 12px', verticalAlign: 'top', paddingTop: '1px' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-yellow)', whiteSpace: 'nowrap' }}>
                      ⚠ {fds[0].finding_type ? FINDING_TYPE_LABELS[fds[0].finding_type] || fds[0].finding_type : ''}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── AI Summary panel ───────────────────────────────────────────
function AISummaryPanel({ summary }) {
  if (!summary) return null;
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: '16px',
      }}
    >
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={14} color="var(--color-accent)" />
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>AI Code Summary</span>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {summary.executive_summary && (
          <div style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: '14px', wordBreak: 'break-word' }}>
            <ReactMarkdown
              components={{
                p: ({node, ...props}) => <p style={{ marginBottom: '10px' }} {...props} />,
                ul: ({node, ...props}) => <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '10px' }} {...props} />,
                ol: ({node, ...props}) => <ol style={{ listStyleType: 'decimal', paddingLeft: '20px', marginBottom: '10px' }} {...props} />,
                li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
                code: ({node, inline, ...props}) => (
                  <code style={{ background: 'var(--color-surface-2)', padding: '2px 4px', borderRadius: '4px', fontSize: '0.85em', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }} {...props} />
                ),
                strong: ({node, ...props}) => <strong style={{ color: 'var(--color-text-primary)' }} {...props} />,
                h3: ({node, ...props}) => <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '14px', marginBottom: '8px' }} {...props} />
              }}
            >
              {summary.executive_summary}
            </ReactMarkdown>
          </div>
        )}
        {summary.top_recommendations?.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Recommendations
            </div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {summary.top_recommendations.map((r, i) => (
                <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{i + 1}.</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function CodeScannerClient({ owner, name }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [activePanel, setActivePanel] = useState('issues');
  const [aiSummary, setAiSummary] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  
  const [files, setFiles] = useState([]);
  const [allFindings, setAllFindings] = useState([]);

  const { events, status: sseStatus, error: sseError, result: rawScanResult, start } = useActionStream(CODE_SCAN_ANALYZE_URL);
  const starting = sseStatus === 'streaming';
  
  // Transform backend result to match frontend tree structure
  useEffect(() => {
    if (rawScanResult && files.length === 0) {
      const flattenedFindings = [];
      const mappedFiles = [];
      (rawScanResult.data.files || []).forEach(f => {
        mappedFiles.push({ file_path: f.path });
        (f.findings || []).forEach(finding => {
          flattenedFindings.push({
            ...finding,
            file_path: f.path,
            finding_type: finding.type,
            line_start: finding.line,
            line_end: finding.endLine
          });
        });
      });
      setFiles(mappedFiles);
      setAllFindings(flattenedFindings);
      
      if (!aiSummary && flattenedFindings.length > 0) {
        fetchCodeReviewSummary(`https://github.com/${owner}/${name}`, flattenedFindings)
          .then(res => setAiSummary({ executive_summary: res.summary }))
          .catch(console.error);
      }
    }
  }, [rawScanResult, files.length, aiSummary, owner, name]);

  const issueMap = {};
  allFindings.forEach((f) => {
    issueMap[f.file_path] = (issueMap[f.file_path] || 0) + 1;
  });

  const tree = buildTree(files);

  async function handleScan() {
    start({ repo: `https://github.com/${owner}/${name}` });
  }

  async function handleSelectFile(fileObj) {
    setSelectedFile(fileObj);
    setFileContent(null);
    setFileLoading(true);
    try {
      const res = await getScanFileContent(owner, name, fileObj.file_path);
      setFileContent(res.content || '');
    } catch (_) {
      setFileContent('// Could not load file content.');
    } finally {
      setFileLoading(false);
    }
  }

  function handleJumpToIssue(finding) {
    const file = files.find((f) => f.file_path === finding.file_path);
    if (file) handleSelectFile(file);
  }

  const fileFindings = selectedFile
    ? allFindings.filter((f) => f.file_path === selectedFile.file_path)
    : [];

  return (
    <div style={{ padding: '0 1.5rem 1.5rem', maxWidth: '100%' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 0', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '2px' }}>
            Source Code Scanner
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Hunt dead code, stub implementations, embedded secrets, and AI coding anti-patterns.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {rawScanResult && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: 'Files', val: files.length, color: 'var(--color-text-secondary)' },
                { label: 'Issues', val: allFindings.length, color: allFindings.length > 0 ? 'var(--color-yellow)' : 'var(--color-green)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 14px' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </div>
          )}
          {!starting && sseStatus === 'idle' && (
            <button
              onClick={handleScan}
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
              {starting ? 'Starting…' : '⚡ Run Scanner'}
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {sseStatus !== 'idle' && !rawScanResult && (
        <div style={{ maxWidth: '560px', marginBottom: '1.5rem' }}>
          <ProgressStream events={events} status={sseStatus} error={sseError} />
        </div>
      )}

      {/* IDE Layout */}
      {rawScanResult && (
        <>
          <AISummaryPanel summary={aiSummary} />
          <SeverityDistribution findings={allFindings} onFilter={setSeverityFilter} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr 300px',
              gap: '0',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              height: 'calc(100vh - 320px)',
              minHeight: '500px',
            }}
          >
            {/* File explorer */}
            <div
              style={{
                borderRight: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>
                File Tree
              </div>
              <div style={{ padding: '4px', overflowY: 'auto', flex: 1 }}>
                {Object.entries(tree).sort(([ak, av], [bk, bv]) => {
                  const aIsFile = av.__file !== undefined;
                  const bIsFile = bv.__file !== undefined;
                  if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
                  return ak.localeCompare(bk);
                }).map(([k, v]) => (
                  <TreeNode
                    key={k}
                    name={k}
                    node={v}
                    depth={0}
                    onSelect={handleSelectFile}
                    selectedPath={selectedFile?.file_path}
                    issueMap={issueMap}
                  />
                ))}
              </div>
            </div>

            {/* Code viewer */}
            <div
              style={{
                background: 'var(--color-bg)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* File tab bar */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  borderBottom: '1px solid var(--color-border)',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '36px',
                  gap: '4px',
                  overflowX: 'auto',
                  flexShrink: 0,
                }}
              >
                {selectedFile ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'var(--color-bg)',
                      borderRadius: '4px 4px 0 0',
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <File size={12} color={fileFindings.length > 0 ? 'var(--color-yellow)' : 'var(--color-text-muted)'} />
                    {selectedFile.file_path.split('/').pop()}
                    {fileFindings.length > 0 && (
                      <Badge color="var(--color-yellow)" style={{ fontSize: '0.6875rem' }}>
                        {fileFindings.length}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', padding: '0 8px' }}>
                    No file open
                  </span>
                )}
              </div>

              {/* Code content */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {fileLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px', color: 'var(--color-text-muted)' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem' }}>Loading file…</span>
                  </div>
                ) : (
                  <CodeViewer content={fileContent} findings={fileFindings} />
                )}
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            {/* Issue panel */}
            <div
              style={{
                borderLeft: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <GroupedIssuePanel
                findings={allFindings}
                onJump={handleJumpToIssue}
                activeFile={selectedFile?.file_path}
                severityFilter={severityFilter}
                onSeverityFilter={setSeverityFilter}
              />
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {sseStatus === 'idle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 300px', gap: '16px', minHeight: '500px', height: 'calc(100vh - 280px)' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px', opacity: 0.5 }}>
             <div style={{ width: '60%', height: '14px', background: 'var(--color-surface-3)', borderRadius: '4px', marginBottom: '16px' }} />
             <div style={{ width: '100%', height: '24px', background: 'var(--color-surface-3)', borderRadius: '4px', marginBottom: '8px' }} />
             <div style={{ width: '80%', height: '24px', background: 'var(--color-surface-3)', borderRadius: '4px', marginBottom: '8px' }} />
             <div style={{ width: '90%', height: '24px', background: 'var(--color-surface-3)', borderRadius: '4px' }} />
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
             <FileSearch size={48} color="var(--color-text-muted)" style={{ marginBottom: '16px' }} />
             <p style={{ fontSize: '1.125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Press "Run Scanner" to analyse this repository.</p>
             <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Finds dead code, stub functions, hardcoded secrets, and AI coding artifacts.</p>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px', opacity: 0.5 }} />
        </div>
      )}
    </div>
  );
}
