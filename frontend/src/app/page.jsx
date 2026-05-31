'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseGitHubUrl } from '@/lib/github';
import { PROJECT_AUTHOR, PROJECT_GITHUB_URL, PROJECT_NAME } from '@/lib/project';
import BootOverlay from '@/components/landing/BootOverlay';
import FeatureDeepDive from '@/components/landing/FeatureDeepDive';
import Button from '@/components/ui/Button';
import ScannerRadarIcon from '@/components/ui/ScannerRadarIcon';
import {
  Github,
  ScanLine,
  Target,
  Fingerprint,
  Eye,
  ArrowRight,
  ClipboardList,
  Radar,
  Activity,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';

import { LIVE_FIRE_PRESETS, auditPathForUrl } from '@/lib/live_fire_presets';
import Logo from '@/components/ui/Logo';

/* ─── Example repos for quick demo ─────────────────────────── */
const EXAMPLES = LIVE_FIRE_PRESETS.map((p) => ({ label: p.label, url: p.url }));

/* ─── Feature cards data ───────────────────────────────────── */
const FEATURES = [
  {
    icon: Target,
    title: 'PR Reviewer',
    desc: 'Compare PR descriptions against actual diffs to detect fake claims and misleading summaries.',
    color: 'var(--health-green)',
    bg: 'rgba(var(--health-green-rgb), 0.08)',
  },
  {
    icon: Fingerprint,
    title: 'Commit Verifier',
    desc: 'Flag generic AI-generated commit messages and hallucinated functionality claims.',
    color: 'var(--purple)',
    bg: 'rgba(var(--purple-rgb), 0.08)',
  },
  {
    icon: Eye,
    title: 'Docs Verifier',
    desc: 'Find hallucinated documentation, repetitive slop, and inconsistent terminology.',
    color: 'var(--warning-amber)',
    bg: 'rgba(var(--warning-amber-rgb), 0.08)',
  },
  {
    icon: ScanLine,
    title: 'Code Scanner',
    desc: 'Detect dead code, fake implementations, hardcoded values, and AI coding artifacts.',
    color: 'var(--info-blue)',
    bg: 'rgba(var(--info-blue-rgb), 0.08)',
  },
];

/* ─── How it works steps ───────────────────────────────────── */
const STEPS = [
  {
    num: '01',
    icon: ClipboardList,
    title: 'Paste Repository URL',
    desc: 'Enter any public GitHub repository URL to begin analysis.',
  },
  {
    num: '02',
    icon: Radar,
    title: 'Clone & Index',
    desc: 'We clone the repo and build a complete file index, commit history, and documentation map.',
  },
  {
    num: '03',
    icon: Activity,
    title: 'AI-Powered Analysis',
    desc: 'Multi-model AI pipeline detects slop patterns, fake claims, and hallucinated content.',
  },
  {
    num: '04',
    icon: BarChart3,
    title: 'Actionable Report',
    desc: 'Get a detailed breakdown of issues with severity ratings and suggested fixes.',
  },
];

/* ─── Tech stack badges ────────────────────────────────────── */
const TECH = ['Next.js', 'FastAPI', 'Fireworks AI', 'Gemini (fallback)', 'Redis', 'SSE Streaming'];

/* ─── Component ────────────────────────────────────────────── */
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
    if (!parsed) {
      setError('Enter a valid GitHub repo URL (e.g. https://github.com/owner/repo)');
      return;
    }
    setLoading(true);
    router.push(`/repo/${parsed.owner}/${parsed.name}`);
  }

  function handleExample(exampleUrl) {
    setUrl(exampleUrl);
    setError('');
  }

  function handleLiveFire(exampleUrl) {
    setError('');
    const path = auditPathForUrl(exampleUrl, true);
    if (path !== '/') router.push(path);
  }

  if (!bootDone) {
    return <BootOverlay onComplete={() => setBootDone(true)} />;
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg-void)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ─── Radar background decoration ─────────────────────── */}
      <div style={{ position: 'fixed', top: '5%', right: '-5%', zIndex: 0, pointerEvents: 'none' }}>
        <ScannerRadarIcon size={520} />
      </div>
      <div
        className="animate-float"
        style={{
          position: 'fixed',
          top: '-10%',
          left: '15%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,23,68,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="animate-float"
        style={{
          position: 'fixed',
          bottom: '-5%',
          right: '10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,26,26,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
          animationDelay: '-3s',
        }}
      />
      <div
        className="animate-float"
        style={{
          position: 'fixed',
          top: '40%',
          right: '30%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,109,0,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
          animationDelay: '-1.5s',
        }}
      />

      {/* ─── Content ─────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ─── Nav bar ─────────────────────────────────────── */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 2rem',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Logo size={34} style={{ color: '#0a0f14', flexShrink: 0, filter: 'drop-shadow(0 0 10px rgba(var(--scan-red-rgb), 0.35))' }} />
            <span
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--color-text-primary)',
              }}
            >
              {PROJECT_NAME}
            </span>
          </div>
          <a
            href={PROJECT_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            title={`${PROJECT_AUTHOR} on GitHub`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.8125rem',
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
          >
            <Github size={14} />
            GitHub
          </a>
        </nav>

        {/* ─── Hero section ────────────────────────────────── */}
        <section
          style={{
            maxWidth: '780px',
            margin: '0 auto',
            padding: '4rem 2rem 3rem',
            textAlign: 'center',
          }}
        >
          {/* Badge */}
          <div
            className="animate-fade-in-up"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '100px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: '1.5rem',
              letterSpacing: '0.02em',
            }}
          >
            <ShieldAlert size={13} color="var(--warning-amber)" />
            AI Code Quality Detector
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in-up"
            style={{
              fontSize: 'clamp(2.25rem, 6vw, 3.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              color: 'var(--color-text-primary)',
              marginBottom: '1.25rem',
              animationDelay: '0.1s',
            }}
          >
            Detect AI{' '}
            <span className="hero-logo-gradient">slop</span>
            <br />
            <span style={{ color: 'var(--text-secondary)' }}>before it ships.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="animate-fade-in-up"
            style={{
              fontSize: '1.0625rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.7,
              maxWidth: '540px',
              margin: '0 auto 2.5rem',
              animationDelay: '0.2s',
            }}
          >
            Scan any GitHub repository for fake PR claims, dead code,
            hallucinated documentation, and AI-generated anti-patterns.
          </p>

          {/* ─── Input form ──────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            className="animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div
              style={{
                display: 'flex',
                gap: '8px',
                background: 'var(--color-surface)',
                border: `1px solid ${error ? 'var(--critical-red)' : inputFocused ? 'var(--scan-red)' : 'rgba(var(--scan-red-rgb), 0.12)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '6px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: inputFocused ? '0 0 0 3px var(--scan-red-glow)' : 'none',
                maxWidth: '560px',
                margin: '0 auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '10px',
                  color: 'var(--color-text-muted)',
                  flexShrink: 0,
                }}
              >
                <Github size={18} />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="https://github.com/owner/repository"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9375rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '8px 4px',
                }}
                autoFocus
                id="repo-url-input"
              />
              <Button
                type="submit"
                loading={loading}
                disabled={!url.trim()}
                id="scan-button"
                style={{
                  borderRadius: '6px',
                  padding: '8px 22px',
                  fontSize: '0.875rem',
                }}
              >
                {loading ? 'INITIALIZING SCAN…' : (
                  <>
                    Scan
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </div>
            {error && (
              <p
                style={{
                  color: 'var(--color-red)',
                  fontSize: '0.8125rem',
                  marginTop: '8px',
                }}
              >
                {error}
              </p>
            )}
          </form>

          {/* ─── Example repos ────────────────────────────── */}
          <div
            className="animate-fade-in-up"
            style={{
              marginTop: '1rem',
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              animationDelay: '0.4s',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                lineHeight: '28px',
              }}
            >
              Try:
            </span>
            <button
              type="button"
              onClick={() => handleLiveFire(LIVE_FIRE_PRESETS[0].url)}
              style={{
                background: 'var(--color-green-dim)',
                border: '1px solid var(--color-green)',
                borderRadius: '100px',
                padding: '4px 14px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-green)',
                cursor: 'pointer',
              }}
            >
              Live Fire demo
            </button>
            {EXAMPLES.map(({ label, url: exUrl }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleExample(exUrl)}
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '100px',
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                  fontFamily: 'var(--font-mono)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-text-muted)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Feature cards ───────────────────────────────── */}
        <section
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '2rem 2rem 4rem',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <div
                key={title}
                className="animate-fade-in-up glass-card"
                style={{
                  padding: '1.5rem',
                  cursor: 'default',
                  animationDelay: `${0.4 + i * 0.08}s`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${bg}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    background: bg,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <Icon size={18} color={color} />
                </div>
                <div
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginBottom: '6px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Feature Deep Dive ───────────────────────────── */}
        <FeatureDeepDive />

        {/* ─── How it works ────────────────────────────────── */}
        <section
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '2rem 2rem 5rem',
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
              How {PROJECT_NAME} Works
            </h2>
            <p
              style={{
                fontSize: '0.9375rem',
                color: 'var(--color-text-secondary)',
                maxWidth: '480px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              A multi-stage pipeline that combines static analysis with AI
              verification to catch what traditional linters miss.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1px',
              background: 'var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
          >
            {STEPS.map(({ num, icon: Icon, title, desc }) => (
              <div
                key={num}
                style={{
                  background: 'var(--color-surface)',
                  padding: '1.75rem 1.5rem',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--color-surface-3)',
                    position: 'absolute',
                    top: '12px',
                    right: '16px',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  {num}
                </div>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'var(--color-accent-dim)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <Icon size={16} color="var(--color-text-primary)" />
                </div>
                <div
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginBottom: '6px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </div>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Tech stack strip ─────────────────────────────── */}
        <section
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '2.5rem 2rem',
          }}
        >
          <div
            style={{
              maxWidth: '960px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginRight: '8px',
              }}
            >
              Built with
            </span>
            {TECH.map((t) => (
              <span
                key={t}
                style={{
                  padding: '5px 14px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '100px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.01em',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        <footer
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '1.5rem 2rem 3rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Maintained by{' '}
            <a
              href={PROJECT_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}
            >
              {PROJECT_AUTHOR}
            </a>
            {' · '}
            <a
              href={PROJECT_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--scan-red)' }}
            >
              beginningofcoding/slopscanning
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
