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

        if (isConnected && TrendAPIService.isAuthenticated()) {
          // Try to load from API first
          result = await loadGoalsFromAPI();

          if (result.success) {
            // Merge with cached showOnBalanceCard preferences
            const cachedResult = await loadGoalsFromCache();
            const cachedPrefs = {};

            if (cachedResult.success) {
              cachedResult.goals.forEach(cachedGoal => {
                if (cachedGoal.showOnBalanceCard) {
                  cachedPrefs[cachedGoal.id] = true;
                }
              });
            }

            // Apply cached preferences to API goals
            const mergedGoals = result.goals.map(goal => ({
              ...goal,
              showOnBalanceCard: cachedPrefs[goal.id] || false,
            }));

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
      try {
        if (!goalData || typeof goalData !== 'object') {
          throw new Error('Invalid goal data provided');
        }

        const sanitizedData = sanitizeGoalData(goalData);

        if (!validateGoalData(sanitizedData)) {
          throw new Error('Goal data validation failed');
        }

        const isConnected = await checkNetworkConnectivity();
        const isEdit = editingGoal && editingGoal.id;
        let result;

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
              return {
                success: true,
                goal: transformedGoal,
                isNewGoal: !isEdit,
                source: 'api',
              };
            }
          } catch (apiError) {
            console.error('❌ API save failed:', apiError);

            // If it's a validation error, don't fall back to local save
            if (apiError.message && apiError.message.includes('targetAmount')) {
              throw new Error(`Backend validation error: ${apiError.message}`);
            }

            console.warn('API save failed, falling back to local:', apiError);
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
          // Add new goal
          newGoal = sanitizedData;
          updatedGoals = [...currentGoals, newGoal];
        }

        const saveResult = await saveGoalsToCache(updatedGoals, false);

        if (saveResult.success) {
          setGoals(saveResult.goals);
          return {
            success: true,
            goal: newGoal,
            isNewGoal: !isEdit,
            source: 'local',
          };
        } else {
          throw new Error(saveResult.error || 'Failed to save goal');
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

  return {
    loadGoalsFromAPI,
    loadGoals,
    saveGoal,
    deleteGoal,
    prepareEditGoal,
  };
};

export default useGoalData;