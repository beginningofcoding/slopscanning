import { Suspense } from 'react';
import RepoNav from '@/components/repo/RepoNav';
import DocsReviewClient from '@/components/docs/DocsReviewClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorState from '@/components/ui/ErrorState';
import { fetchDocsList } from '@/lib/api';

async function DocsContent({ owner, name }) {
  let initialDocs = [];
  let error = null;
  try {
    initialDocs = await fetchDocsList(owner, name);
  } catch (e) {
    error = e.message;
  }
  if (error) return <ErrorState message={error} />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <RepoNav owner={owner} name={name} active="docs" />
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <DocsReviewClient initialDocs={initialDocs} owner={owner} name={name} />
      </div>
    </div>
  );
}

export default async function DocsPage({ params }) {
  const { owner, name } = await params;
  return (
    <Suspense fallback={<LoadingSpinner label="Fetching documentation files…" />}>
      <DocsContent owner={owner} name={name} />
    </Suspense>
  );
}
