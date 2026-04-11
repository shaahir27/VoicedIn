export default function Card({ children, className = '', hover = false, padding = true, ...props }) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-slate-100
        ${padding ? 'p-5 sm:p-6' : ''}
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : 'shadow-sm'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
