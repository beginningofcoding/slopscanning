'use client';

import {
  Target,
  Fingerprint,
  Eye,
  ScanLine,
  ShieldAlert,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';

const TOOLS = [
  {
    key: 'pr',
    icon: Target,
    title: 'PR Reviewer',
    tagline: 'Detect fake claims before merge.',
    detects: [
      'PR descriptions claiming features not present in diff',
      'Misleading summaries vs actual code changes',
      'Fabricated performance or security claims',
    ],
    severityExamples: [
      { label: 'MISMATCH', level: 'critical', text: 'PR claims "adds OAuth2" — diff only adds console.log' },
      { label: 'OVERSTATED', level: 'high', text: '"Performance optimized" — no benchmark changes found' },
    ],
    mockSnippet: [
      { line: 1, text: '-  Adds secure OAuth2 authentication', status: 'removed' },
      { line: 2, text: '+  console.log("auth placeholder")', status: 'added' },
    ],
  },
  {
    key: 'commit',
    icon: Fingerprint,
    title: 'Commit Verifier',
    tagline: 'Expose lazy AI-generated commit messages.',
    detects: [
      'Generic messages like "Update code" or "Fix bug"',
      'Hallucinated functionality never implemented',
      'Commit scope mismatches actual file changes',
    ],
    severityExamples: [
      { label: 'GENERIC SLOP', level: 'medium', text: 'Commit: "Update code" — 12 files changed, 400+ lines' },
      { label: 'HALLUCINATION', level: 'high', text: 'Claims "adds Redis cache" — no cache code in diff' },
    ],
    mockSnippet: [
      { line: 1, text: 'commit 7a3f2d1', status: 'neutral' },
      { line: 2, text: 'Author: ai-dev <bot@example.com>', status: 'neutral' },
      { line: 3, text: 'Date:   Tue Jan 14 09:22:00 2025', status: 'neutral' },
      { line: 4, text: '', status: 'neutral' },
      { line: 5, text: '    Update code', status: 'flagged' },
    ],
  },
  {
    key: 'docs',
    icon: Eye,
    title: 'Docs Verifier',
    tagline: 'Catch hallucinated API docs and stale guides.',
    detects: [
      'Documentation referencing non-existent functions or endpoints',
      'Outdated setup instructions from old versions',
      'Inconsistent terminology across docs',
    ],
    severityExamples: [
      { label: 'GHOST API', level: 'critical', text: 'Docs mention POST /v2/analyze — route does not exist' },
      { label: 'STALE GUIDE', level: 'medium', text: 'Setup references npm package v1.2 — current is v3.0' },
    ],
    mockSnippet: [
      { line: 1, text: '## API Reference', status: 'neutral' },
      { line: 2, text: '', status: 'neutral' },
      { line: 3, text: '### POST /v2/analyze', status: 'flagged' },
      { line: 4, text: 'Analyze a repository for code quality.', status: 'neutral' },
      { line: 5, text: '', status: 'neutral' },
      { line: 6, text: '> ⚠ This endpoint is not implemented.', status: 'added' },
    ],
  },
  {
    key: 'code-review',
    icon: ScanLine,
    title: 'Code Scanner',
    tagline: 'Hunt dead code, secrets, and AI artifacts.',
    detects: [
      'Dead code and unreachable functions',
      'Hardcoded secrets, tokens, and API keys',
      'Placeholder implementations and TODO bombs',
      'Duplicate logic and copy-paste slop',
    ],
    severityExamples: [
      { label: 'HARDCODED SECRET', level: 'critical', text: 'AWS_KEY = "AKIA..." found in config.py' },
      { label: 'DEAD CODE', level: 'low', text: 'Function processData() is defined but never called' },
    ],
    mockSnippet: [
      { line: 1, text: 'function processData(data) {', status: 'flagged' },
      { line: 2, text: '  // TODO: implement', status: 'flagged' },
      { line: 3, text: '  return null;', status: 'flagged' },
      { line: 4, text: '}', status: 'flagged' },
      { line: 5, text: '', status: 'neutral' },
      { line: 6, text: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";', status: 'critical' },
    ],
  },
];

const SEVERITY_META = {
  critical: { color: '#7870E8', bg: 'rgba(120,112,232,0.12)', icon: XCircle },
  high: { color: '#E8A040', bg: 'rgba(232,160,64,0.12)', icon: AlertTriangle },
  medium: { color: '#E8C058', bg: 'rgba(232,192,88,0.12)', icon: AlertCircle },
  low: { color: '#58D0A0', bg: 'rgba(88,208,160,0.12)', icon: Info },
};

function MockBadge({ label, level }) {
  const meta = SEVERITY_META[level];
  const Icon = meta.icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '100px',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.color}`,
        fontFamily: 'var(--font-mono)',
      }}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

function MockTerminal({ lines }) {
  return (
    <div
      style={{
        background: 'var(--bg-void)',
        border: '1px solid rgba(88,192,200,0.12)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.78rem',
        lineHeight: 1.7,
        overflowX: 'auto',
      }}
    >
      {lines.map((l, i) => {
        let color = 'var(--text-secondary)';
        let bg = 'transparent';
        if (l.status === 'removed') { color = '#ff6d00'; }
        if (l.status === 'added') { color = '#00e676'; }
        if (l.status === 'flagged') { color = '#ffab00'; bg = 'rgba(255,171,0,0.06)'; }
        if (l.status === 'critical') { color = '#7870E8'; bg = 'rgba(120,112,232,0.08)'; }
        return (
          <div key={i} style={{ display: 'flex', gap: '8px', background: bg, borderRadius: '2px', padding: '0 4px', margin: '0 -4px' }}>
            <span style={{ color: 'var(--text-dim)', userSelect: 'none', minWidth: '20px', textAlign: 'right' }}>{l.line}</span>
            <span style={{ color, whiteSpace: 'pre' }}>{l.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FeatureDeepDive() {
  return (
    <section
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '4rem 2rem 5rem',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            marginBottom: '0.75rem',
          }}
        >
          What We Detect
        </h2>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
            maxWidth: '560px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Every scan targets specific AI slop patterns. Here is what each module hunts for — and what the output looks like.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {TOOLS.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.key}
              className="animate-fade-in-up glass-card"
              style={{
                padding: '1.75rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                animationDelay: `${0.1 * idx}s`,
              }}
            >
              {/* Left column — info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'rgba(88,192,200,0.10)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={18} color="#58C0C8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                      {tool.title}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {tool.tagline}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '8px',
                    }}
                  >
                    Detects
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {tool.detects.map((d, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        <ShieldAlert size={14} color="#58C0C8" style={{ flexShrink: 0, marginTop: '2px' }} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '8px',
                    }}
                  >
                    Severity Examples
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tool.severityExamples.map((ex, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <MockBadge label={ex.label} level={ex.level} />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                          {ex.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column — mock terminal */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '6px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Sample Output
                </div>
                <MockTerminal lines={tool.mockSnippet} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
