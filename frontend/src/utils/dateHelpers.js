export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatDateISO(date) {
  return new Date(date).toISOString().split('T')[0];
}

export function daysUntil(date) {
  const now = new Date();
  const target = new Date(date);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

export function isOverdue(dueDate) {
  return daysUntil(dueDate) < 0;
}

export function getDaysOverdue(dueDate) {
  const days = daysUntil(dueDate);
  return days < 0 ? Math.abs(days) : 0;
}

export function getRelativeTime(date) {
  const days = daysUntil(date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}
