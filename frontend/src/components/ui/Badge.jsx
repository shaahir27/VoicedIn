const statusStyles = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  premium: 'bg-primary-50 text-primary-700 border-primary-200',
  demo: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function Badge({ status, children, className = '' }) {
  const label = children || status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${statusStyles[status] || statusStyles.draft} ${className}`}>
      {status === 'paid' || status === 'completed' ? '✓ ' : status === 'overdue' ? '! ' : ''}
      {label}
    </span>
  );
}
