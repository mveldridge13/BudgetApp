// hooks/goal-services/useGoalTransformers.js
import {useCallback} from 'react';

const useGoalTransformers = () => {
  // Helper: Transform backend goal to frontend format
  const transformBackendGoal = useCallback(backendGoal => {
    // Map backend categories to frontend display names
    const categoryMapping = {
      EMERGENCY_FUND: 'Security',
      VACATION: 'Travel',
      HOME_PURCHASE: 'Property',
      CAR_PURCHASE: 'Transport',
      DEBT_PAYOFF: 'Debt',
      EDUCATION: 'Education',
      RETIREMENT: 'Retirement',
      INVESTMENT: 'Investment',
      GENERAL_SAVINGS: 'Savings',
    };

    // Map backend types to frontend values
    const typeMapping = {
      SAVINGS: 'savings',
      SPENDING_LIMIT: 'spending',
      DEBT_PAYOFF: 'debt',
      INVESTMENT: 'savings',
    };

    // Map backend priorities to frontend values
    const priorityMapping = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'high',
    };

    return {
      id: backendGoal.id,
      title: backendGoal.name || backendGoal.title,
      type: typeMapping[backendGoal.type] || 'savings',
      target: Number(backendGoal.targetAmount) || 0,
      current: Number(backendGoal.currentAmount) || 0,
      originalAmount:
        Number(backendGoal.originalAmount || backendGoal.targetAmount) || 0,
      deadline: backendGoal.targetDate,
      category: backendGoal.originalCategory || categoryMapping[backendGoal.category] || backendGoal.category || 'Other',
      priority: priorityMapping[backendGoal.priority] || 'medium',
      autoContribute: Number(backendGoal.monthlyTarget) || 0,
      showOnBalanceCard: false, // Default to false since backend doesn't support this field
      isActive: !backendGoal.isCompleted && backendGoal.isActive !== false,
      createdAt: backendGoal.createdAt,
      updatedAt: backendGoal.updatedAt,
      completedDate: backendGoal.isCompleted ? backendGoal.updatedAt : null,
      description: backendGoal.description || '',
      currency: backendGoal.currency || 'AUD',
    };
  }, []);

  // Helper: Transform frontend goal to backend format
  const transformFrontendGoal = useCallback(frontendGoal => {
    // Map frontend categories to backend enum values
    const categoryMapping = {
      Security: 'EMERGENCY_FUND',
      'Emergency Fund': 'EMERGENCY_FUND',
      Travel: 'VACATION',
      Vacation: 'VACATION',
      Property: 'HOME_PURCHASE',
      Home: 'HOME_PURCHASE',
      Transport: 'CAR_PURCHASE',
      Car: 'CAR_PURCHASE',
      Debt: 'DEBT_PAYOFF',
      'Debt Repayment': 'DEBT_PAYOFF',
      Education: 'EDUCATION',
      Retirement: 'RETIREMENT',
      Investment: 'INVESTMENT',
      Savings: 'GENERAL_SAVINGS',
      General: 'GENERAL_SAVINGS',
      Food: 'GENERAL_SAVINGS',
      Entertainment: 'GENERAL_SAVINGS',
      Health: 'GENERAL_SAVINGS',
      Shopping: 'GENERAL_SAVINGS',
      Utilities: 'GENERAL_SAVINGS',
      Bills: 'GENERAL_SAVINGS',
      Other: 'GENERAL_SAVINGS',
    };

    // Map frontend types to backend enum values
    const typeMapping = {
      savings: 'SAVINGS',
      debt: 'DEBT_PAYOFF',
      spending: 'SPENDING_LIMIT',
      investment: 'INVESTMENT',
    };

    // Map frontend priority to backend enum values
    const priorityMapping = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      critical: 'CRITICAL',
    };

    // SIMPLIFIED number validation
    const ensureValidNumber = (
      value,
      defaultValue = 0,
      fieldName = 'unknown',
      allowZero = false,
    ) => {
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }

      let numValue;
      if (typeof value === 'string') {
        numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
      } else {
        numValue = Number(value);
      }

      if (isNaN(numValue) || !isFinite(numValue)) {
        console.warn(`🔍 Invalid ${fieldName}:`, value, '-> using default:', defaultValue);
        return defaultValue;
      }

      // For currentAmount, allow zero and positive values
      if (fieldName === 'currentAmount' || allowZero) {
        if (numValue < 0) {
          console.warn(`🔍 Negative ${fieldName}:`, value, '-> using default:', defaultValue);
          return defaultValue;
        }
      } else {
        // For targetAmount, require positive values
        if (numValue <= 0) {
          console.warn(`🔍 Non-positive ${fieldName}:`, value, '-> using default:', defaultValue);
          return defaultValue;
        }
      }

      return numValue;
    };

    // Calculate targetAmount based on goal type
    let targetAmount;

    if (frontendGoal.type === 'debt') {
      // For debt goals, use originalAmount first, then fallback to target
      const debtAmount = frontendGoal.originalAmount || frontendGoal.target;
      targetAmount = ensureValidNumber(debtAmount, 0, 'debt_targetAmount');
    } else {
      // For savings/spending goals, use target (which should always be present)
      targetAmount = ensureValidNumber(
        frontendGoal.target,
        0,
        'targetAmount',
      );
    }

    // Send targetAmount as a decimal string (some APIs expect this format)
    const safeTargetAmount = targetAmount.toFixed(2);

    // Create the backend goal object - MINIMAL APPROACH
    const backendGoal = {
      name: String(frontendGoal.title || 'Untitled Goal').trim(),
      targetAmount: safeTargetAmount,
      currentAmount: ensureValidNumber(
        frontendGoal.current,
        0,
        'currentAmount',
        true, // Allow zero for currentAmount
      ).toFixed(2),
      currency: 'AUD',
      category: categoryMapping[frontendGoal.category] || 'GENERAL_SAVINGS',
      type: typeMapping[frontendGoal.type] || 'SAVINGS',
      priority: priorityMapping[frontendGoal.priority] || 'MEDIUM',
      isActive: true,
      isCompleted: false,
      showOnBalanceCard: frontendGoal.showOnBalanceCard || false,
      // PRESERVE original category for local storage (spending goals need exact category matching)
      originalCategory: frontendGoal.category,
    };

    // Add optional fields only if they exist
    if (frontendGoal.description && frontendGoal.description.trim()) {
      backendGoal.description = String(frontendGoal.description).trim();
    }

    // Add optional fields
    if (frontendGoal.deadline) {
      try {
        const deadlineDate = new Date(frontendGoal.deadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate > new Date()) {
          backendGoal.targetDate = deadlineDate.toISOString();
        }
      } catch (error) {
        console.warn('🔍 Invalid deadline date:', frontendGoal.deadline);
      }
    }

    // Add monthly contribution if provided
    if (frontendGoal.autoContribute && Number(frontendGoal.autoContribute) > 0) {
      const monthlyTarget = ensureValidNumber(
        frontendGoal.autoContribute,
        0,
        'monthlyTarget',
      );
      if (monthlyTarget > 0) {
        backendGoal.monthlyTarget = monthlyTarget.toFixed(2);
      }
    }

    return backendGoal;
  }, []);

  return {
    transformBackendGoal,
    transformFrontendGoal,
  };
};

export default useGoalTransformers;
