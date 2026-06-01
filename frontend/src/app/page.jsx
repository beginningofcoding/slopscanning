'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseGitHubUrl } from '@/lib/github';
import { PROJECT_AUTHOR, PROJECT_GITHUB_URL, PROJECT_NAME } from '@/lib/project';
import BootOverlay from '@/components/landing/BootOverlay';
import FeatureDeepDive from '@/components/landing/FeatureDeepDive';
import {
  Github, ScanLine, Target, Fingerprint, Eye, ArrowRight,
  ClipboardList, Radar, Activity, BarChart3, ShieldAlert,
  Zap, Terminal, ChevronRight, GitBranch, FileCode, BookOpen, Shield
} from 'lucide-react';
import { LIVE_FIRE_PRESETS, auditPathForUrl } from '@/lib/live_fire_presets';
import Logo from '@/components/ui/Logo';

const EXAMPLES = LIVE_FIRE_PRESETS.map((p) => ({ label: p.label, url: p.url }));

const FEATURES = [
  {
    id: 'pr',
    icon: Target,
    label: 'PR Review',
    title: 'Pull Request Reviewer',
    desc: 'Compare PR descriptions against actual diffs to expose fake claims, inflated summaries, and code that never made it in.',
    color: '#58D0A0',
    rgb: '88,208,160',
    bullets: ['Diff fingerprinting vs description claims', 'Fabricated performance benchmarks', 'Features mentioned but not implemented'],
  },
  {
    id: 'commit',
    icon: Fingerprint,
    label: 'Commits',
    title: 'Commit Inspector',
    desc: 'Scan git history for AI-generated boilerplate, hallucinated functionality, and lazy single-line commit messages on multi-file changes.',
    color: '#A090F0',
    rgb: '160,144,240',
    bullets: ['Generic AI boilerplate detection', 'Scope mismatch: message vs changed files', 'Hallucinated feature references'],
  },
  {
    id: 'docs',
    icon: BookOpen,
    label: 'Docs',
    title: 'Documentation Inspector',
    desc: 'Find ghost API endpoints, outdated installation guides, inconsistent terminology, and repetitive filler text across your docs.',
    color: '#E8C058',
    rgb: '232,192,88',
    bullets: ['Ghost endpoints (docs say exists, code says no)', 'Stale setup instructions', 'Copy-paste repetition patterns'],
  },
  {
    id: 'scan',
    icon: FileCode,
    label: 'Code',
    title: 'Source Code Scanner',
    desc: 'Hunt dead code, stub functions, hardcoded secrets, and the telltale signs of AI-assisted code that was never actually reviewed.',
    color: '#78A8F0',
    rgb: '120,168,240',
    bullets: ['Dead code & unreachable functions', 'Hardcoded secrets and tokens', 'TODO bombs and fake implementations'],
  },
];

const STEPS = [
  { num: '01', icon: ClipboardList, title: 'Paste a GitHub URL', desc: 'Any public repository — owner/repo format or full URL.' },
  { num: '02', icon: Radar, title: 'Clone & Index', desc: 'Full file tree, commit log, docs, and PR history are indexed.' },
  { num: '03', icon: Activity, title: 'Multi-model Analysis', desc: 'Fireworks AI + Gemini pipelines scan every layer in parallel.' },
  { num: '04', icon: BarChart3, title: 'Severity Report', desc: 'Get ranked findings with evidence and recommended fixes.' },
];

/* ─── Terminal typing animation ──────────────────────────── */
const CMD_LINES = [
  { t: '$ slopscanning scan https://github.com/org/repo', c: 'cyan' },
  { t: '  ✓ Cloning repository...', c: 'muted' },
  { t: '  ✓ Indexed 142 files, 38 commits, 4 docs', c: 'muted' },
  { t: '  ⚡ Running 4 detection modules...', c: 'amber' },
  { t: '', c: 'muted' },
  { t: '  [CRITICAL] PR #14 claims "OAuth2" — diff has console.log', c: 'red' },
  { t: '  [HIGH]     Commit "fix" spans 14 files, zero context', c: 'orange' },
  { t: '  [MEDIUM]   POST /v2/analyze not found in codebase', c: 'amber' },
  { t: '  [LOW]      validateUser() defined, never called', c: 'green' },
  { t: '', c: 'muted' },
  { t: '  Slop Index: 73% · Publish Risk: HIGH', c: 'red' },
  { t: '  4 critical issues · 2 high · 6 medium · 3 low', c: 'muted' },
];

function getColor(c) {
  return { cyan: '#58C0C8', muted: '#586898', amber: '#E8C058', red: '#E06070', orange: '#E8A040', green: '#58D0A0' }[c] || '#8898C0';
}

function LiveTerminal() {
  const [shown, setShown] = useState(0);
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    if (shown < CMD_LINES.length) {
      const t = setTimeout(() => setShown(v => v + 1), 500 + Math.random() * 250);
      return () => clearTimeout(t);
    }
  }, [shown]);
  useEffect(() => {
    const t = setInterval(() => setBlink(v => !v), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: '#080B18',
      border: '1px solid rgba(88,192,200,0.18)',
      borderRadius: '14px',
      overflow: 'hidden',
      fontFamily: 'var(--font-mono)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(88,192,200,0.08)',
    }}>
      {/* chrome */}
      <div style={{ padding: '10px 14px', background: 'rgba(19,24,64,0.9)', borderBottom: '1px solid rgba(88,192,200,0.08)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {['#E06070','#E8C058','#58D0A0'].map((c, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.75 }} />)}
        <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: '#586898' }}>bash — slopscanning</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#58D0A0', animation: 'pulse-dot 1.5s ease infinite' }} />
          <span style={{ fontSize: '0.65rem', color: '#58D0A0', fontWeight: 600 }}>SCANNING</span>
        </div>
      </div>
      {/* body */}
      <div style={{ padding: '16px 20px', fontSize: '0.78rem', lineHeight: 2, minHeight: '280px' }}>
        {CMD_LINES.slice(0, shown).map((l, i) => (
          <div key={i} style={{ color: getColor(l.c), animation: 'slideInLine 0.25s ease forwards', opacity: 0, animationFillMode: 'forwards' }}>
            {l.t || '\u00a0'}
          </div>
        ))}
        {shown < CMD_LINES.length && (
          <span style={{ color: '#58C0C8', opacity: blink ? 1 : 0 }}>█</span>
        )}
      </div>
    </div>
  );
}

/* ─── Feature tab panel ──────────────────────────────────── */
function FeatureTabPanel() {
  const [active, setActive] = useState(0);
  const feat = FEATURES[active];
  const Icon = feat.icon;

  return (
    <div>
      {/* Tab row */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid rgba(88,192,200,0.1)', paddingBottom: '0' }}>
        {FEATURES.map((f, i) => {
          const FIcon = f.icon;
          const isAct = i === active;
          return (
            <button
              key={f.id}
              onClick={() => setActive(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px',
                background: isAct ? `rgba(${f.rgb},0.12)` : 'transparent',
                border: 'none',
                borderBottom: isAct ? `2px solid ${f.color}` : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: isAct ? 700 : 400,
                color: isAct ? f.color : 'var(--text-secondary)',
                transition: 'all 0.2s',
                marginBottom: '-1px',
              }}
              onMouseEnter={e => { if (!isAct) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(88,192,200,0.04)'; } }}
              onMouseLeave={e => { if (!isAct) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; } }}
            >
              <FIcon size={13} />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div key={feat.id} style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem',
        padding: '1.75rem',
        background: `rgba(${feat.rgb},0.04)`,
        border: `1px solid rgba(${feat.rgb},0.18)`,
        borderRadius: '14px',
        animation: 'fade-in-up 0.3s ease forwards',
      }}>
        {/* Left */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `rgba(${feat.rgb},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(${feat.rgb},0.3)` }}>
              <Icon size={20} color={feat.color} />
            </div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{feat.title}</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>{feat.desc}</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {feat.bullets.map((b, i) => (
              <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.8375rem', color: 'var(--text-secondary)' }}>
                <ChevronRight size={14} color={feat.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                {b}
              </li>
            ))}
          </ul>
        </div>
        {/* Right: mock output */}
        <div style={{
          background: '#080B18',
          borderRadius: '10px',
          border: `1px solid rgba(${feat.rgb},0.12)`,
          padding: '14px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          lineHeight: 1.8,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{ color: feat.color, marginBottom: '8px', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Sample finding
          </div>
          {feat.id === 'pr' && <>
            <div style={{ color: '#E06070' }}>▶ [CRITICAL] PR #22: description mismatch</div>
            <div style={{ color: '#586898' }}>  Claim: "Adds Redis caching layer"</div>
            <div style={{ color: '#586898' }}>  Found: import redis # commented out</div>
            <div style={{ color: '#E8C058', marginTop: '6px' }}>  Confidence: 94% · Severity: CRITICAL</div>
          </>}
          {feat.id === 'commit' && <>
            <div style={{ color: '#E8C058' }}>▶ [HIGH] Generic AI commit detected</div>
            <div style={{ color: '#586898' }}>  Message: "Update code"</div>
            <div style={{ color: '#586898' }}>  Scope: 12 files, 400+ lines changed</div>
            <div style={{ color: '#A090F0', marginTop: '6px' }}>  Confidence: 88% · Severity: HIGH</div>
          </>}
          {feat.id === 'docs' && <>
            <div style={{ color: '#E06070' }}>▶ [CRITICAL] Ghost API reference</div>
            <div style={{ color: '#586898' }}>  Docs: POST /v2/analyze</div>
            <div style={{ color: '#586898' }}>  Code: route not registered</div>
            <div style={{ color: '#E8C058', marginTop: '6px' }}>  Confidence: 99% · Severity: CRITICAL</div>
          </>}
          {feat.id === 'scan' && <>
            <div style={{ color: '#E8C058' }}>▶ [HIGH] Hardcoded secret detected</div>
            <div style={{ color: '#586898' }}>  File: config.py:42</div>
            <div style={{ color: '#E06070' }}>  AWS_KEY = "AKIA..."</div>
            <div style={{ color: '#78A8F0', marginTop: '6px' }}>  Confidence: 100% · Severity: HIGH</div>
          </>}
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const [bootDone, setBootDone] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const parsed = parseGitHubUrl(url.trim());
    if (!parsed) { setError('Enter a valid GitHub URL  e.g. https://github.com/owner/repo'); return; }
    setLoading(true);
    router.push(`/repo/${parsed.owner}/${parsed.name}`);
  }

  function handleExample(u) { setUrl(u); setError(''); }
  function handleLiveFire(u) { const p = auditPathForUrl(u, true); if (p !== '/') router.push(p); }

  if (!bootDone) return <BootOverlay onComplete={() => setBootDone(true)} />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>

      {/* ── CRT scanline overlay ── */}
      <div className="crt-scanline" />
      <div className="grid-bg" />

      {/* ════════════════════════════════════════════════════
          NAV — left-aligned with accent underline
      ════════════════════════════════════════════════════ */}
      <header style={{
        borderBottom: '1px solid rgba(88,192,200,0.08)',
        backdropFilter: 'blur(20px)',
        background: 'rgba(13,16,40,0.8)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2.5rem', display: 'flex', alignItems: 'center', height: '56px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
            <Logo size={28} style={{ filter: 'drop-shadow(0 0 8px rgba(88,192,200,0.4))' }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>{PROJECT_NAME}</span>
            <span style={{
              padding: '2px 7px', background: 'rgba(88,192,200,0.1)', border: '1px solid rgba(88,192,200,0.25)',
              borderRadius: '100px', fontSize: '0.6rem', fontWeight: 700, color: '#58C0C8',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
            }}>v1</span>
          </div>
          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '20px' }}>
            {['Features', 'How it works', 'Stack'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`} style={{ padding: '6px 12px', fontSize: '0.8125rem', color: 'var(--text-secondary)', textDecoration: 'none', borderRadius: '8px', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(88,192,200,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
              >{l}</a>
            ))}
          </nav>
          <a href={PROJECT_GITHUB_URL} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
            background: 'rgba(19,24,64,0.8)', border: '1px solid rgba(88,192,200,0.15)',
            borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(88,192,200,0.4)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(88,192,200,0.15)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Github size={14} /> GitHub
          </a>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════
          HERO — full-width, left text / right terminal
      ════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '6rem 2.5rem 5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }} className="hero-split">
        {/* LEFT */}
        <div>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.75rem' }} className="animate-fade-in-up">
            <Shield size={13} color="#A090F0" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A090F0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              AI code quality · open source
            </span>
          </div>

          {/* Big headline — LEFT aligned, vertical stacking */}
          <h1 className="animate-fade-in-up" style={{ fontSize: 'clamp(2.75rem,5.5vw,4.5rem)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.05em', marginBottom: '1.5rem', animationDelay: '0.08s' }}>
            <span style={{ display: 'block', color: 'var(--text-primary)' }}>Your repo</span>
            <span style={{ display: 'block', color: 'var(--text-primary)' }}>contains</span>
            <span style={{ display: 'block', background: 'linear-gradient(90deg, #58C0C8, #A090F0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI slop.</span>
            <span style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '65%' }}>We'll prove it.</span>
          </h1>

          <p className="animate-fade-in-up" style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: '420px', marginBottom: '2.5rem', animationDelay: '0.15s' }}>
            Paste any public GitHub URL. Our multi-module AI pipeline cross-checks PRs,
            commits, docs, and source code for signs of unreviewed AI generation.
          </p>

          {/* Command-line style input */}
          <form onSubmit={handleSubmit} className="animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#080B18',
              border: `1px solid ${error ? '#E06070' : inputFocused ? '#58C0C8' : 'rgba(88,192,200,0.2)'}`,
              borderRadius: '12px',
              padding: '0',
              overflow: 'hidden',
              boxShadow: inputFocused ? '0 0 0 3px rgba(88,192,200,0.1), 0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.3)',
              transition: 'all 0.2s',
            }}>
              {/* Prompt prefix */}
              <div style={{ padding: '12px 14px', borderRight: '1px solid rgba(88,192,200,0.1)', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#58C0C8', userSelect: 'none' }}>
                scan
              </div>
              <input
                id="repo-url-input"
                type="text"
                value={url}
                onChange={e => { setUrl(e.target.value); setError(''); }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="github.com/owner/repository"
                autoFocus
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)', padding: '12px 14px',
                }}
              />
              <button
                type="submit"
                disabled={!url.trim() || loading}
                id="scan-button"
                style={{
                  padding: '12px 22px', background: url.trim() && !loading ? '#58C0C8' : 'rgba(88,192,200,0.15)',
                  border: 'none', color: url.trim() && !loading ? '#080B18' : '#586898',
                  fontSize: '0.8125rem', fontWeight: 700, cursor: url.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {loading ? 'Running…' : <><Zap size={14} /> Run</>}
              </button>
            </div>
            {error && <p style={{ color: '#E06070', fontSize: '0.8rem', marginTop: '6px', paddingLeft: '4px', fontFamily: 'var(--font-mono)' }}>{error}</p>}
          </form>

          {/* Quick tries */}
          <div className="animate-fade-in-up" style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', animationDelay: '0.3s' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginRight: '2px' }}>try:</span>
            <button onClick={() => handleLiveFire(LIVE_FIRE_PRESETS[0].url)}
              style={{ padding: '4px 12px', background: 'rgba(88,208,160,0.1)', border: '1px solid rgba(88,208,160,0.3)', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#58D0A0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={10} /> live demo
            </button>
            {EXAMPLES.map(({ label, url: u }) => (
              <button key={label} onClick={() => handleExample(u)}
                style={{ padding: '4px 10px', background: 'rgba(19,24,64,0.8)', border: '1px solid rgba(88,192,200,0.1)', borderRadius: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(88,192,200,0.35)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(88,192,200,0.1)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* RIGHT — live terminal */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <LiveTerminal />
          {/* Mini metric row below terminal */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '10px' }}>
            {[['4', 'modules'], ['∞', 'repos'], ['~12s', 'per scan']].map(([v, l]) => (
              <div key={l} style={{ background: 'rgba(19,24,64,0.7)', border: '1px solid rgba(88,192,200,0.08)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#58C0C8', fontFamily: 'var(--font-mono)' }}>{v}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURES — tabbed panel, id="features"
      ════════════════════════════════════════════════════ */}
      <section id="features" style={{ borderTop: '1px solid rgba(88,192,200,0.06)', background: 'rgba(19,24,64,0.2)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '5rem 2.5rem' }}>
          {/* Section header — left aligned with decorative line */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '2px', background: '#58C0C8' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#58C0C8', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>Detection suite</span>
              </div>
              <h2 style={{ fontSize: 'clamp(1.75rem,3vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                Four modules.<br />One verdict.
              </h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '380px', paddingBottom: '4px', marginLeft: 'auto' }}>
              Each module runs independently and reports its own severity findings. Together they produce a unified slop index.
            </p>
          </div>

          <FeatureTabPanel />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURE DEEP DIVE (existing component)
      ════════════════════════════════════════════════════ */}
      <FeatureDeepDive />

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS — vertical numbered timeline
      ════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ borderTop: '1px solid rgba(88,192,200,0.06)', background: 'rgba(13,16,40,0.5)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '5rem 2.5rem', display: 'grid', gridTemplateColumns: '340px 1fr', gap: '5rem', alignItems: 'start' }} className="pipeline-split">
          {/* Left: sticky label */}
          <div style={{ position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '2px', background: '#A090F0' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#A090F0', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>The pipeline</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem,3vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1rem' }}>
              How it<br />works
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              A multi-stage pipeline combining static analysis with AI verification — built to catch patterns that traditional linters miss entirely.
            </p>
          </div>

          {/* Right: vertical timeline */}
          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: '11px', top: '16px', bottom: '16px', width: '2px', background: 'linear-gradient(to bottom, #58C0C8, #A090F0, #58D0A0)', borderRadius: '1px', opacity: 0.3 }} />

            {STEPS.map(({ num, icon: Icon, title, desc }, i) => {
              const colors = ['#58C0C8','#A090F0','#E8C058','#58D0A0'];
              const c = colors[i];
              return (
                <div key={num} style={{ display: 'flex', gap: '20px', marginBottom: i < STEPS.length - 1 ? '2.5rem' : 0 }}>
                  {/* Node */}
                  <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: `rgba(${c === '#58C0C8' ? '88,192,200' : c === '#A090F0' ? '160,144,240' : c === '#E8C058' ? '232,192,88' : '88,208,160'},0.15)`, border: `2px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', boxShadow: `0 0 12px ${c}44` }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: '8px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: c, fontFamily: 'var(--font-mono)', marginBottom: '4px', letterSpacing: '0.06em' }}>STEP {num}</div>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>{title}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          TECH STACK — horizontal marquee-style cards + CTA
      ════════════════════════════════════════════════════ */}
      <section id="stack" style={{ borderTop: '1px solid rgba(88,192,200,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 2.5rem 5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }} className="cta-split">
          {/* Left: stack */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <div style={{ width: '24px', height: '2px', background: '#58D0A0' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#58D0A0', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>Stack</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>Built with</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['Next.js', 'FastAPI', 'Fireworks AI', 'Gemini (fallback)', 'Redis', 'SSE Streaming'].map(t => (
                <span key={t} style={{
                  padding: '8px 16px', background: 'rgba(19,24,64,0.8)', border: '1px solid rgba(88,192,200,0.1)',
                  borderRadius: '10px', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-secondary)',
                  transition: 'all 0.2s', cursor: 'default',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(88,192,200,0.3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(88,192,200,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >{t}</span>
              ))}
            </div>
          </div>

          {/* Right: CTA */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(88,192,200,0.07) 0%, rgba(160,144,240,0.07) 100%)',
            border: '1px solid rgba(88,192,200,0.15)',
            borderRadius: '20px',
            padding: '2.5rem',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#58C0C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
              ready to scan?
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '10px' }}>
              Find the slop<br />before your users do.
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
              Paste any public GitHub repository URL into the scanner above. Results in under 20 seconds.
            </p>
            <button
              onClick={() => document.getElementById('repo-url-input')?.focus()}
              style={{
                padding: '11px 28px', background: '#58C0C8', border: 'none', borderRadius: '10px',
                color: '#080B18', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                boxShadow: '0 4px 24px rgba(88,192,200,0.3)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(88,192,200,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(88,192,200,0.3)'; }}
            >
              <Zap size={15} /> Start scanning
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(88,192,200,0.07)', padding: '1.5rem 2.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={18} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{PROJECT_NAME}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            by{' '}
            <a href={PROJECT_GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none' }}>{PROJECT_AUTHOR}</a>
            {' · '}
            <a href={PROJECT_GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: '#58C0C8', textDecoration: 'none' }}>beginningofcoding/slopscanning</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
