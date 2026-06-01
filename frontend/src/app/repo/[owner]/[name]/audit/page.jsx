import RepoNav from '@/components/repo/RepoNav';
import RepoAuditClient from '@/components/repo-audit/RepoAuditClient';

export default async function AuditPage({ params, searchParams }) {
  const { owner, name } = await params;
  const sp = await searchParams;
  const demo = sp?.demo === '1';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <RepoNav owner={owner} name={name} active="audit" />
      <RepoAuditClient owner={owner} name={name} autoStart={demo} />
    </div>
  );
}
