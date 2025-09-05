import {useState} from 'react';
import {
  mockTransactions,
  mockGoals,
} from '@/lib/mockData';
import Sidebar from './Sidebar';
import Header from './Header';
import HeroSection from './HeroSection';
import StatsCards from './StatsCards';
import GoalProgress from './GoalProgress';
import TransactionList from './TransactionList';
import SpendSnapshot from './SpendSnapshot';
import TrendChart from './TrendChart';

interface DashboardProps {
  onAddTransaction: () => void;
}

export default function Dashboard({onAddTransaction}: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'transactions':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Transactions
                </h1>
                <p className="text-gray-600 mt-1">
                  Track and manage your financial transactions
                </p>
              </div>
              <button 
                onClick={onAddTransaction}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Transaction</span>
              </button>
            </div>
            <TransactionList transactions={mockTransactions} />
          </div>
        );
      case 'goals':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
                <p className="text-gray-600 mt-1">
                  Track your financial goals and progress.
                </p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                View all goals
              </button>
            </div>
            <GoalProgress goals={mockGoals} />
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-1">
                Analyze your spending patterns and trends.
              </p>
            </div>
            <div className="bg-white rounded-lg border p-8 text-center">
              <p className="text-gray-500">Analytics coming soon...</p>
            </div>
          </div>
        );
      case 'categories':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
              <p className="text-gray-600 mt-1">
                Organize your transactions with categories.
              </p>
            </div>
            <div className="bg-white rounded-lg border p-8 text-center">
              <p className="text-gray-500">
                Categories management coming soon...
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>

            <HeroSection />

            <StatsCards />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SpendSnapshot />
              <TrendChart />
            </div>

          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAddTransaction={onAddTransaction} />

      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <main className="flex-1">
          {/* Mobile navigation */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-4">
            <select
              value={activeTab}
              onChange={e => setActiveTab(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="overview">🏠 Dashboard</option>
              <option value="transactions">📊 Transactions</option>
              <option value="goals">🎯 Goals</option>
              <option value="analytics">📈 Analytics</option>
              <option value="categories">🏷️ Categories</option>
            </select>
          </div>

          <div className="p-6 lg:p-8 max-w-7xl">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}
