// components/GoalCard.js
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  ActionSheetIOS,
  Platform,
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
  onExpand, // Callback when card expands for input
}) => {
  const [showProgressUpdate, setShowProgressUpdate] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentSource, setPaymentSource] = useState('income');
  const [localShowOnBalanceCard, setLocalShowOnBalanceCard] = useState(() => goal?.showOnBalanceCard ?? false);
  const [transactionType, setTransactionType] = useState('add'); // 'add' or 'withdraw'

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


  // Debug logging to track prop changes - TEMPORARILY DISABLED
  // React.useEffect(() => {
  //   if (goal?.id) {
  //     console.log(`🔍 GOAL_CARD[${goal.id}]: Received goal.current = ${goal.current} (type: ${typeof goal.current})`);
  //   }
  // }, [goal?.current, goal?.id]);

  // FIXED: Add safe goal data access
  const safeGoal = {
    title: goal?.title || 'Untitled Goal',
    category: goal?.category || 'Other',
    type: goal?.type || 'savings',
    current: goal?.current ?? 0, // Use nullish coalescing to preserve 0 values
    target: goal?.target ?? 0,
    originalAmount: goal?.originalAmount ?? 0,
    priority: goal?.priority || 'medium',
    deadline: goal?.deadline,
    autoContribute: goal?.autoContribute ?? 0,
    showOnBalanceCard: goal?.showOnBalanceCard ?? false,
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


  // NEW: Handle custom amount submission
  const handleCustomAmountSubmit = () => {
    console.log('🔍 BUTTON PRESSED: Custom amount submit');

    const amount = parseFloat(customAmount);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid amount greater than 0.',
      );
      return;
    }

    // For withdrawals, check if amount exceeds current goal amount
    if (transactionType === 'withdraw' && amount > safeGoal.current) {
      Alert.alert(
        'Invalid Amount',
        `You can only withdraw up to ${safeCurrency(safeGoal.current)} from this goal.`,
      );
      return;
    }

    const isWithdrawal = transactionType === 'withdraw';
    const actionText = isDebtGoal ? 'Pay' : (isWithdrawal ? 'Withdraw' : 'Add');
    const prepositionText = isDebtGoal ? 'toward' : (isWithdrawal ? 'from' : 'to');
    const sourceText = isWithdrawal ? '' : `from ${paymentSource === 'income' ? 'Income' : paymentSource}`;

    Alert.alert(
      isDebtGoal ? 'Make Payment' : (isWithdrawal ? 'Withdraw Money' : 'Add Contribution'),
      `${actionText} ${safeCurrency(amount)} ${prepositionText} ${safeGoal.title} ${sourceText}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: actionText,
          onPress: () => {
            // For withdrawals, pass negative amount
            const finalAmount = isWithdrawal ? -amount : amount;
            onUpdateProgress && onUpdateProgress(safeGoal.id, finalAmount, paymentSource);
            setCustomAmount('');
            setPaymentSource('income');
            setTransactionType('add');
            setShowProgressUpdate(false);
          },
        },
      ],
    );
  };

  // NEW: Cancel custom amount input
  const handleCancelCustomAmount = () => {
    setCustomAmount('');
    setPaymentSource('income');
    setTransactionType('add');
    setShowProgressUpdate(false);
    // Keyboard will dismiss naturally when input loses focus
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

      {/* Progress Insights - UPDATED: Hidden for spending goals */}
      {!isCompleted && !isSpendingGoal && (
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
            value={localShowOnBalanceCard}
            onValueChange={(newValue) => {
              setLocalShowOnBalanceCard(newValue);

              // Call parent handler to persist the change
              if (onToggleBalanceDisplay) {
                onToggleBalanceDisplay(safeGoal.id);
              }
            }}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor={
              localShowOnBalanceCard
                ? colors.textWhite
                : colors.textSecondary
            }
            ios_backgroundColor={colors.border}
          />
        </View>
      )}

      {localShowOnBalanceCard && !isCompleted && (
        <Text style={styles.toggleFeedback}>
          ✓ This goal will appear on your main balance card
        </Text>
      )}

      {!localShowOnBalanceCard && !isCompleted && (
        <Text style={styles.toggleHelp}>
          Toggle on to track this goal on your main balance card
        </Text>
      )}

      {/* NEW: Custom Amount Input Section */}
      {showProgressUpdate && !isCompleted && (
        <View style={styles.customAmountContainer}>
          <Text style={styles.customAmountTitle}>
            {isDebtGoal ? 'Enter Payment Amount' :
             (transactionType === 'withdraw' ? 'Enter Withdrawal Amount' : 'Enter Contribution Amount')}
          </Text>

          {/* Transaction Type Selection for Savings Goals */}
          {!isDebtGoal && (
            <View style={styles.transactionTypeContainer}>
              <Text style={styles.sourceSelectionLabel}>Transaction Type</Text>
              <View style={styles.transactionTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.transactionTypeButton,
                    transactionType === 'add' && styles.transactionTypeButtonActive,
                  ]}
                  onPress={() => setTransactionType('add')}
                  activeOpacity={0.7}>
                  <Icon
                    name="plus"
                    size={16}
                    color={transactionType === 'add' ? colors.textWhite : colors.primary}
                  />
                  <Text style={[
                    styles.transactionTypeButtonText,
                    transactionType === 'add' && styles.transactionTypeButtonTextActive,
                  ]}>
                    Add Money
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.transactionTypeButton,
                    transactionType === 'withdraw' && styles.transactionTypeButtonActive,
                  ]}
                  onPress={() => setTransactionType('withdraw')}
                  activeOpacity={0.7}>
                  <Icon
                    name="minus"
                    size={16}
                    color={transactionType === 'withdraw' ? colors.textWhite : colors.danger}
                  />
                  <Text style={[
                    styles.transactionTypeButtonText,
                    transactionType === 'withdraw' && styles.transactionTypeButtonTextActive,
                  ]}>
                    Withdraw
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Payment Source Selection - only show for additions or debt payments */}
          {(transactionType === 'add' || isDebtGoal) && (
            <View style={styles.sourceSelectionContainer}>
              <Text style={styles.sourceSelectionLabel}>
                Payment Source
              </Text>
            <TouchableOpacity
              style={styles.sourceSelectionButton}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  ActionSheetIOS.showActionSheetWithOptions(
                    {
                      options: ['Cancel', 'Income'],
                      cancelButtonIndex: 0,
                    },
                    (buttonIndex) => {
                      if (buttonIndex === 1) {
                        setPaymentSource('income');
                      }
                    }
                  );
                } else {
                  Alert.alert(
                    'Select Payment Source',
                    '',
                    [
                      {text: 'Cancel', style: 'cancel'},
                      {text: 'Income', onPress: () => setPaymentSource('income')},
                    ]
                  );
                }
              }}
              activeOpacity={0.7}>
              <Text style={styles.sourceSelectionText}>
                {paymentSource === 'income' ? 'Income' : 'Select Source'}
              </Text>
              <Icon name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            </View>
          )}

          <View style={styles.customAmountInputRow}>
            <TextInput
              style={styles.customAmountInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="0.00"
              keyboardType="numeric"
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleCustomAmountSubmit}
              selectTextOnFocus={true}
              enablesReturnKeyAutomatically={true}
            />
            <View style={styles.customAmountButtons}>
              <TouchableOpacity
                style={styles.customAmountCancelButton}
                onPress={handleCancelCustomAmount}
                activeOpacity={0.8}>
                <Icon name="x" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.customAmountSubmitButton,
                  {backgroundColor: goalColor},
                ]}
                onPress={handleCustomAmountSubmit}
                activeOpacity={0.8}>
                <Icon name="check" size={16} color={colors.textWhite} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {!isCompleted && !showProgressUpdate && (
        <View style={styles.actionButtonsContainer}>
          {safeGoal.type === 'savings' && (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, {backgroundColor: goalColor}]}
                onPress={() => {
                  setTransactionType('add');
                  setShowProgressUpdate(true);
                  // Scroll to show expanded card after a short delay
                  setTimeout(() => {
                    onExpand && onExpand();
                  }, 100);
                }}
                activeOpacity={0.8}>
                <Icon name="plus" size={16} color={colors.textWhite} />
                <Text style={styles.primaryButtonText}>Add Money</Text>
              </TouchableOpacity>

              {/* Only show withdraw if there's money in the goal */}
              {safeGoal.current > 0 && (
                <TouchableOpacity
                  style={[styles.secondaryButton, {borderColor: colors.danger}]}
                  onPress={() => {
                    setTransactionType('withdraw');
                    setShowProgressUpdate(true);
                    // Scroll to show expanded card after a short delay
                    setTimeout(() => {
                      onExpand && onExpand();
                    }, 100);
                  }}
                  activeOpacity={0.8}>
                  <Icon name="minus" size={16} color={colors.danger} />
                  <Text style={[styles.secondaryButtonText, {color: colors.danger}]}>Withdraw</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {safeGoal.type === 'debt' && (
            <TouchableOpacity
              style={[styles.primaryButton, {backgroundColor: goalColor}]}
              onPress={() => {
                setShowProgressUpdate(true);
                // Scroll to show expanded card after a short delay
                setTimeout(() => {
                  onExpand && onExpand();
                }, 100);
              }}
              activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Make Payment</Text>
            </TouchableOpacity>
          )}

          {/* UPDATED: Improved spending budget alert */}
          {safeGoal.type === 'spending' &&
            (() => {
              const remaining = safeGoal.target - safeGoal.current;
              const isOverBudget = remaining < 0;
              const overBudgetAmount = Math.abs(remaining);

              return (
                <View
                  style={[
                    styles.spendingAlert,
                    isOverBudget && styles.spendingAlertOverBudget,
                  ]}>
                  <Icon
                    name={isOverBudget ? 'alert-triangle' : 'alert-circle'}
                    size={16}
                    color={isOverBudget ? colors.danger : colors.warning}
                  />
                  <Text
                    style={[
                      styles.spendingAlertText,
                      isOverBudget && styles.spendingAlertTextOverBudget,
                    ]}>
                    {isOverBudget
                      ? `${safeCurrency(
                          overBudgetAmount,
                        )} over budget this month`
                      : `${safeCurrency(remaining)} remaining this month`}
                  </Text>
                </View>
              );
            })()}
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
  // NEW: Custom Amount Input Styles
  customAmountContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customAmountTitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 12,
  },
  customAmountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customAmountInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'System',
    color: colors.text,
  },
  customAmountButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  customAmountCancelButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAmountSubmitButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceSelectionContainer: {
    marginBottom: 16,
  },
  sourceSelectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 8,
  },
  sourceSelectionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  sourceSelectionText: {
    fontSize: 16,
    fontFamily: 'System',
    color: colors.text,
    flex: 1,
  },
  // NEW: Transaction Type Styles
  transactionTypeContainer: {
    marginBottom: 16,
  },
  transactionTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  transactionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  transactionTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  transactionTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
  },
  transactionTypeButtonTextActive: {
    color: colors.textWhite,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
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
  // NEW: Over budget styling
  spendingAlertOverBudget: {
    backgroundColor: colors.dangerLight || '#ffebee',
  },
  spendingAlertText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.warning,
  },
  // NEW: Over budget text styling
  spendingAlertTextOverBudget: {
    color: colors.danger,
    fontWeight: '500',
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
