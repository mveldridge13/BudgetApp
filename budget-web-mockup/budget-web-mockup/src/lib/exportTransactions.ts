import {Transaction} from '@/types';

// Escape a single value for safe inclusion in a CSV cell.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const COLUMNS: {header: string; value: (t: Transaction) => unknown}[] = [
  {header: 'Date', value: (t) => t.date},
  {header: 'Description', value: (t) => t.description},
  {header: 'Type', value: (t) => t.type},
  {header: 'Amount', value: (t) => t.amount},
  {header: 'Category', value: (t) => t.categoryName ?? ''},
  {header: 'Subcategory', value: (t) => t.subcategoryName ?? ''},
  {header: 'Status', value: (t) => t.status ?? ''},
  {header: 'Notes', value: (t) => t.notes ?? ''},
];

export function transactionsToCsv(transactions: Transaction[]): string {
  const header = COLUMNS.map((c) => csvCell(c.header)).join(',');
  const rows = transactions.map((t) =>
    COLUMNS.map((c) => csvCell(c.value(t))).join(','),
  );
  return [header, ...rows].join('\n');
}

// Build a CSV from the given transactions and trigger a browser download.
export function exportTransactionsToCsv(
  transactions: Transaction[],
  filename?: string,
): void {
  const csv = transactionsToCsv(transactions);
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const name =
    filename ?? `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
