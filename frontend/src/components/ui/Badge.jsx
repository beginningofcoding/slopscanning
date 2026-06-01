export default function Badge({ children, color = 'var(--text-secondary)', bg, style = {} }) {
  return (
    <span
      className="badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color,
        background: bg || 'rgba(var(--scan-red-rgb), 0.08)',
        border: `1px solid ${color}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
