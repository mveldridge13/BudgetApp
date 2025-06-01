// hooks/useTransactions.js (Fixed to calculate pay period expenses)
import {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [deletingIds, setDeletingIds] = useState([]);
  const [editingIds, setEditingIds] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const loadTransactions = useCallback(async () => {
    try {
      const storedTransactions = await AsyncStorage.getItem('transactions');
      if (storedTransactions) {
        const parsedTransactions = JSON.parse(storedTransactions);
        setTransactions(parsedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  }, []);

  const saveTransactionsToStorage = useCallback(async updatedTransactions => {
    try {
      await AsyncStorage.setItem(
        'transactions',
        JSON.stringify(updatedTransactions),
      );
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  }, []);

  const saveTransaction = useCallback(
    async transaction => {
      try {
        let updatedTransactions;

        if (editingTransaction) {
          // We're editing an existing transaction
          updatedTransactions = transactions.map(t =>
            t.id === editingTransaction.id ? transaction : t,
          );

          await saveTransactionsToStorage(updatedTransactions);
          setTransactions(updatedTransactions);
          setEditingTransaction(null);
          return {isNewTransaction: false, updatedTransactions};
        }

        // We're adding a new transaction
        updatedTransactions = [...transactions, transaction];
        await saveTransactionsToStorage(updatedTransactions);
        setTransactions(updatedTransactions);

        return {isNewTransaction: true, updatedTransactions};
      } catch (error) {
        console.error('Error saving transaction:', error);
        Alert.alert('Error', 'Failed to save transaction.');
        throw error;
      }
    },
    [editingTransaction, transactions, saveTransactionsToStorage],
  );

  const deleteTransaction = useCallback(
    async transactionId => {
      try {
        // Prevent multiple deletes of the same transaction
        if (deletingIds.includes(transactionId)) {
          return;
        }

        setDeletingIds(prev => [...prev, transactionId]);

        // Get fresh transaction data from AsyncStorage before deleting
        const storedTransactions = await AsyncStorage.getItem('transactions');
        let currentTransactions = [];

        if (storedTransactions) {
          currentTransactions = JSON.parse(storedTransactions);
        } else {
          setDeletingIds(prev => prev.filter(id => id !== transactionId));
          Alert.alert('Error', 'No transactions found.');
          return;
        }

        // Find the transaction to delete
        const transactionToDelete = currentTransactions.find(
          t => t.id === transactionId,
        );
        if (!transactionToDelete) {
          setDeletingIds(prev => prev.filter(id => id !== transactionId));
          Alert.alert('Error', 'Transaction not found.');
          return;
        }

        // Get index and create updated array
        const indexToDelete = currentTransactions.findIndex(
          t => t.id === transactionId,
        );
        if (indexToDelete === -1) {
          setDeletingIds(prev => prev.filter(id => id !== transactionId));
          Alert.alert('Error', 'Transaction not found.');
          return;
        }

        const updatedTransactions = [
          ...currentTransactions.slice(0, indexToDelete),
          ...currentTransactions.slice(indexToDelete + 1),
        ];

        // Verify deletion worked correctly
        if (updatedTransactions.length !== currentTransactions.length - 1) {
          console.error('Delete operation failed - incorrect result');
          setDeletingIds(prev => prev.filter(id => id !== transactionId));
          Alert.alert('Error', 'Delete operation failed. Please try again.');
          return;
        }

        // Save and update state
        await saveTransactionsToStorage(updatedTransactions);
        setTransactions(updatedTransactions);
        setDeletingIds(prev => prev.filter(id => id !== transactionId));

        return updatedTransactions;
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setDeletingIds(prev => prev.filter(id => id !== transactionId));
        Alert.alert('Error', 'Failed to delete transaction. Please try again.');
        throw error;
      }
    },
    [deletingIds, saveTransactionsToStorage],
  );

  const prepareEditTransaction = useCallback(
    async transaction => {
      try {
        // Prevent multiple edits of the same transaction
        if (editingIds.includes(transaction.id)) {
          return null;
        }

        setEditingIds(prev => [...prev, transaction.id]);

        // Get fresh transaction data from AsyncStorage
        const storedTransactions = await AsyncStorage.getItem('transactions');
        let currentTransactions = [];

        if (storedTransactions) {
          currentTransactions = JSON.parse(storedTransactions);
        } else {
          setEditingIds(prev => prev.filter(id => id !== transaction.id));
          Alert.alert('Error', 'No transactions found.');
          return null;
        }

        // Find the most current version of the transaction
        const currentTransaction = currentTransactions.find(
          t => t.id === transaction.id,
        );

        if (!currentTransaction) {
          setEditingIds(prev => prev.filter(id => id !== transaction.id));
          Alert.alert('Error', 'Transaction not found.');
          return null;
        }

        // Set the transaction for editing
        setEditingTransaction(currentTransaction);
        setEditingIds(prev => prev.filter(id => id !== transaction.id));

        return currentTransaction;
      } catch (error) {
        console.error('Error preparing edit transaction:', error);
        setEditingIds(prev => prev.filter(id => id !== transaction.id));
        Alert.alert('Error', 'Failed to prepare transaction for editing.');
        return null;
      }
    },
    [editingIds],
  );

  const clearEditingTransaction = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  // FIXED: Calculate pay period expenses - always use current pay period, not selected date
  const calculateTotalExpenses = useCallback(
    (selectedDate, incomeData) => {
      // If no income data, we can't calculate pay period, so fallback to daily calculation
      if (!incomeData?.nextPayDate || !incomeData?.frequency) {
        // Fallback to original daily calculation
        const dailyTransactions = transactions.filter(transaction => {
          if (transaction.recurrence && transaction.recurrence !== 'none') {
            return false;
          }
          const transactionDate = new Date(transaction.date);
          const isSameDay = (date1, date2) => {
            return (
              date1.getDate() === date2.getDate() &&
              date1.getMonth() === date2.getMonth() &&
              date1.getFullYear() === date2.getFullYear()
            );
          };
          return isSameDay(transactionDate, selectedDate);
        });

        const recurringTransactions = transactions.filter(transaction => {
          return (
            transaction.recurrence &&
            transaction.recurrence !== 'none' &&
            [
              'monthly',
              'fortnightly',
              'sixmonths',
              'yearly',
              'weekly',
            ].includes(transaction.recurrence)
          );
        });

        const dailyExpenses = dailyTransactions.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        );
        const monthlyExpenses = recurringTransactions.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        );

        return dailyExpenses + monthlyExpenses;
      }

      // FIXED: Always calculate based on current date, not selected date
      // This ensures balance card always shows current pay period expenses
      const currentDate = new Date();

      // Calculate current pay period dates (based on current date, not selected date)
      const [dayStr, monthStr, yearStr] = incomeData.nextPayDate.split('/');
      const nextPayDate = new Date(
        2000 + parseInt(yearStr, 10),
        parseInt(monthStr, 10) - 1,
        parseInt(dayStr, 10),
      );

      const frequencyDays = {
        weekly: 7,
        fortnightly: 14,
        monthly: 30,
      };

      const days = frequencyDays[incomeData.frequency] || 30;

      let periodStart;
      if (incomeData.frequency === 'monthly') {
        periodStart = new Date(nextPayDate);
        periodStart.setMonth(periodStart.getMonth() - 1);
      } else {
        periodStart = new Date(nextPayDate);
        periodStart.setDate(periodStart.getDate() - days);
      }

      const periodEnd = new Date(nextPayDate);
      periodEnd.setDate(periodEnd.getDate() - 1);

      // REMOVED: No month adjustment based on selected date
      // The balance should always show current pay period expenses

      // Debug logging
      console.log('=== EXPENSE CALCULATION DEBUG ===');
      console.log('Current Date:', currentDate);
      console.log('Selected Date:', selectedDate);
      console.log('Period Start:', periodStart);
      console.log('Period End:', periodEnd);
      console.log('Income Data:', incomeData);

      // Filter daily transactions within the current pay period
      const payPeriodTransactions = transactions.filter(transaction => {
        if (transaction.recurrence && transaction.recurrence !== 'none') {
          return false; // Handle recurring separately
        }

        const transactionDate = new Date(transaction.date);

        console.log('Checking transaction:', {
          date: transaction.date,
          parsedDate: transactionDate,
          amount: transaction.amount,
          description: transaction.description,
          inPeriod:
            transactionDate >= periodStart && transactionDate <= periodEnd,
        });

        // Check if transaction falls within current pay period
        return transactionDate >= periodStart && transactionDate <= periodEnd;
      });

      // Filter recurring transactions (these apply to the whole period)
      const recurringTransactions = transactions.filter(transaction => {
        return (
          transaction.recurrence &&
          transaction.recurrence !== 'none' &&
          ['monthly', 'fortnightly', 'sixmonths', 'yearly', 'weekly'].includes(
            transaction.recurrence,
          )
        );
      });

      // Calculate totals
      const payPeriodExpenses = payPeriodTransactions.reduce(
        (sum, transaction) => sum + transaction.amount,
        0,
      );
      const recurringExpenses = recurringTransactions.reduce(
        (sum, transaction) => sum + transaction.amount,
        0,
      );

      const totalExpenses = payPeriodExpenses + recurringExpenses;

      console.log('Pay Period Transactions:', payPeriodTransactions);
      console.log('Recurring Transactions:', recurringTransactions);
      console.log('Pay Period Expenses:', payPeriodExpenses);
      console.log('Recurring Expenses:', recurringExpenses);
      console.log('Total Expenses:', totalExpenses);
      console.log('=== END DEBUG ===');

      return totalExpenses;
    },
    [transactions],
  );

  return {
    // State
    transactions,
    deletingIds,
    editingIds,
    editingTransaction,

    // Actions
    loadTransactions,
    saveTransaction,
    deleteTransaction,
    prepareEditTransaction,
    clearEditingTransaction,
    calculateTotalExpenses,
  };
};

export default useTransactions;
