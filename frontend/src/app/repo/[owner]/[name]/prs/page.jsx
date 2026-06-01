import { Suspense } from 'react';
import { fetchPRList } from '@/lib/api';
import PRListClient from '@/components/pr/PRListClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorState from '@/components/ui/ErrorState';
import RepoNav from '@/components/repo/RepoNav';

async function PRListContent({ owner, name }) {
  let prs = [];
  let error = null;
  try {
    prs = await fetchPRList(owner, name);
  } catch (e) {
    error = e.message;
  }
  if (error) return <ErrorState message={error} />;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <RepoNav owner={owner} name={name} active="prs" />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <PRListClient prs={prs} owner={owner} name={name} />
      </div>
    </div>
  );
}

export default async function PRsPage({ params }) {
  const { owner, name } = await params;
  return (
    <Suspense fallback={<LoadingSpinner label="Fetching pull requests…" />}>
      <PRListContent owner={owner} name={name} />
    </Suspense>
  );
}