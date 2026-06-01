'use client';

import { useState, useMemo } from 'react';
import { XCircle, AlertTriangle, AlertCircle, Info, ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { SEVERITY_COLORS, FINDING_TYPE_LABELS, FINDING_TYPE_COLORS } from '@/constants';

const TABS = [
  { key: 'all', label: 'All Issues' },
  { key: 'severity', label: 'By Severity' },
  { key: 'type', label: 'By Type' },
  { key: 'file', label: 'By File' },
];

const SeverityIcon = ({ severity }) => {
  if (severity === 'critical') return <XCircle size={13} color="#7870E8" />;
  if (severity === 'high') return <AlertTriangle size={13} color="#E8A040" />;
  if (severity === 'medium') return <AlertCircle size={13} color="#E8C058" />;
  return <Info size={13} color="#58D0A0" />;
};

function IssueRow({ finding, onClick, activeFile }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--color-border-subtle)',
        cursor: 'pointer',
        background: activeFile === finding.file_path ? 'var(--color-surface-2)' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = activeFile === finding.file_path ? 'var(--color-surface-2)' : 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <SeverityIcon severity={finding.severity} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {FINDING_TYPE_LABELS[finding.finding_type] || finding.finding_type}
            </span>
            <Badge color={FINDING_TYPE_COLORS[finding.finding_type]} style={{ fontSize: '0.6875rem' }}>
              {finding.severity}
            </Badge>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '4px' }}>
            {finding.explanation}
          </p>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            {finding.file_path?.split('/').slice(-2).join('/')}
            {finding.line_start && `:${finding.line_start}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function GroupHeader({ label, count, open, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        background: 'var(--color-surface-2)',
        borderBottom: '1px solid var(--color-border-subtle)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {open ? <ChevronDown size={14} color="var(--color-text-muted)" /> : <ChevronRight size={14} color="var(--color-text-muted)" />}
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
      <span
        style={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface-3)',
          borderRadius: '100px',
          padding: '1px 8px',
          marginLeft: 'auto',
        }}
      >
        {count}
      </span>
    </div>
  );
}

export default function GroupedIssuePanel({ findings, onJump, activeFile, severityFilter, onSeverityFilter }) {
  const [tab, setTab] = useState('all');
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = useMemo(() => {
    if (severityFilter === 'all' || !severityFilter) return findings;
    return findings.filter((f) => f.severity === severityFilter);
  }, [findings, severityFilter]);

  if (filtered.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        No issues found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
        }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              if (key === 'all' && onSeverityFilter) onSeverityFilter('all');
            }}
            style={{
              padding: '8px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: tab === key ? 'var(--color-accent)' : 'var(--color-text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === key ? '2px solid var(--color-accent)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {tab === 'all' && filtered.map((f, i) => (
          <IssueRow key={i} finding={f} onClick={() => onJump(f)} activeFile={activeFile} />
        ))}

        {tab === 'severity' && ['critical', 'high', 'medium', 'low'].map((sev) => {
          const group = filtered.filter((f) => f.severity === sev);
          if (group.length === 0) return null;
          const open = openGroups[sev] !== false;
          return (
            <div key={sev}>
              <GroupHeader label={sev.charAt(0).toUpperCase() + sev.slice(1)} count={group.length} open={open} onToggle={() => toggleGroup(sev)} />
              {open && group.map((f, i) => (
                <IssueRow key={i} finding={f} onClick={() => onJump(f)} activeFile={activeFile} />
              ))}
            </div>
          );
        })}

        {tab === 'type' && (() => {
          const byType = {};
          filtered.forEach((f) => {
            const type = f.finding_type || 'unknown';
            if (!byType[type]) byType[type] = [];
            byType[type].push(f);
          });
          return Object.entries(byType).sort((a, b) => b[1].length - a[1].length).map(([type, group]) => {
            const open = openGroups[type] !== false;
            return (
              <div key={type}>
                <GroupHeader label={FINDING_TYPE_LABELS[type] || type} count={group.length} open={open} onToggle={() => toggleGroup(type)} />
                {open && group.map((f, i) => (
                  <IssueRow key={i} finding={f} onClick={() => onJump(f)} activeFile={activeFile} />
                ))}
              </div>
            );
          });
        })()}

        {tab === 'file' && (() => {
          const byFile = {};
          filtered.forEach((f) => {
            const file = f.file_path || 'unknown';
            if (!byFile[file]) byFile[file] = [];
            byFile[file].push(f);
          });
          return Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).map(([file, group]) => {
            const open = openGroups[file] !== false;
            const fileName = file.split('/').pop();
            return (
              <div key={file}>
                <GroupHeader
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <File size={12} color="var(--color-text-muted)" />
                      {fileName}
                    </span>
                  }
                  count={group.length}
                  open={open}
                  onToggle={() => toggleGroup(file)}
                />
                {open && group.map((f, i) => (
                  <IssueRow key={i} finding={f} onClick={() => onJump(f)} activeFile={activeFile} />
                ))}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
