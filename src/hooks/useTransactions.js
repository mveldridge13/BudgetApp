import {useState, useCallback, useEffect, useRef} from 'react';
import {Alert} from 'react-native';
import {StorageCoordinator} from '../services/storage/StorageCoordinator';

const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [deletingIds, setDeletingIds] = useState([]);
  const [editingIds, setEditingIds] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const hasAttemptedLoadRef = useRef(false);
  const isLoadingRef = useRef(false);

  const storageCoordinator = StorageCoordinator.getInstance();
  const userStorageManager = storageCoordinator.getUserStorageManager();

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;

    const checkAndLoad = async () => {
      if (!mounted || hasAttemptedLoadRef.current || isLoadingRef.current) {
        return;
      }

      const isReady =
        storageCoordinator.isUserStorageInitialized() && userStorageManager;

      if (isReady && !hasAttemptedLoadRef.current) {
        isLoadingRef.current = true;
        hasAttemptedLoadRef.current = true;

        try {
          const storedTransactions = await userStorageManager.getUserData(
            'transactions',
          );

          if (mounted) {
            if (
              storedTransactions &&
              Array.isArray(storedTransactions) &&
              storedTransactions.length > 0
            ) {
              setTransactions(storedTransactions);
              setIsStorageReady(true);
            } else {
              setTransactions([]);
              setIsStorageReady(true);
            }
          }
        } catch (error) {
          console.error('Error loading transactions:', error);
          if (mounted) {
            setTransactions([]);
            setIsStorageReady(true);
          }
        } finally {
          isLoadingRef.current = false;
        }
      } else if (!isReady && retryCount < 20) {
        retryCount++;
        const delay = Math.min(500 * Math.pow(1.3, retryCount), 5000);
        setTimeout(() => {
          if (mounted) {
            checkAndLoad();
          }
        }, delay);
      }
    };

    checkAndLoad();

    return () => {
      mounted = false;
    };
  }, [storageCoordinator, userStorageManager]);

  const loadTransactions = useCallback(async () => {
    if (!userStorageManager) {
      console.warn('Cannot load transactions - no storage manager');
      return;
    }

    try {
      const storedTransactions = await userStorageManager.getUserData(
        'transactions',
      );

      if (storedTransactions && Array.isArray(storedTransactions)) {
        setTransactions(storedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error in manual load transactions:', error);
      setTransactions([]);
    }
  }, [userStorageManager]);

  const saveTransactionsToStorage = useCallback(
    async updatedTransactions => {
      if (!userStorageManager) {
        throw new Error('User storage not ready');
      }

      try {
        const success = await userStorageManager.setUserData(
          'transactions',
          updatedTransactions,
        );

        if (!success) {
          throw new Error('Failed to save transactions');
        }
      } catch (error) {
        console.error('Error saving transactions:', error);
        throw error;
      }
    },
    [userStorageManager],
  );

  const createTransactionBackup = useCallback(async transactionsData => {
    try {
      if (!transactionsData || !Array.isArray(transactionsData)) {
        return;
      }

      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      const backupData = {
        timestamp: new Date().toISOString(),
        transactions: transactionsData,
        count: transactionsData.length,
      };

      await AsyncStorage.setItem(
        'transaction_backup_latest',
        JSON.stringify(backupData),
      );
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }, []);

  const saveTransaction = useCallback(
    async transaction => {
      try {
        let updatedTransactions;

        if (editingTransaction) {
          updatedTransactions = transactions.map(t =>
            t.id === editingTransaction.id ? transaction : t,
          );
        } else {
          updatedTransactions = [transaction, ...transactions];
        }

        await saveTransactionsToStorage(updatedTransactions);
        setTransactions(updatedTransactions);

        if (editingTransaction) {
          setEditingTransaction(null);
        }

        await createTransactionBackup(updatedTransactions);

        return {
          isNewTransaction: !editingTransaction,
          updatedTransactions,
        };
      } catch (error) {
        console.error('Error saving transaction:', error);
        Alert.alert('Error', 'Failed to save transaction.');
        throw error;
      }
    },
    [
      editingTransaction,
      transactions,
      saveTransactionsToStorage,
      createTransactionBackup,
    ],
  );

  const deleteTransaction = useCallback(
    async transactionId => {
      if (!userStorageManager) {
        Alert.alert('Error', 'Storage not ready.');
        return;
      }

      try {
        if (deletingIds.includes(transactionId)) {
          return;
        }
        setDeletingIds(prev => [...prev, transactionId]);

        const currentTransactions = await userStorageManager.getUserData('transactions');
        const freshTransactions = currentTransactions && Array.isArray(currentTransactions)
          ? currentTransactions
          : [];

        const updatedTransactions = freshTransactions.filter(
          t => t.id !== transactionId,
        );

        await saveTransactionsToStorage(updatedTransactions);
        setTransactions(updatedTransactions);
        await createTransactionBackup(updatedTransactions);
        setDeletingIds(prev => prev.filter(id => id !== transactionId));

        return updatedTransactions;
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setDeletingIds(prev => prev.filter(id => id !== transactionId));
        Alert.alert('Error', 'Failed to delete transaction.');
        throw error;
      }
    },
    [deletingIds, saveTransactionsToStorage, userStorageManager, createTransactionBackup],
  );

  const prepareEditTransaction = useCallback(
    async transaction => {
      if (!userStorageManager) {
        Alert.alert('Error', 'Storage not ready.');
        return null;
      }

      try {
        if (editingIds.includes(transaction.id)) {
          return null;
        }
        setEditingIds(prev => [...prev, transaction.id]);

        const storedTransactions = await userStorageManager.getUserData(
          'transactions',
        );
        const currentTransaction = storedTransactions?.find(
          t => t.id === transaction.id,
        );

        if (!currentTransaction) {
          setEditingIds(prev => prev.filter(id => id !== transaction.id));
          Alert.alert('Error', 'Transaction not found.');
          return null;
        }

        setEditingTransaction(currentTransaction);
        setEditingIds(prev => prev.filter(id => id !== transaction.id));
        return currentTransaction;
      } catch (error) {
        console.error('Error preparing edit:', error);
        setEditingIds(prev => prev.filter(id => id !== transaction.id));
        Alert.alert('Error', 'Failed to prepare transaction for editing.');
        return null;
      }
    },
    [editingIds, userStorageManager],
  );

  const clearEditingTransaction = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  const calculateTotalExpenses = useCallback(() => {
      return transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    },
    [transactions],
  );

  return {
    transactions,
    deletingIds,
    editingIds,
    editingTransaction,
    isStorageReady,
    loadTransactions,
    saveTransaction,
    deleteTransaction,
    prepareEditTransaction,
    clearEditingTransaction,
    calculateTotalExpenses,
  };
};

export default useTransactions;
