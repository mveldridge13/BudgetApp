/* eslint-disable no-unused-vars */
// containers/HomeContainer.js
import React, {useState, useEffect, useCallback} from 'react';
import {AppState, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';
import HomeScreen from '../screens/HomeScreen';

const HomeContainer = ({navigation}) => {
  // ==============================================
  // STATE MANAGEMENT
  // ==============================================

  // Core data state
  const [incomeData, setIncomeData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Transaction state management
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Categories state management
  const [categories, setCategories] = useState([]);

  // Date tracking for app state changes
  const [lastActiveDate, setLastActiveDate] = useState(
    new Date().toDateString(),
  );

  // Onboarding state
  const [onboardingStatus, setOnboardingStatus] = useState({
    hasSeenBalanceCardTour: false,
    hasSeenAddTransactionTour: false,
    hasSeenTransactionSwipeTour: false,
  });

  // Goals state
  const [goals, setGoals] = useState([]);

  // ==============================================
  // CATEGORIES INTEGRATION
  // ==============================================

  const transformCategoriesForUI = useCallback(backendCategories => {
    if (!Array.isArray(backendCategories)) {
      return [];
    }

    // Separate main categories and subcategories
    const mainCategories = backendCategories.filter(cat => !cat.parentId);
    const subcategories = backendCategories.filter(cat => cat.parentId);

    const subcategoriesMap = subcategories.reduce((map, subcat) => {
      if (!map[subcat.parentId]) {
        map[subcat.parentId] = [];
      }
      map[subcat.parentId].push({
        id: subcat.id,
        name: subcat.name,
        icon: subcat.icon || 'albums-outline',
        color: subcat.color || '#4ECDC4',
        isCustom: !subcat.isSystem,
        parentId: subcat.parentId,
      });
      return map;
    }, {});

    // Transform main categories and attach their subcategories
    const result = mainCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon || 'albums-outline',
      color: category.color || '#4ECDC4',
      isCustom: !category.isSystem,
      parentId: category.parentId,
      hasSubcategories:
        subcategoriesMap[category.id] &&
        subcategoriesMap[category.id].length > 0,
      subcategories: subcategoriesMap[category.id] || [],
    }));

    // Sort main categories alphabetically by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated()) {
        return;
      }

      const response = await TrendAPIService.getCategories();
      const backendCategories = response?.categories || [];
      const transformedCategories = transformCategoriesForUI(backendCategories);

      setCategories(transformedCategories);
    } catch (error) {
      console.error('HomeContainer: Error loading categories:', error);
      setCategories([]);
    }
  }, [transformCategoriesForUI]);

  // ==============================================
  // TRANSACTION INTEGRATION
  // ==============================================

  const loadTransactions = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated()) {
        return;
      }

      const response = await TrendAPIService.getTransactions();
      const backendTransactions = response?.transactions || [];

      setTransactions(backendTransactions);
    } catch (error) {
      console.error('HomeContainer: Error loading transactions:', error);

      Alert.alert(
        'Connection Issue',
        'Unable to load transactions. Please check your connection.',
        [{text: 'OK'}],
      );
    }
  }, []);

  /**
   * Save transaction with optimistic updates
   */
  const saveTransaction = useCallback(
    async transaction => {
      // Store previous state for rollback
      const previousTransactions = transactions;

      try {
        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }

        const isEditing = transaction.id && transaction.updatedAt;

        // STEP 1: OPTIMISTIC UPDATE - Update UI immediately
        if (isEditing) {
          setTransactions(prevTransactions =>
            prevTransactions.map(t =>
              t.id === transaction.id
                ? {
                    ...transaction,
                    updatedAt: new Date().toISOString(),
                  }
                : t,
            ),
          );
        } else {
          // Generate temporary ID for new transaction
          const tempId = `temp_${Date.now()}_${Math.random()}`;
          const optimisticTransaction = {
            ...transaction,
            id: tempId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setTransactions(prevTransactions => [
            ...prevTransactions,
            optimisticTransaction,
          ]);
        }

        // Clear editing state immediately (optimistic)
        setEditingTransaction(null);

        // STEP 2: BACKEND REQUEST - Send to server
        const transactionData = {
          type: transaction.type || 'EXPENSE',
          amount: transaction.amount,
          description: transaction.description,
          categoryId: transaction.categoryId || transaction.category,
          subcategoryId: transaction.subcategory,
          date: transaction.date.toISOString(),
          recurrence: transaction.recurrence,
        };

        let savedTransaction;
        if (isEditing) {
          savedTransaction = await TrendAPIService.updateTransaction(
            transaction.id,
            transactionData,
          );
        } else {
          savedTransaction = await TrendAPIService.createTransaction(
            transactionData,
          );
        }

        // STEP 3: RECONCILE - Update with real server data
        if (isEditing) {
          setTransactions(prevTransactions =>
            prevTransactions.map(t =>
              t.id === transaction.id ? savedTransaction : t,
            ),
          );
        } else {
          // Replace the temporary transaction with real server data
          setTransactions(prevTransactions =>
            prevTransactions.map(t =>
              t.id &&
              t.id.startsWith('temp_') &&
              t.description === transaction.description &&
              t.amount === transaction.amount
                ? savedTransaction
                : t,
            ),
          );
        }

        return {
          success: true,
          isNewTransaction: !isEditing,
          transaction: savedTransaction,
        };
      } catch (error) {
        console.error(
          'HomeContainer: Transaction save failed, reverting UI:',
          error,
        );

        // STEP 4: ROLLBACK - Revert optimistic changes on error
        setTransactions(previousTransactions);

        // Restore editing state if it was an edit
        if (transaction.id && transaction.updatedAt) {
          setEditingTransaction(transaction);
        }

        throw error;
      }
    },
    [transactions],
  );

  /**
   * Delete transaction with optimistic updates
   */
  const deleteTransaction = useCallback(
    async transactionId => {
      // Store previous state for rollback
      const previousTransactions = transactions;

      try {
        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }

        // STEP 1: OPTIMISTIC UPDATE - Remove from UI immediately
        setTransactions(prevTransactions =>
          prevTransactions.filter(t => t.id !== transactionId),
        );

        // STEP 2: BACKEND REQUEST - Delete on server
        await TrendAPIService.deleteTransaction(transactionId);
      } catch (error) {
        console.error(
          'HomeContainer: Transaction delete failed, reverting UI:',
          error,
        );

        // STEP 4: ROLLBACK - Restore deleted transaction on error
        setTransactions(previousTransactions);

        throw error;
      }
    },
    [transactions],
  );

  /**
   * Prepare transaction for editing with fresh data from backend
   */
  const prepareEditTransaction = useCallback(
    async transactionId => {
      try {
        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }

        // Always fetch fresh data from backend for editing
        const freshTransaction = await TrendAPIService.getTransactionById(
          transactionId,
        );

        if (!freshTransaction) {
          console.warn('Transaction not found on server');
          return null;
        }

        // Update local state with fresh data to keep it in sync
        setTransactions(prevTransactions =>
          prevTransactions.map(t =>
            t.id === transactionId ? freshTransaction : t,
          ),
        );

        setEditingTransaction(freshTransaction);
        return freshTransaction;
      } catch (error) {
        console.error(
          'HomeContainer: Error preparing edit transaction:',
          error,
        );

        // Fallback: try to use local state if backend fails
        const localTransaction = transactions.find(t => t.id === transactionId);

        if (localTransaction) {
          setEditingTransaction(localTransaction);
          return localTransaction;
        }

        throw error;
      }
    },
    [transactions],
  );

  const clearEditingTransaction = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  const calculateTotalExpenses = useCallback(
    date => {
      if (!transactions || transactions.length === 0) {
        return 0;
      }

      const selectedDateStr = date.toDateString();

      // Filter transactions for the selected date
      const dayTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.toDateString() === selectedDateStr;
      });

      // Sum up the expenses
      return dayTransactions.reduce((total, transaction) => {
        return total + (transaction.amount || 0);
      }, 0);
    },
    [transactions],
  );

  // ==============================================
  // GOALS METHODS
  // ==============================================

  const loadGoals = useCallback(async () => {
    try {
      // TODO: Implement when goals backend is ready
      setGoals([]);
    } catch (error) {
      console.error('HomeContainer: Error loading goals:', error);
    }
  }, []);

  const updateSpendingGoals = useCallback(
    async (newTransaction, deletedTransaction) => {
      try {
        // TODO: Implement when goals backend is ready
      } catch (error) {
        console.error('HomeContainer: Error updating spending goals:', error);
      }
    },
    [],
  );

  // ==============================================
  // BACKEND INTEGRATION
  // ==============================================

  const loadCachedIncomeData = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem('userSetup');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setIncomeData(parsedData);
      }
    } catch (error) {
      console.error('HomeContainer: Error loading cached data:', error);
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      // Check if user is authenticated
      if (!AuthService.isAuthenticated()) {
        navigation.navigate('Auth');
        return;
      }

      // Get user profile from backend
      const profile = await TrendAPIService.getUserProfile();
      setUserProfile(profile);

      // Convert backend profile to incomeData format for existing UI
      if (profile.income) {
        // Try to get additional data from AsyncStorage for backward compatibility
        let additionalData = {};
        try {
          const storedData = await AsyncStorage.getItem('userSetup');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            additionalData = {
              frequency: parsedData.frequency || 'monthly',
              nextPayDate: parsedData.nextPayDate || new Date().toISOString(),
            };
          }
        } catch (error) {
          // Ignore errors for additional data
        }

        const incomeDataForUI = {
          income: profile.income,
          monthlyIncome: profile.income,
          setupComplete: profile.setupComplete,
          frequency: additionalData.frequency || 'monthly',
          nextPayDate: additionalData.nextPayDate || new Date().toISOString(),
        };
        setIncomeData(incomeDataForUI);
      } else {
        setIncomeData(null);
      }
    } catch (error) {
      console.error('HomeContainer: Error loading user profile:', error);

      // If API fails, try to get cached data for smooth UX
      await loadCachedIncomeData();

      Alert.alert(
        'Connection Issue',
        'Unable to sync your latest data. Showing cached information.',
        [{text: 'OK'}],
      );
    }
  }, [navigation, loadCachedIncomeData]);

  const loadOnboardingStatus = useCallback(async () => {
    try {
      const [balanceCard, addTransaction, transactionSwipe] = await Promise.all(
        [
          AsyncStorage.getItem('hasSeenBalanceCardTour'),
          AsyncStorage.getItem('hasSeenAddTransactionTour'),
          AsyncStorage.getItem('hasSeenTransactionSwipeTour'),
        ],
      );

      setOnboardingStatus({
        hasSeenBalanceCardTour: balanceCard === 'true',
        hasSeenAddTransactionTour: addTransaction === 'true',
        hasSeenTransactionSwipeTour: transactionSwipe === 'true',
      });
    } catch (error) {
      console.error('HomeContainer: Error loading onboarding status:', error);
    }
  }, []);

  // ==============================================
  // LIFECYCLE
  // ==============================================

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Check authentication first
        const isAuthenticated = AuthService.isAuthenticated();

        if (!isAuthenticated) {
          navigation.navigate('Auth');
          return;
        }

        // Load all data
        await Promise.all([
          loadUserProfile(),
          loadTransactions(),
          loadCategories(),
          loadGoals(),
          loadOnboardingStatus(),
        ]);
      } catch (error) {
        console.error('HomeContainer: Error in loadInitialData:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [
    loadUserProfile,
    loadTransactions,
    loadCategories,
    loadGoals,
    loadOnboardingStatus,
    navigation,
  ]);

  // Initialize last active date
  useEffect(() => {
    setLastActiveDate(new Date().toDateString());
  }, []);

  // Monitor app state changes for date detection
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        const now = new Date();
        const currentDateString = now.toDateString();

        // Check if date has changed
        if (lastActiveDate !== currentDateString) {
          setLastActiveDate(currentDateString);

          // Update selected date if user was viewing "today"
          if (selectedDate.toDateString() === lastActiveDate) {
            setSelectedDate(new Date());
          }

          // Reload data for new day
          const reloadForNewDay = async () => {
            try {
              setLoading(true);
              await Promise.all([
                loadUserProfile(),
                loadTransactions(),
                loadCategories(),
                loadGoals(),
                loadOnboardingStatus(),
              ]);
            } catch (error) {
              console.error('HomeContainer: Error reloading data:', error);
            } finally {
              setLoading(false);
            }
          };
          reloadForNewDay();
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [
    lastActiveDate,
    selectedDate,
    loadUserProfile,
    loadTransactions,
    loadCategories,
    loadGoals,
    loadOnboardingStatus,
    navigation,
  ]);

  // ==============================================
  // EVENT HANDLERS
  // ==============================================

  const handleSaveTransaction = useCallback(
    async transaction => {
      try {
        const result = await saveTransaction(transaction);
        return result;
      } catch (error) {
        console.error('HomeContainer: Error in handleSaveTransaction:', error);

        Alert.alert(
          'Save Failed',
          'Unable to save transaction. Please try again.',
          [{text: 'OK'}],
        );

        throw error;
      }
    },
    [saveTransaction],
  );

  const handleDeleteTransaction = useCallback(
    async transactionId => {
      try {
        await deleteTransaction(transactionId);
      } catch (error) {
        console.error(
          'HomeContainer: Error in handleDeleteTransaction:',
          error,
        );

        Alert.alert(
          'Delete Failed',
          'Unable to delete transaction. Please try again.',
          [{text: 'OK'}],
        );

        throw error;
      }
    },
    [deleteTransaction],
  );

  const handleEditIncome = useCallback(() => {
    navigation.navigate('IncomeSetup', {editMode: true});
  }, [navigation]);

  const handleGoalsPress = useCallback(() => {
    navigation.navigate('Goals');
  }, [navigation]);

  const handleOnboardingComplete = useCallback(async tourType => {
    try {
      await AsyncStorage.setItem(`hasSeen${tourType}Tour`, 'true');
      setOnboardingStatus(prev => ({
        ...prev,
        [`hasSeen${tourType}Tour`]: true,
      }));
    } catch (error) {
      console.error('HomeContainer: Error saving onboarding status:', error);
    }
  }, []);

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <HomeScreen
      incomeData={incomeData}
      userProfile={userProfile}
      transactions={transactions}
      categories={categories}
      goals={goals}
      editingTransaction={editingTransaction}
      loading={loading}
      selectedDate={selectedDate}
      onboardingStatus={onboardingStatus}
      totalExpenses={calculateTotalExpenses(selectedDate)}
      onDateChange={setSelectedDate}
      onSaveTransaction={handleSaveTransaction}
      onDeleteTransaction={handleDeleteTransaction}
      onEditTransaction={prepareEditTransaction}
      onClearEditingTransaction={clearEditingTransaction}
      onEditIncome={handleEditIncome}
      onGoalsPress={handleGoalsPress}
      onOnboardingComplete={handleOnboardingComplete}
      navigation={navigation}
    />
  );
};

export default HomeContainer;
