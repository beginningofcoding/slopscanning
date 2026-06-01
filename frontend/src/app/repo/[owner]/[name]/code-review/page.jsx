import RepoNav from '@/components/repo/RepoNav';
import CodeReviewClient from '@/components/code-review/CodeReviewClient';

export default async function CodeReviewPage({ params }) {
  const { owner, name } = await params;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <RepoNav owner={owner} name={name} active="code-review" />
      <CodeReviewClient owner={owner} name={name} />
    </div>
  );
}