export default function AppShell({ children, showGrid = true }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {showGrid && (
        <>
          <div className="grid-bg" aria-hidden="true" />
          <div className="crt-scanline" aria-hidden="true" />
        </>
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}
