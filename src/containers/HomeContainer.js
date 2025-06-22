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

  // Onboarding state - start as null to prevent premature triggering
  const [onboardingStatus, setOnboardingStatus] = useState(null);

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

  const sortTransactions = useCallback(
    txs => txs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [],
  );

  const loadTransactions = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated()) {
        return;
      }

      const response = await TrendAPIService.getTransactions();
      const backendTransactions = response?.transactions || [];
      const sortedTransactions = sortTransactions(backendTransactions);

      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('HomeContainer: Error loading transactions:', error);

      Alert.alert(
        'Connection Issue',
        'Unable to load transactions. Please check your connection.',
        [{text: 'OK'}],
      );
    }
  }, [sortTransactions]);

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
          setTransactions(prevTransactions =>
            sortTransactions([optimisticTransaction, ...prevTransactions]),
          );
        }

        // Clear editing state only after successful operation
        // setEditingTransaction(null); // Move this after successful backend operation

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
            sortTransactions(
              prevTransactions.map(t =>
                t.id &&
                t.id.startsWith('temp_') &&
                t.description === transaction.description &&
                t.amount === transaction.amount
                  ? savedTransaction
                  : t,
              ),
            ),
          );
        }

        // Clear editing state only after successful backend operation
        setEditingTransaction(null);

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

        // Restore editing state if it was an edit (keep existing editing state)
        if (transaction.id && transaction.updatedAt) {
          setEditingTransaction(transaction);
        } else {
          // For new transactions, don't clear editing state on error
          // Let the user retry the save operation
        }

        throw error;
      }
    },
    [transactions, sortTransactions],
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
          sortTransactions(
            prevTransactions.map(t =>
              t.id === transactionId ? freshTransaction : t,
            ),
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
    [transactions, sortTransactions],
  );

  const clearEditingTransaction = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  const calculateTotalExpenses = useCallback(
    date => {
      if (!transactions || transactions.length === 0) {
        return 0;
      }

      // Calculate pay period dates
      if (!incomeData?.nextPayDate || !incomeData?.frequency) {
        return 0;
      }

      let nextPayDate;

      // Handle both ISO string format and DD/MM/YYYY format
      if (incomeData.nextPayDate.includes('T')) {
        nextPayDate = new Date(incomeData.nextPayDate);
      } else {
        const [dayStr, monthStr, yearStr] = incomeData.nextPayDate.split('/');
        nextPayDate = new Date(
          2000 + parseInt(yearStr, 10),
          parseInt(monthStr, 10) - 1,
          parseInt(dayStr, 10),
        );
      }

      if (isNaN(nextPayDate.getTime())) {
        return 0;
      }

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

      // Filter transactions for the entire pay period
      const periodTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= periodStart && transactionDate < nextPayDate;
      });

      // Sum up the expenses for the entire period
      return periodTransactions.reduce((total, transaction) => {
        return total + (transaction.amount || 0);
      }, 0);
    },
    [transactions, incomeData],
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
  // ONBOARDING INTEGRATION
  // ==============================================

  const loadOnboardingStatus = useCallback(async () => {
    try {
      console.log('HomeContainer: Loading onboarding status...');
      if (!AuthService.isAuthenticated()) {
        // If not authenticated, load from local storage only
        const [balanceCard, addTransaction, transactionSwipe] =
          await Promise.all([
            AsyncStorage.getItem('hasSeenBalanceCardTour'),
            AsyncStorage.getItem('hasSeenAddTransactionTour'),
            AsyncStorage.getItem('hasSeenTransactionSwipeTour'),
          ]);

        const localStatus = {
          hasSeenBalanceCardTour: balanceCard === 'true',
          hasSeenAddTransactionTour: addTransaction === 'true',
          hasSeenTransactionSwipeTour: transactionSwipe === 'true',
        };
        console.log(
          'HomeContainer: Loaded local onboarding status:',
          localStatus,
        );
        setOnboardingStatus(localStatus);
        return;
      }

      // Try to get onboarding status from backend first
      try {
        const serverStatus = await TrendAPIService.getOnboardingStatus();

        // Update local storage to match server
        await Promise.all([
          AsyncStorage.setItem(
            'hasSeenBalanceCardTour',
            String(serverStatus.hasSeenBalanceCardTour),
          ),
          AsyncStorage.setItem(
            'hasSeenAddTransactionTour',
            String(serverStatus.hasSeenAddTransactionTour),
          ),
          AsyncStorage.setItem(
            'hasSeenTransactionSwipeTour',
            String(serverStatus.hasSeenTransactionSwipeTour),
          ),
        ]);

        console.log(
          'HomeContainer: Loaded server onboarding status:',
          serverStatus,
        );
        setOnboardingStatus(serverStatus);
      } catch (serverError) {
        console.warn(
          'Failed to load onboarding status from server, using local storage:',
          serverError,
        );

        // Fallback to local storage
        const [balanceCard, addTransaction, transactionSwipe] =
          await Promise.all([
            AsyncStorage.getItem('hasSeenBalanceCardTour'),
            AsyncStorage.getItem('hasSeenAddTransactionTour'),
            AsyncStorage.getItem('hasSeenTransactionSwipeTour'),
          ]);

        const localStatus = {
          hasSeenBalanceCardTour: balanceCard === 'true',
          hasSeenAddTransactionTour: addTransaction === 'true',
          hasSeenTransactionSwipeTour: transactionSwipe === 'true',
        };

        setOnboardingStatus(localStatus);

        // Try to sync local status to server in background
        try {
          await TrendAPIService.updateOnboardingStatus(localStatus);
        } catch (syncError) {
          console.warn(
            'Failed to sync local onboarding status to server:',
            syncError,
          );
        }
      }
    } catch (error) {
      console.error('HomeContainer: Error loading onboarding status:', error);

      // Set default values on complete failure
      setOnboardingStatus({
        hasSeenBalanceCardTour: false,
        hasSeenAddTransactionTour: false,
        hasSeenTransactionSwipeTour: false,
      });
    }
  }, []);

  const handleOnboardingComplete = useCallback(async tourType => {
    try {
      const tourKey = `hasSeen${tourType}Tour`;

      // Update local state immediately (optimistic update)
      setOnboardingStatus(prev => ({
        hasSeenBalanceCardTour: false,
        hasSeenAddTransactionTour: false,
        hasSeenTransactionSwipeTour: false,
        ...prev,
        [tourKey]: true,
      }));

      // Update local storage
      await AsyncStorage.setItem(tourKey, 'true');

      // Update server if authenticated
      if (AuthService.isAuthenticated()) {
        try {
          // Mark specific tour complete on server
          await TrendAPIService.markOnboardingTourComplete(tourType);
        } catch (serverError) {
          console.warn(
            `Failed to sync ${tourType} completion to server:`,
            serverError,
          );
          // Local update already completed, so we can continue
          // The next app load will attempt to sync again
        }
      }
    } catch (error) {
      console.error('HomeContainer: Error saving onboarding status:', error);

      // Revert optimistic update on failure
      setOnboardingStatus(prev => ({
        hasSeenBalanceCardTour: false,
        hasSeenAddTransactionTour: false,
        hasSeenTransactionSwipeTour: false,
        ...prev,
        [`hasSeen${tourType}Tour`]: false,
      }));

      // Try to revert local storage too
      try {
        await AsyncStorage.setItem(`hasSeen${tourType}Tour`, 'false');
      } catch (storageError) {
        console.error('Failed to revert local storage:', storageError);
      }
    }
  }, []);

  // Optional: Add a method to sync onboarding status manually
  const syncOnboardingStatus = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated()) {
        return;
      }

      const currentStatus = onboardingStatus;
      await TrendAPIService.updateOnboardingStatus(currentStatus);
      console.log('Onboarding status synced successfully');
    } catch (error) {
      console.error('Failed to sync onboarding status:', error);
    }
  }, [onboardingStatus]);

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
