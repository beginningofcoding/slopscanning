export default function Card({ children, style = {}, padding = '1.25rem', className = '', ...props }) {
  return (
    <div
      className={`glass-card ${className}`.trim()}
      style={{
        padding,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
