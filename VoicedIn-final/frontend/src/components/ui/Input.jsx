import { forwardRef } from 'react';

const Input = forwardRef(function Input({
  label,
  error,
  icon: Icon,
  className = '',
  helperText,
  ...props
}, ref) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-800
            placeholder:text-slate-400
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-200'}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-400">{helperText}</p>}
    </div>
  );
});

export default Input;
