'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FilePlus, FileMinus, FileEdit } from 'lucide-react';

function DiffLine({ line }) {
  let bg = 'transparent';
  let color = 'var(--color-text-secondary)';
  let prefix = ' ';

  if (line.startsWith('+')) {
    bg = 'rgba(var(--health-green-rgb), 0.08)';
    color = 'var(--color-green)';
    prefix = '+';
  } else if (line.startsWith('-')) {
    bg = 'rgba(255,68,68,0.08)';
    color = 'var(--color-red)';
    prefix = '-';
  } else if (line.startsWith('@@')) {
    bg = 'rgba(68,136,255,0.06)';
    color = 'var(--color-blue)';
  }

  return (
    <div
      style={{
        display: 'flex',
        background: bg,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8125rem',
        lineHeight: '1.6',
        whiteSpace: 'pre',
        overflowX: 'auto',
      }}
    >
      <span
        style={{
          width: '20px',
          flexShrink: 0,
          color: color,
          userSelect: 'none',
          paddingLeft: '8px',
        }}
      >
        {prefix}
      </span>
      <span style={{ color: line.startsWith('@@') ? 'var(--color-blue)' : 'var(--color-text-primary)', paddingRight: '16px' }}>
        {line.startsWith('+') || line.startsWith('-') ? line.slice(1) : line}
      </span>
    </div>
  );
}

function FileDiff({ file }) {
  const [expanded, setExpanded] = useState(true);
  const lines = file.patch ? file.patch.split('\n') : [];
  const additions = lines.filter((l) => l.startsWith('+')).length;
  const deletions = lines.filter((l) => l.startsWith('-')).length;

  const FileIcon = file.status === 'added' ? FilePlus : file.status === 'removed' ? FileMinus : FileEdit;
  const fileColor = file.status === 'added' ? 'var(--color-green)' : file.status === 'removed' ? 'var(--color-red)' : 'var(--color-text-secondary)';

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        marginBottom: '8px',
      }}
    >
      {/* File header */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--color-surface-2)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {expanded ? <ChevronDown size={14} color="var(--color-text-muted)" /> : <ChevronRight size={14} color="var(--color-text-muted)" />}
        <FileIcon size={14} color={fileColor} />
        <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
          {file.filename}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-green)', marginLeft: '8px' }}>+{additions}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-red)', marginLeft: '6px' }}>-{deletions}</span>
      </div>

      {/* Diff content */}
      {expanded && file.patch && (
        <div style={{ background: 'var(--color-surface)', overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
          {lines.map((line, i) => (
            <DiffLine key={i} line={line} />
          ))}
        </div>
      )}
      {expanded && !file.patch && (
        <div style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
          Binary file or no diff available.
        </div>
      )}
    </div>
  );
}

export default function DiffViewer({ files }) {
  if (!files || files.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
        No changed files found.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
        {files.length} file{files.length !== 1 ? 's' : ''} changed
      </div>
      {files.map((file, i) => (
        <FileDiff key={file.filename || i} file={file} />
      ))}
    </div>
  );
}