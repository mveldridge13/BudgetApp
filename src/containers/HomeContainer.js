/* eslint-disable no-shadow */
/* eslint-disable react-hooks/exhaustive-deps */
// containers/HomeContainer.js
import React, {useState, useEffect, useCallback} from 'react';
import {AppState, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';
import HomeScreen from '../screens/HomeScreen';
import useOnboarding from '../hooks/useOnboarding';

const HomeContainer = ({navigation}) => {
  // ==============================================
  // STATE
  // ==============================================
  const [incomeData, setIncomeData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lastActiveDate, setLastActiveDate] = useState(
    new Date().toDateString(),
  );
  const [totalExpenses, setTotalExpenses] = useState(0);

  // ==============================================
  // HOOKS
  // ==============================================
  const onboarding = useOnboarding();

  // ==============================================
  // UTILITY FUNCTIONS
  // ==============================================
  const sortTransactionsByDate = txs => {
    return [...txs].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
    );
  };

  const transformCategoriesForUI = useCallback(backendCategories => {

    if (!Array.isArray(backendCategories)) {
      return [];
    }

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

    const result = mainCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon || 'albums-outline',
      color: category.color || '#4ECDC4',
      isCustom: !category.isSystem,
      parentId: category.parentId,
      hasSubcategories: subcategoriesMap[category.id]?.length > 0,
      subcategories: subcategoriesMap[category.id] || [],
    }));

    const sorted = result.sort((a, b) => a.name.localeCompare(b.name));


    return sorted;
  }, []);

  // ==============================================
  // CATEGORY RESOLUTION FOR TRANSACTIONS
  // ==============================================
  const resolveCategoryForTransaction = useCallback(
    (transaction, categories) => {

      const categoryId = transaction.categoryId;
      const subcategoryId = transaction.subcategoryId;

      // Check if backend returned subcategory object directly
      if (
        transaction.subcategory &&
        typeof transaction.subcategory === 'object'
      ) {
        return {
          id: transaction.subcategory.id,
          name: transaction.subcategory.name,
          icon: transaction.subcategory.icon || 'albums-outline',
          color: transaction.subcategory.color || '#4ECDC4',
        };
      }

      // Check if backend returned category object directly
      if (transaction.category && typeof transaction.category === 'object') {
        return {
          id: transaction.category.id,
          name: transaction.category.name,
          icon: transaction.category.icon || 'albums-outline',
          color: transaction.category.color || '#4ECDC4',
        };
      }

      // Use passed categories to look up by ID
      if (categories && categories.length > 0) {
        // If we have a subcategoryId, prioritize finding the subcategory
        if (subcategoryId) {
          for (const mainCategory of categories) {
            if (
              mainCategory.subcategories &&
              Array.isArray(mainCategory.subcategories)
            ) {
              const subcategory = mainCategory.subcategories.find(
                sub => sub.id === subcategoryId,
              );
              if (subcategory) {
                return {
                  ...subcategory,
                  color: subcategory.color || mainCategory.color,
                  icon: subcategory.icon || mainCategory.icon,
                };
              }
            }
          }
        }

        // If no subcategory found, look for main category
        if (categoryId) {
          const mainCategory = categories.find(cat => cat.id === categoryId);
          if (mainCategory) {
            return mainCategory;
          }
        }

        // Fallback: look for "other" category in passed categories
        const otherCategory = categories.find(
          cat => cat.name.toLowerCase() === 'other' || cat.id === 'other',
        );
        if (otherCategory) {
          return otherCategory;
        }

        // If no "other" category found, use the first available category
        if (categories.length > 0) {
          return categories[0];
        }
      }

      // Final fallback: Use default category structure
      return {
        id: 'other',
        name: 'Other',
        icon: 'document-text-outline',
        color: '#95A5A6',
      };
    },
    [],
  );

  // ==============================================
  // ENHANCED TRANSACTION PROCESSING
  // ==============================================
  const processTransactionsWithCategories = useCallback(
    (transactions, categories) => {

      const processedTransactions = transactions.map(transaction => {
        const categoryData = resolveCategoryForTransaction(
          transaction,
          categories,
        );
        return {
          ...transaction,
          categoryData, // Pre-resolved category data for UI
        };
      });


      return processedTransactions;
    },
    [resolveCategoryForTransaction],
  );

  // ==============================================
  // DATA LOADING
  // ==============================================
  const loadUserProfile = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated()) {
        navigation.navigate('Auth');
        return;
      }

      const profile = await TrendAPIService.getUserProfile();
      setUserProfile(profile);

      if (profile.income) {
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
          // Ignore additional data errors
        }

        setIncomeData({
          income: profile.income,
          monthlyIncome: profile.income,
          setupComplete: profile.setupComplete,
          frequency: additionalData.frequency || 'monthly',
          nextPayDate: additionalData.nextPayDate || new Date().toISOString(),
        });
      } else {
        setIncomeData(null);
      }
    } catch (error) {
      console.error('HomeContainer: Error loading user profile:', error);

      try {
        const storedData = await AsyncStorage.getItem('userSetup');
        if (storedData) {
          setIncomeData(JSON.parse(storedData));
        }
      } catch (cacheError) {
        console.error('HomeContainer: Error loading cached data:', cacheError);
      }

      Alert.alert(
        'Connection Issue',
        'Unable to sync your latest data. Showing cached information.',
        [{text: 'OK'}],
      );
    }
  }, [navigation]);

  const loadTransactions = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated()) {
        return;
      }

      const response = await TrendAPIService.getTransactions();
      const backendTransactions = response?.transactions || [];
      const sortedTransactions = sortTransactionsByDate(backendTransactions);


      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('HomeContainer: Error loading transactions:', error);
      Alert.alert(
        'Connection Issue',
        'Unable to load transactions. Please check your connection.',
        [{text: 'OK'}],
      );
    }
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
      console.error('📂 Error loading categories:', error);
      setCategories([]);
    }
  }, [transformCategoriesForUI]);

  const loadGoals = useCallback(async () => {
    try {
      setGoals([]);
    } catch (error) {
      console.error('HomeContainer: Error loading goals:', error);
    }
  }, []);

  // ==============================================
  // TRANSACTION OPERATIONS
  // ==============================================
  const saveTransaction = useCallback(
    async transaction => {
      const isEditing = transaction.id && !transaction.id?.startsWith('temp_');
      let tempId = null;

      try {
        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }


        // Optimistic update
        if (isEditing) {
          setTransactions(prev => {
            const updated = sortTransactionsByDate(
              prev.map(t =>
                t.id === transaction.id
                  ? {...transaction, updatedAt: new Date().toISOString()}
                  : t,
              ),
            );
            return updated;
          });
        } else {
          tempId = `temp_${Date.now()}_${Math.random()}`;
          const optimisticTransaction = {
            ...transaction,
            id: tempId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setTransactions(prev => {
            const updated = sortTransactionsByDate([
              optimisticTransaction,
              ...prev,
            ]);
            return updated;
          });
        }

        // Prepare data for backend
        const transactionData = {
          type: transaction.type || 'EXPENSE',
          amount: transaction.amount,
          description: transaction.description,
          categoryId: transaction.categoryId || transaction.category,
          subcategoryId: transaction.subcategoryId || transaction.subcategory, // ✅ FIXED: Use subcategoryId
          date: transaction.date.toISOString(),
          recurrence: transaction.recurrence,
        };


        // Send to backend
        const savedTransaction = isEditing
          ? await TrendAPIService.updateTransaction(
              transaction.id,
              transactionData,
            )
          : await TrendAPIService.createTransaction(transactionData);


        // Reconcile with server response
        setTransactions(prev => {
          const updated = prev.map(t => {
            if (isEditing && t.id === transaction.id) {
              return savedTransaction;
            }
            if (!isEditing && t.id === tempId) {
              return savedTransaction;
            }
            return t;
          });
          const final = sortTransactionsByDate(updated);
          return final;
        });

        setEditingTransaction(null);

        return {
          success: true,
          isNewTransaction: !isEditing,
          transaction: savedTransaction,
          shouldShowTransactionTutorial:
            onboarding.shouldShowTransactionTutorial(
              !isEditing,
              transactions.length === 0,
            ),
        };
      } catch (error) {
        console.error('HomeContainer: Transaction save failed:', error);

        // Rollback optimistic changes
        if (isEditing) {
          setEditingTransaction(transaction);
          await loadTransactions();
        } else {
          setTransactions(prev => {
            const updated = prev.filter(t => t.id !== tempId);
            return updated;
          });
        }

        throw error;
      }
    },
    [transactions, onboarding, loadTransactions],
  );

  const deleteTransaction = useCallback(async transactionId => {
    let deletedTransaction = null;

    try {
      if (!AuthService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }


      // Optimistic removal
      setTransactions(prev => {
        deletedTransaction = prev.find(t => t.id === transactionId);
        const updated = prev.filter(t => t.id !== transactionId);
        return updated;
      });

      // Delete on server
      await TrendAPIService.deleteTransaction(transactionId);
    } catch (error) {
      console.error('HomeContainer: Transaction delete failed:', error);

      // Rollback
      if (deletedTransaction) {
        setTransactions(prev => {
          const updated = sortTransactionsByDate([deletedTransaction, ...prev]);
          return updated;
        });
      }

      throw error;
    }
  }, []);

  const prepareEditTransaction = useCallback(
    async transactionId => {
      try {
        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }

        // Fetch fresh data from backend
        const freshTransaction = await TrendAPIService.getTransactionById(
          transactionId,
        );

        if (!freshTransaction) {
          console.warn('Transaction not found on server');
          return null;
        }

        // Update local state with fresh data
        setTransactions(prev =>
          sortTransactionsByDate(
            prev.map(t => (t.id === transactionId ? freshTransaction : t)),
          ),
        );

        setEditingTransaction(freshTransaction);
        return freshTransaction;
      } catch (error) {
        console.error(
          'HomeContainer: Error preparing edit transaction:',
          error,
        );

        // Fallback to local state
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

  // ==============================================
  // CALCULATIONS
  // ==============================================
  const calculateTotalExpenses = useCallback(() => {
    try {

      if (!transactions?.length) {
        return 0;
      }

      if (!incomeData?.nextPayDate || !incomeData?.frequency) {
        return 0;
      }

      // Parse next pay date with error handling
      let nextPayDate;
      try {
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
          throw new Error('Invalid date after parsing');
        }
      } catch (dateError) {
        console.error('🧮 Error parsing next pay date:', dateError);
        nextPayDate = new Date();
      }

      // Calculate period start and end based on frequency
      let periodStart;
      let periodEnd;

      try {
        // Always set period end to end of the next pay date
        periodEnd = new Date(nextPayDate);
        periodEnd.setHours(23, 59, 59, 999);


        if (incomeData.frequency === 'weekly') {
          periodStart = new Date(nextPayDate);
          periodStart.setDate(periodStart.getDate() - 7);
        } else if (incomeData.frequency === 'fortnightly') {
          periodStart = new Date(nextPayDate);
          periodStart.setDate(periodStart.getDate() - 14);
        } else if (incomeData.frequency === 'monthly') {
          periodStart = new Date(nextPayDate);
          periodStart.setMonth(periodStart.getMonth() - 1);
        } else if (incomeData.frequency === 'sixmonths') {
          periodStart = new Date(nextPayDate);
          periodStart.setMonth(periodStart.getMonth() - 6);
        } else if (incomeData.frequency === 'yearly') {
          periodStart = new Date(nextPayDate);
          periodStart.setFullYear(periodStart.getFullYear() - 1);
        } else {
          // Default to monthly if frequency is unknown
          periodStart = new Date(nextPayDate);
          periodStart.setMonth(periodStart.getMonth() - 1);
        }

        // Ensure periodStart is not invalid
        if (isNaN(periodStart.getTime())) {
          throw new Error('Invalid period start date');
        }
      } catch (periodError) {
        console.error('🧮 Error calculating period:', periodError);
        periodStart = new Date(nextPayDate);
        periodStart.setDate(periodStart.getDate() - 30);
        periodEnd = new Date(nextPayDate);
        periodEnd.setHours(23, 59, 59, 999);
      }


      // Filter transactions for the period - only count EXPENSE transactions
      const periodTransactions = transactions.filter(transaction => {
        try {
          const transactionDate = new Date(transaction.date);
          if (isNaN(transactionDate.getTime())) {
            return false;
          }

          const inPeriod =
            transactionDate >= periodStart && transactionDate <= periodEnd;
          const isExpense = transaction.type === 'EXPENSE' || !transaction.type;


          return inPeriod && isExpense;
        } catch (error) {
          console.error('🧮 Error checking transaction:', error, transaction);
          return false;
        }
      });

      // Sum up the expenses for the period
      const total = periodTransactions.reduce((sum, transaction) => {
        try {
          const amount = parseFloat(transaction.amount) || 0;
          return sum + amount;
        } catch (error) {
          console.error(
            '🧮 Error adding transaction amount:',
            error,
            transaction,
          );
          return sum;
        }
      }, 0);


      return total;
    } catch (error) {
      console.error('🧮 Critical error in calculateTotalExpenses:', error);
      return 0; // Return 0 instead of crashing
    }
  }, [transactions, incomeData]);

  // Update totalExpenses whenever transactions or incomeData changes
  useEffect(() => {
    const newTotal = calculateTotalExpenses();
    setTotalExpenses(newTotal);
  }, [calculateTotalExpenses]);

  // ==============================================
  // EVENT HANDLERS
  // ==============================================
  const handleSaveTransaction = useCallback(
    async transaction => {
      try {
        const result = await saveTransaction(transaction);

        // Trigger onboarding tutorial if needed
        if (result?.shouldShowTransactionTutorial) {
          onboarding.triggerTransactionTutorial();
        }

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
    [saveTransaction, onboarding],
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

  const handleEditTransaction = useCallback(
    async transactionId => {
      try {
        // Hide any active onboarding when user starts editing
        onboarding.hideActiveSpotlights();

        return await prepareEditTransaction(transactionId);
      } catch (error) {
        console.error('HomeContainer: Error in handleEditTransaction:', error);
        throw error;
      }
    },
    [prepareEditTransaction, onboarding],
  );

  const handleOnboardingComplete = useCallback(
    async tourType => {
      await onboarding.completeTour(tourType);
    },
    [onboarding],
  );

  const handleOnboardingSkip = useCallback(
    async tourType => {
      await onboarding.skipTour(tourType);
    },
    [onboarding],
  );

  const handleEditIncome = useCallback(() => {
    navigation.navigate('IncomeSetup', {editMode: true});
  }, [navigation]);

  const handleGoalsPress = useCallback(() => {
    navigation.navigate('Goals');
  }, [navigation]);

  // ==============================================
  // CALCULATED VALUES WITH CATEGORY RESOLUTION
  // ==============================================
  const transactionsWithCategories = processTransactionsWithCategories(
    transactions,
    categories,
  );


  // ==============================================
  // LIFECYCLE
  // ==============================================

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        if (!AuthService.isAuthenticated()) {
          navigation.navigate('Auth');
          return;
        }

        await Promise.all([
          loadUserProfile(),
          loadTransactions(),
          loadCategories(),
          loadGoals(),
        ]);
      } catch (error) {
        console.error('HomeContainer: Error in loadInitialData:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Trigger onboarding checks when data changes
  useEffect(() => {
    if (!onboarding.loading && onboarding.onboardingStatus) {
      onboarding.checkAndShowOnboarding(incomeData, transactions);
    }
  }, [incomeData, transactions, onboarding]);

  // App state monitoring for date changes
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        const currentDateString = new Date().toDateString();

        if (lastActiveDate !== currentDateString) {
          setLastActiveDate(currentDateString);

          // Update selected date if viewing "today"
          if (selectedDate.toDateString() === lastActiveDate) {
            setSelectedDate(new Date());
          }

          // Reload data for new day
          const reloadForNewDay = async () => {
            try {
              setLoading(true);

              if (AuthService.isAuthenticated()) {
                await Promise.all([
                  TrendAPIService.getUserProfile()
                    .then(setUserProfile)
                    .catch(console.error),
                  TrendAPIService.getTransactions()
                    .then(response => {
                      const backendTransactions = response?.transactions || [];
                      setTransactions(
                        sortTransactionsByDate(backendTransactions),
                      );
                    })
                    .catch(console.error),
                  TrendAPIService.getCategories()
                    .then(response => {
                      const backendCategories = response?.categories || [];
                      setCategories(
                        transformCategoriesForUI(backendCategories),
                      );
                    })
                    .catch(console.error),
                ]);
              }
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
    return () => subscription?.remove?.();
  }, [lastActiveDate, selectedDate, transformCategoriesForUI]);

  // ==============================================
  // RENDER
  // ==============================================
  return (
    <HomeScreen
      incomeData={incomeData}
      userProfile={userProfile}
      transactions={transactionsWithCategories} // ✅ PASS PRE-RESOLVED TRANSACTIONS
      categories={categories}
      goals={goals}
      editingTransaction={editingTransaction}
      loading={loading || onboarding.loading}
      selectedDate={selectedDate}
      totalExpenses={totalExpenses}
      onDateChange={setSelectedDate}
      onSaveTransaction={handleSaveTransaction}
      onDeleteTransaction={handleDeleteTransaction}
      onEditTransaction={handleEditTransaction}
      onClearEditingTransaction={() => setEditingTransaction(null)}
      onEditIncome={handleEditIncome}
      onGoalsPress={handleGoalsPress}
      onOnboardingComplete={handleOnboardingComplete}
      onOnboardingSkip={handleOnboardingSkip}
      navigation={navigation}
      onboarding={onboarding}
    />
  );
};

export default HomeContainer;
