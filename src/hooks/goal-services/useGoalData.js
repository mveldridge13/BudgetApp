// hooks/goal-services/useGoalData.js
import {useCallback} from 'react';
import TrendAPIService from '../../services/TrendAPIService';
import useGoalTransformers from './useGoalTransformers';
import useGoalValidation from './useGoalValidation';
import useGoalCache from './useGoalCache';

const useGoalData = (checkNetworkConnectivity) => {
  const {transformBackendGoal, transformFrontendGoal} = useGoalTransformers();
  const {validateGoalData, sanitizeGoalData} = useGoalValidation();
  const {saveGoalsToCache, loadGoalsFromCache} = useGoalCache();

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
    async (goals, setGoals, hasInitiallyLoaded, lastSyncTime, setLoadingWithTimeout, clearLoadingTimeout, setLoading, isLoadingRef, forceLoading = false, forceAPI = false) => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current && !forceAPI) {
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

        const isConnected = await checkNetworkConnectivity();

        let result;

        // TEMPORARILY DISABLED: API loading to stop loops
        if (false && isConnected && TrendAPIService.isAuthenticated()) {
          // Try to load from API first
          result = await loadGoalsFromAPI();

          if (result.success) {
            // Merge with cached showOnBalanceCard preferences
            const cachedResult = await loadGoalsFromCache();
            const cachedPrefs = {};
            const recentProgressUpdates = {};

            if (cachedResult.success) {
              cachedResult.goals.forEach(cachedGoal => {
                if (cachedGoal.showOnBalanceCard) {
                  cachedPrefs[cachedGoal.id] = true;
                }
                // Track recent progress updates to avoid overriding them
                if (cachedGoal.lastProgressUpdate) {
                  const updateTime = new Date(cachedGoal.lastProgressUpdate).getTime();
                  const timeSinceUpdate = Date.now() - updateTime;
                  if (timeSinceUpdate < 60000) { // Within 60 seconds (increased for better protection)
                    recentProgressUpdates[cachedGoal.id] = {
                      current: cachedGoal.current,
                      lastProgressUpdate: cachedGoal.lastProgressUpdate
                    };
                    console.log(`🔍 GOAL_DATA: Preserving recent progress update for goal ${cachedGoal.id}, updated ${timeSinceUpdate}ms ago`);
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
                  lastProgressUpdate: recentUpdate.lastProgressUpdate
                })
              };
            });

            // Save merged results and update state
            await saveGoalsToCache(mergedGoals);
            setGoals(mergedGoals);
            lastSyncTime.current = Date.now();
            hasInitiallyLoaded.current = true;
            return {success: true, goals: mergedGoals, source: 'api'};
          } else {
            // API failed, try cache
            console.warn('API failed, falling back to cache');
          }
        }

        // Load from cache (either offline or API failed)
        const cacheResult = await loadGoalsFromCache();
        setGoals(cacheResult.goals);
        hasInitiallyLoaded.current = true;

        return {
          success: true,
          goals: cacheResult.goals,
          source: 'cache',
          cacheTimestamp: cacheResult.cacheTimestamp,
        };
      } catch (error) {
        console.error('Error loading goals:', error);
        // Even on error, try to return cached data
        const cacheResult = await loadGoalsFromCache();
        setGoals(cacheResult.goals);
        hasInitiallyLoaded.current = true;

        return {success: false, error: error.message, goals: cacheResult.goals};
      } finally {
        isLoadingRef.current = false;
        clearLoadingTimeout();
        setLoading(false);
      }
    },
    [
      checkNetworkConnectivity,
      loadGoalsFromAPI,
      loadGoalsFromCache,
      saveGoalsToCache,
    ],
  );

  // Save or update a goal
  const saveGoal = useCallback(
    async (goalData, goals, editingGoal, setGoals) => {
      console.log('🔍 SAVE_GOAL: Starting saveGoal with:', {
        goalData,
        editingGoal: editingGoal?.id,
        goalsLength: goals.length
      });
      
      try {
        if (!goalData || typeof goalData !== 'object') {
          console.error('🔍 SAVE_GOAL: Invalid goal data provided:', goalData);
          throw new Error('Invalid goal data provided');
        }

        console.log('🔍 SAVE_GOAL: Sanitizing goal data...');
        const sanitizedData = sanitizeGoalData(goalData);
        console.log('🔍 SAVE_GOAL: Sanitized data:', sanitizedData);

        console.log('🔍 SAVE_GOAL: Validating goal data...');
        if (!validateGoalData(sanitizedData)) {
          console.error('🔍 SAVE_GOAL: Goal data validation failed for:', sanitizedData);
          throw new Error('Goal data validation failed');
        }

        console.log('🔍 SAVE_GOAL: Checking network connectivity...');
        const isConnected = await checkNetworkConnectivity();
        const isEdit = editingGoal && editingGoal.id;
        console.log('🔍 SAVE_GOAL: Network status:', { isConnected, isEdit });
        let result;

        // TEMPORARILY DISABLED: API calls to prevent hanging
        if (false && isConnected && TrendAPIService.isAuthenticated()) {
          // Try API first
          try {
            console.log('🔍 SAVE_GOAL: Transforming to backend format...');
            const backendGoalData = transformFrontendGoal(sanitizedData);
            console.log('🔍 SAVE_GOAL: Backend goal data:', backendGoalData);

            if (isEdit) {
              console.log('🔍 TEMPORARILY DISABLED: TrendAPIService.updateGoal for editing');
              // result = await TrendAPIService.updateGoal(
              //   editingGoal.id,
              //   backendGoalData,
              // );
              result = null; // Simulate API failure to fall back to local
            } else {
              console.log('🔍 SAVE_GOAL: Calling TrendAPIService.createGoal with data:', backendGoalData);
              result = await TrendAPIService.createGoal(backendGoalData);
              console.log('🔍 SAVE_GOAL: API createGoal result:', result);
            }

            if (result) {
              console.log('🔍 SAVE_GOAL: API success, transforming back from backend...');
              // Transform back from backend format
              const transformedGoal = transformBackendGoal(result);
              console.log('🔍 SAVE_GOAL: Transformed goal:', transformedGoal);
              return {
                success: true,
                goal: transformedGoal,
                isNewGoal: !isEdit,
                source: 'api',
              };
            } else {
              console.log('🔍 SAVE_GOAL: API returned null/empty result, falling back to local');
            }
          } catch (apiError) {
            console.error('❌ SAVE_GOAL: API save failed:', apiError);

            // If it's a validation error, don't fall back to local save
            if (apiError.message && apiError.message.includes('targetAmount')) {
              console.error('🔍 SAVE_GOAL: Backend validation error, not falling back');
              throw new Error(`Backend validation error: ${apiError.message}`);
            }

            console.warn('🔍 SAVE_GOAL: API save failed, falling back to local:', apiError);
            // Continue to local save below
          }
        } else {
          console.log('🔍 SAVE_GOAL: API disabled, using local save only');
        }

        // Offline mode or API failed - save locally
        console.log('🔍 SAVE_GOAL: Starting local save...');
        const currentGoals = [...goals];
        let updatedGoals;
        let newGoal;

        if (isEdit) {
          console.log('🔍 SAVE_GOAL: Updating existing goal locally');
          // Update existing goal
          updatedGoals = currentGoals.map(goal =>
            goal.id === editingGoal.id ? {...goal, ...sanitizedData} : goal,
          );
          newGoal = updatedGoals.find(goal => goal.id === editingGoal.id);
        } else {
          console.log('🔍 SAVE_GOAL: Adding new goal locally');
          // Add new goal - ensure it has an ID
          newGoal = {
            ...sanitizedData,
            id: sanitizedData.id || `local_goal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          };
          updatedGoals = [...currentGoals, newGoal];
          console.log('🔍 SAVE_GOAL: New goal created:', newGoal);
        }

        console.log('🔍 SAVE_GOAL: Updated goals array:', updatedGoals.length, 'goals');
        
        // Update state immediately 
        console.log('🔍 SAVE_GOAL: Setting goals state...');
        setGoals(updatedGoals);
        
        // Save to cache in background
        console.log('🔍 SAVE_GOAL: Saving to cache...');
        const saveResult = await saveGoalsToCache(updatedGoals, false);

        if (saveResult.success) {
          console.log('🔍 SAVE_GOAL: Goal saved to cache successfully');
          return {
            success: true,
            goal: newGoal,
            isNewGoal: !isEdit,
            source: 'local',
          };
        } else {
          console.error('🔍 SAVE_GOAL: Failed to save to cache:', saveResult.error);
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
    [
      sanitizeGoalData,
      validateGoalData,
      checkNetworkConnectivity,
      transformFrontendGoal,
      transformBackendGoal,
      saveGoalsToCache,
    ],
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
        const saveResult = await saveGoalsToCache(updatedGoals, false);

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
    [checkNetworkConnectivity, saveGoalsToCache],
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
    async (goalId, amount, goals, setGoals) => {
      try {
        console.log('🔍 GOAL_DATA: Starting updateGoalProgress for goal:', goalId, 'amount:', amount);
        
        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Amount must be a positive number');
        }

        const goalIndex = goals.findIndex(goal => goal.id === goalId);
        if (goalIndex === -1) {
          throw new Error('Goal not found');
        }

        // Add timestamp to track when this update was made
        const updateTimestamp = new Date().toISOString();
        
        const updatedGoals = goals.map(currentGoal => {
          if (currentGoal.id !== goalId) {
            return currentGoal;
          }

          let newCurrent = currentGoal.current || 0;

          if (currentGoal.type === 'debt') {
            // For debt goals, reduce the current debt amount
            newCurrent = Math.max(0, newCurrent - parsedAmount);
          } else {
            // For savings goals, increase the current amount
            newCurrent += parsedAmount;
          }

          console.log('🔍 GOAL_DATA: Updated goal', goalId, 'from', currentGoal.current, 'to', newCurrent);

          return {
            ...currentGoal,
            current: newCurrent,
            lastUpdated: updateTimestamp,
            lastProgressUpdate: updateTimestamp, // Track progress updates separately
          };
        });

        // Update state immediately with optimistic update
        console.log('🔍 GOAL_DATA: Setting goals with updated progress');
        setGoals(updatedGoals);
        
        // Save to cache first (for offline support)
        const saveResult = await saveGoalsToCache(updatedGoals, false);
        
        if (!saveResult.success) {
          console.error('🔍 GOAL_DATA: Failed to save progress update to cache:', saveResult.error);
          throw new Error(saveResult.error || 'Failed to update goal progress');
        }

        // TEMPORARILY DISABLED: Backend sync to stop the infinite loop
        // The backend validation is causing loops - need to fix the data format first
        console.log('🔍 GOAL_DATA: Backend sync temporarily disabled to prevent loops');
        
        // TODO: Re-enable backend sync after fixing data validation issues
        // const isConnected = await checkNetworkConnectivity();
        // const targetGoal = updatedGoals.find(g => g.id === goalId);
        // if (isConnected && TrendAPIService.isAuthenticated() && !goalId.startsWith('local_') && targetGoal) {
        //   // Backend sync code here...
        // }

        console.log('🔍 GOAL_DATA: Progress update completed successfully');
        return {success: true, updateTimestamp};
      } catch (error) {
        console.error('🔍 GOAL_DATA: Error updating goal progress:', error);
        return {success: false, error: error.message};
      }
    },
    [saveGoalsToCache],
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