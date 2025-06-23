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
    console.log('🔄 Transforming categories:', backendCategories.length);

    if (!Array.isArray(backendCategories)) {
      console.log('🔄 Not an array, returning empty');
      return [];
    }

    const mainCategories = backendCategories.filter(cat => !cat.parentId);
    const subcategories = backendCategories.filter(cat => cat.parentId);

    console.log('🔄 Categories breakdown:', {
      total: backendCategories.length,
      mainCategories: mainCategories.length,
      subcategories: subcategories.length,
    });

    console.log(
      '🔄 Main categories:',
      mainCategories.map(c => ({id: c.id, name: c.name})),
    );
    console.log(
      '🔄 Subcategories:',
      subcategories.map(c => ({id: c.id, name: c.name, parentId: c.parentId})),
    );

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

    console.log(
      '🔄 Final transformed categories:',
      sorted.map(c => ({
        id: c.id,
        name: c.name,
        subcategoriesCount: c.subcategories?.length || 0,
      })),
    );

    return sorted;
  }, []);

  // ==============================================
  // CATEGORY RESOLUTION FOR TRANSACTIONS
  // ==============================================
  const resolveCategoryForTransaction = useCallback(
    (transaction, categories) => {
      console.log('🏷️ HomeContainer: Resolving category for transaction:', {
        description: transaction.description,
        categoryId: transaction.categoryId,
        subcategoryId: transaction.subcategoryId,
        availableCategoriesCount: categories.length,
      });

      const categoryId = transaction.categoryId;
      const subcategoryId = transaction.subcategoryId;

      // Check if backend returned subcategory object directly
      if (
        transaction.subcategory &&
        typeof transaction.subcategory === 'object'
      ) {
        console.log(
          '🏷️ HomeContainer: Using direct subcategory object:',
          transaction.subcategory.name,
        );
        return {
          id: transaction.subcategory.id,
          name: transaction.subcategory.name,
          icon: transaction.subcategory.icon || 'albums-outline',
          color: transaction.subcategory.color || '#4ECDC4',
        };
      }

      // Check if backend returned category object directly
      if (transaction.category && typeof transaction.category === 'object') {
        console.log(
          '🏷️ HomeContainer: Using direct category object:',
          transaction.category.name,
        );
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
          console.log(
            '🏷️ HomeContainer: Looking for subcategory ID:',
            subcategoryId,
          );
          for (const mainCategory of categories) {
            if (
              mainCategory.subcategories &&
              Array.isArray(mainCategory.subcategories)
            ) {
              const subcategory = mainCategory.subcategories.find(
                sub => sub.id === subcategoryId,
              );
              if (subcategory) {
                console.log(
                  '🏷️ HomeContainer: Found subcategory:',
                  subcategory.name,
                );
                return {
                  ...subcategory,
                  color: subcategory.color || mainCategory.color,
                  icon: subcategory.icon || mainCategory.icon,
                };
              }
            }
          }
          console.log(
            '🏷️ HomeContainer: Subcategory not found:',
            subcategoryId,
          );
        }

        // If no subcategory found, look for main category
        if (categoryId) {
          console.log(
            '🏷️ HomeContainer: Looking for main category ID:',
            categoryId,
          );
          const mainCategory = categories.find(cat => cat.id === categoryId);
          if (mainCategory) {
            console.log(
              '🏷️ HomeContainer: Found main category:',
              mainCategory.name,
            );
            return mainCategory;
          }
          console.log('🏷️ HomeContainer: Main category not found:', categoryId);
        }

        // Fallback: look for "other" category in passed categories
        const otherCategory = categories.find(
          cat => cat.name.toLowerCase() === 'other' || cat.id === 'other',
        );
        if (otherCategory) {
          console.log(
            '🏷️ HomeContainer: Using "Other" category from available categories:',
            otherCategory.name,
          );
          return otherCategory;
        }

        // If no "other" category found, use the first available category
        if (categories.length > 0) {
          console.log(
            '🏷️ HomeContainer: Using first available category as fallback:',
            categories[0].name,
          );
          return categories[0];
        }
      }

      // Final fallback: Use default category structure
      console.log('🏷️ HomeContainer: Using hardcoded default "Other" category');
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
      console.log(
        '🔄 HomeContainer: Processing transactions with categories:',
        {
          transactionsCount: transactions.length,
          categoriesCount: categories.length,
        },
      );

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

      console.log(
        '🔄 HomeContainer: Processed transactions sample:',
        processedTransactions.slice(0, 3).map(t => ({
          description: t.description,
          categoryName: t.categoryData?.name,
          categoryId: t.categoryId,
        })),
      );

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

      console.log('📊 Loaded transactions:', sortedTransactions.length);
      console.log(
        '📊 Transaction category IDs:',
        sortedTransactions.map(t => ({
          description: t.description,
          categoryId: t.categoryId,
          subcategoryId: t.subcategoryId,
        })),
      );

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
      console.log('📂 Loading categories...');

      if (!AuthService.isAuthenticated()) {
        console.log('📂 Not authenticated, skipping categories');
        return;
      }

      console.log('📂 Calling TrendAPIService.getCategories()...');
      const response = await TrendAPIService.getCategories();
      console.log('📂 Categories API response:', response);

      const backendCategories = response?.categories || [];
      console.log('📂 Backend categories count:', backendCategories.length);

      const transformedCategories = transformCategoriesForUI(backendCategories);
      console.log(
        '📂 Transformed categories:',
        transformedCategories.length,
        transformedCategories,
      );

      setCategories(transformedCategories);
      console.log('📂 Categories loaded successfully!');
    } catch (error) {
      console.error('📂 Error loading categories:', error);
      console.log('📂 Setting empty categories array');
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

        console.log('💾 Saving transaction:', {
          isEditing,
          description: transaction.description,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          subcategoryId: transaction.subcategoryId,
        });

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
            console.log('💾 Updated transactions (edit):', updated.length);
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
            console.log('💾 Updated transactions (new):', updated.length);
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

        console.log('💾 Sending to backend:', transactionData);

        // Send to backend
        const savedTransaction = isEditing
          ? await TrendAPIService.updateTransaction(
              transaction.id,
              transactionData,
            )
          : await TrendAPIService.createTransaction(transactionData);

        console.log('💾 Backend response:', savedTransaction);

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
          console.log('💾 Final reconciled transactions:', final.length);
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
            console.log(
              '💾 Rollback - transactions after removal:',
              updated.length,
            );
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

      console.log('🗑️ Deleting transaction:', transactionId);

      // Optimistic removal
      setTransactions(prev => {
        deletedTransaction = prev.find(t => t.id === transactionId);
        const updated = prev.filter(t => t.id !== transactionId);
        console.log('🗑️ Transactions after delete:', updated.length);
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
          console.log(
            '🗑️ Rollback - restored transaction, total:',
            updated.length,
          );
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
      console.log('🧮 Calculating total expenses...', {
        transactionsCount: transactions?.length,
        hasIncomeData: !!incomeData,
        nextPayDate: incomeData?.nextPayDate,
        frequency: incomeData?.frequency,
      });

      if (!transactions?.length) {
        console.log('🧮 No transactions, returning 0');
        return 0;
      }

      if (!incomeData?.nextPayDate || !incomeData?.frequency) {
        console.log('🧮 No income data, returning 0');
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
        console.log('🧮 Falling back to current date');
        nextPayDate = new Date();
      }

      // Calculate period start and end based on frequency
      let periodStart;
      let periodEnd;

      try {
        // Always set period end to end of the next pay date
        periodEnd = new Date(nextPayDate);
        periodEnd.setHours(23, 59, 59, 999);

        console.log('🧮 Next pay date:', nextPayDate.toISOString());

        if (incomeData.frequency === 'weekly') {
          periodStart = new Date(nextPayDate);
          periodStart.setDate(periodStart.getDate() - 7);
          console.log('🧮 Weekly period: 7 days back from next pay date');
        } else if (incomeData.frequency === 'fortnightly') {
          periodStart = new Date(nextPayDate);
          periodStart.setDate(periodStart.getDate() - 14);
          console.log('🧮 Fortnightly period: 14 days back from next pay date');
        } else if (incomeData.frequency === 'monthly') {
          periodStart = new Date(nextPayDate);
          periodStart.setMonth(periodStart.getMonth() - 1);
          console.log('🧮 Monthly period: 1 month back from next pay date');
        } else if (incomeData.frequency === 'sixmonths') {
          periodStart = new Date(nextPayDate);
          periodStart.setMonth(periodStart.getMonth() - 6);
          console.log('🧮 Six months period: 6 months back from next pay date');
        } else if (incomeData.frequency === 'yearly') {
          periodStart = new Date(nextPayDate);
          periodStart.setFullYear(periodStart.getFullYear() - 1);
          console.log('🧮 Yearly period: 1 year back from next pay date');
        } else {
          // Default to monthly if frequency is unknown
          periodStart = new Date(nextPayDate);
          periodStart.setMonth(periodStart.getMonth() - 1);
          console.log(
            '🧮 Default to monthly period for unknown frequency:',
            incomeData.frequency,
          );
        }

        // Ensure periodStart is not invalid
        if (isNaN(periodStart.getTime())) {
          throw new Error('Invalid period start date');
        }
      } catch (periodError) {
        console.error('🧮 Error calculating period:', periodError);
        console.log('🧮 Falling back to 30-day period');
        periodStart = new Date(nextPayDate);
        periodStart.setDate(periodStart.getDate() - 30);
        periodEnd = new Date(nextPayDate);
        periodEnd.setHours(23, 59, 59, 999);
      }

      console.log('🧮 Period:', {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        frequency: incomeData.frequency,
        daysDifference: Math.ceil(
          (periodEnd - periodStart) / (1000 * 60 * 60 * 24),
        ),
      });

      // Filter transactions for the period - only count EXPENSE transactions
      const periodTransactions = transactions.filter(transaction => {
        try {
          const transactionDate = new Date(transaction.date);
          if (isNaN(transactionDate.getTime())) {
            console.warn('🧮 Invalid transaction date:', transaction.date);
            return false;
          }

          const inPeriod =
            transactionDate >= periodStart && transactionDate <= periodEnd;
          const isExpense = transaction.type === 'EXPENSE' || !transaction.type;

          console.log('🧮 Transaction check:', {
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            date: transactionDate.toISOString(),
            inPeriod,
            isExpense,
            included: inPeriod && isExpense,
          });

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
          console.log('🧮 Adding to total:', {
            description: transaction.description,
            amount,
            runningTotal: sum + amount,
          });
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

      console.log('🧮 Final calculation:', {
        totalTransactions: transactions.length,
        periodTransactions: periodTransactions.length,
        totalExpenses: total,
      });

      return total;
    } catch (error) {
      console.error('🧮 Critical error in calculateTotalExpenses:', error);
      return 0; // Return 0 instead of crashing
    }
  }, [transactions, incomeData]);

  // Update totalExpenses whenever transactions or incomeData changes
  useEffect(() => {
    const newTotal = calculateTotalExpenses();
    console.log('🧮 Setting new total expenses:', newTotal);
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
          console.log('HomeContainer: Triggering transaction tutorial');
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

  console.log('🏠 HomeContainer render:', {
    transactionsCount: transactions.length,
    transactionsWithCategoriesCount: transactionsWithCategories.length,
    categoriesCount: categories.length,
    totalExpenses,
    incomeData: !!incomeData,
    loading: loading || onboarding.loading,
  });

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
