import { Suspense } from 'react';
import { fetchPRDetail } from '@/lib/api';
import PrReviewDetailClient from '@/components/pr-review/PrReviewDetailClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorState from '@/components/ui/ErrorState';
import RepoNav from '@/components/repo/RepoNav';

async function PrReviewDetailContent({ owner, name, prNumber }) {
  let prDetail = null;
  let error = null;
  try {
    prDetail = await fetchPRDetail(owner, name, prNumber);
  } catch (e) {
    error = e.message;
  }
  if (error) return <ErrorState message={error} />;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <RepoNav owner={owner} name={name} active="pr-review" />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <PrReviewDetailClient prDetail={prDetail} owner={owner} name={name} />
      </div>
    </div>
  );
}

export default async function PrReviewDetailPage({ params }) {
  const { owner, name, prNumber } = await params;
  return (
    <Suspense fallback={<LoadingSpinner label="Loading PR details…" />}>
      <PrReviewDetailContent owner={owner} name={name} prNumber={prNumber} />
    </Suspense>
  );
}