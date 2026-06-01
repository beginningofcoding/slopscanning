import { Suspense } from 'react';
import { fetchRepoInfo } from '@/lib/api';
import { PROJECT_NAME } from '@/lib/project';
import RepoDashboard from '@/components/repo/RepoDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorState from '@/components/ui/ErrorState';

export async function generateMetadata({ params }) {
  const { owner, name } = await params;
  return {
    title: `${owner}/${name} — ${PROJECT_NAME}`,
  };
}

async function RepoContent({ owner, name }) {
  let repoInfo = null;
  let error = null;
  try {
    repoInfo = await fetchRepoInfo(owner, name);
  } catch (e) {
    error = e.message;
  }
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={undefined}
        subtitle={`https://github.com/${owner}/${name}`}
      />
    );
  }
  return <RepoDashboard repoInfo={repoInfo} owner={owner} name={name} />;
}

export default async function RepoPage({ params }) {
  const { owner, name } = await params;
  return (
    <Suspense fallback={<LoadingSpinner label="Fetching repository…" />}>
      <RepoContent owner={owner} name={name} />
    </Suspense>
  );
}