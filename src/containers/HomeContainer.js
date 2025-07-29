/* eslint-disable no-shadow */
/* eslint-disable react-hooks/exhaustive-deps */
// containers/HomeContainer.js
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  startTransition,
} from 'react';
import {AppState, Alert, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useFocusEffect} from '@react-navigation/native'; // Removed to eliminate reload delay
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';
import HomeScreen from '../screens/HomeScreen';
import useOnboarding from '../hooks/useOnboarding';
import useGoals from '../hooks/useGoals';

const HomeContainer = ({navigation}) => {
  // ==============================================
  // STATE
  // ==============================================
  const [incomeData, setIncomeData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lastActiveDate, setLastActiveDate] = useState(
    new Date().toDateString(),
  );
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currency, setCurrency] = useState('AUD');
  const [backgroundSyncCount, setBackgroundSyncCount] = useState(0);
  const [userActiveOperations, setUserActiveOperations] = useState(0);

  // ==============================================
  // HOOKS
  // ==============================================
  const onboarding = useOnboarding();
  const {goals, loadGoals: loadGoalsFromHook, updateSpendingGoals} = useGoals();

  // Debug: Log goals state changes
  useEffect(() => {
    console.log('🏠 HomeContainer: Goals state changed:', {
      goalsCount: goals.length,
      balanceCardGoals: goals
        .filter(g => g.showOnBalanceCard)
        .map(g => ({
          id: g.id,
          title: g.title,
          showOnBalanceCard: g.showOnBalanceCard,
        })),
    });
  }, [goals]);

  // ==============================================
  // UTILITY FUNCTIONS
  // ==============================================
  const sortTransactionsByDate = txs => {
    return [...txs].sort((a, b) => {
      const aHasDueDate = a.dueDate;
      const bHasDueDate = b.dueDate;

      // Both have due dates - sort by due date ascending (soonest first)
      if (aHasDueDate && bHasDueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      // Only a has due date - a comes first
      if (aHasDueDate && !bHasDueDate) {
        return -1;
      }

      // Only b has due date - b comes first
      if (!aHasDueDate && bHasDueDate) {
        return 1;
      }

      // Neither has due date - sort by transaction date descending (newest first)
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
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

  // Reload goals when screen comes into focus (e.g., returning from GoalsScreen)
  // Only loads from cache now - no API calls to prevent race conditions
  const loadGoalsRef = useRef();

  useEffect(() => {
    loadGoalsRef.current = loadGoals;
  });
  // Remove focus effect reload - goals state should persist across navigation
  // useFocusEffect(
  //   useCallback(() => {
  //     if (loadGoalsRef.current) {
  //       console.log('🏠 HomeContainer: Reloading goals from cache on focus');
  //       loadGoalsRef.current();
  //     }
  //   }, []),
  // );

  // ==============================================
  // MEMOIZED CATEGORY MAP (PREVENTS FLICKER)
  // ==============================================
  const categoryMap = useMemo(() => {
    return categories.reduce((map, category) => {
      map[category.id] = category;
      if (category.subcategories) {
        category.subcategories.forEach(sub => {
          map[sub.id] = sub;
        });
      }
      return map;
    }, {});
  }, [categories]);

  // ==============================================
  // CATEGORY RESOLUTION FOR TRANSACTIONS
  // ==============================================
  const resolveCategoryForTransaction = useCallback(
    (transaction, categoryMap) => {
      const categoryId = transaction.categoryId;
      const subcategoryId = transaction.subcategoryId;

      // CONSISTENT LOGIC: Always return MAIN CATEGORY for metadata display
      // If we have a subcategoryId, find its parent category
      if (subcategoryId && Object.keys(categoryMap).length > 0) {
        const subcategory = categoryMap[subcategoryId];
        if (subcategory && subcategory.parentId) {
          const parentCategory = categoryMap[subcategory.parentId];
          if (parentCategory) {
            return {
              id: parentCategory.id,
              name: parentCategory.name,
              icon: parentCategory.icon || 'albums-outline',
              color: parentCategory.color || '#4ECDC4',
            };
          }
        }
      }

      // If we have a categoryId, use the main category
      if (categoryId && Object.keys(categoryMap).length > 0) {
        const mainCategory = categoryMap[categoryId];
        if (mainCategory) {
          return {
            id: mainCategory.id,
            name: mainCategory.name,
            icon: mainCategory.icon || 'albums-outline',
            color: mainCategory.color || '#4ECDC4',
          };
        }
      }

      // Fallback: look for "other" category in categoryMap
      if (Object.keys(categoryMap).length > 0) {
        const otherCategory = Object.values(categoryMap).find(
          cat => cat.name.toLowerCase() === 'other' || cat.id === 'other',
        );
        if (otherCategory) {
          return otherCategory;
        }

        // If no "other" category found, use the first available category
        const firstCategory = Object.values(categoryMap)[0];
        if (firstCategory) {
          return firstCategory;
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
    [categoryMap],
  );

  // ==============================================
  // ENHANCED TRANSACTION PROCESSING
  // ==============================================
  const processTransactionsWithCategories = useCallback(
    transactions => {
      const processedTransactions = transactions.map(transaction => {
        const categoryData = resolveCategoryForTransaction(
          transaction,
          categoryMap,
        );
        return {
          ...transaction,
          categoryData, // Pre-resolved category data for UI
        };
      });

      return processedTransactions;
    },
    [resolveCategoryForTransaction, categoryMap],
  );

  // ==============================================
  // DATA LOADING - ✅ PURE BACKEND VERSION
  // ==============================================
  const loadUserProfile = useCallback(async () => {
    try {
      console.log('👤 loadUserProfile START - Platform:', Platform.OS);

      if (!AuthService.isAuthenticated()) {
        navigation.navigate('Auth');
        return;
      }

      const profile = await TrendAPIService.getUserProfile();
      console.log('👤 Profile received from backend:', {
        platform: Platform.OS,
        userId: profile?.id,
        income: profile?.income,
        incomeFrequency: profile?.incomeFrequency,
        nextPayDate: profile?.nextPayDate,
        setupComplete: profile?.setupComplete,
      });

      setUserProfile(profile);

      // ✅ NEW: Use PURE backend data - no AsyncStorage
      if (profile.income && profile.incomeFrequency && profile.nextPayDate) {
        const finalIncomeData = {
          income: profile.income,
          monthlyIncome: profile.income,
          setupComplete: profile.setupComplete,
          frequency: profile.incomeFrequency, // ✅ From backend
          nextPayDate: profile.nextPayDate, // ✅ From backend
        };

        console.log('👤 Final income data (pure backend):', {
          platform: Platform.OS,
          income: finalIncomeData.income,
          frequency: finalIncomeData.frequency,
          nextPayDate: finalIncomeData.nextPayDate,
        });

        setIncomeData(finalIncomeData);
      } else {
        console.log('👤 Incomplete profile data - missing pay schedule:', {
          hasIncome: !!profile.income,
          hasFrequency: !!profile.incomeFrequency,
          hasNextPayDate: !!profile.nextPayDate,
        });
        setIncomeData(null);
      }
    } catch (error) {
      console.error('HomeContainer: Error loading user profile:', error);

      Alert.alert(
        'Connection Issue',
        'Unable to load your profile data. Please check your connection.',
        [{text: 'OK'}],
      );
    }
  }, [navigation]);

  // Load currency setting from app settings
  const loadCurrencySetting = useCallback(async () => {
    try {
      const appSettings = await AsyncStorage.getItem('appSettings');
      if (appSettings) {
        const settings = JSON.parse(appSettings);
        setCurrency(settings.currency || 'AUD');
      } else {
        setCurrency('AUD'); // Default
      }
    } catch (error) {
      console.error('Error loading currency setting:', error);
      setCurrency('AUD'); // Fallback
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      console.log('💳 loadTransactions START - Platform:', Platform.OS);

      if (!AuthService.isAuthenticated()) {
        return;
      }

      // 🎯 PREVENT HYDRATION CONFLICTS: Skip if user is actively making changes
      if (userActiveOperations > 0) {
        console.log(
          '💳 Skipping transaction reload - user is actively editing',
        );
        return;
      }

      const response = await TrendAPIService.getTransactions({
        limit: 1000, // Get all transactions for accurate balance calculations
      });
      const backendTransactions = response?.transactions || [];
      const sortedTransactions = sortTransactionsByDate(backendTransactions);

      console.log('💳 Transactions loaded:', {
        platform: Platform.OS,
        count: sortedTransactions.length,
        sampleTransactions: sortedTransactions.slice(0, 3).map(t => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          date: t.date,
          description: t.description,
        })),
      });

      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('HomeContainer: Error loading transactions:', error);
      Alert.alert(
        'Connection Issue',
        'Unable to load transactions. Please check your connection.',
        [{text: 'OK'}],
      );
    }
  }, [userActiveOperations]);

  const loadCategories = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated()) {
        return;
      }

      // 🎯 PREVENT HYDRATION CONFLICTS: Skip if user is actively making changes
      if (userActiveOperations > 0) {
        console.log('📂 Skipping category reload - user is actively editing');
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
  }, [transformCategoriesForUI, userActiveOperations]);

  const loadGoals = useCallback(async () => {
    try {
      await loadGoalsFromHook();
    } catch (error) {
      console.error('HomeContainer: Error loading goals:', error);
    }
  }, [loadGoalsFromHook]);

  // ==============================================
  // TRANSACTION OPERATIONS
  // ==============================================
  const saveTransaction = useCallback(
    async transaction => {
      const isEditing = transaction.id && !transaction.id?.startsWith('temp_');
      let tempId = null;
      let optimisticTransaction = null;

      try {
        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }

        // 🎯 TRACK USER ACTIVITY: Prevent API hydration overwrites
        setUserActiveOperations(prev => prev + 1);

        // 🎯 CACHE-FIRST: Immediate optimistic update
        if (isEditing) {
          optimisticTransaction = {
            ...transaction,
            updatedAt: new Date().toISOString(),
          };

          setTransactions(prev => {
            const updated = sortTransactionsByDate(
              prev.map(t =>
                t.id === transaction.id ? optimisticTransaction : t,
              ),
            );
            return updated;
          });
        } else {
          tempId = `temp_${Date.now()}_${Math.random()}`;
          optimisticTransaction = {
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

        setEditingTransaction(null);

        // 🎯 NON-BLOCKING: Update spending goals in a transition to avoid blocking transaction UI
        startTransition(() => {
          (async () => {
            try {
              console.log(
                '🔍 TRANSACTION: Updating spending goals with optimistic data',
              );

              if (isEditing) {
                const originalTransaction = transactions.find(
                  t => t.id === transaction.id,
                );
                await updateSpendingGoals(
                  optimisticTransaction,
                  originalTransaction,
                );
              } else {
                await updateSpendingGoals(optimisticTransaction, null);
              }
            } catch (goalError) {
              console.error(
                '🔍 TRANSACTION: Failed to update spending goals:',
                goalError,
              );
              // Don't fail the transaction save if goal update fails
            }
          })();
        });

        // 🎯 SERVER SYNC: Different approach for create vs edit
        const transactionData = {
          type: transaction.type || 'EXPENSE',
          amount: transaction.amount,
          description: transaction.description,
          categoryId: transaction.categoryId || transaction.category,
          subcategoryId: transaction.subcategoryId || transaction.subcategory,
          date: transaction.date.toISOString(),
          recurrence: transaction.recurrence,
          dueDate: transaction.dueDate
            ? transaction.dueDate.toISOString()
            : null,
          status: transaction.status,
        };

        if (isEditing) {
          // 🎯 EDITS: Background sync (cache-first)
          setTimeout(async () => {
            try {
              setBackgroundSyncCount(prev => prev + 1);
              console.log('🔍 TRANSACTION: Background sync for edit');
              const savedTransaction = await TrendAPIService.updateTransaction(
                transaction.id,
                transactionData,
              );

              // Only update UI if server data differs
              setTransactions(prev => {
                const current = prev.find(t => t.id === transaction.id);
                if (
                  !current ||
                  current.amount !== savedTransaction.amount ||
                  current.description !== savedTransaction.description ||
                  current.categoryId !== savedTransaction.categoryId
                ) {
                  console.log(
                    '🔍 TRANSACTION: Server data differs, updating UI',
                  );
                  return sortTransactionsByDate(
                    prev.map(t =>
                      t.id === transaction.id ? savedTransaction : t,
                    ),
                  );
                }
                return prev;
              });
            } catch (syncError) {
              console.error(
                '🔍 TRANSACTION: Background sync failed:',
                syncError,
              );
            } finally {
              setBackgroundSyncCount(prev => Math.max(0, prev - 1));
            }
          }, 0);
        } else {
          // 🎯 CREATION: Synchronous (like before - no flicker)
          try {
            console.log('🔍 TRANSACTION: Synchronous creation');
            const savedTransaction = await TrendAPIService.createTransaction(
              transactionData,
            );

            // Replace temp transaction with real server response
            setTransactions(prev => {
              const updated = prev.map(t =>
                t.id === tempId ? savedTransaction : t,
              );
              return sortTransactionsByDate(updated);
            });

            optimisticTransaction = savedTransaction; // Update for return value
          } catch (createError) {
            console.error('🔍 TRANSACTION: Creation failed:', createError);
            throw createError; // Let the catch block handle rollback
          }
        }

        // 🎯 BACKGROUND SYNC: Reload categories without blocking transaction UI
        setTimeout(async () => {
          try {
            console.log('🔍 TRANSACTION: Background category reload');
            await loadCategories();
          } catch (categoryError) {
            console.error(
              'Failed to reload categories after transaction save:',
              categoryError,
            );
            // Don't fail the transaction save if category reload fails
          }
        }, 100); // Small delay to ensure transaction UI has updated

        return {
          success: true,
          isNewTransaction: !isEditing,
          transaction: optimisticTransaction,
          shouldShowTransactionTutorial: false, // Disable transaction tutorial triggering on save
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
      } finally {
        // 🎯 CLEANUP: Always decrement user activity counter
        setTimeout(() => {
          setUserActiveOperations(prev => Math.max(0, prev - 1));
        }, 1000); // Keep lock for 1 second after transaction completes
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

      // Update spending goals to remove the deleted transaction's impact
      if (deletedTransaction) {
        try {
          console.log(
            '🔍 DELETE_TRANSACTION: Updating spending goals for deleted transaction:',
            {
              id: deletedTransaction.id,
              category: deletedTransaction.categoryId,
              amount: deletedTransaction.amount,
            },
          );

          // Pass null as newTransaction and the deleted transaction as originalTransaction
          await updateSpendingGoals(null, deletedTransaction);

          console.log(
            '🔍 DELETE_TRANSACTION: Spending goals updated successfully',
          );
        } catch (goalError) {
          console.warn(
            '🔍 DELETE_TRANSACTION: Failed to update spending goals:',
            goalError,
          );
          // Don't fail the entire transaction delete if goal update fails
        }
      }
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

        // Always fetch fresh data from backend to ensure latest status

        const freshTransaction = await TrendAPIService.getTransactionById(
          transactionId,
        );

        if (!freshTransaction) {
          console.warn('Transaction not found on server');
          return null;
        }

        // Update local state and set for editing
        setTransactions(prev =>
          sortTransactionsByDate([
            freshTransaction,
            ...prev.filter(t => t.id !== transactionId),
          ]),
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
  // CALCULATIONS - WITH DEBUG LOGGING
  // ==============================================
  const calculateTotalExpenses = useCallback(() => {
    try {
      // Reduced logging to prevent console spam
      // console.log('💰 calculateTotalExpenses START - Platform:', Platform.OS);
      // console.log('💰 Input data check:', {
      //   platform: Platform.OS,
      //   transactionsLength: transactions?.length || 0,
      //   incomeData: incomeData ? 'exists' : 'null',
      //   nextPayDate: incomeData?.nextPayDate,
      //   frequency: incomeData?.frequency,
      // });

      if (!transactions?.length) {
        console.log('💰 No transactions, returning 0');
        return 0;
      }

      if (!incomeData?.nextPayDate || !incomeData?.frequency) {
        console.log('💰 Missing incomeData fields, returning 0:', {
          nextPayDate: incomeData?.nextPayDate,
          frequency: incomeData?.frequency,
        });
        return 0;
      }

      // Parse next pay date with error handling
      let nextPayDate;
      try {
        // Handle both date-only format (YYYY-MM-DD) and full ISO string
        if (incomeData.nextPayDate.includes('T')) {
          nextPayDate = new Date(incomeData.nextPayDate);
        } else {
          // For date-only format, create date in local timezone at noon to avoid timezone issues
          nextPayDate = new Date(incomeData.nextPayDate + 'T12:00:00');
        }

        if (isNaN(nextPayDate.getTime())) {
          throw new Error('Invalid date after parsing');
        }

        console.log('💰 Parsed nextPayDate:', nextPayDate.toISOString());
      } catch (dateError) {
        console.error('🧮 Error parsing next pay date:', dateError);
        nextPayDate = new Date();
      }

      // Calculate period start and end based on frequency
      let periodStart;
      let periodEnd;

      try {
        // Set period end to the next pay date
        periodEnd = new Date(nextPayDate);
        periodEnd.setHours(23, 59, 59, 999);

        // Calculate the PREVIOUS pay date - this becomes the start of the current period
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

        // Set period start to beginning of day to include all transactions from that day
        periodStart.setHours(0, 0, 0, 0);

        // Ensure periodStart is not invalid
        if (isNaN(periodStart.getTime())) {
          throw new Error('Invalid period start date');
        }

        console.log('💰 Period calculated:', {
          platform: Platform.OS,
          frequency: incomeData.frequency,
          nextPayDate: nextPayDate.toISOString(),
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          today: new Date().toISOString(),
        });
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

      console.log('💰 Transaction filtering results:', {
        platform: Platform.OS,
        totalTransactions: transactions.length,
        periodTransactions: periodTransactions.length,
        allTransactionDates: transactions.map(t => ({
          date: t.date,
          type: t.type,
          amount: t.amount,
          description: t.description,
          inPeriod:
            new Date(t.date) >= periodStart && new Date(t.date) <= periodEnd,
        })),
        periodTransactionAmounts: periodTransactions.map(t => ({
          amount: t.amount,
          date: t.date,
          type: t.type,
          description: t.description,
        })),
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

      console.log('💰 calculateTotalExpenses RESULT:', {
        platform: Platform.OS,
        total: total,
      });
      return total;
    } catch (error) {
      console.error('🧮 Critical error in calculateTotalExpenses:', error);
      return 0; // Return 0 instead of crashing
    }
  }, [transactions, incomeData]);

  // Create stable dependency for memoization - only changes when calculation-relevant data changes
  const transactionsSignature = useMemo(() => {
    // Only include fields that actually affect calculations to reduce re-renders
    return transactions
      .map(t => `${t.id}-${t.amount}-${t.type}-${t.date}-${t.status || ''}`)
      .join('|');
  }, [transactions]);

  const incomeSignature = useMemo(() => {
    return JSON.stringify({
      income: incomeData?.income,
      frequency: incomeData?.frequency,
      nextPayDate: incomeData?.nextPayDate,
    });
  }, [incomeData]);

  // ✅ FIXED: Update totalExpenses only when actual data changes (stable memoization)
  const totalExpensesValue = useMemo(() => {
    // Only calculate when both data sources are available
    if (incomeData && transactions.length >= 0) {
      return calculateTotalExpenses();
    }
    return 0;
  }, [transactionsSignature, incomeSignature, calculateTotalExpenses]);

  // Update state only when memoized value changes (non-blocking)
  useEffect(() => {
    startTransition(() => {
      setTotalExpenses(totalExpensesValue);
    });
  }, [totalExpensesValue]);

  // ==============================================
  // ADDITIONAL INCOME CALCULATION
  // ==============================================
  const [totalAdditionalIncome, setTotalAdditionalIncome] = useState(0);

  const calculateTotalAdditionalIncome = useCallback(() => {
    try {
      // Input validation - early returns for invalid state
      if (!transactions?.length) {
        return 0;
      }

      if (!incomeData?.nextPayDate || !incomeData?.frequency) {
        return 0;
      }

      // Parse next pay date with error handling
      let nextPayDate;
      try {
        // Handle both date-only format (YYYY-MM-DD) and full ISO string
        if (incomeData.nextPayDate.includes('T')) {
          nextPayDate = new Date(incomeData.nextPayDate);
        } else if (incomeData.nextPayDate.includes('-')) {
          // YYYY-MM-DD format
          nextPayDate = new Date(incomeData.nextPayDate + 'T12:00:00');
        } else {
          // Legacy DD/MM/YYYY format
          const [dayStr, monthStr, yearStr] = incomeData.nextPayDate.split('/');
          nextPayDate = new Date(
            2000 + parseInt(yearStr, 10),
            parseInt(monthStr, 10) - 1,
            parseInt(dayStr, 10),
            12,
            0,
            0,
            0,
          );
        }

        if (isNaN(nextPayDate.getTime())) {
          throw new Error('Invalid date after parsing');
        }
      } catch (dateError) {
        console.error(
          '🧮 Date parsing error for additional income:',
          dateError,
        );
        nextPayDate = new Date(); // Fallback to current date
      }

      // Calculate period boundaries (same logic as calculateTotalExpenses)
      let periodStart, periodEnd;
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
      } else {
        // Default to monthly if frequency is unknown
        periodStart = new Date(nextPayDate);
        periodStart.setMonth(periodStart.getMonth() - 1);
      }

      periodStart.setHours(0, 0, 0, 0);

      // Filter transactions for the period - only count INCOME transactions
      const periodIncomeTransactions = transactions.filter(transaction => {
        try {
          const transactionDate = new Date(transaction.date);
          if (isNaN(transactionDate.getTime())) {
            return false;
          }

          const inPeriod =
            transactionDate >= periodStart && transactionDate <= periodEnd;
          const isIncome = transaction.type === 'INCOME';

          return inPeriod && isIncome;
        } catch (error) {
          console.error(
            '🧮 Error checking income transaction:',
            error,
            transaction,
          );
          return false;
        }
      });

      // Calculate total additional income
      const total = periodIncomeTransactions.reduce((sum, transaction) => {
        const amount = parseFloat(transaction.amount) || 0;
        return sum + amount;
      }, 0);

      return total;
    } catch (error) {
      console.error(
        '🧮 Critical error in calculateTotalAdditionalIncome:',
        error,
      );
      return 0; // Graceful fallback
    }
  }, [transactions, incomeData]);

  // Auto-calculate additional income when dependencies change (stable memoized)
  const totalAdditionalIncomeValue = useMemo(() => {
    if (incomeData && transactions.length >= 0) {
      return calculateTotalAdditionalIncome();
    }
    return 0;
  }, [transactionsSignature, incomeSignature, calculateTotalAdditionalIncome]);

  // Update state only when memoized value changes (non-blocking)
  useEffect(() => {
    startTransition(() => {
      setTotalAdditionalIncome(totalAdditionalIncomeValue);
    });
  }, [totalAdditionalIncomeValue]);

  // ==============================================
  // EVENT HANDLERS
  // ==============================================
  const handleSaveTransaction = useCallback(
    async transaction => {
      try {
        const result = await saveTransaction(transaction);

        // Onboarding tutorial triggering disabled - handled by initial load only

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
  // CALCULATED VALUES WITH CATEGORY RESOLUTION (STABLE MEMOIZED TO PREVENT FLICKER)
  // ==============================================
  const transactionsWithCategories = useMemo(
    () => processTransactionsWithCategories(transactions),
    [transactionsSignature, processTransactionsWithCategories],
  );

  // Debug what we're passing to the Balance Card (commented out to reduce noise)
  /*
  console.log('🏠 HomeContainer RENDER DEBUG:', {
    platform: Platform.OS,
    incomeDataExists: !!incomeData,
    incomeAmount: incomeData?.income,
    frequency: incomeData?.frequency,
    nextPayDate: incomeData?.nextPayDate,
    totalExpenses: totalExpenses,
    transactionCount: transactions.length,
    userProfileExists: !!userProfile,
    loading: loading,
  });
  */

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
          loadCurrencySetting(),
        ]);
      } catch (error) {
        console.error('HomeContainer: Error in loadInitialData:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Trigger onboarding checks only once when data is initially loaded and user hasn't completed all tours
  useEffect(() => {
    if (
      !onboarding.loading &&
      onboarding.onboardingStatus &&
      incomeData &&
      transactions
    ) {
      const {
        hasSeenBalanceCardTour,
        hasSeenAddTransactionTour,
        hasSeenTransactionSwipeTour,
      } = onboarding.onboardingStatus;

      // Only trigger onboarding if user hasn't completed all tours yet
      const hasCompletedAllTours =
        hasSeenBalanceCardTour &&
        hasSeenAddTransactionTour &&
        hasSeenTransactionSwipeTour;

      if (!hasCompletedAllTours) {
        onboarding.checkAndShowOnboarding(incomeData, transactions);
      }
    }
  }, [onboarding.loading, onboarding.onboardingStatus]);

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
                  loadUserProfile(), // ✅ Will reload backend profile data
                  loadTransactions(),
                  loadCategories(),
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
  }, [lastActiveDate, selectedDate]);

  // State for total income payments from backend
  const [totalIncomePayments, setTotalIncomePayments] = useState(0);

  // Load total income payments from backend
  const loadTotalIncomePayments = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated() || goals.length === 0) {
        return;
      }

      console.log('🔍 HOME_CONTAINER: Loading income payments from backend');
      let totalPayments = 0;

      // Get contributions for all goals and sum up income payments
      for (const goal of goals) {
        if (!goal.id.startsWith('local_')) {
          // Only fetch for backend goals
          try {
            // Fetch all contributions (both MANUAL and WITHDRAWAL)
            const allContributions = await TrendAPIService.getGoalContributions(
              goal.id,
              // No type filter - get all contributions
            );

            if (allContributions && Array.isArray(allContributions)) {
              const incomeTotal = allContributions.reduce((sum, contrib) => {
                if (contrib.type === 'MANUAL') {
                  // MANUAL contributions subtract from income (money going to goals)
                  return sum + (contrib.amount || 0);
                } else if (contrib.type === 'WITHDRAWAL') {
                  // WITHDRAWAL contributions add back to income (money coming back from goals)
                  return sum - (contrib.amount || 0);
                } else {
                  // Other types (AUTOMATIC, TRANSACTION, INTEREST, WINDFALL) don't affect income
                  return sum;
                }
              }, 0);
              totalPayments += incomeTotal;
            }
          } catch (error) {
            console.warn(
              '🔍 HOME_CONTAINER: Failed to load contributions for goal',
              goal.id,
              error,
            );
          }
        }
      }

      console.log(
        '🔍 HOME_CONTAINER: Total income payments from backend:',
        totalPayments,
      );
      setTotalIncomePayments(totalPayments);
    } catch (error) {
      console.error('🔍 HOME_CONTAINER: Error loading income payments:', error);
    }
  }, [goals]);

  // Load income payments when goals change
  useEffect(() => {
    if (goals.length > 0) {
      loadTotalIncomePayments();
    }
  }, [goals.length]); // Remove function dependency, use goals.length instead

  // Store current loadTotalIncomePayments in a ref for event handlers
  const loadTotalIncomePaymentsRef = useRef(loadTotalIncomePayments);
  useEffect(() => {
    loadTotalIncomePaymentsRef.current = loadTotalIncomePayments;
  }, [loadTotalIncomePayments]);

  // Listen for goal income payments to reload income payment totals
  useEffect(() => {
    const handleGoalIncomePayment = eventData => {
      console.log(
        '🔍 HOME_CONTAINER: Goal income payment made, reloading income payments',
        eventData,
      );
      loadTotalIncomePaymentsRef.current();
    };

    // Use React Native DeviceEventEmitter for cross-platform compatibility
    let subscription;
    try {
      const {DeviceEventEmitter} = require('react-native');
      subscription = DeviceEventEmitter.addListener(
        'goalIncomePaymentMade',
        handleGoalIncomePayment,
      );
      console.log(
        '🔍 HOME_CONTAINER: Listening for goalIncomePaymentMade events',
      );
    } catch (e) {
      console.warn('DeviceEventEmitter not available, trying web events:', e);
      // Fallback to web browser events if available
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener(
          'goalIncomePaymentMade',
          handleGoalIncomePayment,
        );
      }
    }

    return () => {
      if (subscription) {
        subscription.remove();
      } else if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener(
          'goalIncomePaymentMade',
          handleGoalIncomePayment,
        );
      }
    };
  }, []); // Now safe to use empty dependency - handler uses ref

  // ==============================================
  // RENDER
  // ==============================================
  return (
    <HomeScreen
      incomeData={incomeData}
      userProfile={userProfile}
      transactions={transactionsWithCategories}
      categories={categories}
      goals={goals}
      editingTransaction={editingTransaction}
      loading={loading || onboarding.loading}
      selectedDate={selectedDate}
      totalExpenses={totalExpenses}
      totalIncomePayments={totalIncomePayments}
      totalAdditionalIncome={totalAdditionalIncome}
      currency={currency}
      isBackgroundSyncing={backgroundSyncCount > 0}
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
