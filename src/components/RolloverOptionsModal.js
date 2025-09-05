import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import {formatCurrencySync} from '../utils/currencyHelper';

const RolloverOptionsModal = ({
  visible,
  onClose,
  onConfirm,
  availableAmount,
  currency = 'AUD',
  goals = [],
  frequency = 'fortnightly',
}) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const formatCurrency = amount => {
    return formatCurrencySync(amount, currency);
  };

  const getFrequencyText = () => {
    switch (frequency) {
      case 'weekly':
        return 'next week';
      case 'fortnightly':
        return 'next fortnight';
      case 'monthly':
        return 'next month';
      case 'sixmonths':
        return 'next 6 months';
      case 'yearly':
        return 'next year';
      default:
        return 'next period';
    }
  };

  const handleOptionSelect = option => {
    setSelectedOption(option);
  };

  const handleConfirm = () => {
    if (!selectedOption) {
      Alert.alert('Please Select', 'Choose how you want to handle your leftover funds.');
      return;
    }

    if (selectedOption === 'goals' && goals.length === 0) {
      // Navigate to create goal
      Alert.alert(
        'Create Goal First',
        'You need to create a goal before allocating funds to it.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Create Goal',
            onPress: () => {
              onConfirm({option: 'createGoal'});
            },
          },
        ],
      );
      return;
    }

    onConfirm({
      option: selectedOption,
      rolloverAmount: selectedOption === 'rollover' ? availableAmount : 0,
      goalAllocation: selectedOption === 'goals' ? availableAmount : 0,
    });
  };

  const activeGoals = goals.filter(goal => 
    !goal.completed && 
    (goal.type === 'debt' ? goal.current > 0 : goal.current < goal.target)
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.button}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Leftover Funds</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.button}>
            <Text style={[styles.confirmText, !selectedOption && styles.disabledText]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Amount Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Icon name="dollar-sign" size={24} color={colors.progressGreen} />
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryTitle}>You have</Text>
                <Text style={styles.availableAmount}>
                  {formatCurrency(availableAmount)}
                </Text>
                <Text style={styles.summarySubtitle}>leftover this period</Text>
              </View>
            </View>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>What would you like to do?</Text>

            {/* Roll Over Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === 'rollover' && styles.optionCardSelected,
              ]}
              onPress={() => handleOptionSelect('rollover')}>
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <Icon name="arrow-right-circle" size={24} color={colors.progressGreen} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Roll Over</Text>
                  <Text style={styles.optionDescription}>
                    Add {formatCurrency(availableAmount)} to your spending budget for {getFrequencyText()}
                  </Text>
                </View>
              </View>
              {selectedOption === 'rollover' && (
                <View style={styles.selectedIcon}>
                  <Icon name="check-circle" size={20} color={colors.progressGreen} />
                </View>
              )}
            </TouchableOpacity>

            {/* Goals Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === 'goals' && styles.optionCardSelected,
              ]}
              onPress={() => handleOptionSelect('goals')}>
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <Icon name="target" size={24} color={colors.progressGreen} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Save to Goals</Text>
                  <Text style={styles.optionDescription}>
                    {activeGoals.length > 0
                      ? `Put ${formatCurrency(availableAmount)} towards your active goals`
                      : 'Create a new goal and allocate these funds to it'}
                  </Text>
                </View>
              </View>
              {selectedOption === 'goals' && (
                <View style={styles.selectedIcon}>
                  <Icon name="check-circle" size={20} color={colors.progressGreen} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Active Goals Preview */}
          {activeGoals.length > 0 && selectedOption === 'goals' && (
            <View style={styles.goalsPreview}>
              <Text style={styles.previewTitle}>Your Active Goals</Text>
              {activeGoals.slice(0, 3).map(goal => (
                <View key={goal.id} style={styles.goalPreviewCard}>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalProgress}>
                      {goal.type === 'debt' 
                        ? `${formatCurrency(goal.current)} remaining`
                        : `${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}`
                      }
                    </Text>
                  </View>
                  <View style={styles.goalProgressBar}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        {
                          width: `${Math.min(
                            goal.type === 'debt'
                              ? ((goal.originalAmount - goal.current) / goal.originalAmount) * 100
                              : (goal.current / goal.target) * 100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
              {activeGoals.length > 3 && (
                <Text style={styles.moreGoalsText}>
                  +{activeGoals.length - 3} more goals
                </Text>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
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
    color: colors.progressGreen,
    textAlign: 'right',
  },
  disabledText: {
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: colors.overlayLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  availableAmount: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.progressGreen,
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: colors.overlayLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.overlayDark,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: colors.progressGreen,
    backgroundColor: colors.successLight,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  selectedIcon: {
    marginLeft: 12,
  },
  goalsPreview: {
    backgroundColor: colors.overlayLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  goalPreviewCard: {
    marginBottom: 16,
  },
  goalInfo: {
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  goalProgress: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  goalProgressBar: {
    height: 4,
    backgroundColor: colors.overlayDark,
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.progressGreen,
    borderRadius: 2,
  },
  moreGoalsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default RolloverOptionsModal;