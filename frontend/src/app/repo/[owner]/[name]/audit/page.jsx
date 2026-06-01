import RepoNav from '@/components/repo/RepoNav';
import UnifiedAuditClient from '@/components/audit/UnifiedAuditClient';

export default async function AuditPage({ params, searchParams }) {
  const { owner, name } = await params;
  const sp = await searchParams;
  const demo = sp?.demo === '1';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <RepoNav owner={owner} name={name} active="audit" />
      <UnifiedAuditClient owner={owner} name={name} autoStart={demo} />
    </div>
  );
}
