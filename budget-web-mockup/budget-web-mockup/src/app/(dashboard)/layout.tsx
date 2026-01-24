'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Header, Sidebar, MobileNav } from '@/components/layout';
import TransactionModal from '@/components/transactions/TransactionModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const handleSaveTransaction = () => {
    // TODO: Implement transaction save logic
    setIsTransactionModalOpen(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header onAddTransaction={() => setIsTransactionModalOpen(true)} />

        <div className="flex">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 pb-20 lg:pb-0">
            <div className="p-6 lg:p-8">{children}</div>
          </main>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />

        {/* Transaction Modal */}
        <TransactionModal
          visible={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSave={handleSaveTransaction}
        />
      </div>
    </ProtectedRoute>
  );
}
