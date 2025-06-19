/* eslint-disable no-unused-vars */
// containers/HomeContainer.js
import React, {useState, useEffect, useCallback} from 'react';
import {AppState, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';
import HomeScreen from '../screens/HomeScreen';
// TEMPORARILY DISABLED - NOT CONNECTED TO BACKEND YET
// import useTransactions from '../hooks/useTransactions';
// import useGoals from '../hooks/useGoals';

const HomeContainer = ({navigation}) => {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  // Core data state
  const [incomeData, setIncomeData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Custom hooks for transaction and goals management
  // TEMPORARILY DISABLED - NOT CONNECTED TO BACKEND YET
  // const {
  //   transactions,
  //   editingTransaction,
  //   loadTransactions,
  //   saveTransaction,
  //   deleteTransaction,
  //   prepareEditTransaction,
  //   clearEditingTransaction,
  //   calculateTotalExpenses,
  // } = useTransactions();

  // const {
  //   goals,
  //   loadGoals,
  //   updateSpendingGoals,
  // } = useGoals();

  // TEMPORARY DUMMY DATA - Until we connect transactions to backend
  // const transactions = [];
  // const goals = [];
  // const editingTransaction = null;
  const loadTransactions = useCallback(async () => {}, []);
  const saveTransaction = useCallback(async () => {
    // Return expected structure for compatibility
    return {
      success: true,
      isNewTransaction: true,
      updatedTransactions: [],
    };
  }, []);
  const deleteTransaction = useCallback(async () => {}, []);
  const prepareEditTransaction = useCallback(async () => {}, []);
  const clearEditingTransaction = useCallback(() => {}, []);
  const calculateTotalExpenses = useCallback(() => 0, []);
  const loadGoals = useCallback(async () => {}, []);
  const updateSpendingGoals = useCallback(async () => {}, []);

  // Simple constants (not variables that change)
  const transactions = [];
  const goals = [];
  const editingTransaction = null;

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

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

  // Initial data loading - inline the loading logic to avoid dependency issues
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

        // Load all data in parallel for better performance
        await Promise.all([
          loadUserProfile(),
          // TEMPORARILY DISABLED - NOT CONNECTED TO BACKEND YET
          // loadTransactions(),
          // loadGoals(),
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
  }, [loadUserProfile, loadOnboardingStatus, navigation]); // Added navigation dependency

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

          // Reload data for new day - inline to avoid dependency issues
          const reloadForNewDay = async () => {
            try {
              setLoading(true);
              await Promise.all([
                loadUserProfile(),
                // TEMPORARILY DISABLED - NOT CONNECTED TO BACKEND YET
                // loadTransactions(),
                // loadGoals(),
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
    loadOnboardingStatus,
    navigation,
  ]); // Added navigation dependency

  // ==============================================
  // BUSINESS LOGIC HANDLERS
  // ==============================================

  /**
   * Handle transaction save operations
   * Updated for new AddTransactionContainer integration
   */
  const handleSaveTransaction = useCallback(async transaction => {
    try {
      console.log('HomeContainer: Saving transaction...', transaction);

      // Since transaction system is temporarily disabled,
      // just log the transaction for now
      console.log('HomeContainer: Transaction would be saved:', transaction);

      // TODO: Connect to backend transaction API when ready
      // For now, return success to allow modal to close
      return {
        success: true,
        isNewTransaction: !transaction.updatedAt,
        transaction: transaction,
        updatedTransactions: [transaction], // Add this to prevent undefined error
      };
    } catch (error) {
      console.error('HomeContainer: Error saving transaction:', error);
      throw error;
    }
  }, []);

  /**
   * Handle transaction deletion
   * Properly coordinates with goals system
   */
  const handleDeleteTransaction = useCallback(
    async transactionId => {
      try {
        console.log('HomeContainer: Deleting transaction:', transactionId);

        // Get current transaction data before deletion
        const storedTransactions = await AsyncStorage.getItem('transactions');
        if (storedTransactions) {
          const currentTransactionList = JSON.parse(storedTransactions);
          const transactionToDelete = currentTransactionList.find(
            t => t.id === transactionId,
          );

          if (transactionToDelete) {
            // Delete transaction
            await deleteTransaction(transactionId);

            // Update goals to remove transaction impact
            await updateSpendingGoals(null, transactionToDelete);
          }
        }
      } catch (error) {
        console.error('HomeContainer: Error deleting transaction:', error);
        throw error;
      }
    },
    [deleteTransaction, updateSpendingGoals],
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
      // Data props
      incomeData={incomeData}
      userProfile={userProfile}
      transactions={transactions}
      goals={goals}
      editingTransaction={editingTransaction}
      loading={loading}
      selectedDate={selectedDate}
      onboardingStatus={onboardingStatus}
      // Calculated data props
      totalExpenses={calculateTotalExpenses(selectedDate, incomeData)}
      // 🔍 FINAL DEBUG - What props are we passing to HomeScreen?
      // Note: Remove these logs after debugging
      {...(() => {
        console.log('🔍 HomeContainer: Passing props to HomeScreen:', {
          incomeData,
          userProfile,
          loading,
          hasIncomeData: !!incomeData,
          incomeAmount: incomeData?.monthlyIncome,
        });
        return {};
      })()}
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
