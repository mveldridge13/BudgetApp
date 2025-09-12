import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import {formatCurrencySync} from '../utils/currencyHelper';

const {width: screenWidth} = Dimensions.get('window');

const GoalAllocationModal = ({
  visible,
  onClose,
  onConfirm,
  onCreateGoal,
  availableAmount,
  currency = 'AUD',
  goals = [],
}) => {
  const [allocations, setAllocations] = useState({});
  const [selectedGoals, setSelectedGoals] = useState(new Set());

  // Animation refs
  const slideAnim = useRef(new Animated.Value(300)).current; // Start 300px below screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setAllocations({});
      setSelectedGoals(new Set());
    }
  }, [visible]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      // Delay the animation slightly to let main modal start animating
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100); // 100ms delay
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      keyboardAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim, keyboardAnim]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        const height = event.endCoordinates.height;
        Animated.timing(keyboardAnim, {
          toValue: -height + 50, // Move up by keyboard height minus 50px gap
          duration: Platform.OS === 'ios' ? event.duration : 300,
          useNativeDriver: true,
        }).start();
      },
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      event => {
        Animated.timing(keyboardAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? event.duration : 300,
          useNativeDriver: true,
        }).start();
      },
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardAnim]);

  const formatCurrency = amount => {
    return formatCurrencySync(amount, currency);
  };

  const activeGoals = goals.filter(
    goal =>
      !goal.completed &&
      (goal.type === 'debt' ? goal.current > 0 : goal.current < goal.target),
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
      Alert.alert(
        'No Goals Selected',
        'Please select at least one goal first.',
      );
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
      Alert.alert(
        'No Goals Selected',
        'Please select at least one goal to allocate funds to.',
      );
      return;
    }

    if (totalAllocated <= 0) {
      Alert.alert(
        'No Allocation',
        'Please specify amounts to allocate to your selected goals.',
      );
      return;
    }

    if (totalAllocated > availableAmount) {
      Alert.alert(
        'Allocation Exceeds Available Amount',
        `You're trying to allocate ${formatCurrency(
          totalAllocated,
        )} but only have ${formatCurrency(availableAmount)} available.`,
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

  const renderGoalItem = goal => {
    const isSelected = selectedGoals.has(goal.id);
    const allocation = allocations[goal.id] || '';

    return (
      <TouchableOpacity
        key={goal.id}
        style={[styles.goalItem, isSelected && styles.goalItemSelected]}
        onPress={() => handleGoalToggle(goal.id)}
        activeOpacity={0.7}>
        <View style={styles.goalHeader}>
          <View style={styles.goalCheckbox}>
            <Icon
              name={isSelected ? 'check-circle' : 'circle'}
              size={20}
              color={isSelected ? colors.primary : colors.textSecondary}
            />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalProgress}>
              {goal.type === 'debt'
                ? `${formatCurrency(goal.current)} remaining`
                : `${formatCurrency(goal.current)} / ${formatCurrency(
                    goal.target,
                  )}`}
            </Text>
          </View>
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
              disabled={remainingAmount <= 0}>
              <Text
                style={[
                  styles.allocateAllText,
                  remainingAmount <= 0 && styles.disabledText,
                ]}>
                All
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.overlayContainer, {opacity: fadeAnim}]}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />

      <Animated.View
        style={[
          styles.overlayContent,
          {
            transform: [{translateY: slideAnim}, {translateY: keyboardAnim}],
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Allocate Rollover</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Amount Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Available:</Text>
            <Text style={styles.availableAmount}>
              {formatCurrency(availableAmount)}
            </Text>
          </View>
          {totalAllocated > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Allocated:</Text>
              <Text
                style={[
                  styles.allocatedAmount,
                  totalAllocated > availableAmount && styles.errorAmount,
                ]}>
                {formatCurrency(totalAllocated)}
              </Text>
            </View>
          )}
        </View>

        {/* Goals List - Scrollable */}
        <View style={styles.goalsContainer}>
          {activeGoals.length > 0 ? (
            <>
              {selectedGoals.size === 0 && (
                <Text style={styles.instructionText}>
                  Tap goals to select them
                </Text>
              )}
              {activeGoals.slice(0, 2).map(goal => renderGoalItem(goal))}
              {selectedGoals.size > 1 && (
                <TouchableOpacity
                  style={styles.evenSplitButton}
                  onPress={handleEvenSplit}>
                  <Text style={styles.evenSplitText}>Split Evenly</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.emptyState}
              onPress={() => {
                if (onCreateGoal) {
                  onCreateGoal(); // Open Add Goal modal (GoalAllocationModal stays open)
                }
              }}
              activeOpacity={0.7}>
              <Icon name="target" size={24} color={colors.primary} />
              <Text style={styles.emptyTitle}>No Active Goals</Text>
              <Text style={styles.emptySubtitle}>
                Tap to create a goal for your rollover funds
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Confirm Button */}
        {selectedGoals.size > 0 && totalAllocated > 0 && (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              totalAllocated > availableAmount && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={totalAllocated > availableAmount}>
            <Text
              style={[
                styles.confirmButtonText,
                totalAllocated > availableAmount && styles.disabledText,
              ]}>
              Allocate {formatCurrency(totalAllocated)}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  overlayContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
    paddingBottom: 30,
    width: screenWidth,
    maxHeight: '55%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  summaryCard: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '400',
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
  errorAmount: {
    color: colors.error,
  },
  goalsContainer: {
    maxHeight: 150,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  goalItem: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  goalItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  allocationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.overlayLight,
  },
  allocationInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
  allocationInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    padding: 0,
  },
  allocateAllButton: {
    marginLeft: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  allocateAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  evenSplitButton: {
    backgroundColor: colors.overlayLight,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  evenSplitText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  disabledText: {
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    backgroundColor: `${colors.primary}08`,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GoalAllocationModal;
