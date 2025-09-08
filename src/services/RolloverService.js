// services/RolloverService.js - Rollover calculation and management service

import TrendAPIService from './TrendAPIService';
import PayPeriodService from './PayPeriodService';

/**
 * RolloverService handles all rollover related calculations and business logic
 * Provides methods for calculating surplus, processing rollover decisions, and managing rollover state
 */
class RolloverService {
  /**
   * Load current rollover amount from backend
   * Returns { rolloverAmount: number, lastRolloverDate: string | null }
   */
  static async loadRolloverAmount() {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        return {rolloverAmount: 0, lastRolloverDate: null};
      }

      const rolloverData = await TrendAPIService.getRolloverAmount();
      return {
        rolloverAmount: rolloverData.rolloverAmount || 0,
        lastRolloverDate: rolloverData.lastRolloverDate,
      };
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error loading rollover amount:',
        error,
      );
      return {rolloverAmount: 0, lastRolloverDate: null};
    }
  }

  /**
   * Calculate available surplus (Left to Spend amount)
   * This is the amount available for rollover decisions
   */
  static calculateAvailableSurplus(
    incomeData,
    rolloverAmount,
    totalExpenses,
    goals,
  ) {
    if (!incomeData || typeof incomeData.income !== 'number') {
      return 0;
    }

    const totalGoalContributions = goals.reduce(
      (sum, goal) => sum + (goal.autoContribute || 0),
      0,
    );

    return Math.max(
      0,
      incomeData.income +
        rolloverAmount -
        totalExpenses -
        totalGoalContributions,
    );
  }

  /**
   * Check if rollover should be made available based on surplus
   */
  static shouldMakeRolloverAvailable(surplus, isCurrentlyAvailable) {
    return surplus > 0 && !isCurrentlyAvailable;
  }

  /**
   * Process rollover to next pay period
   * Updates the total rollover amount with additional surplus
   */
  static async processRolloverToNextPeriod(
    availableSurplus,
    currentRollover,
    frequency,
  ) {
    try {
      const newTotalRollover = currentRollover + availableSurplus;

      await TrendAPIService.processRollover({
        amount: newTotalRollover,
      });

      return {
        success: true,
        newRolloverAmount: newTotalRollover,
        message: `$${availableSurplus.toFixed(
          2,
        )} rolled over to next ${frequency} period`,
      };
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error processing rollover to next period:',
        error,
      );
      throw error;
    }
  }

  /**
   * Process goal allocations from rollover funds
   * LESSON LEARNED: Simply reset rollover to 0, don't try to track contributions
   * This matches the createGoal path and avoids the contribution date field issues
   */
  static async processGoalAllocations(
    goalAllocations,
    addGoalContribution,
    incomeData,
  ) {
    try {
      console.log('🎯 RolloverService: Processing goal allocations:', {
        totalAllocations: goalAllocations.length,
        totalAllocated: goalAllocations.reduce(
          (sum, alloc) => sum + alloc.amount,
          0,
        ),
      });

      // Add contributions to selected goals
      for (const allocation of goalAllocations) {
        try {
          // LESSON LEARNED: addGoalContribution only takes goalId and amount
          await addGoalContribution(
            allocation.goalId,
            allocation.amount,
          );
          console.log(
            `🎯 RolloverService: Added $${allocation.amount.toFixed(
              2,
            )} to goal: ${allocation.goal.title}`,
          );
        } catch (goalError) {
          console.error(
            `🎯 RolloverService: Failed to add contribution to goal ${allocation.goal.title}:`,
            goalError,
          );
        }
      }

      // LESSON LEARNED: Reset rollover amount to 0 (matches createGoal behavior)
      // This immediately updates "Left to Spend" to 0
      console.log('🎯 RolloverService: Resetting rollover amount to 0');
      await TrendAPIService.processRollover({
        amount: 0,
      });
      console.log('🎯 RolloverService: Rollover amount reset to 0 successfully');

      const totalAllocated = goalAllocations.reduce(
        (sum, alloc) => sum + alloc.amount,
        0,
      );
      const allocatedGoalsCount = goalAllocations.length;

      const result = {
        success: true,
        newRolloverAmount: 0, // Always 0 since we reset rollover when allocating to goals
        shouldMarkProcessed: true, // Always mark as processed since rollover is reset
        message: `$${totalAllocated.toFixed(
          2,
        )} allocated to ${allocatedGoalsCount} goal${
          allocatedGoalsCount > 1 ? 's' : ''
        }`,
      };

      console.log('🎯 RolloverService: Returning result:', result);
      return result;
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error processing goal allocations:',
        error,
      );
      throw error;
    }
  }

  /**
   * Mark rollover period as processed
   * Returns the current timestamp as ISO string
   */
  static markRolloverPeriodProcessed() {
    return new Date().toISOString();
  }

  /**
   * Get rollover navigation data for Goals screen
   */
  static getRolloverNavigationData(availableSurplus, frequency) {
    return {
      fromRollover: true,
      rolloverAmount: availableSurplus,
      rolloverFrequency: frequency,
      returnToHome: true,
    };
  }

  /**
   * Filter active goals for rollover allocation
   * Returns goals that are not completed and can receive contributions
   */
  static getActiveGoalsForRollover(goals) {
    return goals.filter(
      goal =>
        !goal.completed &&
        (goal.type === 'debt' ? goal.current > 0 : goal.current < goal.target),
    );
  }

  /**
   * Check if rollover should be available based on pay period and date
   */
  static checkRolloverAvailability(nextPayDate, lastRolloverDate) {
    try {
      if (!nextPayDate) {
        return false;
      }

      // Use PayPeriodService to check rollover availability
      return PayPeriodService.isRolloverAvailable(
        nextPayDate,
        lastRolloverDate,
      );
    } catch (error) {
      console.error('🔄 RolloverService: Error checking rollover availability:', error);
      return false;
    }
  }

  /**
   * Reduce rollover amount when expenses are made (only for new transactions, not edits)
   */
  static async reduceRolloverForExpense(currentRollover, expenseAmount) {
    try {
      const newRolloverAmount = Math.max(0, currentRollover - expenseAmount);

      await TrendAPIService.processRollover({
        amount: newRolloverAmount,
      });

      console.log(
        `🔄 RolloverService: Rollover reduced from $${currentRollover} to $${newRolloverAmount} due to $${expenseAmount} expense`,
      );

      return {
        success: true,
        newRolloverAmount,
      };
    } catch (error) {
      console.error(
        '🔄 RolloverService: Failed to reduce rollover amount:',
        error,
      );
      throw error;
    }
  }

  /**
   * Check if we should make rollover available after pay period transition
   */
  static shouldMakeRolloverAvailableAfterTransition(previousPeriodSurplus, isCurrentlyAvailable) {
    return previousPeriodSurplus > 0 && !isCurrentlyAvailable;
  }

  /**
   * Process complete rollover decision based on option selected
   * Handles the main rollover decision flow with all options
   */
  static async processRolloverDecision({
    option,
    availableSurplus,
    currentRollover,
    incomeData,
    goals,
    addGoalContribution,
    navigation,
  }) {
    try {
      if (option === 'rollover') {
        // Roll over to next pay period - update user's total rollover amount
        const result = await this.processRolloverToNextPeriod(
          availableSurplus,
          currentRollover,
          incomeData.frequency,
        );

        return {
          success: true,
          newRolloverAmount: result.newRolloverAmount,
          shouldMarkProcessed: true,
          shouldCloseModal: true,
          alertTitle: 'Rollover Complete',
          alertMessage: result.message,
        };
      } else if (option === 'goals') {
        // Check if we have active goals for allocation
        const activeGoals = this.getActiveGoalsForRollover(goals);

        if (activeGoals.length > 0) {
          // Return data to open goal allocation modal
          return {
            success: true,
            shouldOpenGoalAllocation: true,
            shouldCloseModal: true,
            activeGoals,
          };
        } else {
          // No active goals, navigate to create goal flow
          // Reset rollover amount to 0 since funds will be allocated to new goal
          await TrendAPIService.processRollover({
            amount: 0,
          });

          const navData = this.getRolloverNavigationData(
            availableSurplus,
            incomeData.frequency,
          );
          navigation.navigate('Goals', navData);

          return {
            success: true,
            newRolloverAmount: 0,
            shouldMarkProcessed: true,
            shouldCloseModal: true,
            shouldNavigate: true,
          };
        }
      } else if (option === 'createGoal') {
        // Navigate to Goals screen to create a new goal with rollover context
        // Reset rollover amount to 0 since funds will be allocated to new goal
        await TrendAPIService.processRollover({
          amount: 0,
        });

        const navData = this.getRolloverNavigationData(
          availableSurplus,
          incomeData.frequency,
        );
        navigation.navigate('Goals', navData);

        return {
          success: true,
          newRolloverAmount: 0,
          shouldMarkProcessed: true,
          shouldCloseModal: true,
          shouldNavigate: true,
        };
      }

      throw new Error(`Unknown rollover option: ${option}`);
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error processing rollover decision:',
        error,
      );
      throw error;
    }
  }
}

export default RolloverService;