// Mock data based on mobile app structure
export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: Category;
  subcategory: Subcategory;
  date: string;
  dueDate?: string;
  recurrence: 'none' | 'weekly' | 'fortnightly' | 'monthly' | 'sixmonths' | 'yearly';
  transactionType: 'EXPENSE' | 'INCOME';
  paymentStatus: 'UPCOMING' | 'PAID' | 'OVERDUE';
  location?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string;
  category: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  recurrence: string;
  category: Category;
  status: 'UPCOMING' | 'PAID' | 'OVERDUE';
}

// Mock Categories
export const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Food & Dining',
    color: '#FF6B6B',
    icon: 'restaurant-outline',
    subcategories: [
      { id: '1-1', name: 'Restaurants', categoryId: '1' },
      { id: '1-2', name: 'Groceries', categoryId: '1' },
      { id: '1-3', name: 'Coffee & Tea', categoryId: '1' },
    ],
  },
  {
    id: '2',
    name: 'Transportation',
    color: '#4ECDC4',
    icon: 'car-outline',
    subcategories: [
      { id: '2-1', name: 'Fuel', categoryId: '2' },
      { id: '2-2', name: 'Public Transport', categoryId: '2' },
      { id: '2-3', name: 'Parking', categoryId: '2' },
    ],
  },
  {
    id: '3',
    name: 'Entertainment',
    color: '#45B7D1',
    icon: 'film-outline',
    subcategories: [
      { id: '3-1', name: 'Movies', categoryId: '3' },
      { id: '3-2', name: 'Games', categoryId: '3' },
      { id: '3-3', name: 'Subscriptions', categoryId: '3' },
    ],
  },
  {
    id: '4',
    name: 'Shopping',
    color: '#96CEB4',
    icon: 'bag-outline',
    subcategories: [
      { id: '4-1', name: 'Clothing', categoryId: '4' },
      { id: '4-2', name: 'Electronics', categoryId: '4' },
      { id: '4-3', name: 'Home & Garden', categoryId: '4' },
    ],
  },
  {
    id: '5',
    name: 'Income',
    color: '#4CAF50',
    icon: 'cash-outline',
    subcategories: [
      { id: '5-1', name: 'Salary', categoryId: '5' },
      { id: '5-2', name: 'Freelance', categoryId: '5' },
      { id: '5-3', name: 'Investment', categoryId: '5' },
    ],
  },
  {
    id: '6',
    name: 'Health & Fitness',
    color: '#FF9F8C',
    icon: 'fitness-outline',
    subcategories: [
      { id: '6-1', name: 'Doctor Visits', categoryId: '6' },
      { id: '6-2', name: 'Gym Membership', categoryId: '6' },
      { id: '6-3', name: 'Pharmacy', categoryId: '6' },
    ],
  },
  {
    id: '7',
    name: 'Utilities',
    color: '#FFB84D',
    icon: 'flash-outline',
    subcategories: [
      { id: '7-1', name: 'Electricity', categoryId: '7' },
      { id: '7-2', name: 'Water', categoryId: '7' },
      { id: '7-3', name: 'Internet', categoryId: '7' },
    ],
  },
  {
    id: '8',
    name: 'Education',
    color: '#A29BFE',
    icon: 'school-outline',
    subcategories: [
      { id: '8-1', name: 'Online Courses', categoryId: '8' },
      { id: '8-2', name: 'Books', categoryId: '8' },
      { id: '8-3', name: 'Certification', categoryId: '8' },
    ],
  },
];

// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: -45.50,
    description: 'Dinner at Italian Restaurant',
    category: mockCategories[0],
    subcategory: mockCategories[0].subcategories[0],
    date: '2025-01-15',
    recurrence: 'none',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
    location: 'Downtown',
  },
  {
    id: '2',
    amount: -12.75,
    description: 'Coffee with Sarah',
    category: mockCategories[0],
    subcategory: mockCategories[0].subcategories[2],
    date: '2025-01-14',
    recurrence: 'none',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
  {
    id: '3',
    amount: -89.99,
    description: 'Weekly Groceries',
    category: mockCategories[0],
    subcategory: mockCategories[0].subcategories[1],
    date: '2025-01-13',
    recurrence: 'weekly',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
  {
    id: '4',
    amount: -25.00,
    description: 'Fuel',
    category: mockCategories[1],
    subcategory: mockCategories[1].subcategories[0],
    date: '2025-01-12',
    recurrence: 'none',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
  {
    id: '5',
    amount: 3200.00,
    description: 'Monthly Salary',
    category: mockCategories[4],
    subcategory: mockCategories[4].subcategories[0],
    date: '2025-01-01',
    recurrence: 'monthly',
    transactionType: 'INCOME',
    paymentStatus: 'PAID',
  },
  {
    id: '6',
    amount: -15.99,
    description: 'Netflix Subscription',
    category: mockCategories[2],
    subcategory: mockCategories[2].subcategories[2],
    date: '2025-01-10',
    dueDate: '2025-02-10',
    recurrence: 'monthly',
    transactionType: 'EXPENSE',
    paymentStatus: 'UPCOMING',
  },
  {
    id: '7',
    amount: -75.00,
    description: 'Doctor Visit',
    category: mockCategories[5],
    subcategory: mockCategories[5].subcategories[0],
    date: '2025-01-09',
    recurrence: 'none',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
  {
    id: '8',
    amount: -29.99,
    description: 'Gym Membership',
    category: mockCategories[5],
    subcategory: mockCategories[5].subcategories[1],
    date: '2025-01-08',
    recurrence: 'monthly',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
  {
    id: '9',
    amount: -85.50,
    description: 'Electricity Bill',
    category: mockCategories[6],
    subcategory: mockCategories[6].subcategories[0],
    date: '2025-01-07',
    recurrence: 'monthly',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
  {
    id: '10',
    amount: -55.00,
    description: 'Internet Bill',
    category: mockCategories[6],
    subcategory: mockCategories[6].subcategories[2],
    date: '2025-01-06',
    recurrence: 'monthly',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
  {
    id: '11',
    amount: -39.99,
    description: 'Online Course',
    category: mockCategories[7],
    subcategory: mockCategories[7].subcategories[0],
    date: '2025-01-05',
    recurrence: 'none',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
  {
    id: '12',
    amount: -120.00,
    description: 'New Clothes',
    category: mockCategories[3],
    subcategory: mockCategories[3].subcategories[0],
    date: '2025-01-04',
    recurrence: 'none',
    transactionType: 'EXPENSE',
    paymentStatus: 'PAID',
  },
];

// Mock Goals
export const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Emergency Fund',
    description: 'Build up 6 months of expenses',
    targetAmount: 15000,
    currentAmount: 8500,
    dueDate: '2025-12-31',
    category: 'Savings',
  },
  {
    id: '2',
    title: 'Vacation to Japan',
    description: 'Save for 2-week trip',
    targetAmount: 5000,
    currentAmount: 1200,
    dueDate: '2025-08-15',
    category: 'Travel',
  },
  {
    id: '3',
    title: 'New Laptop',
    description: 'MacBook Pro for work',
    targetAmount: 2500,
    currentAmount: 750,
    dueDate: '2025-06-01',
    category: 'Technology',
  },
];

// Mock Bills
export const mockBills: Bill[] = [
  {
    id: '1',
    name: 'Rent',
    amount: 1200,
    dueDate: '2025-02-01',
    recurrence: 'monthly',
    category: { id: 'housing', name: 'Housing', color: '#FF9F43', icon: '🏠', subcategories: [] },
    status: 'UPCOMING',
  },
  {
    id: '2',
    name: 'Electricity',
    amount: 85,
    dueDate: '2025-01-25',
    recurrence: 'monthly',
    category: { id: 'utilities', name: 'Utilities', color: '#FEA47F', icon: '⚡', subcategories: [] },
    status: 'UPCOMING',
  },
  {
    id: '3',
    name: 'Internet',
    amount: 55,
    dueDate: '2025-01-20',
    recurrence: 'monthly',
    category: { id: 'utilities', name: 'Utilities', color: '#FEA47F', icon: '📡', subcategories: [] },
    status: 'OVERDUE',
  },
  {
    id: '4',
    name: 'Phone',
    amount: 45,
    dueDate: '2025-01-15',
    recurrence: 'monthly',
    category: { id: 'utilities', name: 'Utilities', color: '#FEA47F', icon: '📱', subcategories: [] },
    status: 'PAID',
  },
];

// Summary data
export const mockSummary = {
  totalIncome: 3200,
  totalExpenses: 239.23,
  balance: 2960.77,
  upcomingBills: 1340,
  goalsSavings: 10450,
  monthlyBudget: 2800,
};
