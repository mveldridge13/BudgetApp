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

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

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
      console.error('HomeContainer: Error loading categories:', error);
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
          subcategoryId: transaction.subcategory,
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

    // Parse next pay date
    let nextPayDate;
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
      console.log('🧮 Invalid pay date, returning 0');
      return 0;
    }

    // Calculate period start
    const frequencyDays = {weekly: 7, fortnightly: 14, monthly: 30};
    const days = frequencyDays[incomeData.frequency] || 30;

    let periodStart;
    let periodEnd;

    if (incomeData.frequency === 'monthly') {
      periodStart = new Date(nextPayDate);
      periodStart.setMonth(periodStart.getMonth() - 1);
      periodEnd = new Date(nextPayDate);
      periodEnd.setHours(23, 59, 59, 999); // Include the entire day
    } else {
      periodStart = new Date(nextPayDate);
      periodStart.setDate(periodStart.getDate() - days);
      periodEnd = new Date(nextPayDate);
      periodEnd.setHours(23, 59, 59, 999); // Include the entire day
    }

    console.log('🧮 Period:', {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      frequency: incomeData.frequency,
    });

    // Filter transactions for the period - only count EXPENSE transactions
    const periodTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const inPeriod =
        transactionDate >= periodStart && transactionDate <= periodEnd; // Changed to <= to include end date
      const isExpense = transaction.type === 'EXPENSE' || !transaction.type; // Default to expense if type not set

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
    });

    // Sum up the expenses for the period
    const total = periodTransactions.reduce((sum, transaction) => {
      const amount = parseFloat(transaction.amount) || 0;
      console.log('🧮 Adding to total:', {
        description: transaction.description,
        amount,
        runningTotal: sum + amount,
      });
      return sum + amount;
    }, 0);

    console.log('🧮 Final calculation:', {
      totalTransactions: transactions.length,
      periodTransactions: periodTransactions.length,
      totalExpenses: total,
    });

    return total;
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
  // CALCULATED VALUES
  // ==============================================
  console.log('🏠 HomeContainer render:', {
    transactionsCount: transactions.length,
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
      transactions={transactions}
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
