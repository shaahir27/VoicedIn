export default function Logo({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  };

  return (
    <span className={`font-extrabold tracking-tight ${sizes[size]} ${className}`}>
      <span className="text-slate-800">voiced</span>
      <span className="text-primary-500">In</span>
    </span>
  );
}
