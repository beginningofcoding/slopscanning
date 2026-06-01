import RepoNav from '@/components/repo/RepoNav';
import CodeScannerClient from '@/components/scanner/CodeScannerClient';

export default async function ScanPage({ params }) {
  const { owner, name } = await params;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <RepoNav owner={owner} name={name} active="scan" />
      <CodeScannerClient owner={owner} name={name} />
    </div>
  );
}