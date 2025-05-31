// components/GoalCard.js
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';

const GoalCard = ({
  goal,
  isCompleted = false,
  onEdit,
  onDelete,
  onToggleBalanceDisplay,
  onUpdateProgress,
  onComplete,
  getGoalProgress,
  isOverdue = false,
  formatCurrency,
}) => {
  const [showProgressUpdate, setShowProgressUpdate] = useState(false);

  // FIXED: Add safe formatCurrency function
  const safeCurrency = amount => {
    if (!formatCurrency || typeof formatCurrency !== 'function') {
      return `$${(amount || 0).toFixed(2)}`;
    }
    try {
      const formatted = formatCurrency(amount || 0);
      return formatted || `$${(amount || 0).toFixed(2)}`;
    } catch (error) {
      console.error('formatCurrency error:', error);
      return `$${(amount || 0).toFixed(2)}`;
    }
  };

  // FIXED: Add safe goal data access
  const safeGoal = {
    title: goal?.title || 'Untitled Goal',
    category: goal?.category || 'Other',
    type: goal?.type || 'savings',
    current: goal?.current || 0,
    target: goal?.target || 0,
    originalAmount: goal?.originalAmount || 0,
    priority: goal?.priority || 'medium',
    deadline: goal?.deadline,
    autoContribute: goal?.autoContribute || 0,
    showOnBalanceCard: goal?.showOnBalanceCard || false,
    completedDate: goal?.completedDate,
    id: goal?.id,
  };

  const progress = getGoalProgress ? getGoalProgress(safeGoal) : 0;
  const isDebtGoal = safeGoal.type === 'debt';
  const isSpendingGoal = safeGoal.type === 'spending';

  // Calculate days until deadline
  const getDaysUntilDeadline = () => {
    if (!safeGoal.deadline) {
      return null;
    }
    try {
      const today = new Date();
      const deadline = new Date(safeGoal.deadline);
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      console.error('Date calculation error:', error);
      return null;
    }
  };

  const daysLeft = getDaysUntilDeadline();

  // Calculate monthly contribution needed
  const getMonthlyNeeded = () => {
    if (!daysLeft || daysLeft <= 0) {
      return 0;
    }
    const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));

    if (isDebtGoal) {
      return safeGoal.current / monthsLeft;
    } else {
      return (safeGoal.target - safeGoal.current) / monthsLeft;
    }
  };

  const monthlyNeeded = getMonthlyNeeded();

  // Get appropriate color for goal type
  const getGoalColor = () => {
    switch (safeGoal.type) {
      case 'debt':
        return colors.danger;
      case 'spending':
        return colors.warning;
      case 'savings':
      default:
        return colors.primary;
    }
  };

  const goalColor = getGoalColor();

  // Priority indicator color
  const getPriorityColor = () => {
    switch (safeGoal.priority) {
      case 'high':
        return colors.danger;
      case 'medium':
        return colors.warning;
      case 'low':
      default:
        return colors.success;
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${safeGoal.title}"? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete && onDelete(safeGoal.id),
        },
      ],
    );
  };

  const handleCompletePress = () => {
    Alert.alert('Complete Goal', `Mark "${safeGoal.title}" as completed?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Complete',
        onPress: () => onComplete && onComplete(safeGoal.id),
      },
    ]);
  };

  const handleQuickContribution = () => {
    const amount = safeGoal.autoContribute || 50;
    Alert.alert(
      isDebtGoal ? 'Make Payment' : 'Add Contribution',
      `${isDebtGoal ? 'Pay' : 'Add'} ${safeCurrency(amount)} ${
        isDebtGoal ? 'toward' : 'to'
      } ${safeGoal.title}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: isDebtGoal ? 'Pay' : 'Add',
          onPress: () =>
            onUpdateProgress && onUpdateProgress(safeGoal.id, amount),
        },
      ],
    );
  };

  const getProgressColor = () => {
    if (isDebtGoal) {
      return colors.danger;
    }
    if (isSpendingGoal) {
      return colors.warning;
    }
    if (isOverdue) {
      return colors.danger;
    }
    if (progress >= 80) {
      return colors.success;
    }
    if (progress >= 50) {
      return colors.warning;
    }
    return goalColor;
  };

  return (
    <View style={[styles.container, isCompleted && styles.completedContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.goalInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.goalTitle}>{safeGoal.title}</Text>
            {safeGoal.priority === 'high' && !isCompleted && (
              <View
                style={[
                  styles.priorityBadge,
                  {backgroundColor: getPriorityColor()},
                ]}>
                <Text style={styles.priorityText}>High Priority</Text>
              </View>
            )}
          </View>
          <Text style={styles.goalCategory}>{safeGoal.category}</Text>
          {isOverdue && !isCompleted && (
            <Text style={styles.overdueText}>⚠️ Overdue</Text>
          )}
        </View>

        {!isCompleted && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit && onEdit(goal)}
              activeOpacity={0.7}>
              <Icon name="edit-3" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDeletePress}
              activeOpacity={0.7}>
              <Icon name="trash-2" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.amountRow}>
          <Text style={styles.currentAmount}>
            {safeCurrency(safeGoal.current)}
          </Text>
          <Text style={styles.targetAmount}>
            {isDebtGoal
              ? `of ${safeCurrency(safeGoal.originalAmount)} debt`
              : `of ${safeCurrency(safeGoal.target)}`}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(Math.max(progress || 0, 0), 100)}%`,
                backgroundColor: getProgressColor(),
              },
            ]}
          />
        </View>

        <View style={styles.progressDetails}>
          <Text style={styles.progressText}>
            {(progress || 0).toFixed(0)}% {isDebtGoal ? 'paid off' : 'complete'}
          </Text>
          {!isCompleted && daysLeft !== null && (
            <Text
              style={[
                styles.daysLeftText,
                daysLeft < 30 && {color: colors.danger},
              ]}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
            </Text>
          )}
          {isCompleted && safeGoal.completedDate && (
            <Text style={styles.completedDate}>
              Completed {new Date(safeGoal.completedDate).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      {/* Progress Insights */}
      {!isCompleted && (
        <View style={styles.insightsContainer}>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Monthly needed:</Text>
            <Text style={styles.insightValue}>
              {safeCurrency(monthlyNeeded)}
            </Text>
          </View>
          {safeGoal.autoContribute > 0 && (
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Auto-contributing:</Text>
              <Text style={[styles.insightValue, {color: colors.success}]}>
                {safeCurrency(safeGoal.autoContribute)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Balance Card Toggle */}
      {!isCompleted && (
        <View style={styles.balanceCardToggle}>
          <View style={styles.toggleInfo}>
            <Icon name="eye" size={16} color={colors.primary} />
            <Text style={styles.toggleLabel}>Show on Balance Card</Text>
          </View>
          <Switch
            value={safeGoal.showOnBalanceCard}
            onValueChange={() =>
              onToggleBalanceDisplay && onToggleBalanceDisplay(safeGoal.id)
            }
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor={
              safeGoal.showOnBalanceCard
                ? colors.textWhite
                : colors.textSecondary
            }
            ios_backgroundColor={colors.border}
          />
        </View>
      )}

      {safeGoal.showOnBalanceCard && !isCompleted && (
        <Text style={styles.toggleFeedback}>
          ✓ This goal will appear on your main balance card
        </Text>
      )}

      {!safeGoal.showOnBalanceCard && !isCompleted && (
        <Text style={styles.toggleHelp}>
          Toggle on to track this goal on your main balance card
        </Text>
      )}

      {/* Action Buttons */}
      {!isCompleted && (
        <View style={styles.actionButtonsContainer}>
          {safeGoal.type === 'savings' && (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, {backgroundColor: goalColor}]}
                onPress={handleQuickContribution}
                activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>Add Money</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowProgressUpdate(!showProgressUpdate)}
                activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>Custom Amount</Text>
              </TouchableOpacity>
            </>
          )}

          {safeGoal.type === 'debt' && (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, {backgroundColor: goalColor}]}
                onPress={handleQuickContribution}
                activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>Make Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowProgressUpdate(!showProgressUpdate)}
                activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>Custom Payment</Text>
              </TouchableOpacity>
            </>
          )}

          {safeGoal.type === 'spending' && (
            <View style={styles.spendingAlert}>
              <Icon name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.spendingAlertText}>
                {safeCurrency(Math.max(0, safeGoal.target - safeGoal.current))}{' '}
                remaining this month
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Complete Goal Button */}
      {!isCompleted && progress >= 100 && (
        <TouchableOpacity
          style={[styles.completeButton, {backgroundColor: colors.success}]}
          onPress={handleCompletePress}
          activeOpacity={0.8}>
          <Icon name="check-circle" size={16} color={colors.textWhite} />
          <Text style={styles.completeButtonText}>Mark as Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  completedContainer: {
    opacity: 0.8,
    borderColor: colors.success,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.text,
    letterSpacing: -0.2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    textTransform: 'uppercase',
  },
  goalCategory: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  overdueText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.danger,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  progressSection: {
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentAmount: {
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.text,
    letterSpacing: -0.5,
  },
  targetAmount: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  progressContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 10,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  daysLeftText: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  completedDate: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.success,
  },
  insightsContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  insightValue: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.text,
  },
  balanceCardToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.primary,
  },
  toggleFeedback: {
    fontSize: 11,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.primary,
    marginBottom: 16,
  },
  toggleHelp: {
    fontSize: 11,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.text,
  },
  spendingAlert: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  spendingAlertText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.warning,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
});

export default GoalCard;
