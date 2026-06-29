// hooks/goal-services/useGoalSync.js
import {useCallback} from 'react';
import TrendAPIService from '../../services/TrendAPIService';
import useGoalTransformers from './useGoalTransformers';
import useGoalCache from './useGoalCache';


const useGoalSync = () => {
  const {transformFrontendGoal, transformBackendGoal} = useGoalTransformers();
  const {saveGoalsToCache} = useGoalCache();

  // Sync local goals with backend (for when coming back online)
  const syncGoalsWithBackend = useCallback(async (goals, setGoals, checkNetworkConnectivity) => {
    try {
      const isConnected = await checkNetworkConnectivity();

      if (!isConnected || !TrendAPIService.isAuthenticated()) {
        return {success: false, error: 'Not connected or authenticated'};
      }

      // Load local goals that need syncing
      const localGoals = goals.filter(goal => goal.id.startsWith('local_'));

      if (localGoals.length === 0) {
        return {success: true, syncedCount: 0};
      }

      let syncedCount = 0;
      const updatedGoals = [...goals];

      for (const localGoal of localGoals) {
        try {
          const backendGoalData = transformFrontendGoal(localGoal);
          const result = await TrendAPIService.createGoal(backendGoalData);

          if (result) {
            // Replace local goal with backend goal
            const transformedGoal = transformBackendGoal(result);
            const goalIndex = updatedGoals.findIndex(
              g => g.id === localGoal.id,
            );

            if (goalIndex !== -1) {
              updatedGoals[goalIndex] = {
                ...transformedGoal,
                showOnBalanceCard: localGoal.showOnBalanceCard, // Preserve local settings
              };
              syncedCount++;
            }
          }
        } catch (error) {
          console.warn(`Failed to sync goal ${localGoal.id}:`, error);
        }
      }

      // Save updated goals and update state
      const currentUserId = TrendAPIService.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('No user ID available for goals cache');
      }
      await saveGoalsToCache(updatedGoals, currentUserId);
      setGoals(updatedGoals);

      return {success: true, syncedCount};
    } catch (error) {
      console.error('Error syncing goals with backend:', error);
      return {success: false, error: error.message};
    }
  }, [transformFrontendGoal, transformBackendGoal, saveGoalsToCache]);


  // Force refresh from backend
  const refreshFromBackend = useCallback(async (loadGoals) => {
    return await loadGoals(true, true);
  }, []);

  // Check if sync is needed
  const needsSync = useCallback((goals) => {
    return goals.some(goal => goal.id.startsWith('local_'));
  }, []);

  // Get last sync time
  const getLastSyncTime = useCallback((lastSyncTime) => {
    return lastSyncTime.current;
  }, []);

  return {
    syncGoalsWithBackend,
    refreshFromBackend,
    needsSync,
    getLastSyncTime,
  };
};

export default useGoalSync;
