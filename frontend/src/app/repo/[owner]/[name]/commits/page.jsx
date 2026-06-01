import { Suspense } from 'react';
import RepoNav from '@/components/repo/RepoNav';
import CommitsReviewClient from '@/components/commits/CommitsReviewClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorState from '@/components/ui/ErrorState';
import { fetchCommitsList } from '@/lib/api';

async function CommitsContent({ owner, name }) {
  let initialCommits = [];
  let error = null;
  try {
    initialCommits = await fetchCommitsList(owner, name);
  } catch (e) {
    error = e.message;
  }
  if (error) return <ErrorState message={error} />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <RepoNav owner={owner} name={name} active="commits" />
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <CommitsReviewClient initialCommits={initialCommits} owner={owner} name={name} />
      </div>
    </div>
  );
}

export default async function CommitsPage({ params }) {
  const { owner, name } = await params;
  return (
    <Suspense fallback={<LoadingSpinner label="Loading commit history…" />}>
      <CommitsContent owner={owner} name={name} />
    </Suspense>
  );
}