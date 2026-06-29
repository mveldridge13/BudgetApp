// hooks/goal-services/useGoalData.js
import {useCallback, useState, useRef} from 'react';
import TrendAPIService from '../../services/TrendAPIService';
import transactionCache from '../../services/TransactionCache';
import useGoalTransformers from './useGoalTransformers';
import useGoalValidation from './useGoalValidation';
import useGoalCache from './useGoalCache';

const useGoalData = checkNetworkConnectivity => {
  const {transformBackendGoal, transformFrontendGoal} = useGoalTransformers();
  const {validateGoalData, sanitizeGoalData} = useGoalValidation();
  const {saveGoalsToCache, loadGoalsFromCache} = useGoalCache();

  // Track payments in progress to prevent duplicates
  const [processingPayments, setProcessingPayments] = useState(new Set());
  const lastPaymentTime = useRef({});

  // Load goals from backend API
  const loadGoalsFromAPI = useCallback(async () => {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      const response = await TrendAPIService.getGoals();

      if (response?.goals && Array.isArray(response.goals)) {
        const transformedGoals = response.goals.map(transformBackendGoal);
        return {success: true, goals: transformedGoals, fromAPI: true};
      } else if (response && Array.isArray(response)) {
        // Handle case where response is directly an array
        const transformedGoals = response.map(transformBackendGoal);
        return {success: true, goals: transformedGoals, fromAPI: true};
      } else {
        return {success: true, goals: [], fromAPI: true};
      }
    } catch (error) {
      console.error('Error loading goals from API:', error);
      return {success: false, error: error.message, fromAPI: true};
    }
  }, [transformBackendGoal]);

  // Main load goals function - tries API first, falls back to cache
  const loadGoals = useCallback(
    async (
      goals,
      setGoals,
      hasInitiallyLoaded,
      lastSyncTime,
      setLoadingWithTimeout,
      clearLoadingTimeout,
      setLoading,
      isLoadingRef,
      forceLoading = false,
      forceAPI = false,
    ) => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current && !forceAPI) {
        return {success: true, goals};
      }

      // Prevent too frequent API calls (debounce with 1 second minimum)
      const now = Date.now();
      if (
        lastSyncTime.current &&
        now - lastSyncTime.current < 1000 &&
        !forceAPI
      ) {
        return {success: true, goals};
      }

      try {
        isLoadingRef.current = true;

        // Show loading state appropriately
        if (
          (!hasInitiallyLoaded.current || forceLoading) &&
          goals.length === 0
        ) {
          setLoadingWithTimeout(true);
        }

        // 🔄 CACHE-FIRST: Load from cache immediately
        const currentUserId = TrendAPIService.getCurrentUserId();
        if (!currentUserId) {
          console.warn('🔍 LOAD_GOALS: No user ID available for goals cache');
          return {success: true, goals};
        }

        const cachedResult = await loadGoalsFromCache(currentUserId);
        if (cachedResult.success && cachedResult.goals.length > 0) {
          setGoals(cachedResult.goals);

          // If we have goals and this is initial load, consider it loaded
          if (!hasInitiallyLoaded.current) {
            hasInitiallyLoaded.current = true;
          }
        }

        const isConnected = await checkNetworkConnectivity();

        let result;

        if (isConnected && TrendAPIService.isAuthenticated()) {
          // 🌐 BACKGROUND SYNC: Fetch from API to update with fresh data
          result = await loadGoalsFromAPI();

          if (result.success) {
            // Merge with cached showOnBalanceCard preferences
            const cachedPrefs = {};
            const recentProgressUpdates = {};

            if (cachedResult.success) {
              cachedResult.goals.forEach(cachedGoal => {
                if (cachedGoal.showOnBalanceCard) {
                  cachedPrefs[cachedGoal.id] = true;
                }
                // Track recent progress updates to avoid overriding them
                if (cachedGoal.lastProgressUpdate) {
                  const updateTime = new Date(
                    cachedGoal.lastProgressUpdate,
                  ).getTime();
                  const timeSinceUpdate = Date.now() - updateTime;
                  if (timeSinceUpdate < 60000) {
                    // Within 60 seconds (increased for better protection)
                    recentProgressUpdates[cachedGoal.id] = {
                      current: cachedGoal.current,
                      lastProgressUpdate: cachedGoal.lastProgressUpdate,
                    };
                  }
                }
              });
            }

            // Apply cached preferences to API goals, preserving recent progress updates
            const mergedGoals = result.goals.map(goal => {
              const recentUpdate = recentProgressUpdates[goal.id];
              return {
                ...goal,
                showOnBalanceCard: cachedPrefs[goal.id] || false,
                // Preserve recent progress updates to avoid overriding user actions
                ...(recentUpdate && {
                  current: recentUpdate.current,
                  lastProgressUpdate: recentUpdate.lastProgressUpdate,
                }),
              };
            });

            // CRITICAL: Only preserve goals created locally within last 60 seconds
            // Goals older than this should have synced; if not in API, they were deleted elsewhere
            if (cachedResult.success) {
              const apiGoalIds = new Set(result.goals.map(g => g.id));
              const sixtySecondsAgo = Date.now() - 60000;
              const localOnlyGoals = cachedResult.goals.filter(cachedGoal => {
                // Skip if goal exists in API response
                if (apiGoalIds.has(cachedGoal.id)) {
                  return false;
                }
                // Only preserve if created within last 60 seconds (pending sync)
                const createdAt = cachedGoal.createdAt
                  ? new Date(cachedGoal.createdAt).getTime()
                  : 0;
                const isRecentlyCreated = createdAt > sixtySecondsAgo;
                return isRecentlyCreated;
              });

              if (localOnlyGoals.length > 0) {
                mergedGoals.push(...localOnlyGoals);
              }
            }

            // Save merged results and update state
            await saveGoalsToCache(mergedGoals, currentUserId);
            setGoals(mergedGoals);
            lastSyncTime.current = Date.now();
            hasInitiallyLoaded.current = true;
            return {success: true, goals: mergedGoals, source: 'api'};
          } else {
            // API failed, cache was already loaded at start
            console.warn('API failed, using previously loaded cache data');
          }
        }

        // Return current goals state (either from cache loaded at start, or updated from API)
        return {
          success: true,
          goals: goals,
          source: cachedResult.success ? 'cache' : 'none',
        };
      } catch (error) {
        console.error('Error loading goals:', error);
        // Return current goals state (cache was already loaded at start if available)
        hasInitiallyLoaded.current = true;

        return {success: false, error: error.message, goals: goals};
      } finally {
        isLoadingRef.current = false;
        clearLoadingTimeout();
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      loadGoalsFromAPI,
      loadGoalsFromCache,
      saveGoalsToCache,
    ], // ✅ FIXED: Removed checkNetworkConnectivity dependency to prevent infinite loops
  );

  // Save or update a goal
  const saveGoal = useCallback(
    async (goalData, goals, editingGoal, setGoals) => {
      try {
        if (!goalData || typeof goalData !== 'object') {
          console.error('🔍 SAVE_GOAL: Invalid goal data provided:', goalData);
          throw new Error('Invalid goal data provided');
        }

        const sanitizedData = sanitizeGoalData(goalData);

        if (!validateGoalData(sanitizedData)) {
          console.error(
            '🔍 SAVE_GOAL: Goal data validation failed for:',
            sanitizedData,
          );
          throw new Error('Goal data validation failed');
        }

        const isConnected = await checkNetworkConnectivity();
        const isEdit = editingGoal && editingGoal.id;
        let result;

        // Re-enable API calls for backend goal creation
        if (isConnected && TrendAPIService.isAuthenticated()) {
          // Try API first
          try {
            const backendGoalData = transformFrontendGoal(sanitizedData);

            if (isEdit) {
              result = await TrendAPIService.updateGoal(
                editingGoal.id,
                backendGoalData,
              );
            } else {
              result = await TrendAPIService.createGoal(backendGoalData);
            }

            if (result) {
              // Transform back from backend format
              const transformedGoal = transformBackendGoal(result);
              // CRITICAL: Update state immediately so UI reflects the new goal
              const updatedGoals = isEdit
                ? goals.map(g => g.id === transformedGoal.id ? transformedGoal : g)
                : [...goals, transformedGoal];

              setGoals(updatedGoals);

              // Save to cache
              const currentUserId = TrendAPIService.getCurrentUserId();
              if (currentUserId) {
                await saveGoalsToCache(updatedGoals, currentUserId, false);
              }

              return {
                success: true,
                goal: transformedGoal,
                isNewGoal: !isEdit,
                source: 'api',
              };
            }
          } catch (apiError) {
            console.error('❌ SAVE_GOAL: API save failed:', apiError);

            // If it's a validation error, don't fall back to local save
            if (apiError.message && apiError.message.includes('targetAmount')) {
              console.error(
                '🔍 SAVE_GOAL: Backend validation error, not falling back',
              );
              throw new Error(`Backend validation error: ${apiError.message}`);
            }

            console.warn(
              '🔍 SAVE_GOAL: API save failed, falling back to local:',
              apiError,
            );
            // Continue to local save below
          }
        }

        // Offline mode or API failed - save locally
        const currentGoals = [...goals];
        let updatedGoals;
        let newGoal;

        if (isEdit) {
          // Update existing goal
          updatedGoals = currentGoals.map(goal =>
            goal.id === editingGoal.id ? {...goal, ...sanitizedData} : goal,
          );
          newGoal = updatedGoals.find(goal => goal.id === editingGoal.id);
        } else {
          // Add new goal - ensure it has an ID
          newGoal = {
            ...sanitizedData,
            id:
              sanitizedData.id ||
              `local_goal_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 11)}`,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          };
          updatedGoals = [...currentGoals, newGoal];
        }

        // Update state immediately
        setGoals(updatedGoals);

        // Save to cache in background
        const currentUserId = TrendAPIService.getCurrentUserId();
        if (!currentUserId) {
          console.warn('🔍 SAVE_GOAL: No user ID available for goals cache');
          return {success: false, error: 'No user ID available'};
        }
        const saveResult = await saveGoalsToCache(updatedGoals, currentUserId, false);

        if (saveResult.success) {
          return {
            success: true,
            goal: newGoal,
            isNewGoal: !isEdit,
            source: 'local',
          };
        } else {
          console.error(
            '🔍 SAVE_GOAL: Failed to save to cache:',
            saveResult.error,
          );
          return {
            success: true, // Still return success since state was updated
            goal: newGoal,
            isNewGoal: !isEdit,
            source: 'local',
          };
        }
      } catch (error) {
        console.error('❌ Error saving goal:', error);
        return {success: false, error: error.message};
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sanitizeGoalData,
      validateGoalData,
      saveGoalsToCache,
      transformFrontendGoal,
      transformBackendGoal,
    ], // ✅ FIXED: Removed checkNetworkConnectivity dependency to prevent infinite loops
  );

  // Delete a goal
  const deleteGoal = useCallback(
    async (goalId, goals, setGoals) => {
      try {
        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const goalToDelete = goals.find(goal => goal.id === goalId);
        if (!goalToDelete) {
          throw new Error('Goal not found');
        }

        const isConnected = await checkNetworkConnectivity();

        if (
          isConnected &&
          TrendAPIService.isAuthenticated() &&
          !goalId.startsWith('local_')
        ) {
          try {
            await TrendAPIService.deleteGoal(goalId);
          } catch (apiError) {
            console.warn('API deletion failed, removing locally:', apiError);
          }
        }

        // Remove from local data regardless of API result
        const updatedGoals = goals.filter(goal => goal.id !== goalId);
        const currentUserId = TrendAPIService.getCurrentUserId();
        if (!currentUserId) {
          throw new Error('No user ID available for goals cache');
        }
        const saveResult = await saveGoalsToCache(updatedGoals, currentUserId, false);

        if (saveResult.success) {
          setGoals(saveResult.goals);
          return {success: true, deletedGoal: goalToDelete};
        } else {
          throw new Error(saveResult.error || 'Failed to delete goal');
        }
      } catch (error) {
        console.error('Error deleting goal:', error);
        return {success: false, error: error.message};
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saveGoalsToCache], // ✅ FIXED: Removed checkNetworkConnectivity dependency to prevent infinite loops
  );

  // Prepare goal for editing
  const prepareEditGoal = useCallback(async goalId => {
    try {
      if (!goalId) {
        throw new Error('Goal ID is required');
      }

      // For now, we'll just return the goal ID since the actual goal
      // will be found in the main useGoals hook
      return {success: true, goalId};
    } catch (error) {
      console.error('Error preparing goal for edit:', error);
      return {success: false, error: error.message};
    }
  }, []);

  // Update goal progress
  const updateGoalProgress = useCallback(
    async (goalId, amount, paymentSource = 'income', goals, setGoals, contributionType = 'MANUAL') => {
      try {

        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount === 0) {
          throw new Error('Amount must be a non-zero number');
        }

        const goalIndex = goals.findIndex(goal => goal.id === goalId);
        if (goalIndex === -1) {
          throw new Error('Goal not found');
        }

        // Prevent duplicate payments for income source (both additions and withdrawals)
        if (paymentSource === 'income') {
          const transactionType = parsedAmount < 0 ? 'withdraw' : 'add';
          const paymentKey = `${goalId}-${transactionType}-${Math.abs(parsedAmount)}`;
          const now = Date.now();
          const lastPayment = lastPaymentTime.current[paymentKey] || 0;

          // Prevent payments within 3 seconds of each other for same goal/amount/type
          if (now - lastPayment < 3000) {
            throw new Error('Please wait before making another payment');
          }

          // Check if payment is already processing
          if (processingPayments.has(paymentKey)) {
            throw new Error('Payment already in progress');
          }

          // Mark payment as processing
          setProcessingPayments(prev => new Set(prev).add(paymentKey));
          lastPaymentTime.current[paymentKey] = now;
        }

        // Add timestamp to track when this update was made
        const updateTimestamp = new Date().toISOString();

        // For income payments, don't update currentAmount locally - let backend handle it
        const updatedGoals = goals.map(currentGoal => {
          if (currentGoal.id !== goalId) {
            return currentGoal;
          }

          // For income payments, backend addContribution handles the amount update
          if (paymentSource === 'income') {
            return {
              ...currentGoal,
              lastUpdated: updateTimestamp,
              lastProgressUpdate: updateTimestamp,
            };
          }

          // For non-income payments, update locally
          let newCurrent = currentGoal.current || 0;

          if (currentGoal.type === 'debt') {
            // For debt goals, reduce the current debt amount (amount should be positive for payments)
            newCurrent = Math.max(0, newCurrent - Math.abs(parsedAmount));
          } else {
            // For savings goals, add or subtract the amount
            // Positive amounts = additions, negative amounts = withdrawals
            newCurrent += parsedAmount;
            // Ensure we don't go below 0 for savings goals
            newCurrent = Math.max(0, newCurrent);
          }

          return {
            ...currentGoal,
            current: newCurrent,
            lastUpdated: updateTimestamp,
            lastProgressUpdate: updateTimestamp, // Track progress updates separately
          };
        });

        // Update state immediately with optimistic update
        setGoals(updatedGoals);

        // Save to cache first (for offline support)
        const currentUserId = TrendAPIService.getCurrentUserId();
        if (!currentUserId) {
          throw new Error('No user ID available for goals cache');
        }
        const saveResult = await saveGoalsToCache(updatedGoals, currentUserId, false);

        if (!saveResult.success) {
          console.error(
            '🔍 GOAL_DATA: Failed to save progress update to cache:',
            saveResult.error,
          );
          throw new Error(saveResult.error || 'Failed to update goal progress');
        }

        // For income payments, skip goal sync since backend addContribution handles it
        // For non-income payments, sync the goal update to backend
        if (paymentSource !== 'income') {
          const isConnected = await checkNetworkConnectivity();
          const targetGoal = updatedGoals.find(g => g.id === goalId);

          if (
            isConnected &&
            TrendAPIService.isAuthenticated() &&
            !goalId.startsWith('local_') &&
            targetGoal
          ) {
            try {
              const backendGoalData = transformFrontendGoal(targetGoal);
              await TrendAPIService.updateGoal(goalId, backendGoalData);
            } catch (backendSyncError) {
              console.error(
                '🔍 GOAL_DATA: Failed to sync goal to backend:',
                backendSyncError,
              );
              // Don't fail the goal update if backend sync fails
            }
          }
        }

        // Create backend goal contribution if payment source is income and goal is on backend
        if (paymentSource === 'income') {

          // Only create backend contribution for backend goals (not local goals)
          if (!goalId.startsWith('local_')) {
            try {
              const isWithdrawal = parsedAmount < 0;
              const contributionData = {
                amount: Math.abs(parsedAmount).toFixed(2), // Backend expects positive decimal string
                currency: 'AUD',
                description: isWithdrawal
                  ? `Withdrawal from ${updatedGoals.find(g => g.id === goalId)?.title || 'goal'}`
                  : contributionType === 'ROLLOVER'
                  ? `Rollover allocation to ${updatedGoals.find(g => g.id === goalId)?.title || 'goal'}`
                  : `Income payment to ${updatedGoals.find(g => g.id === goalId)?.title || 'goal'}`,
                type: isWithdrawal ? 'WITHDRAWAL' : contributionType, // Use provided contribution type (MANUAL or ROLLOVER)
                date: updateTimestamp,
              };

              await TrendAPIService.addGoalContribution(
                goalId,
                contributionData,
              );

              // Create a transaction for the payment to show in transaction list
              try {
                const targetGoal = updatedGoals.find(g => g.id === goalId);

                // Create transactions ONLY for MANUAL contributions (not ROLLOVER)
                // Use different transaction types to prevent double-counting:
                // - Debt payments: 'EXPENSE' (counted in totalExpenses)
                // - MANUAL savings contributions: 'TRANSFER' (not counted in expenses, already in totalIncomePayments)
                // - ROLLOVER contributions: NO transaction (already tracked elsewhere)
                if (targetGoal && !isWithdrawal && contributionType === 'MANUAL') {
                  // Fetch categories to find the appropriate categoryId and subcategoryId
                  let categoryId = null;
                  let subcategoryId = null;

                  try {
                    const response = await TrendAPIService.getCategories();

                    // Handle response - might be wrapped or direct array
                    const categories = Array.isArray(response) ? response : response?.categories;

                    if (Array.isArray(categories)) {
                      // Look for "Other" category first (which contains "Debt Payment" subcategory)
                      let otherCategory = categories.find(
                        c => c.name?.toLowerCase() === 'other'
                      );

                      // If "Other" category doesn't exist, create it
                      if (!otherCategory) {
                        try {
                          const createdCategory = await TrendAPIService.createCategory({
                            name: 'Other',
                            description: 'Other financial activities',
                            type: 'EXPENSE',
                            icon: 'ellipsis-horizontal-outline',
                            color: '#A8A8A8',
                          });
                          otherCategory = createdCategory;
                        } catch (createError) {
                          console.error('🔍 GOAL_DATA: Failed to create "Other" category:', createError);
                        }
                      }

                      // Try to find the "Debt Payment" subcategory under "Other"
                      let debtPaymentSubcategory = null;
                      if (otherCategory?.subcategories) {
                        debtPaymentSubcategory = otherCategory.subcategories.find(
                          sub => sub.name?.toLowerCase().includes('debt')
                        );
                      }

                      // If "Debt Payment" subcategory doesn't exist, create it
                      if (otherCategory && !debtPaymentSubcategory) {
                        try {
                          const createdSubcategory = await TrendAPIService.createCategory({
                            name: 'Debt Payment',
                            description: 'Loan payments, credit cards',
                            type: 'EXPENSE',
                            icon: 'card-outline',
                            color: '#A8A8A8',
                            parentId: otherCategory.id,
                          });
                          debtPaymentSubcategory = createdSubcategory;
                        } catch (createError) {
                          console.error('🔍 GOAL_DATA: Failed to create "Debt Payment" subcategory:', createError);
                        }
                      }

                      // Fallback options
                      const billsCategory = categories.find(
                        c => c.name?.toLowerCase().includes('bill')
                      );
                      const fallbackCategory = categories.find(c => c.type === 'EXPENSE') || categories[0];

                      // Prefer "Other" category (which has Debt Payment subcategory)
                      const selectedCategory = otherCategory || billsCategory || fallbackCategory;
                      const selectedSubcategory = debtPaymentSubcategory;

                      categoryId = selectedCategory?.id || null;
                      subcategoryId = selectedSubcategory?.id || null;
                    } else {
                      console.warn('🔍 GOAL_DATA: Categories is not an array:', typeof categories);
                    }
                  } catch (catError) {
                    console.warn('🔍 GOAL_DATA: Failed to fetch categories:', catError);
                  }

                  // Use TRANSFER type for all MANUAL goal contributions (both debt and savings)
                  // TRANSFER transactions are visible in transaction list but not counted in expenses
                  // because they're already counted in totalIncomePayments via goal contributions
                  const transactionType = 'TRANSFER';

                  const transactionData = {
                    amount: Math.abs(parsedAmount).toFixed(2),
                    categoryId: categoryId, // Use resolved category ID
                    subcategoryId: subcategoryId, // Use resolved subcategory ID for "Debt Payment"
                    category: targetGoal.category || 'Savings', // Use goal's category for display
                    description: `Payment to ${targetGoal.title}`,
                    type: transactionType,
                    date: updateTimestamp,
                    recurrence: 'none', // Must be 'none' (lowercase) to appear in daily transactions
                    // Paying from the goal card IS the payment, so mark it PAID. This
                    // mirrors the web app and lets the payment match the backend
                    // pay-period query's "PAID -> filter by date" branch.
                    status: 'PAID',
                  };

                  await TrendAPIService.createTransaction(transactionData);

                  // Invalidate transaction cache to trigger reload
                  await transactionCache.invalidate(currentUserId);

                  // Emit event to trigger transaction reload in HomeContainer
                  try {
                    const {DeviceEventEmitter} = require('react-native');
                    DeviceEventEmitter.emit('transactionsChanged');
                  } catch (e) {
                    console.warn('DeviceEventEmitter not available:', e);
                  }
                }
              } catch (transactionError) {
                console.error(
                  '🔍 GOAL_DATA: Failed to create transaction for debt payment:',
                  transactionError,
                );
                // Don't throw - contribution was successful, transaction is supplementary
              }
            } catch (contributionError) {
              console.error(
                '🔍 GOAL_DATA: Failed to create goal contribution:',
                contributionError,
              );
              // Throw error to let the caller handle it properly
              throw new Error(
                `Failed to save payment: ${
                  contributionError.message || 'Network error'
                }`,
              );
            }
          } else {
            // For local goals, we'll track income payments locally until they're synced
            // Update the local goal with income payment tracking
            const localGoalIndex = updatedGoals.findIndex(g => g.id === goalId);
            if (localGoalIndex !== -1) {
              // Only add to totalIncomePayments for MANUAL contributions
              // ROLLOVER contributions are already accounted for in rolloverAmount
              const shouldUpdateTotalIncomePayments = contributionType !== 'ROLLOVER';

              updatedGoals[localGoalIndex] = {
                ...updatedGoals[localGoalIndex],
                totalIncomePayments: shouldUpdateTotalIncomePayments
                  ? (updatedGoals[localGoalIndex].totalIncomePayments || 0) +
                    parsedAmount
                  : (updatedGoals[localGoalIndex].totalIncomePayments || 0),
                lastIncomePayment: {
                  amount: parsedAmount,
                  date: updateTimestamp,
                  type: contributionType, // Track contribution type for debugging
                },
              };

              // Save updated local goals
              setGoals(updatedGoals);
              await saveGoalsToCache(updatedGoals, currentUserId, false);
            }
          }

          // Trigger balance card update event for both backend and local goals
          // Use React Native DeviceEventEmitter for cross-platform compatibility
          try {
            const {DeviceEventEmitter} = require('react-native');
            DeviceEventEmitter.emit('goalIncomePaymentMade', {
              goalId: goalId,
              amount: parsedAmount,
            });
          } catch (e) {
            console.warn('DeviceEventEmitter not available:', e);
            // Fallback: try web browser events if available
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              try {
                // eslint-disable-next-line no-undef
                const event = new CustomEvent('goalIncomePaymentMade', {
                  detail: {
                    goalId: goalId,
                    amount: parsedAmount,
                  },
                });
                window.dispatchEvent(event);
              } catch (webError) {
                console.warn('Web events also not available:', webError);
              }
            }
          }
        }

        // For income payments, reload goals from backend to get updated amounts
        if (paymentSource === 'income') {
          try {
            // Preserve showOnBalanceCard preferences before reloading
            const currentPreferences = {};
            updatedGoals.forEach(goal => {
              if (goal.showOnBalanceCard) {
                currentPreferences[goal.id] = true;
              }
            });

            const backendGoals = await loadGoalsFromAPI();
            if (backendGoals.success) {
              // Merge preserved preferences back into backend goals
              const goalsWithPreferences = backendGoals.goals.map(goal => ({
                ...goal,
                showOnBalanceCard: currentPreferences[goal.id] || false,
              }));

              setGoals(goalsWithPreferences);
              await saveGoalsToCache(goalsWithPreferences, currentUserId, false);
            }
          } catch (reloadError) {
            console.warn(
              '🔍 GOAL_DATA: Failed to reload goals after income payment:',
              reloadError,
            );
          }
        }

        return {success: true, updateTimestamp};
      } catch (error) {
        console.error('🔍 GOAL_DATA: Error updating goal progress:', error);
        return {success: false, error: error.message};
      } finally {
        // Clean up processing payment state
        if (paymentSource === 'income') {
          const transactionType = Number(amount) < 0 ? 'withdraw' : 'add';
          const paymentKey = `${goalId}-${transactionType}-${Math.abs(Number(amount))}`;
          setProcessingPayments(prev => {
            const newSet = new Set(prev);
            newSet.delete(paymentKey);
            return newSet;
          });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      saveGoalsToCache,
      processingPayments,
      transformFrontendGoal,
      loadGoalsFromAPI,
    ], // ✅ FIXED: Removed checkNetworkConnectivity dependency to prevent infinite loops
  );

  return {
    loadGoalsFromAPI,
    loadGoals,
    saveGoal,
    deleteGoal,
    prepareEditGoal,
    updateGoalProgress,
  };
};

export default useGoalData;
