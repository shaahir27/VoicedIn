let counter = 1;

export function generateInvoiceNumber(prefix = 'INV') {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const num = counter.toString().padStart(4, '0');
  counter++;
  return `${prefix}-${year}${month}-${num}`;
}

export function resetCounter(value = 1) {
  counter = value;
}
