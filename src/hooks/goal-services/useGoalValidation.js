// hooks/goal-services/useGoalValidation.js
import {useCallback} from 'react';

const useGoalValidation = () => {
  // Helper: Validate goal data structure
  const validateGoalData = useCallback(goal => {
    if (!goal || typeof goal !== 'object') {
      return false;
    }

    // Required fields
    if (!goal.title || typeof goal.title !== 'string' || !goal.title.trim()) {
      return false;
    }
    if (!goal.type || !['savings', 'spending', 'debt'].includes(goal.type)) {
      return false;
    }

    // Type-specific validation
    if (goal.type === 'debt') {
      // For debt goals, check originalAmount or target as fallback
      const debtAmount = goal.originalAmount || goal.target;
      if (!debtAmount || Number(debtAmount) <= 0) {
        return false;
      }
    } else if (goal.type !== 'spending') {
      // For savings goals, target is required
      if (!goal.target || Number(goal.target) <= 0) {
        return false;
      }
    }

    return true;
  }, []);

  // Helper: Sanitize goal data
  const sanitizeGoalData = useCallback(goal => {
    const sanitized = {
      priority: 'medium',
      current: 0,
      autoContribute: 0,
      isActive: true,
      category: 'Other',
      currency: 'AUD',
      ...goal,
      // Explicitly preserve showOnBalanceCard if it exists
      showOnBalanceCard: goal?.showOnBalanceCard ?? false,
    };

    // Ensure numeric fields are numbers
    sanitized.current = Number(sanitized.current) || 0;
    if (sanitized.target) {
      sanitized.target = Number(sanitized.target);
    }
    if (sanitized.originalAmount) {
      sanitized.originalAmount = Number(sanitized.originalAmount);
    }
    sanitized.autoContribute = Number(sanitized.autoContribute) || 0;

    // Ensure strings are trimmed
    if (typeof sanitized.title === 'string') {
      sanitized.title = sanitized.title.trim();
    }
    if (typeof sanitized.category === 'string') {
      sanitized.category = sanitized.category.trim();
    }
    if (typeof sanitized.description === 'string') {
      sanitized.description = sanitized.description.trim();
    }

    // Ensure IDs exist (for local goals)
    if (!sanitized.id) {
      sanitized.id = `local_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      sanitized.createdAt = new Date().toISOString();
    }

    // Ensure dates
    if (!sanitized.updatedAt) {
      sanitized.updatedAt = new Date().toISOString();
    }

    return sanitized;
  }, []);

  return {
    validateGoalData,
    sanitizeGoalData,
  };
};

export default useGoalValidation;
