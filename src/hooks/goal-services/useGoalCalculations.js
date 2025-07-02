// hooks/goal-services/useGoalCalculations.js
import {useCallback} from 'react';
import TrendAPIService from '../../services/TrendAPIService';

const useGoalCalculations = () => {
  // Get goal progress for a specific goal
  const getGoalProgress = useCallback(goal => {
    try {
      if (!goal || typeof goal !== 'object') {
        return 0;
      }

      const current = Number(goal.current) || 0;
      let progress = 0;

      if (goal.type === 'debt') {
        const originalAmount =
          Number(goal.originalAmount) || Number(goal.target) || 0;
        if (originalAmount > 0) {
          const paid = originalAmount - current;
          progress = Math.min((paid / originalAmount) * 100, 100);
        }
      } else {
        const target = Number(goal.target) || 0;
        if (target > 0) {
          progress = Math.min((current / target) * 100, 100);
        }
      }

      return Math.max(0, progress); // Ensure no negative progress
    } catch (error) {
      console.error('Error calculating goal progress:', error);
      return 0;
    }
  }, []);

  // Check if goal is overdue
  const isGoalOverdue = useCallback(
    goal => {
      try {
        if (!goal || !goal.deadline) {
          return false;
        }

        const today = new Date();
        const deadline = new Date(goal.deadline);

        if (isNaN(deadline.getTime())) {
          return false; // Invalid date
        }

        return today > deadline && getGoalProgress(goal) < 100;
      } catch (error) {
        console.error('Error checking if goal is overdue:', error);
        return false;
      }
    },
    [getGoalProgress],
  );

  // Get goals for balance card display
  const getBalanceCardGoals = useCallback((goals) => {
    try {
      return goals.filter(
        goal =>
          goal && goal.showOnBalanceCard === true && goal.isActive !== false,
      );
    } catch (error) {
      console.error('Error getting balance card goals:', error);
      return [];
    }
  }, []);

  // Calculate total monthly goal contributions
  const calculateTotalGoalContributions = useCallback((goals) => {
    try {
      return goals
        .filter(
          goal =>
            goal &&
            goal.showOnBalanceCard === true &&
            goal.autoContribute &&
            Number(goal.autoContribute) > 0,
        )
        .reduce((total, goal) => total + Number(goal.autoContribute), 0);
    } catch (error) {
      console.error('Error calculating total goal contributions:', error);
      return 0;
    }
  }, []);

  // Get analytics data for a specific goal
  const getGoalAnalytics = useCallback(
    async (goalId, goals, checkNetworkConnectivity) => {
      try {
        const isConnected = await checkNetworkConnectivity();

        if (
          isConnected &&
          TrendAPIService.isAuthenticated() &&
          !goalId.startsWith('local_')
        ) {
          try {
            const analytics = await TrendAPIService.getGoalAnalytics(goalId);
            return {success: true, analytics, source: 'api'};
          } catch (apiError) {
            console.warn('API analytics failed:', apiError);
          }
        }

        // Fallback to local analytics calculation
        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
          throw new Error('Goal not found');
        }

        const localAnalytics = {
          goalId: goal.id,
          goalName: goal.title,
          targetAmount: goal.target || goal.originalAmount,
          currentAmount: goal.current,
          progressPercentage: getGoalProgress(goal),
          isOnTrack: !isGoalOverdue(goal),
          daysToTarget: goal.deadline
            ? Math.ceil(
                (new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24),
              )
            : null,
        };

        return {success: true, analytics: localAnalytics, source: 'local'};
      } catch (error) {
        console.error('Error getting goal analytics:', error);
        return {success: false, error: error.message};
      }
    },
    [getGoalProgress, isGoalOverdue],
  );

  return {
    getGoalProgress,
    isGoalOverdue,
    getBalanceCardGoals,
    calculateTotalGoalContributions,
    getGoalAnalytics,
  };
};

export default useGoalCalculations;