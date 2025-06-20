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
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  // Core data state
  const [incomeData, setIncomeData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ✅ NEW: Transaction state management
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // ✅ NEW: Categories state management
  const [categories, setCategories] = useState([]);

  // Date tracking for app state changes
  const [lastActiveDate, setLastActiveDate] = useState(
    new Date().toDateString(),
  );

  // Onboarding state (will migrate to backend later)
  const [onboardingStatus, setOnboardingStatus] = useState({
    hasSeenBalanceCardTour: false,
    hasSeenAddTransactionTour: false,
    hasSeenTransactionSwipeTour: false,
  });

  // ✅ NEW: Goals state (placeholder for now)
  const [goals, setGoals] = useState([]);

  // ==============================================
  // ✅ NEW: CATEGORIES BACKEND INTEGRATION
  // ==============================================

  /**
   * Transform categories from backend to UI format
   * Same transformation logic as AddTransactionContainer
   */
  const transformCategoriesForUI = useCallback(backendCategories => {
    if (!Array.isArray(backendCategories)) {
      console.log(
        '🔍 HomeContainer: backendCategories is not an array:',
        backendCategories,
      );
      return [];
    }

    console.log(
      '🔍 HomeContainer: Raw backend categories:',
      backendCategories.length,
    );

    // Separate main categories and subcategories
    const mainCategories = backendCategories.filter(cat => !cat.parentId);
    const subcategories = backendCategories.filter(cat => cat.parentId);

    console.log(
      '🔍 HomeContainer: Main categories found:',
      mainCategories.length,
    );
    console.log('🔍 HomeContainer: Subcategories found:', subcategories.length);

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

    console.log(
      '🔍 HomeContainer: Final transformed categories:',
      result.length,
    );

    // Sort main categories alphabetically by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  /**
   * Load categories from backend API
   */
  const loadCategories = useCallback(async () => {
    try {
      console.log('HomeContainer: Loading categories from backend...');

      if (!AuthService.isAuthenticated()) {
        console.log('HomeContainer: User not authenticated');
        return;
      }

      const response = await TrendAPIService.getCategories();
      const backendCategories = response?.categories || [];
      const transformedCategories = transformCategoriesForUI(backendCategories);

      console.log(
        'HomeContainer: Loaded categories:',
        transformedCategories.length,
      );
      setCategories(transformedCategories);
    } catch (error) {
      console.error('HomeContainer: Error loading categories:', error);

      // Don't show alert for categories - just log error
      // Categories will fall back to default in TransactionCard
      setCategories([]);
    }
  }, [transformCategoriesForUI]);

  // ==============================================
  // ✅ TRANSACTION BACKEND INTEGRATION (EXISTING)
  // ==============================================

  /**
   * Load transactions from backend API
   */
  const loadTransactions = useCallback(async () => {
    try {
      console.log('HomeContainer: Loading transactions from backend...');

      if (!AuthService.isAuthenticated()) {
        console.log('HomeContainer: User not authenticated');
        return;
      }

      const response = await TrendAPIService.getTransactions();
      const backendTransactions = response?.transactions || [];

      console.log(
        'HomeContainer: Loaded transactions:',
        backendTransactions.length,
      );
      console.log(
        '🔍 DEBUG: First transaction structure:',
        backendTransactions[0],
      );
      setTransactions(backendTransactions);
    } catch (error) {
      console.error('HomeContainer: Error loading transactions:', error);

      // Show user-friendly error
      Alert.alert(
        'Connection Issue',
        'Unable to load transactions. Please check your connection.',
        [{text: 'OK'}],
      );
    }
  }, []);

  /**
   * Save transaction to backend API
   */
  const saveTransaction = useCallback(
    async transaction => {
      try {
        console.log(
          'HomeContainer: Saving transaction to backend...',
          transaction,
        );

        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }

        let savedTransaction;
        const isEditing = transaction.id && transaction.updatedAt;

        // ✅ FIXED: Map frontend field names to backend field names
        const transactionData = {
          type: transaction.type || 'EXPENSE',
          amount: transaction.amount,
          description: transaction.description,
          categoryId: transaction.categoryId || transaction.category, // Support both field names
          subcategoryId: transaction.subcategory, // ✅ FIXED: Map subcategory → subcategoryId
          date: transaction.date.toISOString(),
          recurrence: transaction.recurrence,
        };

        console.log('🔍 DEBUG: Data being sent to backend:', transactionData);

        if (isEditing) {
          // Update existing transaction
          console.log(
            'HomeContainer: Updating existing transaction:',
            transaction.id,
          );
          savedTransaction = await TrendAPIService.updateTransaction(
            transaction.id,
            transactionData,
          );
        } else {
          // Create new transaction
          console.log('HomeContainer: Creating new transaction');
          savedTransaction = await TrendAPIService.createTransaction(
            transactionData,
          );
        }

        console.log(
          'HomeContainer: Transaction saved successfully:',
          savedTransaction,
        );

        // Reload transactions to get fresh data
        await loadTransactions();

        // ✅ CRITICAL FIX: Clear editingTransaction so prepareEditTransaction finds fresh data
        if (isEditing) {
          console.log('🔍 DEBUG: Clearing editingTransaction to force refresh');
          setEditingTransaction(null);
        } else {
          // Clear editing state for new transactions
          setEditingTransaction(null);
        }

        return {
          success: true,
          isNewTransaction: !isEditing,
          transaction: savedTransaction,
        };
      } catch (error) {
        console.error('HomeContainer: Error saving transaction:', error);
        throw error;
      }
    },
    [loadTransactions],
  );

  /**
   * Delete transaction from backend API
   */
  const deleteTransaction = useCallback(
    async transactionId => {
      try {
        console.log('HomeContainer: Deleting transaction:', transactionId);

        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }

        await TrendAPIService.deleteTransaction(transactionId);
        console.log('HomeContainer: Transaction deleted successfully');

        // Reload transactions to update UI
        await loadTransactions();
      } catch (error) {
        console.error('HomeContainer: Error deleting transaction:', error);
        throw error;
      }
    },
    [loadTransactions],
  );

  /**
   * ✅ FIXED: Prepare transaction for editing - now receives transaction ID
   */
  const prepareEditTransaction = useCallback(
    async transactionId => {
      try {
        console.log(
          '🔍 DEBUG: prepareEditTransaction called with ID:',
          transactionId,
        );
        console.log(
          '🔍 DEBUG: Current transactions in state length:',
          transactions.length,
        );

        // ✅ CRITICAL FIX: Find the latest version from transactions state by ID
        const latestTransaction = transactions.find(
          t => t.id === transactionId,
        );
        console.log(
          '🔍 DEBUG: Latest transaction from state:',
          latestTransaction,
        );

        if (!latestTransaction) {
          console.warn('⚠️ Warning: Transaction not found in current state');
          return null;
        }

        // ✅ Use the fresh data from transactions state
        console.log(
          '🔍 DEBUG: Transaction being set for editing (FRESH DATA):',
          latestTransaction,
        );

        console.log(
          'HomeContainer: Preparing transaction for edit:',
          latestTransaction.id,
        );
        setEditingTransaction(latestTransaction);
        return latestTransaction;
      } catch (error) {
        console.error(
          'HomeContainer: Error preparing edit transaction:',
          error,
        );
        throw error;
      }
    },
    [transactions],
  );

  /**
   * Clear editing transaction state
   */
  const clearEditingTransaction = useCallback(() => {
    console.log('HomeContainer: Clearing editing transaction');
    setEditingTransaction(null);
  }, []);

  /**
   * Calculate total expenses for selected date
   */
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
  // ✅ GOALS PLACEHOLDER METHODS (EXISTING)
  // ==============================================

  /**
   * Load goals from backend (placeholder)
   */
  const loadGoals = useCallback(async () => {
    try {
      console.log('HomeContainer: Loading goals (placeholder)...');
      // TODO: Implement when goals backend is ready
      setGoals([]);
    } catch (error) {
      console.error('HomeContainer: Error loading goals:', error);
    }
  }, []);

  /**
   * Update spending goals (placeholder)
   */
  const updateSpendingGoals = useCallback(
    async (newTransaction, deletedTransaction) => {
      try {
        console.log('HomeContainer: Updating spending goals (placeholder)...');
        // TODO: Implement when goals backend is ready
      } catch (error) {
        console.error('HomeContainer: Error updating spending goals:', error);
      }
    },
    [],
  );

  // ==============================================
  // BACKEND INTEGRATION METHODS (EXISTING)
  // ==============================================

  /**
   * Fallback method to load cached income data
   * Provides smooth UX when backend is unavailable
   */
  const loadCachedIncomeData = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem('userSetup');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setIncomeData(parsedData);
        console.log('HomeContainer: Loaded cached income data');
      }
    } catch (error) {
      console.error('HomeContainer: Error loading cached data:', error);
    }
  }, []);

  /**
   * Load user profile data from backend API
   * This replaces the AsyncStorage userSetup loading
   */
  const loadUserProfile = useCallback(async () => {
    try {
      console.log('HomeContainer: Loading user profile from backend...');

      // Check if user is authenticated
      if (!AuthService.isAuthenticated()) {
        console.log('HomeContainer: User not authenticated, redirecting...');
        navigation.navigate('Auth');
        return;
      }

      // Get user profile from backend
      const profile = await TrendAPIService.getUserProfile();
      console.log('HomeContainer: User profile loaded:', profile);

      // 🔍 DEBUG - Check what data we're getting from backend
      console.log('🔍 DEBUG - Backend profile:', profile);
      console.log('🔍 DEBUG - Backend profile.income:', profile.income);
      console.log('🔍 DEBUG - Backend profile keys:', Object.keys(profile));

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
          console.log('Could not load additional data from AsyncStorage');
        }

        const incomeDataForUI = {
          income: profile.income, // ✅ This is what BalanceCard looks for
          monthlyIncome: profile.income, // Keep for backward compatibility
          setupComplete: profile.setupComplete,
          frequency: additionalData.frequency || 'monthly', // Default to monthly
          nextPayDate: additionalData.nextPayDate || new Date().toISOString(), // Default to today
          // Add other fields as needed for backward compatibility
        };
        console.log('🔍 DEBUG - Converted incomeDataForUI:', incomeDataForUI);
        setIncomeData(incomeDataForUI);
      } else {
        console.log('🔍 DEBUG - No income in profile, incomeData will be null');
        setIncomeData(null);
      }
    } catch (error) {
      console.error('HomeContainer: Error loading user profile:', error);

      // If API fails, try to get cached data for smooth UX
      await loadCachedIncomeData();

      // Show user-friendly error
      Alert.alert(
        'Connection Issue',
        'Unable to sync your latest data. Showing cached information.',
        [{text: 'OK'}],
      );
    }
  }, [navigation, loadCachedIncomeData]);

  /**
   * Load onboarding status from AsyncStorage
   * TODO: Migrate this to backend user preferences in next phase
   */
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
  // LIFECYCLE METHODS
  // ==============================================

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log(
          '🔍 HomeContainer: Component mounted, loading initial data',
        );
        setLoading(true);

        // Check authentication first
        const isAuthenticated = AuthService.isAuthenticated();
        console.log('🔍 HomeContainer: isAuthenticated =', isAuthenticated);

        if (!isAuthenticated) {
          console.log(
            '🔍 HomeContainer: Not authenticated, redirecting to auth',
          );
          navigation.navigate('Auth');
          return;
        }

        // ✅ UPDATED: Load all data including categories
        await Promise.all([
          loadUserProfile(),
          loadTransactions(),
          loadCategories(), // ✅ NEW: Load categories
          loadGoals(),
          loadOnboardingStatus(),
        ]);
      } catch (error) {
        console.error('🔍 HomeContainer: Error in loadInitialData:', error);
      } finally {
        console.log('🔍 HomeContainer: Setting loading to false');
        setLoading(false);
      }
    };

    loadInitialData();
  }, [
    loadUserProfile,
    loadTransactions,
    loadCategories, // ✅ NEW: Added to dependencies
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
          console.log('HomeContainer: Date changed, updating data');
          setLastActiveDate(currentDateString);

          // Update selected date if user was viewing "today"
          if (selectedDate.toDateString() === lastActiveDate) {
            setSelectedDate(new Date());
          }

          // ✅ UPDATED: Reload data including categories
          const reloadForNewDay = async () => {
            try {
              setLoading(true);
              await Promise.all([
                loadUserProfile(),
                loadTransactions(),
                loadCategories(), // ✅ NEW: Reload categories
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
    loadCategories, // ✅ NEW: Added to dependencies
    loadGoals,
    loadOnboardingStatus,
    navigation,
  ]);

  // ==============================================
  // BUSINESS LOGIC HANDLERS
  // ==============================================

  /**
   * ✅ UPDATED: Handle transaction save operations
   */
  const handleSaveTransaction = useCallback(
    async transaction => {
      try {
        console.log('HomeContainer: Handling save transaction...', transaction);

        // Call the backend save function
        const result = await saveTransaction(transaction);

        console.log('HomeContainer: Transaction saved successfully');
        return result;
      } catch (error) {
        console.error('HomeContainer: Error in handleSaveTransaction:', error);

        // Show user-friendly error
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

  /**
   * ✅ UPDATED: Handle transaction deletion
   */
  const handleDeleteTransaction = useCallback(
    async transactionId => {
      try {
        console.log(
          'HomeContainer: Handling delete transaction:',
          transactionId,
        );

        // Call the backend delete function
        await deleteTransaction(transactionId);

        console.log('HomeContainer: Transaction deleted successfully');
      } catch (error) {
        console.error(
          'HomeContainer: Error in handleDeleteTransaction:',
          error,
        );

        // Show user-friendly error
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

  /**
   * Handle navigation to income editing
   */
  const handleEditIncome = useCallback(() => {
    navigation.navigate('IncomeSetup', {editMode: true});
  }, [navigation]);

  /**
   * Handle navigation to goals screen
   */
  const handleGoalsPress = useCallback(() => {
    navigation.navigate('Goals');
  }, [navigation]);

  /**
   * Handle onboarding tour completions
   */
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
  // RENDER UI COMPONENT
  // ==============================================

  return (
    <HomeScreen
      // ✅ UPDATED: Real data props
      incomeData={incomeData}
      userProfile={userProfile}
      transactions={transactions}
      categories={categories} // ✅ NEW: Pass categories to HomeScreen
      goals={goals}
      editingTransaction={editingTransaction}
      loading={loading}
      selectedDate={selectedDate}
      onboardingStatus={onboardingStatus}
      // ✅ UPDATED: Calculated data props
      totalExpenses={calculateTotalExpenses(selectedDate)}
      // Event handlers
      onDateChange={setSelectedDate}
      onSaveTransaction={handleSaveTransaction}
      onDeleteTransaction={handleDeleteTransaction}
      onEditTransaction={prepareEditTransaction}
      onClearEditingTransaction={clearEditingTransaction}
      onEditIncome={handleEditIncome}
      onGoalsPress={handleGoalsPress}
      onOnboardingComplete={handleOnboardingComplete}
      // Navigation prop
      navigation={navigation}
    />
  );
};

export default HomeContainer;
