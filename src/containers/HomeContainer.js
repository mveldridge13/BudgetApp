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
import DateService from '../services/DateService';
import HomeScreen from '../screens/HomeScreen';
import useOnboarding from '../hooks/useOnboarding';
import useGoals from '../hooks/useGoals';
import GoalAllocationModal from '../components/GoalAllocationModal';
import AddGoalModal from '../components/AddGoalModal';
import TournamentCache from '../services/TournamentCache';
import CategoryCache from '../services/CategoryCache';
import UserProfileCache from '../services/UserProfileCache';
import TransactionCache from '../services/TransactionCache';
import PayPeriodService from '../services/PayPeriodService';
import RolloverService from '../services/RolloverService';
import {useAppSettings} from '../contexts/AppSettingsContext';
import AddTournamentContainer from './AddTournamentContainer';

const HomeContainer = ({navigation}) => {
  // ==============================================
  // STATE
  // ==============================================
  const [incomeData, setIncomeData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(false); // Start false - show cached data immediately
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lastActiveDate, setLastActiveDate] = useState(
    new Date().toDateString(),
  );
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [homeSummary, setHomeSummary] = useState(null); // Backend-calculated balance card data
  const [currency, setCurrency] = useState('AUD');
  const [backgroundSyncCount, setBackgroundSyncCount] = useState(0);
  const [userActiveOperations, setUserActiveOperations] = useState(0);

  // Poker/Tournament state
  const [tournaments, setTournaments] = useState([]);
  const [pokerSectionExpanded, setPokerSectionExpanded] = useState(false);
  const [showAddTournament, setShowAddTournament] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  // Rollover state
  const [rolloverAmount, setRolloverAmount] = useState(0);
  const [rolloverBanner, setRolloverBanner] = useState(null); // {amount: number, frequency: string, date: string}
  const [showGoalAllocationModal, setShowGoalAllocationModal] = useState(false);
  const [rolloverAmountToAllocate, setRolloverAmountToAllocate] = useState(0);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  // ==============================================
  // HOOKS
  // ==============================================
  const onboarding = useOnboarding();
  const {
    goals,
    loadGoals: loadGoalsFromHook,
    updateSpendingGoals,
    saveGoal,
    addGoalContribution,
  } = useGoals();
  const {moduleSettings} = useAppSettings();

  // Get poker module setting
  const pokerTrackerEnabled = moduleSettings?.pokerTracker || false;

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

      // Get current user ID for user-specific cache
      const currentUserId = TrendAPIService.getCurrentUserId();
      if (!currentUserId) {
        console.warn('👤 No user ID available, skipping cache');
      } else {
        // 🔄 CACHE-FIRST: Load from cache immediately
        const cached = await UserProfileCache.get(currentUserId);
        if (cached && cached.profile) {
          console.log('👤 Using cached profile data');
          const cachedProfile = cached.profile;
          setUserProfile(cachedProfile);

          // Set income data from cache to remove delay
          if (
            cachedProfile.income &&
            cachedProfile.incomeFrequency &&
            cachedProfile.nextPayDate
          ) {
            const cachedIncomeData = {
              income: cachedProfile.income,
              monthlyIncome: cachedProfile.income,
              setupComplete: cachedProfile.setupComplete,
              frequency: cachedProfile.incomeFrequency,
              nextPayDate: cachedProfile.nextPayDate,
            };
            setIncomeData(cachedIncomeData);
          }

          // If cache is fresh, we're done
          if (!cached.isStale) {
            return;
          }
        }
      }

      // 🌍 Check and update timezone for existing UTC users (one-time fix)
      try {
        const timezoneUpdate = await AuthService.updateTimezoneIfNeeded();
        if (timezoneUpdate.success && !timezoneUpdate.alreadySet) {
          console.log(
            '🌍 HomeContainer: Timezone updated successfully:',
            timezoneUpdate,
          );
        }
      } catch (timezoneError) {
        console.warn(
          '🌍 HomeContainer: Timezone update failed (non-critical):',
          timezoneError,
        );
        // Don't fail the entire profile load if timezone update fails
      }

      // 🌐 BACKGROUND SYNC: Fetch from API (always for fresh data, or if no cache)
      const profile = await TrendAPIService.getUserProfile();
      console.log('👤 Profile received from backend:', {
        platform: Platform.OS,
        userId: profile?.id,
        income: profile?.income,
        incomeFrequency: profile?.incomeFrequency,
        nextPayDate: profile?.nextPayDate,
        setupComplete: profile?.setupComplete,
      });

      // Update cache with fresh data
      if (currentUserId) {
        await UserProfileCache.set(profile, currentUserId);
      }

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

  // Load home summary from backend (single source of truth for balance card)
  const loadHomeSummary = useCallback(async () => {
    try {
      console.log('🏠 loadHomeSummary START');

      if (!AuthService.isAuthenticated()) {
        return;
      }

      const summary = await TrendAPIService.getHomeSummary();
      console.log('🏠 Home summary received:', {
        period: summary?.period?.frequency,
        totalInflow: summary?.income?.totalInflow,
        leftToSpendSafe: summary?.totals?.leftToSpendSafe,
        committedRemaining: summary?.outflows?.committed?.remaining,
        discretionarySpent: summary?.outflows?.discretionary?.spentSoFar,
      });

      setHomeSummary(summary);

      // Also update totalExpenses for backwards compatibility during transition
      if (summary?.totals) {
        setTotalExpenses(summary.totals.totalExpensesAllocated);
      }
    } catch (error) {
      console.error('🏠 Error loading home summary:', error);
      // Don't fail silently - fallback to local calculation will still work
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

      // 🔄 CACHE-FIRST: Load from cache immediately
      const currentUserId = TrendAPIService.getCurrentUserId();
      const cached = await TransactionCache.get(currentUserId);

      if (cached && cached.data) {
        console.log('💳 Using cached transactions:', {
          count: cached.data.length,
          age: Math.round(cached.age / 1000), // seconds
          isStale: cached.isStale,
        });

        const sortedCached = sortTransactionsByDate(cached.data);
        setTransactions(sortedCached);

        // If cache is fresh, we're done
        if (!cached.isStale) {
          console.log('💳 Cache is fresh, skipping API call');
          return;
        }

        console.log('💳 Cache is stale, fetching fresh data in background');
      }

      // 🌐 BACKGROUND SYNC: Fetch from API (always for fresh data, or if no cache)
      try {
        // Load ALL transactions - filtering happens in TransactionList component
        // This allows calendar navigation to show transactions for any date
        const response = await TrendAPIService.getTransactions({
          limit: 1000,
        });
        const backendTransactions = response?.transactions || [];
        const sortedTransactions = sortTransactionsByDate(backendTransactions);

        console.log('💳 Transactions loaded from API:', {
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

        // Update cache in background (don't block on this)
        TransactionCache.set(currentUserId, sortedTransactions).catch(err => {
          console.warn('💳 Failed to update transaction cache:', err);
        });

        // Update state with fresh data
        setTransactions(sortedTransactions);
      } catch (apiError) {
        console.error('HomeContainer: Error loading transactions from API:', apiError);

        // If API fails but we have cached data, keep using cached data
        if (!cached && transactions.length === 0) {
          // Only clear if we have no cache AND no existing UI data
          Alert.alert(
            'Connection Issue',
            'Unable to load transactions. Please check your connection.',
            [{text: 'OK'}],
          );
          setTransactions([]);
        } else {
          console.log('💳 Using cached/existing data due to API failure');
        }
      }
    } catch (error) {
      console.error('HomeContainer: Error in loadTransactions:', error);
      Alert.alert(
        'Connection Issue',
        'Unable to load transactions. Please check your connection.',
        [{text: 'OK'}],
      );
    }
  }, [userActiveOperations, sortTransactionsByDate]);

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

      console.log('📂 loadCategories START - Platform:', Platform.OS);

      // 🔄 CACHE-FIRST: Load from cache immediately
      const currentUserId = TrendAPIService.getCurrentUserId();
      if (!currentUserId) {
        console.warn('📂 No user ID available for category cache');
        return;
      }

      const cached = await CategoryCache.get(currentUserId);
      if (cached && cached.data) {
        console.log('📂 Using cached categories:', {
          count: cached.data.length,
          age: Math.round(cached.age / 1000 / 60),
          isStale: cached.isStale,
        });
        const transformedCategories = transformCategoriesForUI(cached.data);
        setCategories(transformedCategories);

        // If cache is fresh, we're done
        if (!cached.isStale) {
          return;
        }
      }

      // 🌐 BACKGROUND SYNC: Fetch from API (always for fresh data, or if no cache)
      try {
        const response = await TrendAPIService.getCategories();
        const backendCategories = response?.categories || [];

        console.log(
          '📂 Categories received from backend:',
          backendCategories?.length || 0,
        );

        if (backendCategories && Array.isArray(backendCategories)) {
          console.log('📂 Setting categories from API and updating cache');

          // Check if "Other" category exists
          const otherCategory = backendCategories.find(
            c => c.name?.toLowerCase() === 'other' && !c.parentId
          );

          if (!otherCategory) {
            console.log('📂 "Other" category missing, creating it...');
            try {
              // Create "Other" main category
              const createdOther = await TrendAPIService.createCategory({
                name: 'Other',
                description: 'Other financial activities',
                type: 'EXPENSE',
                icon: 'ellipsis-horizontal-outline',
                color: '#A8A8A8',
              });
              console.log('📂 Created "Other" category:', createdOther);

              // Create "Debt Payment" subcategory
              const createdDebtPayment = await TrendAPIService.createCategory({
                name: 'Debt Payment',
                description: 'Loan payments, credit cards',
                type: 'EXPENSE',
                icon: 'card-outline',
                color: '#A8A8A8',
                parentId: createdOther.id,
              });
              console.log('📂 Created "Debt Payment" subcategory:', createdDebtPayment);

              // Add to backend categories array
              backendCategories.push(createdOther);

              // Invalidate cache to force refresh on next load
              await CategoryCache.invalidate(currentUserId);
            } catch (createError) {
              console.error('📂 Failed to create "Other" category:', createError);
            }
          }

          // Update cache in background
          CategoryCache.set(backendCategories, currentUserId);

          // Update state with transformed categories
          const transformedCategories =
            transformCategoriesForUI(backendCategories);
          setCategories(transformedCategories);
        } else {
          console.warn('📂 Invalid categories response:', backendCategories);

          // If API fails but we have cached data, keep using cached data
          if (!cached) {
            setCategories([]);
          }
        }
      } catch (apiError) {
        console.error(
          '📂 API request failed, using cached data if available:',
          apiError,
        );

        // If API fails and we don't have cached data, set empty array
        if (!cached) {
          setCategories([]);
        }
      }
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

  const loadTournaments = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated()) {
        console.log('🎲 loadTournaments: User not authenticated');
        return;
      }

      if (!pokerTrackerEnabled) {
        console.log(
          '🎲 loadTournaments: Poker module disabled, clearing tournaments',
        );
        setTournaments([]);
        return;
      }

      console.log('🎲 loadTournaments START - Platform:', Platform.OS);

      // 🔄 CACHE-FIRST: Load from cache immediately
      const cached = await TournamentCache.get();
      if (cached && cached.data) {
        console.log('🎲 Using cached tournaments:', {
          count: cached.data.length,
          age: Math.round(cached.age / 1000 / 60),
          isStale: cached.isStale,
        });
        setTournaments(cached.data);

        // If cache is fresh, we're done
        if (!cached.isStale) {
          return;
        }
      }

      // 🌐 BACKGROUND SYNC: Fetch from API (always for fresh data, or if no cache)
      try {
        const tournamentsResponse = await TrendAPIService.getTournaments();
        console.log(
          '🎲 Tournaments received from backend:',
          tournamentsResponse?.length || 0,
        );

        // Debug: Log detailed tournament data structure
        if (tournamentsResponse && tournamentsResponse.length > 0) {
          console.log('🎲 First tournament detailed structure from API:', {
            fullTournament: tournamentsResponse[0],
            accommodationCost: tournamentsResponse[0]?.accommodationCost,
            foodBudget: tournamentsResponse[0]?.foodBudget,
            otherExpenses: tournamentsResponse[0]?.otherExpenses,
          });
        }

        if (tournamentsResponse && Array.isArray(tournamentsResponse)) {
          console.log('🎲 Setting tournaments from API and updating cache');

          // Update state
          setTournaments(tournamentsResponse);

          // Update cache in background
          TournamentCache.set(tournamentsResponse);
        } else {
          console.warn('🎲 Invalid tournaments response:', tournamentsResponse);

          // If API fails but we have cached data, keep using cached data
          if (!cached) {
            setTournaments([]);
          }
        }
      } catch (apiError) {
        console.error(
          '🎲 API request failed, using cached data if available:',
          apiError,
        );

        // If API fails and we don't have cached data, set empty array
        if (!cached) {
          setTournaments([]);
        }
      }
    } catch (error) {
      console.error('🎲 HomeContainer: Error loading tournaments:', error);
      setTournaments([]);
    }
  }, [pokerTrackerEnabled]);

  // ==============================================
  // TRANSACTION OPERATIONS
  // ==============================================
  const saveTransaction = useCallback(
    async transaction => {
      const isEditing = transaction.id && !transaction.id?.startsWith('temp_');
      let tempId = null;
      let optimisticTransaction = null;
      const currentUserId = TrendAPIService.getCurrentUserId(); // Declare outside try block for access in catch

      try {
        if (!AuthService.isAuthenticated()) {
          throw new Error('User not authenticated');
        }

        // 🎯 TRACK USER ACTIVITY: Prevent API hydration overwrites
        setUserActiveOperations(prev => prev + 1);

        // 🎯 CACHE-FIRST: Immediate optimistic update (UI + Cache)

        if (isEditing) {
          optimisticTransaction = {
            ...transaction,
            updatedAt: new Date().toISOString(),
            // Pre-resolve category data to prevent flicker
            categoryData: resolveCategoryForTransaction(
              transaction,
              categoryMap,
            ),
          };

          setTransactions(prev => {
            const updated = sortTransactionsByDate(
              prev.map(t =>
                t.id === transaction.id ? optimisticTransaction : t,
              ),
            );
            return updated;
          });

          // Update cache immediately for optimistic update
          TransactionCache.upsertTransaction(currentUserId, optimisticTransaction).catch(err => {
            console.warn('💳 Failed to update transaction in cache:', err);
          });
        } else {
          tempId = `temp_${Date.now()}_${Math.random()}`;
          optimisticTransaction = {
            ...transaction,
            id: tempId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Pre-resolve category data to prevent flicker
            categoryData: resolveCategoryForTransaction(
              transaction,
              categoryMap,
            ),
          };

          setTransactions(prev => {
            const updated = sortTransactionsByDate([
              optimisticTransaction,
              ...prev,
            ]);
            return updated;
          });

          // Update cache immediately for optimistic update
          TransactionCache.upsertTransaction(currentUserId, optimisticTransaction).catch(err => {
            console.warn('💳 Failed to add transaction to cache:', err);
          });
        }

        setEditingTransaction(null);

        // 🎯 NON-BLOCKING: Update spending goals in a transition to avoid blocking transaction UI
        startTransition(() => {
          (async () => {
            try {
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
          date: DateService.prepareForBackend(transaction.date),
          recurrence: transaction.recurrence,
          dueDate: DateService.prepareForBackend(transaction.dueDate),
          status: transaction.status,
        };

        if (isEditing) {
          // 🎯 EDITS: Background sync (cache-first)
          setTimeout(async () => {
            try {
              setBackgroundSyncCount(prev => prev + 1);
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
                  return sortTransactionsByDate(
                    prev.map(t =>
                      t.id === transaction.id ? savedTransaction : t,
                    ),
                  );
                }
                return prev;
              });

              // Update cache with server response (prevent cache staleness)
              if (currentUserId) {
                TransactionCache.upsertTransaction(currentUserId, savedTransaction).catch(err => {
                  console.warn('💳 Failed to update transaction in cache after sync:', err);
                });
              }
            } catch (syncError) {
            } finally {
              setBackgroundSyncCount(prev => Math.max(0, prev - 1));
            }
          }, 0);
        } else {
          // 🎯 CREATION: Synchronous (like before - no flicker)
          try {
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

            // Replace temp transaction in cache with real one
            TransactionCache.replaceTempTransaction(currentUserId, tempId, savedTransaction).catch(err => {
              console.warn('💳 Failed to replace temp transaction in cache:', err);
            });

            optimisticTransaction = savedTransaction; // Update for return value
          } catch (createError) {
            throw createError; // Let the catch block handle rollback
          }
        }

        // 🎯 BACKGROUND SYNC: Reload categories without blocking transaction UI
        setTimeout(async () => {
          try {
            await loadCategories();
          } catch (categoryError) {
            // Don't fail the transaction save if category reload fails
          }
        }, 100); // Small delay to ensure transaction UI has updated

        // NOTE: Rollover amount should remain constant during the pay period
        // It represents money carried over from the previous period and shouldn't change
        // when adding/removing current period transactions

        return {
          success: true,
          isNewTransaction: !isEditing,
          transaction: optimisticTransaction,
          shouldShowTransactionTutorial: false, // Disable transaction tutorial triggering on save
        };
      } catch (error) {
        console.error('HomeContainer: Transaction save failed:', error);

        // Rollback optimistic changes (UI + Cache)
        if (isEditing) {
          setEditingTransaction(transaction);

          // Restore original transaction from cache first
          if (currentUserId) {
            try {
              const cached = await TransactionCache.get(currentUserId);
              if (cached?.data) {
                // Find the original transaction in cache (before optimistic update)
                const originalFromCache = cached.data.find(t => t.id === transaction.id);
                if (originalFromCache) {
                  // Restore from cache in UI
                  setTransactions(prev =>
                    sortTransactionsByDate(
                      prev.map(t => (t.id === transaction.id ? originalFromCache : t)),
                    ),
                  );
                } else {
                  // Cache doesn't have it, reload from server
                  await loadTransactions();
                }
              } else {
                // No cache, reload from server
                await loadTransactions();
              }
            } catch (cacheError) {
              console.warn('💳 Failed to restore from cache, reloading from server:', cacheError);
              await loadTransactions();
            }
          } else {
            // No userId, fallback to server reload
            await loadTransactions();
          }
        } else {
          setTransactions(prev => {
            const updated = prev.filter(t => t.id !== tempId);
            return updated;
          });

          // Remove temp transaction from cache
          if (currentUserId) {
            TransactionCache.removeTransaction(currentUserId, tempId).catch(err => {
              console.warn('💳 Failed to remove temp transaction from cache:', err);
            });
          }
        }

        throw error;
      } finally {
        // 🎯 CLEANUP: Always decrement user activity counter
        setTimeout(() => {
          setUserActiveOperations(prev => Math.max(0, prev - 1));
        }, 1000); // Keep lock for 1 second after transaction completes
      }
    },
    [transactions, onboarding, loadTransactions, rolloverAmount],
  );

  const deleteTransaction = useCallback(async transactionId => {
    let deletedTransaction = null;
    const currentUserId = TrendAPIService.getCurrentUserId();

    try {
      if (!AuthService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      if (!currentUserId) {
        throw new Error('User ID not available');
      }

      // Optimistic removal (UI + Cache)

      setTransactions(prev => {
        deletedTransaction = prev.find(t => t.id === transactionId);
        const updated = prev.filter(t => t.id !== transactionId);
        return updated;
      });

      // Remove from cache immediately
      TransactionCache.removeTransaction(currentUserId, transactionId).catch(err => {
        console.warn('💳 Failed to remove transaction from cache:', err);
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

        // NOTE: Don't clear rollover cache for current period transactions
        // Rollover amount should remain constant during the pay period
        // It only gets recalculated during pay period transitions
      }
    } catch (error) {
      console.error('HomeContainer: Transaction delete failed:', error);

      // Rollback (UI + Cache)
      if (deletedTransaction) {
        setTransactions(prev => {
          const updated = sortTransactionsByDate([deletedTransaction, ...prev]);
          return updated;
        });

        // Re-add to cache (currentUserId already fetched at function start)
        if (currentUserId) {
          TransactionCache.upsertTransaction(currentUserId, deletedTransaction).catch(err => {
            console.warn('💳 Failed to rollback transaction in cache:', err);
          });
        } else {
          console.warn('💳 Cannot rollback transaction in cache - no user ID available');
        }
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

      // Use PayPeriodService to calculate total expenses
      const total = PayPeriodService.calculateTotalExpensesForPeriod(
        transactions,
        incomeData.nextPayDate,
        incomeData.frequency,
      );

      console.log('💰 calculateTotalExpenses RESULT:', {
        platform: Platform.OS,
        total: total,
        totalTransactionCount: transactions.length,
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

  // Calculate if we should show "New period started!" message (for UI display)
  const isNewPayPeriodForUI = useMemo(() => {
    return PayPeriodService.shouldShowNewPeriodMessage(
      incomeData?.nextPayDate,
      incomeData?.frequency,
    );
  }, [incomeData?.nextPayDate, incomeData?.frequency]);

  // Update state only when memoized value changes (non-blocking)
  useEffect(() => {
    startTransition(() => {
      setTotalExpenses(totalExpensesValue);
    });
  }, [totalExpensesValue]);

  // Refresh home summary when transactions change (debounced)
  useEffect(() => {
    // Skip initial render and when no transactions signature yet
    if (!transactionsSignature || transactionsSignature === '[]') {
      return;
    }

    // Debounce to avoid too many API calls during rapid changes
    const timeoutId = setTimeout(() => {
      loadHomeSummary();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [transactionsSignature, loadHomeSummary]);

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

      // Use PayPeriodService to calculate total additional income
      const total = PayPeriodService.calculateTotalAdditionalIncomeForPeriod(
        transactions,
        incomeData.nextPayDate,
        incomeData.frequency,
      );

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
  // ROLLOVER CALCULATION AND MANAGEMENT
  // ==============================================

  // Load current rollover amount from backend using RolloverService
  const loadRolloverAmount = useCallback(async () => {
    try {
      const rolloverData = await RolloverService.loadRolloverAmount();
      console.log('🔄 HomeContainer: Loaded rollover data:', rolloverData);
      setRolloverAmount(rolloverData.rolloverAmount);
    } catch (error) {
      console.error('🔄 Error loading rollover amount:', error);
    }
  }, []);

  // Load rollover data and banner on component mount
  useEffect(() => {
    loadRolloverAmount();
    loadRolloverBanner();
  }, [loadRolloverAmount, loadRolloverBanner]);

  // Load rollover banner from cache using cache-first approach
  const loadRolloverBanner = useCallback(async () => {
    try {
      const bannerData = await RolloverService.loadRolloverBanner();
      console.log('🔄 HomeContainer: Loaded rollover banner:', bannerData);
      setRolloverBanner(bannerData);
    } catch (error) {
      console.error('🔄 Error loading rollover banner:', error);
    }
  }, []);

  // Listen for navigation events to refresh rollover amount when returning from Goals
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Always reload rollover amount when returning to Home screen
      // This ensures we get the latest rollover state after goal creation
      loadRolloverAmount();

      // Reload rollover banner to show updated amount after partial allocations
      loadRolloverBanner();

      // Also reload goals to ensure we have the latest goal data (including contributions)
      if (loadGoalsRef.current) {
        loadGoalsRef.current();
      }

      // Reload transactions to pick up any changes made in other screens (like Analytics bill updates)
      loadTransactions();
    });

    return unsubscribe;
  }, [navigation, loadRolloverAmount, loadRolloverBanner, loadTransactions]);

  // ==============================================
  // PAY PERIOD TRANSITION DETECTION
  // ==============================================

  // Check if we've crossed into a new pay period and need to reset
  const checkPayPeriodTransition = useCallback(async () => {
    try {
      if (!incomeData?.nextPayDate || !incomeData?.frequency) {
        return;
      }

      // Use PayPeriodService to check if transition is needed
      const transitionResult = PayPeriodService.checkPayPeriodTransition(
        incomeData.nextPayDate,
        incomeData.frequency,
      );

      if (!transitionResult.shouldTransition) {
        return;
      }

      console.log('🔄 Pay period transition detected:', {
        currentNextPayDate: incomeData.nextPayDate,
        newNextPayDate: transitionResult.newNextPayDate,
        frequency: incomeData.frequency,
      });

      // Update the user profile with the new next pay date
      try {
        const updateData = {
          nextPayDate: transitionResult.newNextPayDate,
        };

        await TrendAPIService.updateIncomeProfile(updateData);

        // Update local state
        setIncomeData(prev => ({
          ...prev,
          nextPayDate: transitionResult.newNextPayDate.split('T')[0],
        }));

        // Calculate if there were leftover funds from previous period using RolloverService
        // NOTE: Use 0 for rolloverAmount since we're calculating the previous period's surplus
        // before any rollover was applied to this new period

        // Ensure we have complete data before calculating surplus
        if (
          totalExpenses === null ||
          totalExpenses === undefined ||
          !Array.isArray(goals)
        ) {
          console.log('🔄 Skipping auto-rollover: incomplete data', {
            totalExpenses,
            goalsLoaded: Array.isArray(goals),
            goalsCount: goals?.length || 0,
          });
          return;
        }

        // Calculate expenses from PREVIOUS pay period (not current period)
        // This is crucial for mid-period app adoption scenarios
        const previousPeriodExpenses =
          PayPeriodService.calculateTotalExpensesForPreviousPeriod(
            transactions,
            incomeData.nextPayDate,
            incomeData.frequency,
          );

        const previousPeriodSurplus = RolloverService.calculateAvailableSurplus(
          incomeData,
          0, // Previous period had no rollover contribution
          previousPeriodExpenses, // Use previous period expenses, not current period
          goals,
        );

        console.log('🔄 Surplus calculation details:', {
          income: incomeData.income,
          currentPeriodExpenses: totalExpenses, // Current period (should be 0 for new period)
          previousPeriodExpenses, // Previous period (where the $500 transaction should be)
          goals: goals.map(g => ({
            id: g.id,
            autoContribute: g.autoContribute || 0,
          })),
          goalContributions: goals.reduce(
            (sum, g) => sum + (g.autoContribute || 0),
            0,
          ),
          calculatedSurplus: previousPeriodSurplus,
          expectedSurplus:
            incomeData.income -
            previousPeriodExpenses - // Use previous period expenses for surplus calculation
            goals.reduce((sum, g) => sum + (g.autoContribute || 0), 0),
        });

        // AUTO-ROLLOVER: Automatically process surplus rollover to new period
        if (previousPeriodSurplus > 0) {
          console.log(
            '🔄 Auto-rollover: Processing surplus from previous period:',
            previousPeriodSurplus,
          );

          try {
            const rolloverResult =
              await RolloverService.processRolloverToNextPeriod(
                previousPeriodSurplus,
                rolloverAmount,
                incomeData.frequency,
                incomeData,
              );

            // Update rollover amount in state
            setRolloverAmount(rolloverResult.newRolloverAmount);

            // Set rollover banner using cache-first approach
            // Use simple leftToSpend calculation from PREVIOUS period
            const leftToSpend = incomeData.income - previousPeriodExpenses;
            const bannerData = {
              amount: leftToSpend, // Show actual Left to Spend amount from previous period
              frequency: incomeData.frequency,
              date: new Date().toISOString(),
            };

            // Cache the banner data and update UI state
            await RolloverService.setRolloverBanner(bannerData);
            setRolloverBanner(bannerData);

            console.log(
              '🔄 Auto-rollover completed:',
              `$${previousPeriodSurplus.toFixed(
                2,
              )} → New total: $${rolloverResult.newRolloverAmount.toFixed(2)}`,
            );
          } catch (rolloverError) {
            console.error('🔄 Auto-rollover failed:', rolloverError);

            // Show error notification to user
            Alert.alert(
              'Auto-Rollover Failed',
              `Failed to automatically roll over $${previousPeriodSurplus.toFixed(
                2,
              )}. You can manually process this in your settings.`,
              [{text: 'OK'}],
            );
          }
        }
      } catch (error) {
        console.error(
          'Pay period transition failed to update next pay date:',
          error,
        );

        // Still update local state even if server update fails
        // This prevents the app from getting stuck in an infinite loop
        setIncomeData(prev => ({
          ...prev,
          nextPayDate: transitionResult.newNextPayDate.split('T')[0],
        }));

        // Don't throw - this shouldn't break the app, just log the error
      }
    } catch (error) {
      console.error('Pay period transition error:', error);
    }
  }, [incomeData, rolloverAmount, totalExpenses, goals]);

  // Check pay period transition when app becomes active or when all required data is loaded
  useEffect(() => {
    if (
      incomeData?.nextPayDate &&
      incomeData?.frequency &&
      totalExpenses !== null &&
      totalExpenses !== undefined &&
      Array.isArray(goals) &&
      !loading // Wait for initial loading to complete
    ) {
      console.log('🔄 All data loaded, checking pay period transition', {
        incomeLoaded: !!incomeData?.nextPayDate,
        expensesCalculated: totalExpenses !== null,
        totalExpenses,
        goalsLoaded: Array.isArray(goals),
        transactionCount: transactions.length,
        loadingComplete: !loading,
      });
      checkPayPeriodTransition();
    } else {
      console.log('🔄 Waiting for data before pay period check', {
        incomeLoaded: !!incomeData?.nextPayDate,
        expensesCalculated: totalExpenses !== null,
        totalExpenses,
        goalsLoaded: Array.isArray(goals),
        transactionCount: transactions?.length || 0,
        stillLoading: loading,
      });
    }
  }, [
    checkPayPeriodTransition,
    incomeData?.nextPayDate,
    totalExpenses,
    goals,
    loading,
    transactions.length,
  ]);

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
  // POKER/TOURNAMENT EVENT HANDLERS
  // ==============================================

  const handleTogglePokerSection = useCallback(() => {
    setPokerSectionExpanded(prev => !prev);
  }, []);

  const handleTournamentPress = useCallback(
    tournament => {
      console.log('🎲 Tournament pressed:', tournament.name);
      // Navigate to tournament details screen
      navigation.navigate('TournamentDetails', {
        tournament: tournament,
        tournamentId: tournament.id,
      });
    },
    [navigation],
  );

  const handleTournamentEdit = useCallback(
    tournament => {
      console.log('🎲 Tournament edit:', tournament.name);

      // Find the latest version of this tournament from current state
      const latestTournament =
        tournaments.find(t => t.id === tournament.id) || tournament;
      console.log('🎲 Setting editing tournament with latest data:', {
        originalTournament: tournament,
        latestTournament: latestTournament,
        foodBudgetOriginal: tournament.foodBudget,
        foodBudgetLatest: latestTournament.foodBudget,
      });

      setEditingTournament(latestTournament);
      setShowAddTournament(true);
    },
    [tournaments],
  );

  const handleTournamentDelete = useCallback(
    async tournamentId => {
      try {
        console.log('🎲 Deleting tournament:', tournamentId);

        if (!AuthService.isAuthenticated()) {
          Alert.alert('Error', 'You must be logged in to delete a tournament.');
          return;
        }

        // 🔄 CACHE-FIRST: Remove from cache immediately for instant UI feedback
        await TournamentCache.removeTournament(tournamentId);

        // Update local state immediately
        setTournaments(prev => prev.filter(t => t.id !== tournamentId));

        // 🌐 BACKGROUND SYNC: Delete from server (only if not a temporary ID)
        if (!tournamentId.toString().startsWith('temp_')) {
          try {
            await TrendAPIService.deleteTournament(tournamentId);
            console.log('🎲 Tournament deleted from server:', tournamentId);
          } catch (syncError) {
            console.error(
              '🎲 Failed to delete tournament from server:',
              syncError,
            );

            // Revert changes on server failure - reload tournaments to restore from cache/server
            await loadTournaments();

            Alert.alert(
              'Sync Error',
              'Tournament was deleted locally but failed to sync to server. Please try again when online.',
              [{text: 'OK'}],
            );
            return; // Exit early on server failure
          }
        } else {
          console.log(
            '🎲 Skipping server delete for temporary tournament:',
            tournamentId,
          );
        }
      } catch (error) {
        console.error('🎲 Error deleting tournament:', error);
        Alert.alert('Error', 'Failed to delete tournament. Please try again.', [
          {text: 'OK'},
        ]);
      }
    },
    [loadTournaments],
  );

  const handleAddTournament = useCallback(() => {
    console.log('🎲 Add tournament pressed - opening modal');
    setEditingTournament(null); // Clear any existing editing tournament
    setShowAddTournament(true);
  }, []);

  const handleTournamentSwipeStart = useCallback(() => {
    // Scroll disabling is handled in HomeScreen
    console.log('🎲 Tournament swipe started');
  }, []);

  const handleTournamentSwipeEnd = useCallback(() => {
    // Scroll disabling is handled in HomeScreen
    console.log('🎲 Tournament swipe ended');
  }, []);

  const handleCloseAddTournament = useCallback(() => {
    console.log('🎲 Closing add tournament modal');
    setShowAddTournament(false);
    setEditingTournament(null);
  }, []);

  const handleSaveTournament = useCallback(
    async (tournament, isSynced = false) => {
      try {
        console.log('🎲 Tournament saved:', {tournament, isSynced});

        if (isSynced) {
          console.log(
            '🎲 Tournament synced to server, updating state immediately with server data:',
            {
              tournamentId: tournament.id,
              serverFoodBudget: tournament.foodBudget,
              serverAccommodationCost: tournament.accommodationCost,
              serverOtherExpenses: tournament.otherExpenses,
            },
          );

          // Immediately update local state with server data
          setTournaments(prevTournaments => {
            const existingIndex = prevTournaments.findIndex(
              t => t.id === tournament.id,
            );
            if (existingIndex >= 0) {
              const updated = [...prevTournaments];
              console.log(
                '🎲 Server sync - updating tournament at index:',
                existingIndex,
                {
                  oldFoodBudget: prevTournaments[existingIndex].foodBudget,
                  newServerFoodBudget: tournament.foodBudget,
                },
              );
              updated[existingIndex] = tournament;
              return updated;
            } else {
              console.log('🎲 Server sync - adding new tournament');
              return [...prevTournaments, tournament];
            }
          });

          // Update cache in background for consistency
          await TournamentCache.upsertTournament(tournament);
        } else {
          // Optimistic update - immediately update local state
          console.log(
            '🎲 Optimistic tournament update, refreshing local state with:',
            {
              tournamentId: tournament.id,
              newFoodBudget: tournament.foodBudget,
              newAccommodationCost: tournament.accommodationCost,
              newOtherExpenses: tournament.otherExpenses,
            },
          );
          setTournaments(prevTournaments => {
            const existingIndex = prevTournaments.findIndex(
              t => t.id === tournament.id,
            );
            if (existingIndex >= 0) {
              // Update existing tournament
              const updated = [...prevTournaments];
              console.log('🎲 Updating tournament at index:', existingIndex, {
                oldFoodBudget: prevTournaments[existingIndex].foodBudget,
                newFoodBudget: tournament.foodBudget,
              });
              updated[existingIndex] = tournament;
              return updated;
            } else {
              // Add new tournament
              console.log('🎲 Adding new tournament to state');
              return [...prevTournaments, tournament];
            }
          });
        }

        // Expand poker section to show the new tournament
        setPokerSectionExpanded(true);
      } catch (error) {
        console.error('🎲 Error handling tournament save:', error);
      }
    },
    [loadTournaments],
  );

  const reloadTournaments = useCallback(async () => {
    try {
      console.log('🎲 Reloading tournaments and invalidating cache...');

      // Invalidate cache to force fresh data
      await TournamentCache.invalidate();

      // Load tournaments (will fetch from API since cache is now stale)
      await loadTournaments();
    } catch (error) {
      console.error('Failed to reload tournaments:', error);
    }
  }, [loadTournaments]);

  // Function to reload categories and invalidate cache
  const reloadCategories = useCallback(async () => {
    try {
      console.log('📂 Reloading categories and invalidating cache...');

      // Get current user ID for cache invalidation
      const currentUserId = TrendAPIService.getCurrentUserId();

      // Invalidate cache to force fresh data
      if (currentUserId) {
        await CategoryCache.invalidate(currentUserId);
      }

      // Load categories (will fetch from API since cache is now stale)
      await loadCategories();
    } catch (error) {
      console.error('Failed to reload categories:', error);
    }
  }, [loadCategories]);

  // Expose debug functions globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.reloadTournaments = reloadTournaments;
      window.reloadCategories = reloadCategories;
      window.debugShowAddTransactionSpotlight =
        onboarding.debugShowAddTransactionSpotlight;
      window.debugResetOnboarding = onboarding.debugResetOnboarding;
      window.debugRecurringTransactions = () => {
        const recurring = transactions.filter(t => t.recurrence && t.recurrence !== 'none');
        const phoneBill = transactions.filter(t =>
          t.amount === 380 ||
          (t.description && t.description.toLowerCase().includes('phone'))
        );
        console.log('🔄 DEBUG: All recurring transactions:', recurring.map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          dueDate: t.dueDate,
          status: t.status,
          recurrence: t.recurrence,
        })));
        console.log('🔄 DEBUG: Phone bill / $380 transactions:', phoneBill.map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          dueDate: t.dueDate,
          status: t.status,
          recurrence: t.recurrence,
        })));
        console.log('🔄 DEBUG: Current pay period info:', {
          nextPayDate: incomeData?.nextPayDate,
          frequency: incomeData?.frequency,
        });
        return { recurring, phoneBill };
      };
      window.debugCategories = async () => {
        const currentUserId = TrendAPIService.getCurrentUserId();
        if (currentUserId) {
          const stats = await CategoryCache.getStats(currentUserId);
          const cached = await CategoryCache.get(currentUserId);
          console.log('📂 Category Debug Stats:', stats);
          console.log('📂 Raw cached data:', cached?.data);
          console.log('📂 Transformed categories state:', categories);
          console.log(
            '📂 Looking for Shopping category and its subcategories...',
          );
          const shopping = categories.find(c =>
            c.name.toLowerCase().includes('shopping'),
          );
          if (shopping) {
            console.log('📂 Shopping category found:', shopping);
            console.log('📂 Shopping subcategories:', shopping.subcategories);
            const sporting = shopping.subcategories?.find(s =>
              s.name.toLowerCase().includes('sporting'),
            );
            if (sporting) {
              console.log(
                '📂 ✅ Sporting subcategory found in state:',
                sporting,
              );
            } else {
              console.log(
                '📂 ❌ Sporting subcategory NOT found in transformed state',
              );
            }
          } else {
            console.log('📂 ❌ Shopping category not found');
          }
          return {stats, cached: cached?.data, transformed: categories};
        }
        return null;
      };
      console.log(
        '🎲 Exposed debug functions: window.reloadTournaments(), window.reloadCategories(), window.debugCategories(), window.debugRecurringTransactions(), window.debugShowAddTransactionSpotlight(), window.debugResetOnboarding()',
      );
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.reloadTournaments;
        delete window.reloadCategories;
        delete window.debugCategories;
        delete window.debugRecurringTransactions;
        delete window.debugShowAddTransactionSpotlight;
        delete window.debugResetOnboarding;
      }
    };
  }, [
    reloadTournaments,
    reloadCategories,
    transactions,
    incomeData,
    onboarding.debugShowAddTransactionSpotlight,
    onboarding.debugResetOnboarding,
  ]);

  // ==============================================
  // CALCULATED VALUES WITH CATEGORY RESOLUTION (STABLE MEMOIZED TO PREVENT FLICKER)
  // ==============================================
  const transactionsWithCategories = useMemo(() => {
    // If transactions already have categoryData, use them as-is to prevent re-processing
    const hasResolvedCategories = transactions.some(t => t.categoryData);
    if (hasResolvedCategories) {
      return transactions.map(transaction => ({
        ...transaction,
        categoryData:
          transaction.categoryData ||
          resolveCategoryForTransaction(transaction, categoryMap),
      }));
    }

    // Process transactions with categories (uses fallback if categories not loaded yet)
    return processTransactionsWithCategories(transactions);
  }, [
    transactions,
    categories,
    processTransactionsWithCategories,
    categoryMap,
  ]);

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

  // Initial data loading - Cache-first approach (no loading block)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (!AuthService.isAuthenticated()) {
          navigation.navigate('Auth');
          return;
        }

        // Load all data in parallel - cache-first pattern ensures instant display
        // No blocking loading state - show cached data immediately, sync in background
        await Promise.all([
          loadCategories(),
          loadUserProfile(),
          loadTransactions(),
          loadGoals(),
          loadTournaments(),
          loadCurrencySetting(),
          loadHomeSummary(), // Backend-calculated balance card data
        ]);

        // Set loading to false after initial data is loaded (for first-time scenarios)
        setLoading(false);
      } catch (error) {
        console.error('HomeContainer: Error in loadInitialData:', error);
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

      // Debug onboarding status before checking
      console.log('🎯 HomeContainer: Onboarding debug:', {
        onboardingLoading: onboarding.loading,
        onboardingStatus: onboarding.onboardingStatus,
        hasIncomeData: !!incomeData,
        transactionCount: transactions?.length || 0,
        tutorialInProgress: onboarding.tutorialInProgress,
        showAddTransactionSpotlight: onboarding.showAddTransactionSpotlight,
        showBalanceCardSpotlight: onboarding.showBalanceCardSpotlight,
        hasSeenBalanceCardTour,
        hasSeenAddTransactionTour,
        hasSeenTransactionSwipeTour,
      });

      // Only trigger onboarding if user hasn't completed all tours yet
      const hasCompletedAllTours =
        hasSeenBalanceCardTour &&
        hasSeenAddTransactionTour &&
        hasSeenTransactionSwipeTour;

      if (!hasCompletedAllTours) {
        onboarding.checkAndShowOnboarding(incomeData, transactions);
      }
    }
  }, [
    onboarding.loading,
    onboarding.onboardingStatus,
    incomeData,
    transactions.length, // Use length instead of full array to prevent unnecessary re-renders
  ]);

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

          // Reload data for new day and check for pay period transitions
          const reloadForNewDay = async () => {
            try {
              setLoading(true);

              if (AuthService.isAuthenticated()) {
                // Check for pay period transitions first (this may update nextPayDate)
                await checkPayPeriodTransition();
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

  // Load total income payments from backend for current pay period only
  const loadTotalIncomePayments = useCallback(async () => {
    try {
      if (
        !AuthService.isAuthenticated() ||
        goals.length === 0 ||
        !incomeData?.nextPayDate
      ) {
        return;
      }

      // Calculate current pay period boundaries using PayPeriodService
      let periodStart, periodEnd;
      try {
        const payPeriodBoundaries =
          PayPeriodService.calculatePayPeriodBoundaries(
            incomeData.nextPayDate,
            incomeData.frequency,
            true, // useCurrentPeriodForNewPeriod = true
          );

        if (!payPeriodBoundaries) {
          console.error(
            '🔍 HOME_CONTAINER: Failed to calculate pay period boundaries for income payments',
          );
          return;
        }

        periodStart = payPeriodBoundaries.start;
        periodEnd = payPeriodBoundaries.end;

        console.log(
          '🔍 HOME_CONTAINER: Pay period boundaries for income payment calculation:',
          {
            start: periodStart.toLocaleString(),
            end: periodEnd.toLocaleString(),
            nextPayDate: incomeData.nextPayDate,
            frequency: incomeData.frequency,
          },
        );
      } catch (dateError) {
        console.error(
          '🔍 HOME_CONTAINER: Error calculating pay period for income payments:',
          dateError,
        );
        return;
      }

      let totalPayments = 0;

      // Get rollover entries for current pay period and add to total payments
      try {
        const allRolloverEntries = await RolloverService.loadRolloverEntries();

        // Filter entries to current pay period on frontend
        const rolloverEntries =
          allRolloverEntries?.filter(entry => {
            if (!entry.periodStart || !entry.periodEnd) {
              return false;
            }

            const entryStart = new Date(entry.periodStart);
            const entryEnd = new Date(entry.periodEnd);

            // Check if entry period overlaps with current pay period
            return (
              (entryStart >= periodStart && entryStart <= periodEnd) ||
              (entryEnd >= periodStart && entryEnd <= periodEnd) ||
              (entryStart <= periodStart && entryEnd >= periodEnd)
            );
          }) || [];

        if (rolloverEntries && Array.isArray(rolloverEntries)) {
          console.log(
            '🔍 HOME_CONTAINER: Rollover entries for current period:',
            rolloverEntries.map(entry => ({
              id: entry.id,
              amount: entry.amount,
              type: entry.type,
              date: entry.date,
              description: entry.description,
            })),
          );

          const rolloverTotal = rolloverEntries.reduce((sum, entry) => {
            if (entry.type === 'ROLLOVER') {
              // ROLLOVER entries are for analytics only - don't reduce available spending
              // The rollover amount is already added to income in BalanceCard
              console.log(
                '🔍 HOME_CONTAINER: Skipping ROLLOVER entry (analytics only):',
                {
                  amount: entry.amount,
                  type: entry.type,
                  description: entry.description,
                },
              );
              return sum; // Don't add to totalPayments to avoid double accounting
            }
            return sum;
          }, 0);

          totalPayments += rolloverTotal;
          console.log(
            '🔍 HOME_CONTAINER: Total from rollover entries:',
            rolloverTotal,
          );
        }
      } catch (rolloverError) {
        console.warn(
          '🔍 HOME_CONTAINER: Failed to load rollover entries:',
          rolloverError,
        );
        // Don't fail the entire function if rollover entries can't be loaded
      }

      // Get contributions for all goals and sum up income payments for current period only
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
              console.log(
                `🔍 HOME_CONTAINER: All contributions for goal ${goal.id} (${goal.title}):`,
                allContributions.map(c => ({
                  id: c.id,
                  type: c.type,
                  amount: c.amount,
                  date: c.date,
                  created: new Date(c.date).toLocaleString(),
                })),
              );

              // Filter contributions to current pay period only
              const currentPeriodContributions = allContributions.filter(
                contrib => {
                  // LESSON LEARNED: Backend returns 'date' field, not 'contributionDate'
                  if (!contrib.date) {
                    return false;
                  }

                  const contribDate = new Date(contrib.date);
                  const isInPeriod =
                    contribDate >= periodStart && contribDate <= periodEnd;
                  console.log(
                    `🔍 HOME_CONTAINER: Contribution ${contrib.id} date check:`,
                    {
                      date: contrib.date,
                      parsed: contribDate.toLocaleString(),
                      periodStart: periodStart.toLocaleString(),
                      periodEnd: periodEnd.toLocaleString(),
                      isInPeriod,
                    },
                  );
                  return isInPeriod;
                },
              );

              console.log(
                `🔍 HOME_CONTAINER: Current period contributions for goal ${goal.id}:`,
                currentPeriodContributions.map(c => ({
                  id: c.id,
                  type: c.type,
                  amount: c.amount,
                  date: c.date,
                })),
              );

              const incomeTotal = currentPeriodContributions.reduce(
                (sum, contrib) => {
                  let newSum = sum;

                  // Enhanced logging for debugging rollover issue
                  console.log(
                    `🔍 HOME_CONTAINER: Processing contribution for goal ${goal.id}:`,
                    {
                      contributionId: contrib.id,
                      type: contrib.type,
                      amount: contrib.amount,
                      date: contrib.date,
                      description: contrib.description,
                    },
                  );

                  if (contrib.type === 'MANUAL') {
                    // MANUAL contributions subtract from income (money going to goals from current income)
                    newSum = sum + (contrib.amount || 0);
                    console.log(
                      `🔍 HOME_CONTAINER: Adding ${contrib.type} contribution:`,
                      {
                        amount: contrib.amount,
                        previousSum: sum,
                        newSum,
                      },
                    );
                  } else if (contrib.type === 'ROLLOVER') {
                    // ROLLOVER contributions are already accounted for in rolloverAmount
                    // Don't add to totalIncomePayments to avoid double-counting
                    console.log(
                      '🔍 HOME_CONTAINER: ✓ SKIPPING ROLLOVER contribution (already in rolloverAmount):',
                      {
                        amount: contrib.amount,
                        type: contrib.type,
                        description: contrib.description,
                      },
                    );
                  } else if (contrib.type === 'WITHDRAWAL') {
                    // WITHDRAWAL contributions no longer affect income - just reduce goal amount
                    console.log(
                      '🔍 HOME_CONTAINER: Ignoring WITHDRAWAL contribution for income calculation:',
                      {
                        amount: contrib.amount,
                        type: contrib.type,
                      },
                    );
                  } else {
                    // Other types (AUTOMATIC, TRANSACTION, INTEREST, WINDFALL) don't affect income
                    console.log(
                      `🔍 HOME_CONTAINER: Ignoring ${contrib.type} contribution:`,
                      {
                        amount: contrib.amount,
                        sum: newSum,
                      },
                    );
                  }
                  return newSum;
                },
                0,
              );

              console.log(
                `🔍 HOME_CONTAINER: Goal ${goal.id} (${goal.title}) income total from ${currentPeriodContributions.length} contributions: ${incomeTotal}`,
              );

              totalPayments += incomeTotal;
            }
          } catch (error) {
            // Handle 404 errors more gracefully (goal might not exist anymore)
            if (
              error.message?.includes('404') ||
              error.message?.includes('Goal not found')
            ) {
              console.log(
                '🔍 HOME_CONTAINER: Goal not found when loading contributions (likely deleted):',
                goal.id,
              );
            } else {
              console.warn(
                '🔍 HOME_CONTAINER: Failed to load contributions for goal',
                goal.id,
                error,
              );
            }
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
  }, [goals, incomeData?.nextPayDate, incomeData?.frequency]);

  // Load income payments when goals change
  useEffect(() => {
    console.log(
      '🔍 HOME_CONTAINER: loadTotalIncomePayments useEffect triggered:',
      {
        goalsLength: goals.length,
        hasNextPayDate: !!incomeData?.nextPayDate,
        nextPayDate: incomeData?.nextPayDate,
      },
    );

    if (goals.length > 0) {
      console.log('🔍 HOME_CONTAINER: Calling loadTotalIncomePayments...');
      loadTotalIncomePayments();
    } else {
      console.log(
        '🔍 HOME_CONTAINER: Skipping loadTotalIncomePayments - no goals loaded yet',
      );
    }
  }, [goals.length, incomeData?.nextPayDate, loadTotalIncomePayments]); // Add nextPayDate dependency to recalculate on pay period changes

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

  // Ensure "Other" category exists on app load
  const hasCheckedOtherCategory = useRef(false);
  useEffect(() => {
    const ensureOtherCategory = async () => {
      if (!categories || categories.length === 0) {
        return; // Wait for categories to load first
      }

      if (hasCheckedOtherCategory.current) {
        return; // Already checked, don't loop
      }

      const otherCategory = categories.find(
        c => c.name?.toLowerCase() === 'other' && !c.parentId
      );

      if (!otherCategory) {
        console.log('📂 HOME_CONTAINER: "Other" category missing, triggering reload to create it');
        hasCheckedOtherCategory.current = true;
        await reloadCategories();
      } else {
        hasCheckedOtherCategory.current = true;
      }
    };

    ensureOtherCategory();
  }, [categories, reloadCategories]);

  // Listen for transaction changes (e.g., from debt payments) to reload transactions
  useEffect(() => {
    const handleTransactionsChanged = () => {
      console.log(
        '💳 HOME_CONTAINER: Transactions changed, reloading transactions',
      );
      loadTransactions();
    };

    // Use React Native DeviceEventEmitter for cross-platform compatibility
    let subscription;
    try {
      const {DeviceEventEmitter} = require('react-native');
      subscription = DeviceEventEmitter.addListener(
        'transactionsChanged',
        handleTransactionsChanged,
      );
      console.log(
        '💳 HOME_CONTAINER: Listening for transactionsChanged events',
      );
    } catch (e) {
      console.warn('DeviceEventEmitter not available, trying web events:', e);
      // Fallback to web browser events if available
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener(
          'transactionsChanged',
          handleTransactionsChanged,
        );
      }
    }

    return () => {
      if (subscription) {
        subscription.remove();
      } else if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener(
          'transactionsChanged',
          handleTransactionsChanged,
        );
      }
    };
  }, [loadTransactions]);

  // Debug: Log tournaments state
  useEffect(() => {
    console.log('🎲 HomeContainer: Tournaments state changed:', {
      tournamentsCount: tournaments.length,
      tournaments: tournaments,
      pokerTrackerEnabled: pokerTrackerEnabled,
    });
  }, [tournaments, pokerTrackerEnabled]);

  // Reload tournaments when poker module is enabled/disabled
  useEffect(() => {
    if (moduleSettings !== undefined) {
      // Wait for module settings to load
      console.log(
        '🎲 HomeContainer: Poker module setting changed:',
        pokerTrackerEnabled,
      );
      loadTournaments();
    }
  }, [pokerTrackerEnabled, loadTournaments, moduleSettings]);

  // ==============================================
  // RENDER
  // ==============================================
  return (
    <>
      <HomeScreen
        incomeData={incomeData}
        userProfile={userProfile}
        transactions={transactionsWithCategories}
        categories={categories}
        goals={goals}
        editingTransaction={editingTransaction}
        loading={loading}
        selectedDate={selectedDate}
        totalExpenses={totalExpenses}
        totalIncomePayments={totalIncomePayments}
        totalAdditionalIncome={totalAdditionalIncome}
        currency={currency}
        isBackgroundSyncing={backgroundSyncCount > 0}
        isNewPayPeriodForUI={isNewPayPeriodForUI}
        // Backend home summary (single source of truth for balance card)
        homeSummary={homeSummary}
        onRefreshHomeSummary={loadHomeSummary}
        // Rollover props
        rolloverAmount={rolloverAmount}
        rolloverBanner={rolloverBanner}
        onDismissRolloverBanner={async () => {
          const result = await RolloverService.confirmRolloverBanner();
          if (result.success) {
            setRolloverBanner(null);
            // Reload rollover amount to ensure UI reflects current backend state
            await loadRolloverAmount();
            console.log('🔄 HomeContainer: Rollover confirmed by user');
          } else {
            console.error(
              '🔄 HomeContainer: Failed to confirm rollover:',
              result.error,
            );
          }
        }}
        onReassignRollover={amount => {
          console.log(
            '🔄 HomeContainer: Rollover reassignment requested:',
            amount,
          );
          setRolloverAmountToAllocate(amount);
          setShowGoalAllocationModal(true);
        }}
        // Tournament/Poker props
        tournaments={tournaments}
        pokerSectionExpanded={pokerSectionExpanded}
        pokerTrackerEnabled={pokerTrackerEnabled}
        onDateChange={setSelectedDate}
        onSaveTransaction={handleSaveTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onEditTransaction={handleEditTransaction}
        onClearEditingTransaction={() => setEditingTransaction(null)}
        onEditIncome={handleEditIncome}
        onGoalsPress={handleGoalsPress}
        onOnboardingComplete={handleOnboardingComplete}
        onOnboardingSkip={handleOnboardingSkip}
        // Tournament event handlers
        onTogglePokerSection={handleTogglePokerSection}
        onTournamentPress={handleTournamentPress}
        onTournamentEdit={handleTournamentEdit}
        onTournamentDelete={handleTournamentDelete}
        onTournamentSwipeStart={handleTournamentSwipeStart}
        onTournamentSwipeEnd={handleTournamentSwipeEnd}
        onAddTournament={handleAddTournament}
        navigation={navigation}
        onboarding={onboarding}
      />

      {/* Tournament Creation/Edit Modal */}
      <AddTournamentContainer
        visible={showAddTournament}
        onClose={handleCloseAddTournament}
        onSave={handleSaveTournament}
        editingTournament={editingTournament}
      />

      {/* Goal Allocation Modal for Rollover Reassignment */}
      <GoalAllocationModal
        key={`goal-allocation-${goals.length}-${showGoalAllocationModal}`}
        visible={showGoalAllocationModal}
        onClose={() => setShowGoalAllocationModal(false)}
        onConfirm={async allocation => {
          try {
            console.log(
              '🔄 HomeContainer: Goal allocation confirmed:',
              allocation,
            );
            // Use RolloverService to process goal allocations with optimistic updates
            const result = await RolloverService.processGoalAllocations(
              allocation.goalAllocations,
              addGoalContribution,
              rolloverAmount,
            );

            if (result.success) {
              console.log(
                '🎯 HomeContainer: Goal allocations processed successfully',
              );
              // Update rollover amount to reflect the reduction
              setRolloverAmount(result.newRolloverAmount);

              // Update banner to reflect remaining rollover amount
              if (result.newRolloverAmount > 0) {
                // Update banner with new amount
                const updatedBanner = {
                  ...rolloverBanner,
                  amount: result.newRolloverAmount,
                };
                setRolloverBanner(updatedBanner);
                await RolloverService.setRolloverBanner(updatedBanner);
              } else {
                // Clear banner if no rollover remaining
                setRolloverBanner(null);
                await RolloverService.confirmRolloverBanner();
              }

              setShowGoalAllocationModal(false);
            } else {
              console.error(
                '🔄 HomeContainer: Goal allocation failed:',
                result.error,
              );
              Alert.alert(
                'Error',
                result.error || 'Failed to allocate funds to goals',
              );
            }
          } catch (error) {
            console.error(
              '🔄 HomeContainer: Error processing goal allocations:',
              error,
            );
            Alert.alert(
              'Error',
              'An unexpected error occurred while allocating funds',
            );
          }
        }}
        onCreateGoal={() => {
          // Open AddGoalModal directly
          setShowAddGoalModal(true);
        }}
        availableAmount={rolloverAmountToAllocate}
        goals={goals}
        frequency={incomeData?.frequency || 'fortnightly'}
      />

      {/* Add Goal Modal */}
      <AddGoalModal
        visible={showAddGoalModal}
        onClose={() => setShowAddGoalModal(false)}
        onSave={async goalData => {
          try {
            // Actually save the goal using the useGoals hook
            const result = await saveGoal(goalData);
            if (result && result.success) {
              console.log('🎯 Goal saved successfully, refreshing goals list');
              setShowAddGoalModal(false);
              // Force refresh goals to ensure GoalAllocationModal sees the new goal
              await loadGoals();
              return {success: true};
            } else {
              return {
                success: false,
                error: result?.error || 'Failed to save goal',
              };
            }
          } catch (error) {
            console.error(
              'HomeContainer: Error saving goal from overlay:',
              error,
            );
            return {
              success: false,
              error: error.message || 'Failed to save goal',
            };
          }
        }}
        navigation={navigation}
      />
    </>
  );
};

export default HomeContainer;
