// Transaction types
export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER', 'ROLLOVER'] as const;

// Payment statuses
export const PAYMENT_STATUSES = ['UPCOMING', 'PAID', 'OVERDUE'] as const;

// Recurrence options
export const RECURRENCE_OPTIONS = [
  { id: 'none', name: '-- None --' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'fortnightly', name: 'Fortnightly' },
  { id: 'monthly', name: 'Monthly' },
  { id: 'sixmonths', name: 'Every 6 months' },
  { id: 'yearly', name: 'Yearly' },
] as const;

// Budget periods
export const BUDGET_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

// Goal priorities
export const GOAL_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;

// Income frequencies
export const INCOME_FREQUENCIES = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'YEARLY'] as const;

// Colors for categories (default palette)
export const CATEGORY_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFB84D', // Orange
  '#A29BFE', // Purple
  '#FF9F8C', // Coral
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
] as const;

// Priority colors
export const PRIORITY_COLORS = {
  HIGH: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  MEDIUM: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  LOW: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
} as const;

// Payment status colors
export const PAYMENT_STATUS_COLORS = {
  UPCOMING: { bg: 'bg-blue-50', text: 'text-blue-600' },
  PAID: { bg: 'bg-green-50', text: 'text-green-600' },
  OVERDUE: { bg: 'bg-red-50', text: 'text-red-600' },
} as const;

// Transaction type colors
export const TRANSACTION_TYPE_COLORS = {
  INCOME: '#4CAF50',
  EXPENSE: '#FF4757',
  TRANSFER: '#6366F1',
  ROLLOVER: '#FFB84D',
} as const;

// Chart colors
export const CHART_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
] as const;

// Date ranges for filters
export const DATE_RANGES = [
  { id: 'today', name: 'Today' },
  { id: 'this-week', name: 'This Week' },
  { id: 'this-month', name: 'This Month' },
  { id: 'last-month', name: 'Last Month' },
  { id: 'this-year', name: 'This Year' },
  { id: 'custom', name: 'Custom Range' },
] as const;

// Sort options for transactions
export const TRANSACTION_SORT_OPTIONS = [
  { id: 'date-desc', name: 'Newest First' },
  { id: 'date-asc', name: 'Oldest First' },
  { id: 'amount-desc', name: 'Highest Amount' },
  { id: 'amount-asc', name: 'Lowest Amount' },
] as const;

// Navigation items
export const NAV_ITEMS = [
  { id: 'overview', name: 'Dashboard', icon: 'dashboard' },
  { id: 'transactions', name: 'Transactions', icon: 'transactions' },
  { id: 'goals', name: 'Goals', icon: 'goals' },
  { id: 'budgets', name: 'Budgets', icon: 'budgets' },
  { id: 'analytics', name: 'Analytics', icon: 'analytics' },
  { id: 'categories', name: 'Categories', icon: 'categories' },
] as const;
