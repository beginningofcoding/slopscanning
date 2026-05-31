/**
 * Shared constants used across the application.
 * Import via @/lib/constants (aliased as @/constants in jsconfig).
 */

// ── PR States ─────────────────────────────────────────────────
export const PR_STATES = {
  open: { label: 'Open', color: 'var(--color-green)' },
  closed: { label: 'Closed', color: 'var(--color-red)' },
  merged: { label: 'Merged', color: 'var(--color-purple)' },
};

// ── Verdict colors (PR Review) ────────────────────────────────
export const VERDICT_COLORS = {
  TRUSTWORTHY: 'var(--color-green)',
  SUSPICIOUS: 'var(--color-yellow)',
  MISLEADING: 'var(--color-red)',
};

export const VERDICT_BG = {
  TRUSTWORTHY: 'var(--color-green-dim)',
  SUSPICIOUS: 'var(--color-yellow-dim)',
  MISLEADING: 'var(--color-red-dim)',
};

// ── Claim verdict colors ──────────────────────────────────────
export const CLAIM_VERDICT_COLORS = {
  VERIFIED: 'var(--color-green)',
  MISMATCH: 'var(--color-red)',
  UNVERIFIABLE: 'var(--color-text-muted)',
};

// ── Progress stage labels ─────────────────────────────────────
export const PROGRESS_STAGE_LABELS = {
  fetch: 'Fetching PR Data',
  parse: 'Parsing Diff',
  ast_analysis: 'AST Analysis',
  claim_extraction: 'Extracting Claims',
  mismatch_detection: 'Detecting Mismatches',
  llm_summary: 'Generating Summary',
  complete: 'Complete',
  fetch_docs: 'Fetching Documents',
  phrase_analysis: 'Phrase Analysis',
  embedding: 'Computing Embeddings',
  consistency: 'Consistency Check',
  clone: 'Cloning Repository',
  index: 'Building File Index',
  static_analysis: 'Static Analysis',
};

// ── Severity colors (Code Scanner) ────────────────────────────
export const SEVERITY_COLORS = {
  critical: 'var(--color-red)',
  high: 'var(--color-orange)',
  medium: 'var(--color-yellow)',
  low: 'var(--color-blue)',
};

export const SEVERITY_BG = {
  critical: 'var(--color-red-dim)',
  high: 'var(--color-orange-dim)',
  medium: 'var(--color-yellow-dim)',
  low: 'var(--color-blue-dim)',
};

// ── Finding type labels & colors ──────────────────────────────
export const FINDING_TYPE_LABELS = {
  dead_code: 'Dead Code',
  fake_impl: 'Fake Implementation',
  hardcoded: 'Hardcoded Value',
  arch_slop: 'Architectural Slop',
  ai_artifact: 'AI Artifact',
  unused_import: 'Unused Import',
  duplicate_code: 'Duplicate Code',
  god_function: 'God Function',
  magic_number: 'Magic Number',
};

export const FINDING_TYPE_COLORS = {
  dead_code: 'var(--color-red)',
  fake_impl: 'var(--color-red)',
  hardcoded: 'var(--color-orange)',
  arch_slop: 'var(--color-yellow)',
  ai_artifact: 'var(--color-purple)',
  unused_import: 'var(--color-blue)',
  duplicate_code: 'var(--color-yellow)',
  god_function: 'var(--color-orange)',
  magic_number: 'var(--color-blue)',
};
