// hooks/useRolloverAllocation.js
import {useState, useEffect, useCallback, useRef} from 'react';
import TrendAPIService from '../services/TrendAPIService';
import {DeviceEventEmitter} from 'react-native';

// Rollover state machine
const ROLLOVER_STATES = {
  IDLE: 'idle',
  PENDING: 'pending', // Waiting for user to create goal
  ALLOCATING: 'allocating', // Backend allocation in progress
  COMPLETED: 'completed', // Done
  ERROR: 'error', // Failed
};

/**
 * Custom hook to manage rollover allocation flow
 * Follows cache-first, background sync pattern
 *
 * @param {Object} rolloverParams - Navigation params from route
 * @param {Function} loadGoals - Function to reload goals after allocation
 * @returns {Object} Rollover state and control functions
 */
const useRolloverAllocation = (rolloverParams, loadGoals) => {
  // State
  const [rolloverState, setRolloverState] = useState(ROLLOVER_STATES.IDLE);
  const [rolloverData, setRolloverData] = useState(null);
  const [error, setError] = useState(null);

  // Refs to prevent duplicate processing
  const hasInitialized = useRef(false);
  const isAllocating = useRef(false);

  // Initialize rollover from route params (only once)
  useEffect(() => {
    if (
      rolloverParams?.fromRollover &&
      rolloverParams?.rolloverAmount &&
      !hasInitialized.current
    ) {
      hasInitialized.current = true;
      setRolloverState(ROLLOVER_STATES.PENDING);
      setRolloverData({
        amount: rolloverParams.rolloverAmount,
        frequency: rolloverParams.rolloverFrequency,
      });
    }
  }, [rolloverParams]);

  /**
   * Main allocation function - allocates rollover funds to a goal
   * Follows sequential backend operations then single reload pattern
   */
  const allocateToGoal = useCallback(
    async goalId => {
      // Prevent duplicate allocations
      if (isAllocating.current || !rolloverData) {
        return {success: false, error: 'Allocation already in progress'};
      }

      isAllocating.current = true;
      setRolloverState(ROLLOVER_STATES.ALLOCATING);
      setError(null);

      try {
        // Step 1: Add contribution to goal
        const contributionData = {
          amount: rolloverData.amount,
          type: 'ROLLOVER',
          description: `Rollover allocation from ${rolloverData.frequency} period`,
          date: new Date().toISOString(),
        };

        await TrendAPIService.addGoalContribution(goalId, contributionData);

        // Step 2: Process rollover on backend (reduce by allocated amount)
        const remainingRollover = rolloverData.amount - contributionData.amount;
        await TrendAPIService.processRollover({
          amount: Math.max(0, remainingRollover), // Reduce rollover by allocated amount, minimum 0
        });

        // Step 3: Emit event to notify other components (HomeContainer)
        try {
          DeviceEventEmitter.emit('goalIncomePaymentMade', {
            goalId: goalId,
            amount: rolloverData.amount,
            type: 'ROLLOVER',
          });
        } catch (eventError) {
          console.error(
            'Failed to emit goalIncomePaymentMade event:',
            eventError,
          );
          // Don't fail the whole operation if event emission fails
        }

        // Step 4: Update rollover banner with remaining amount (if any)
        // This allows users to make multiple partial allocations within the 3-day window
        if (remainingRollover > 0) {
          try {
            const RolloverService =
              require('../services/RolloverService').default;

            // Load existing banner to preserve the original date (don't reset 3-day timer)
            const existingBanner = await RolloverService.loadRolloverBanner();

            const bannerData = {
              amount: remainingRollover,
              frequency: rolloverData.frequency,
              date: existingBanner?.date || new Date().toISOString(), // Preserve original date
            };
            await RolloverService.setRolloverBanner(bannerData);
            console.log(
              '🔄 Updated rollover banner with remaining amount:',
              remainingRollover,
              '(preserved original date)',
            );
          } catch (bannerError) {
            console.error('Failed to update rollover banner:', bannerError);
            // Don't fail the allocation if banner update fails
          }
        } else {
          // No remaining rollover - clear the banner
          try {
            const RolloverService =
              require('../services/RolloverService').default;
            await RolloverService.confirmRolloverBanner();
            console.log(
              '🔄 Cleared rollover banner - full allocation completed',
            );
          } catch (bannerError) {
            console.error('Failed to clear rollover banner:', bannerError);
          }
        }

        // Step 5: Single reload after all backend operations complete
        // This follows the cache-first pattern - reload from backend to sync
        if (loadGoals) {
          await loadGoals(true); // Force refresh from backend
        }

        // Success - transition to completed state
        setRolloverState(ROLLOVER_STATES.COMPLETED);
        setRolloverData(null);
        isAllocating.current = false;

        return {
          success: true,
          remainingRollover: Math.max(0, remainingRollover),
          allocatedAmount: contributionData.amount,
        };
      } catch (allocationError) {
        console.error('Failed to allocate rollover funds:', allocationError);
        setRolloverState(ROLLOVER_STATES.ERROR);
        setError(allocationError.message || 'Failed to allocate rollover funds');
        isAllocating.current = false;

        return {
          success: false,
          error: allocationError.message || 'Failed to allocate rollover funds',
        };
      }
    },
    [rolloverData, loadGoals],
  );

  /**
   * Cancel rollover flow - user chose not to create a goal
   */
  const cancelRollover = useCallback(() => {
    setRolloverState(ROLLOVER_STATES.COMPLETED);
    setRolloverData(null);
    setError(null);
    hasInitialized.current = false;
  }, []);

  /**
   * Reset rollover state (for cleanup)
   */
  const resetRollover = useCallback(() => {
    setRolloverState(ROLLOVER_STATES.IDLE);
    setRolloverData(null);
    setError(null);
    hasInitialized.current = false;
    isAllocating.current = false;
  }, []);

  // Computed values for convenience
  const shouldShowModal = rolloverState === ROLLOVER_STATES.PENDING;
  const isAllocatingState = rolloverState === ROLLOVER_STATES.ALLOCATING;
  const isCompleted = rolloverState === ROLLOVER_STATES.COMPLETED;
  const hasError = rolloverState === ROLLOVER_STATES.ERROR;

  return {
    // State
    rolloverState,
    rolloverData,
    error,

    // Computed flags
    shouldShowModal,
    isAllocating: isAllocatingState,
    isCompleted,
    hasError,

    // Actions
    allocateToGoal,
    cancelRollover,
    resetRollover,

    // Constants for external use
    ROLLOVER_STATES,
  };
};

export default useRolloverAllocation;
