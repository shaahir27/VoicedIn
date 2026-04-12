export default function ShortcutHint({ keys, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={keys.join(' plus ')}>
      {keys.map(key => (
        <kbd
          key={key}
          className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-500 shadow-sm"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
