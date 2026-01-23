// Currency formatting
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatCurrencyCompact(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

// Date formatting
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return formatDate(d);
}

export function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Percentage formatting
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// Number formatting
export function formatNumber(
  value: number,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatNumberCompact(
  value: number,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// Recurrence formatting
export function formatRecurrence(recurrence: string): string {
  const map: Record<string, string> = {
    none: 'One-time',
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
    sixmonths: 'Every 6 months',
    yearly: 'Yearly',
  };
  return map[recurrence] || recurrence;
}

// Transaction type formatting
export function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    INCOME: 'Income',
    EXPENSE: 'Expense',
    TRANSFER: 'Transfer',
    ROLLOVER: 'Rollover',
  };
  return map[type] || type;
}

// Payment status formatting
export function formatPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    UPCOMING: 'Upcoming',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
  };
  return map[status] || status;
}

// Priority formatting
export function formatPriority(priority: string): string {
  const map: Record<string, string> = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  };
  return map[priority] || priority;
}
