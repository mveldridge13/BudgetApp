/* eslint-disable react-hooks/exhaustive-deps */
import {useState, useCallback, useEffect, useRef} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import TrendAPIService from '../services/TrendAPIService';

const TRANSACTIONS_KEY = 'transactions';
const TRANSACTION_QUEUE_KEY = 'transaction_queue';

const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const syncInProgress = useRef(false);

  // Watch network
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });
    return () => unsubscribe();
  }, []);

  // Load queue on mount
  useEffect(() => {
    (async () => {
      const storedQueue = await AsyncStorage.getItem(TRANSACTION_QUEUE_KEY);
      setQueue(storedQueue ? JSON.parse(storedQueue) : []);
    })();
  }, []);

  const sortTransactions = useCallback(
    txs => txs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [],
  );

  // Load transactions when coming online
  const loadTransactions = useCallback(async () => {
    try {
      if (isOnline) {
        const response = await TrendAPIService.getTransactions();
        const backendTransactions = response?.transactions || [];
        const sorted = sortTransactions(backendTransactions);
        setTransactions(sorted);
        await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(sorted));
      } else {
        const stored = await AsyncStorage.getItem(TRANSACTIONS_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        setTransactions(sortTransactions(parsed));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  }, [isOnline, sortTransactions]);

  // Load transactions when online status changes
  useEffect(() => {
    loadTransactions();
  }, [isOnline, loadTransactions]);

  // Sync on reconnect
  const syncQueue = useCallback(async () => {
    if (syncInProgress.current) {
      return;
    }

    syncInProgress.current = true;
    setSyncing(true);
    setSyncError(null);

    try {
      let updatedTransactions = [...transactions];
      let newQueue = [...queue];

      for (let i = 0; i < newQueue.length; i++) {
        const change = newQueue[i];
        try {
          if (change.type === 'create') {
            const {id, ...data} = change.transaction;
            const saved = await TrendAPIService.createTransaction(data);
            updatedTransactions = updatedTransactions.map(t =>
              t.id === id ? saved : t,
            );
          } else if (change.type === 'update') {
            await TrendAPIService.updateTransaction(
              change.transaction.id,
              change.transaction,
            );
          } else if (change.type === 'delete') {
            await TrendAPIService.deleteTransaction(change.transactionId);
          }

          newQueue = newQueue.slice(i + 1);
          setQueue(newQueue);
          await AsyncStorage.setItem(
            TRANSACTION_QUEUE_KEY,
            JSON.stringify(newQueue),
          );
          i = -1; // Restart loop from new queue start
        } catch (error) {
          console.warn('Sync error, will retry later:', error);
          setSyncError(error);
          break;
        }
      }

      await AsyncStorage.setItem(
        TRANSACTIONS_KEY,
        JSON.stringify(updatedTransactions),
      );
      setTransactions(sortTransactions(updatedTransactions));
    } finally {
      syncInProgress.current = false;
      setSyncing(false);
    }
  }, [queue, transactions, sortTransactions]);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline, queue.length, syncQueue]);

  const queueChange = useCallback(
    async change => {
      const dedupedQueue = queue.filter(q => {
        if (
          q.type === 'update' &&
          change.type === 'update' &&
          q.transaction.id === change.transaction.id
        ) {
          return false;
        }
        if (
          q.type === 'delete' &&
          change.type === 'delete' &&
          q.transactionId === change.transactionId
        ) {
          return false;
        }
        return true;
      });
      const newQueue = [...dedupedQueue, change];
      setQueue(newQueue);
      await AsyncStorage.setItem(
        TRANSACTION_QUEUE_KEY,
        JSON.stringify(newQueue),
      );
    },
    [queue],
  );

  const saveTransaction = useCallback(
    async transaction => {
      try {
        let updatedTransactions;

        if (isOnline) {
          let saved;
          if (transaction.id) {
            saved = await TrendAPIService.updateTransaction(
              transaction.id,
              transaction,
            );
            updatedTransactions = transactions.map(t =>
              t.id === saved.id ? saved : t,
            );
          } else {
            saved = await TrendAPIService.createTransaction(transaction);
            updatedTransactions = [saved, ...transactions];
          }
          setTransactions(sortTransactions(updatedTransactions));
          await AsyncStorage.setItem(
            TRANSACTIONS_KEY,
            JSON.stringify(updatedTransactions),
          );
        } else {
          if (transaction.id) {
            updatedTransactions = transactions.map(t =>
              t.id === transaction.id ? transaction : t,
            );
            await queueChange({type: 'update', transaction});
          } else {
            const tempId = `temp-${Date.now()}`;
            const offlineTransaction = {...transaction, id: tempId};
            updatedTransactions = [offlineTransaction, ...transactions];
            await queueChange({
              type: 'create',
              transaction: offlineTransaction,
            });
          }
          setTransactions(sortTransactions(updatedTransactions));
          await AsyncStorage.setItem(
            TRANSACTIONS_KEY,
            JSON.stringify(updatedTransactions),
          );
        }

        setEditingTransaction(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to save transaction.');
        throw error;
      }
    },
    [isOnline, transactions, queueChange, sortTransactions],
  );

  const deleteTransaction = useCallback(
    async transactionId => {
      try {
        const updatedTransactions = transactions.filter(
          t => t.id !== transactionId,
        );
        setTransactions(updatedTransactions);

        if (isOnline) {
          await TrendAPIService.deleteTransaction(transactionId);
        } else {
          await queueChange({type: 'delete', transactionId});
        }

        await AsyncStorage.setItem(
          TRANSACTIONS_KEY,
          JSON.stringify(updatedTransactions),
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to delete transaction.');
        throw error;
      }
    },
    [isOnline, transactions, queueChange, sortTransactions],
  );

  const prepareEditTransaction = useCallback(
    transactionId => {
      const transaction = transactions.find(t => t.id === transactionId);
      setEditingTransaction(transaction);
      return transaction;
    },
    [transactions],
  );

  const clearEditingTransaction = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  return {
    transactions,
    editingTransaction,
    loadTransactions,
    saveTransaction,
    deleteTransaction,
    prepareEditTransaction,
    clearEditingTransaction,
    isOnline,
    syncing,
    syncError,
  };
};

export default useTransactions;
