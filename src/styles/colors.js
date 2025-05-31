export const colors = {
  // Primary brand colors (from your mockup's gradient)
  primary: '#6366f1', // Main purple
  primaryDark: '#8b5cf6', // Darker purple for gradients
  primaryLight: '#E0E7FF', // Updated for goals - light blue backgrounds

  // Background colors
  background: '#f8fafc', // Light gray background
  backgroundDark: '#1f2937', // Dark gray for sections

  // Card and surface colors
  surface: '#ffffff', // Added for consistent card backgrounds
  cardBackground: '#ffffff',
  overlayLight: 'rgba(255, 255, 255, 0.2)',
  overlayDark: 'rgba(255, 255, 255, 0.3)',

  // Text colors
  text: '#1f2937', // Added for consistency with goals
  textPrimary: '#1f2937', // Dark gray for main text
  textSecondary: '#6b7280', // Medium gray for secondary text
  textLight: '#9ca3af', // Light gray for disabled text
  textWhite: '#ffffff', // White text

  // Transaction colors
  income: '#16a34a', // Green for positive amounts
  expense: '#dc2626', // Red for negative amounts
  incomeLight: '#dcfce7', // Light green background
  expenseLight: '#fee2e2', // Light red background

  // Category icon colors
  grocery: '#d97706', // Orange
  groceryLight: '#fef3c7', // Light orange
  gas: '#2563eb', // Blue
  gasLight: '#dbeafe', // Light blue
  coffee: '#be185d', // Pink
  coffeeLight: '#fce7f3', // Light pink
  rent: '#d97706', // Orange
  utilities: '#2563eb', // Blue

  // Progress and accent colors
  progressGreen: '#10b981',
  progressGreenLight: '#34d399',

  // Goals-specific colors
  success: '#10B981', // Green for success states
  warning: '#F59E0B', // Orange/yellow for warnings
  danger: '#EF4444', // Red for danger/debt
  dangerLight: '#FEF2F2', // Light red for debt goal backgrounds
  warningLight: '#FEF3C7', // Light yellow for spending goal backgrounds

  // Border colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  // Status bar and navigation
  statusBar: '#6366f1',
  navigationActive: '#6366f1',
  navigationInactive: '#9ca3af',

  // Shadow colors
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',

  // Gradient definitions (for use with LinearGradient)
  gradients: {
    primary: ['#6366f1', '#8b5cf6'],
    background: ['#667eea', '#764ba2'],
    progress: ['#10b981', '#34d399'],
  },
};
