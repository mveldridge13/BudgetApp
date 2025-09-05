'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import TransactionModal from '@/components/TransactionModal';

export default function Home() {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const handleSaveTransaction = (transactionData: any) => {
    console.log('New transaction saved:', transactionData);
    // Here you would typically save to your data store
    setIsTransactionModalOpen(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Dashboard onAddTransaction={() => setIsTransactionModalOpen(true)} />
      <TransactionModal 
        visible={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleSaveTransaction}
      />
    </main>
  );
}
