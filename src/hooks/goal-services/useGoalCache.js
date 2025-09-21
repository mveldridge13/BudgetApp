// hooks/goal-services/useGoalCache.js
import {useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useGoalValidation from './useGoalValidation';

const getGoalsStorageKey = (userId) => {
  if (!userId) {
    throw new Error('useGoalCache: userId is required for user-specific cache');
  }
  return `goals_${userId}`;
};

const useGoalCache = () => {
  const {validateGoalData, sanitizeGoalData} = useGoalValidation();

  // Save goals to cache
  const saveGoalsToCache = useCallback(
    async (updatedGoals, userId, withTimestamp = true) => {
      try {
        if (!Array.isArray(updatedGoals)) {
          throw new Error('Goals must be an array');
        }

        const validGoals = updatedGoals.filter(goal => validateGoalData(goal));
        const cacheData = {
          goals: validGoals,
          timestamp: withTimestamp ? Date.now() : null,
        };

        const storageKey = getGoalsStorageKey(userId);
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(cacheData),
        );
        return {success: true, goals: validGoals};
      } catch (error) {
        console.error('Error saving goals to cache:', error);
        return {success: false, error: error.message};
      }
    },
    [validateGoalData],
  );

  // Load goals from cache
  const loadGoalsFromCache = useCallback(async (userId) => {
    try {
      const storageKey = getGoalsStorageKey(userId);
      const cachedData = await AsyncStorage.getItem(storageKey);
      if (!cachedData) {
        return {success: true, goals: [], fromCache: true};
      }

      const parsed = JSON.parse(cachedData);

      // Handle both old format (array) and new format (object with timestamp)
      const cachedGoals = Array.isArray(parsed) ? parsed : parsed.goals || [];
      const timestamp = parsed.timestamp || null;

      const validatedGoals = cachedGoals
        .map(goal => sanitizeGoalData(goal))
        .filter(goal => validateGoalData(goal));

      return {
        success: true,
        goals: validatedGoals,
        fromCache: true,
        cacheTimestamp: timestamp,
      };
    } catch (error) {
      console.error('Error loading goals from cache:', error);
      return {success: true, goals: [], fromCache: true};
    }
  }, [sanitizeGoalData, validateGoalData]);



  // Clear user-specific cache
  const clearCache = useCallback(async (userId) => {
    try {
      const storageKey = getGoalsStorageKey(userId);
      await AsyncStorage.removeItem(storageKey);
      return {success: true};
    } catch (error) {
      console.error('Error clearing cache:', error);
      return {success: false, error: error.message};
    }
  }, []);

  return {
    saveGoalsToCache,
    loadGoalsFromCache,
    clearCache,
  };
};

export default useGoalCache;
