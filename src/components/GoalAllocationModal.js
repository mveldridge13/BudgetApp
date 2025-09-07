import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import {formatCurrencySync} from '../utils/currencyHelper';

const GoalAllocationModal = ({
  visible,
  onClose,
  onConfirm,
  availableAmount,
  currency = 'AUD',
  goals = [],
  frequency = 'fortnightly',
}) => {
  const [allocations, setAllocations] = useState({});
  const [selectedGoals, setSelectedGoals] = useState(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setAllocations({});
      setSelectedGoals(new Set());
    }
  }, [visible]);

  const formatCurrency = amount => {
    return formatCurrencySync(amount, currency);
  };


  const activeGoals = goals.filter(goal =>
    !goal.completed &&
    (goal.type === 'debt' ? goal.current > 0 : goal.current < goal.target)
  );

  const totalAllocated = Object.values(allocations).reduce((sum, amount) => {
    const numAmount = parseFloat(amount) || 0;
    return sum + numAmount;
  }, 0);

  const remainingAmount = availableAmount - totalAllocated;

  const handleGoalToggle = goalId => {
    const newSelected = new Set(selectedGoals);
    if (newSelected.has(goalId)) {
      newSelected.delete(goalId);
      // Remove allocation when deselecting
      const newAllocations = {...allocations};
      delete newAllocations[goalId];
      setAllocations(newAllocations);
    } else {
      newSelected.add(goalId);
    }
    setSelectedGoals(newSelected);
  };

  const handleAllocationChange = (goalId, value) => {
    // Allow empty string for editing, but convert to 0 for calculations
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setAllocations({
      ...allocations,
      [goalId]: cleanValue,
    });
  };

  const handleAllocateAll = goalId => {
    // Allocate all remaining amount to this goal
    setAllocations({
      ...allocations,
      [goalId]: remainingAmount.toString(),
    });
  };

  const handleEvenSplit = () => {
    if (selectedGoals.size === 0) {
      Alert.alert('No Goals Selected', 'Please select at least one goal first.');
      return;
    }

    const amountPerGoal = availableAmount / selectedGoals.size;
    const newAllocations = {};
    selectedGoals.forEach(goalId => {
      newAllocations[goalId] = amountPerGoal.toFixed(2);
    });
    setAllocations(newAllocations);
  };

  const handleConfirm = () => {
    if (selectedGoals.size === 0) {
      Alert.alert('No Goals Selected', 'Please select at least one goal to allocate funds to.');
      return;
    }

    if (totalAllocated <= 0) {
      Alert.alert('No Allocation', 'Please specify amounts to allocate to your selected goals.');
      return;
    }

    if (totalAllocated > availableAmount) {
      Alert.alert(
        'Allocation Exceeds Available Amount',
        `You're trying to allocate ${formatCurrency(totalAllocated)} but only have ${formatCurrency(availableAmount)} available.`
      );
      return;
    }

    // Create allocation data for selected goals
    const goalAllocations = [];
    selectedGoals.forEach(goalId => {
      const amount = parseFloat(allocations[goalId]) || 0;
      if (amount > 0) {
        const goal = activeGoals.find(g => g.id === goalId);
        goalAllocations.push({
          goalId,
          goal,
          amount,
        });
      }
    });

    onConfirm({
      goalAllocations,
      totalAllocated,
      remainingRollover: availableAmount - totalAllocated,
    });
  };

  const renderGoalCard = goal => {
    const isSelected = selectedGoals.has(goal.id);
    const allocation = allocations[goal.id] || '';
    const allocationAmount = parseFloat(allocation) || 0;

    const progressPercentage = goal.type === 'debt'
      ? ((goal.originalAmount - goal.current) / goal.originalAmount) * 100
      : (goal.current / goal.target) * 100;

    return (
      <View key={goal.id} style={styles.goalCard}>
        <TouchableOpacity
          style={styles.goalHeader}
          onPress={() => handleGoalToggle(goal.id)}
        >
          <View style={styles.goalCheckbox}>
            <Icon
              name={isSelected ? 'check-square' : 'square'}
              size={20}
              color={isSelected ? colors.primary : colors.textSecondary}
            />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalProgress}>
              {goal.type === 'debt'
                ? `${formatCurrency(goal.current)} remaining`
                : `${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}`
              }
            </Text>
          </View>
          <View style={styles.goalTypeIcon}>
            <Icon
              name={goal.type === 'debt' ? 'credit-card' : goal.type === 'savings' ? 'dollar-sign' : 'shopping-cart'}
              size={16}
              color={colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {width: `${Math.min(progressPercentage, 100)}%`},
            ]}
          />
        </View>

        {isSelected && (
          <View style={styles.allocationSection}>
            <View style={styles.allocationInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.allocationInput}
                value={allocation}
                onChangeText={value => handleAllocationChange(goal.id, value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <TouchableOpacity
              style={styles.allocateAllButton}
              onPress={() => handleAllocateAll(goal.id)}
            >
              <Text style={styles.allocateAllText}>All</Text>
            </TouchableOpacity>
          </View>
        )}

        {allocationAmount > 0 && (
          <Text style={styles.allocationPreview}>
            Will allocate: {formatCurrency(allocationAmount)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.button}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Allocate to Goals</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.button}>
            <Text style={[styles.confirmText, (selectedGoals.size === 0 || totalAllocated <= 0) && styles.disabledText]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
          {/* Amount Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Available to allocate:</Text>
              <Text style={styles.availableAmount}>
                {formatCurrency(availableAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total allocated:</Text>
              <Text style={[styles.allocatedAmount, totalAllocated > availableAmount && styles.errorAmount]}>
                {formatCurrency(totalAllocated)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.remainingRow]}>
              <Text style={styles.summaryLabel}>Remaining:</Text>
              <Text style={[styles.remainingAmount, remainingAmount < 0 && styles.errorAmount]}>
                {formatCurrency(remainingAmount)}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleEvenSplit}
            >
              <Icon name="divide" size={16} color={colors.primary} />
              <Text style={styles.quickActionText}>Even Split</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <Text style={styles.instructionsText}>
            Select goals and specify how much to allocate to each from your rollover funds.
          </Text>

          {/* Goals List */}
          <View style={styles.goalsContainer}>
            {activeGoals.map(renderGoalCard)}
          </View>

          {activeGoals.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="target" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Active Goals</Text>
              <Text style={styles.emptySubtitle}>
                Create some goals first to allocate your rollover funds
              </Text>
            </View>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.overlayLight,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'left',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
  },
  disabledText: {
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: colors.overlayLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  remainingRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.overlayDark,
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  availableAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  allocatedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  remainingAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.progressGreen,
  },
  errorAmount: {
    color: colors.error,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlayLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.overlayDark,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  goalsContainer: {
    gap: 16,
  },
  goalCard: {
    backgroundColor: colors.overlayLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalCheckbox: {
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  goalTypeIcon: {
    marginLeft: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.overlayDark,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.progressGreen,
    borderRadius: 2,
  },
  allocationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  allocationInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '300',
    color: colors.textPrimary,
    marginRight: 4,
  },
  allocationInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '300',
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  allocateAllButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  allocateAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  allocationPreview: {
    fontSize: 12,
    color: colors.progressGreen,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GoalAllocationModal;
