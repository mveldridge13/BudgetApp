// services/RolloverService.js - Rollover calculation and management service

import TrendAPIService from './TrendAPIService';
import PayPeriodService from './PayPeriodService';
import RolloverCache from './RolloverCache';

/**
 * RolloverService handles all rollover related calculations and business logic
 * Provides methods for calculating surplus, processing rollover decisions, and managing rollover state
 */
class RolloverService {
  /**
   * Load current rollover amount using cache-first, background sync approach
   * Returns { rolloverAmount: number, lastRolloverDate: string | null }
   */
  static async loadRolloverAmount() {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        return {rolloverAmount: 0, lastRolloverDate: null};
      }

      // Try to get from cache first
      const cached = await RolloverCache.getRolloverAmount();

      if (cached && !cached.isStale) {
        // Cache hit and fresh - return cached data
        console.log('🔄 RolloverService: Using fresh cached rollover amount');
        // Background sync if data is getting older (>2 minutes)
        if (cached.age > 2 * 60 * 1000) {
          this._backgroundSyncRolloverAmount().catch(error =>
            console.warn('🔄 Background sync failed:', error),
          );
        }
        return cached.data;
      }

      // Cache miss or stale - fetch from API
      console.log('🔄 RolloverService: Cache miss/stale, fetching from API');
      const rolloverData = await TrendAPIService.getRolloverAmount();
      const result = {
        rolloverAmount: rolloverData.rolloverAmount || 0,
        lastRolloverDate: rolloverData.lastRolloverDate,
      };

      // Update cache with fresh data
      await RolloverCache.setRolloverAmount(result);
      return result;
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error loading rollover amount:',
        error,
      );

      // Try to return stale cache as fallback
      const cached = await RolloverCache.getRolloverAmount();
      if (cached) {
        console.log('🔄 RolloverService: Using stale cache as fallback');
        return cached.data;
      }

      return {rolloverAmount: 0, lastRolloverDate: null};
    }
  }

  /**
   * Background sync for rollover amount (private method)
   */
  static async _backgroundSyncRolloverAmount() {
    try {
      const rolloverData = await TrendAPIService.getRolloverAmount();
      const result = {
        rolloverAmount: rolloverData.rolloverAmount || 0,
        lastRolloverDate: rolloverData.lastRolloverDate,
      };
      await RolloverCache.setRolloverAmount(result);
      console.log(
        '🔄 RolloverService: Background sync completed for rollover amount',
      );
    } catch (error) {
      console.error('🔄 RolloverService: Background sync failed:', error);
    }
  }

  /**
   * Load rollover entries using cache-first, background sync approach
   * Returns array of rollover entries
   */
  static async loadRolloverEntries() {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        return [];
      }

      // Try to get from cache first
      const cached = await RolloverCache.getRolloverEntries();

      if (cached && !cached.isStale) {
        // Cache hit and fresh - return cached data
        console.log('🔄 RolloverService: Using fresh cached rollover entries');
        // Background sync if data is getting older (>2 minutes)
        if (cached.age > 2 * 60 * 1000) {
          this._backgroundSyncRolloverEntries().catch(error =>
            console.warn('🔄 Background sync failed:', error),
          );
        }
        return cached.data;
      }

      // Cache miss or stale - fetch from API
      console.log(
        '🔄 RolloverService: Cache miss/stale, fetching rollover entries from API',
      );
      const entriesData = await TrendAPIService.getRolloverEntries();
      const result = entriesData || [];

      // Update cache with fresh data
      await RolloverCache.setRolloverEntries(result);
      return result;
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error loading rollover entries:',
        error,
      );

      // Try to return stale cache as fallback
      const cached = await RolloverCache.getRolloverEntries();
      if (cached) {
        console.log('🔄 RolloverService: Using stale cache as fallback');
        return cached.data;
      }

      return [];
    }
  }

  /**
   * Background sync for rollover entries (private method)
   */
  static async _backgroundSyncRolloverEntries() {
    try {
      const entriesData = await TrendAPIService.getRolloverEntries();
      const result = entriesData || [];
      await RolloverCache.setRolloverEntries(result);
      console.log(
        '🔄 RolloverService: Background sync completed for rollover entries',
      );
    } catch (error) {
      console.error(
        '🔄 RolloverService: Background sync failed for entries:',
        error,
      );
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
   * Process rollover to next pay period with optimistic updates
   * Updates the total rollover amount with additional surplus
   * Creates a RolloverEntry for analytics tracking and Left to Spend calculation
   */
  static async processRolloverToNextPeriod(
    availableSurplus,
    currentRollover,
    frequency,
    incomeData,
  ) {
    const newTotalRollover = currentRollover + availableSurplus;

    try {
      console.log('🔄 RolloverService: Processing rollover to next period:', {
        availableSurplus,
        currentRollover,
        frequency,
      });

      // Optimistic update - update cache immediately for better UX
      await RolloverCache.updateRolloverAmount(
        newTotalRollover,
        new Date().toISOString(),
      );

      // Calculate current pay period boundaries for the RolloverEntry
      const payPeriodBoundaries = PayPeriodService.calculatePayPeriodBoundaries(
        incomeData.nextPayDate,
        frequency,
        true, // useCurrentPeriodForNewPeriod = true
      );

      if (!payPeriodBoundaries) {
        throw new Error(
          'Failed to calculate pay period boundaries for rollover entry',
        );
      }

      // Create RolloverEntry for tracking and Left to Spend calculation
      const rolloverEntryData = {
        amount: availableSurplus,
        type: 'ROLLOVER', // Using the backend RolloverType enum
        description: `Rollover to next ${frequency} period`,
        periodStart: payPeriodBoundaries.start.toISOString(),
        periodEnd: payPeriodBoundaries.end.toISOString(),
      };

      console.log(
        '🔄 RolloverService: Creating RolloverEntry:',
        rolloverEntryData,
      );

      // Background sync - perform API operations
      const [rolloverEntryResult, processRolloverResult] = await Promise.all([
        TrendAPIService.createRolloverEntry(rolloverEntryData),
        TrendAPIService.processRollover({
          amount: newTotalRollover,
        }),
      ]);

      // Update cache with confirmed data
      await RolloverCache.setRolloverAmount({
        rolloverAmount: newTotalRollover,
        lastRolloverDate: new Date().toISOString(),
      });

      // Invalidate rollover entries cache to force refresh
      await RolloverCache.invalidateRolloverEntries();

      console.log('🔄 RolloverService: Rollover to next period completed:', {
        newTotalRollover,
        rolloverEntryCreated: !!rolloverEntryResult,
        rolloverProcessed: !!processRolloverResult,
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

      // Rollback optimistic update
      await RolloverCache.updateRolloverAmount(currentRollover);
      throw error;
    }
  }

  /**
   * Process goal allocations from rollover funds using atomic backend endpoint
   * Backend atomically: creates contributions, deducts rolloverAmount, updates/dismisses notification
   *
   * @param {Array} goalAllocations - Array of { goalId, amount, goal } objects
   * @param {Function} addGoalContribution - Unused, kept for backward compatibility
   * @param {number} currentRolloverAmount - Current rollover amount for optimistic updates
   */
  static async processGoalAllocations(
    goalAllocations,
    _addGoalContribution,
    currentRolloverAmount,
  ) {
    try {
      const totalAllocated = goalAllocations.reduce(
        (sum, alloc) => sum + alloc.amount,
        0,
      );

      console.log('🎯 RolloverService: Processing goal allocations:', {
        totalAllocations: goalAllocations.length,
        totalAllocated,
        currentRolloverAmount,
      });

      // Calculate new rollover amount (reduce by allocated amount)
      const newRolloverAmount = Math.max(
        0,
        currentRolloverAmount - totalAllocated,
      );

      // Optimistic update - reduce rollover amount by allocated amount
      await RolloverCache.updateRolloverAmount(
        newRolloverAmount,
        new Date().toISOString(),
      );

      // Format allocations for backend (only goalId and amount needed)
      const formattedAllocations = goalAllocations.map(alloc => ({
        goalId: alloc.goalId,
        amount: alloc.amount,
      }));

      // Generate description with current date
      const today = new Date();
      const description = `Rollover allocation - ${today.toLocaleDateString()}`;

      // Call atomic backend endpoint
      const response = await TrendAPIService.allocateRolloverToGoals(
        formattedAllocations,
        description,
      );

      console.log('🎯 RolloverService: Backend response:', response);

      // Update cache with confirmed data from backend
      const confirmedRolloverAmount = response?.newRolloverAmount ?? newRolloverAmount;
      await RolloverCache.setRolloverAmount({
        rolloverAmount: confirmedRolloverAmount,
        lastRolloverDate: new Date().toISOString(),
      });

      // Clear banner cache if fully allocated
      if (confirmedRolloverAmount === 0) {
        await RolloverCache.clearRolloverBanner();
      }

      console.log('🎯 RolloverService: Rollover allocation completed:', {
        previousAmount: currentRolloverAmount,
        totalAllocated,
        newAmount: confirmedRolloverAmount,
      });

      const allocatedGoalsCount = goalAllocations.length;

      const result = {
        success: true,
        newRolloverAmount: confirmedRolloverAmount,
        shouldMarkProcessed: confirmedRolloverAmount === 0,
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
      // Rollback optimistic update on error
      await RolloverCache.updateRolloverAmount(currentRolloverAmount);
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
      console.error(
        '🔄 RolloverService: Error checking rollover availability:',
        error,
      );
      return false;
    }
  }

  /**
   * Reduce rollover amount when expenses are made (only for new transactions, not edits)
   * Uses optimistic updates for better UX
   */
  static async reduceRolloverForExpense(currentRollover, expenseAmount) {
    const newRolloverAmount = Math.max(0, currentRollover - expenseAmount);

    try {
      // Optimistic update - update cache immediately
      await RolloverCache.updateRolloverAmount(newRolloverAmount);

      // Background sync - update backend
      await TrendAPIService.processRollover({
        amount: newRolloverAmount,
      });

      // Confirm cache with successful result
      await RolloverCache.setRolloverAmount({
        rolloverAmount: newRolloverAmount,
        lastRolloverDate: null, // Keep existing lastRolloverDate
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

      // Rollback optimistic update
      await RolloverCache.updateRolloverAmount(currentRollover);
      throw error;
    }
  }

  /**
   * Check if we should make rollover available after pay period transition
   */
  static shouldMakeRolloverAvailableAfterTransition(
    previousPeriodSurplus,
    isCurrentlyAvailable,
  ) {
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
    _addGoalContribution,
    navigation,
  }) {
    try {
      if (option === 'rollover') {
        // Roll over to next pay period - update user's total rollover amount
        const result = await this.processRolloverToNextPeriod(
          availableSurplus,
          currentRollover,
          incomeData.frequency,
          incomeData,
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

  /**
   * Clear all rollover caches
   * Useful when switching users or clearing app data
   */
  static async clearCache() {
    try {
      await RolloverCache.clearAll();
      console.log('🔄 RolloverService: All caches cleared successfully');
      return true;
    } catch (error) {
      console.error('🔄 RolloverService: Error clearing caches:', error);
      return false;
    }
  }

  /**
   * Force refresh of all rollover data
   * Invalidates caches and triggers fresh API calls
   */
  static async forceRefresh() {
    try {
      await Promise.all([
        RolloverCache.invalidateRolloverAmount(),
        RolloverCache.invalidateRolloverEntries(),
      ]);
      console.log(
        '🔄 RolloverService: Cache invalidated, next calls will refresh from API',
      );
      return true;
    } catch (error) {
      console.error('🔄 RolloverService: Error forcing refresh:', error);
      return false;
    }
  }

  /**
   * Load rollover banner using cache-first, background sync approach
   * Returns banner data or null if no banner should be shown
   */
  static async loadRolloverBanner() {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        return null;
      }

      // Try to get from cache first
      const cached = await RolloverCache.getRolloverBanner();

      // Check if cache exists and is stale (older than 3 days)
      if (cached && cached.isStale) {
        console.log(
          '🔄 RolloverService: Rollover banner expired after 3 days - auto-confirming rollover',
        );
        console.log('🔄 RolloverService: Banner age:', {
          ageInDays: Math.round(cached.age / 1000 / 60 / 60 / 24),
          ageInHours: Math.round(cached.age / 1000 / 60 / 60),
          timestamp: cached.timestamp,
        });

        await RolloverCache.clearRolloverBanner();

        // Auto-expiry means user implicitly accepts rollover by not interacting
        // Rollover funds remain in spendable pool (no additional action needed)
        console.log(
          '🔄 RolloverService: Rollover auto-confirmed via 3-day expiry',
        );

        return null;
      }

      // Cache hit and fresh - return cached data
      if (cached && !cached.isStale) {
        console.log('🔄 RolloverService: Using fresh cached rollover banner');
        console.log('🔄 RolloverService: Banner age:', {
          ageInDays: Math.round(cached.age / 1000 / 60 / 60 / 24),
          ageInHours: Math.round(cached.age / 1000 / 60 / 60),
          timestamp: cached.timestamp,
        });
        return cached.data;
      }

      // No cached banner found
      return null;
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error loading rollover banner:',
        error,
      );
      return null;
    }
  }

  /**
   * Set rollover banner (after auto-rollover occurs)
   */
  static async setRolloverBanner(bannerData) {
    try {
      console.log('🔄 RolloverService: Setting rollover banner:', bannerData);
      await RolloverCache.setRolloverBanner(bannerData);
      return true;
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error setting rollover banner:',
        error,
      );
      return false;
    }
  }

  /**
   * Confirm rollover banner (user clicked X)
   * This acknowledges the rollover and confirms funds should stay in spendable pool
   */
  static async confirmRolloverBanner() {
    try {
      console.log(
        '🔄 RolloverService: Confirming rollover banner - user accepts rollover',
      );

      // Call backend to dismiss the notification
      await TrendAPIService.dismissRolloverNotification();

      // Clear the banner from local cache
      await RolloverCache.clearRolloverBanner();

      console.log('🔄 RolloverService: Rollover confirmed, banner dismissed');
      return {
        success: true,
        message: 'Rollover confirmed and banner dismissed',
      };
    } catch (error) {
      console.error(
        '🔄 RolloverService: Error confirming rollover banner:',
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Dismiss rollover banner (legacy method - use confirmRolloverBanner instead)
   * @deprecated Use confirmRolloverBanner() instead
   */
  static async dismissRolloverBanner() {
    console.warn(
      '🔄 RolloverService: dismissRolloverBanner() is deprecated, use confirmRolloverBanner() instead',
    );
    return this.confirmRolloverBanner();
  }

  /**
   * Get cache statistics for debugging
   */
  static async getCacheStats() {
    try {
      return await RolloverCache.getStats();
    } catch (error) {
      console.error('🔄 RolloverService: Error getting cache stats:', error);
      return null;
    }
  }
}

export default RolloverService;
