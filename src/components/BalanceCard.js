/* eslint-disable react-native/no-inline-styles */
// components/BalanceCard.js (Improved goal readability with larger fonts and better spacing)
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';

const BalanceCard = ({
  incomeData,
  loading,
  totalExpenses,
  onEditIncome,
  onCalendarPress,
  selectedDate,
  balanceCardRef,
  // New goal-related props
  goals = [],
  onGoalsPress,
}) => {
  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount || 0);
  };

  const getCurrentMonth = () => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[selectedDate.getMonth()];
  };

  const calculatePayPeriod = () => {
    if (!incomeData?.nextPayDate || !incomeData?.frequency) {
      return null;
    }

    let nextPayDate;

    // Handle both ISO string format (from CalendarModal) and DD/MM/YYYY format (legacy)
    if (incomeData.nextPayDate.includes('T')) {
      // ISO string format from CalendarModal
      nextPayDate = new Date(incomeData.nextPayDate);
    } else {
      // Legacy DD/MM/YYYY format
      const [dayStr, monthStr, yearStr] = incomeData.nextPayDate.split('/');
      nextPayDate = new Date(
        2000 + parseInt(yearStr, 10),
        parseInt(monthStr, 10) - 1,
        parseInt(dayStr, 10),
      );
    }

    // Validate the date
    if (isNaN(nextPayDate.getTime())) {
      return null;
    }

    const frequencyDays = {
      weekly: 7,
      fortnightly: 14,
      monthly: 30,
    };

    const days = frequencyDays[incomeData.frequency] || 30;

    let periodStart;
    if (incomeData.frequency === 'monthly') {
      periodStart = new Date(nextPayDate);
      periodStart.setMonth(periodStart.getMonth() - 1);
    } else {
      periodStart = new Date(nextPayDate);
      periodStart.setDate(periodStart.getDate() - days);
    }

    const periodEnd = new Date(nextPayDate);
    periodEnd.setDate(periodEnd.getDate() - 1);

    const formatDate = dateToFormat => {
      const dayNum = dateToFormat.getDate();
      const monthName = dateToFormat.toLocaleDateString('en-AU', {
        month: 'short',
      });
      const yearNum = dateToFormat.getFullYear().toString().slice(-2);
      return `${dayNum} ${monthName} ${yearNum}`;
    };

    return `${formatDate(periodStart)} - ${formatDate(periodEnd)}`;
  };

  // Format the next pay date for display
  const formatNextPayDate = () => {
    if (!incomeData?.nextPayDate) {
      return '';
    }

    let nextPayDate;

    // Handle both ISO string format and DD/MM/YYYY format
    if (incomeData.nextPayDate.includes('T')) {
      // ISO string format from CalendarModal
      nextPayDate = new Date(incomeData.nextPayDate);
    } else {
      // Legacy DD/MM/YYYY format
      const [dayStr, monthStr, yearStr] = incomeData.nextPayDate.split('/');
      nextPayDate = new Date(
        2000 + parseInt(yearStr, 10),
        parseInt(monthStr, 10) - 1,
        parseInt(dayStr, 10),
      );
    }

    // Validate the date
    if (isNaN(nextPayDate.getTime())) {
      return incomeData.nextPayDate; // Fallback to original string
    }

    // Format as DD/MM/YYYY for display
    return nextPayDate.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filter goals that should be shown on balance card
  const balanceCardGoals = goals.filter(goal => goal.showOnBalanceCard);

  // Calculate active goals count (exclude completed goals)
  const activeGoalsCount = goals.filter(goal => {
    // Check if explicitly marked as completed
    if (goal.completed === true) {
      return false;
    }

    // Check if goal is functionally complete based on progress
    if (goal.type === 'debt') {
      // For debt goals, complete when current amount reaches 0 or below
      return goal.current > 0;
    } else {
      // For savings/spending goals, complete when current >= target
      return goal.current < goal.target;
    }
  }).length;

  // Calculate total goal contributions
  const totalGoalContributions = balanceCardGoals.reduce(
    (sum, goal) => sum + (goal.autoContribute || 0),
    0,
  );

  // Calculate values
  const incomeAmount = incomeData?.income || 0;
  const leftToSpend = incomeAmount - totalExpenses;
  const adjustedLeftToSpend = leftToSpend - totalGoalContributions;
  const percentageRemaining =
    incomeAmount > 0 ? Math.round((leftToSpend / incomeAmount) * 100) : 0;

  // Additional calculated metrics
  const dailyBudget =
    incomeData?.frequency === 'weekly'
      ? adjustedLeftToSpend / 7
      : incomeData?.frequency === 'fortnightly'
      ? adjustedLeftToSpend / 14
      : adjustedLeftToSpend / 30;

  const isOverBudget = leftToSpend < 0;
  const isCloseToLimit = percentageRemaining < 20 && percentageRemaining > 0;
  const isGoalImpact = totalGoalContributions > 0 && adjustedLeftToSpend < 500;

  // Calculate goal progress for display
  const getGoalProgress = goal => {
    if (goal.type === 'debt') {
      const paid = goal.originalAmount - goal.current;
      return Math.min((paid / goal.originalAmount) * 100, 100);
    }
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const getGoalDisplayAmount = goal => {
    if (goal.type === 'debt') {
      return `${formatCurrency(goal.current)} left`;
    }
    return `${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}`;
  };

  const getGoalProgressColor = goal => {
    if (goal.type === 'debt') {
      return colors.danger;
    }
    if (goal.type === 'spending') {
      return colors.warning;
    }
    return colors.progressGreen;
  };

  return (
    <View style={styles.container}>
      {/* Period Info - Touchable */}
      {incomeData && !loading && (
        <TouchableOpacity
          style={styles.periodInfo}
          onPress={onCalendarPress}
          activeOpacity={0.7}>
          <Text style={styles.currentMonth}>{getCurrentMonth()}</Text>
          {calculatePayPeriod() && (
            <Text style={styles.payPeriod}>{calculatePayPeriod()}</Text>
          )}
          <Text style={styles.frequencyDisplay}>
            Paid {incomeData.frequency} • Next: {formatNextPayDate()}
          </Text>
        </TouchableOpacity>
      )}

      {/* Balance Card */}
      <View
        ref={balanceCardRef}
        style={[styles.balanceCard, isOverBudget && styles.overBudgetCard]}
        collapsable={false}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>BALANCE</Text>
            <Text style={styles.totalIncome}>
              {loading ? '$0.00' : formatCurrency(incomeAmount)}
            </Text>
          </View>
          <View style={[styles.balanceItem, styles.balanceItemRight]}>
            <Text style={styles.balanceLabel}>TOTAL EXPENSES</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>

        {/* Goals Section - Only show if user has enabled goals */}
        {balanceCardGoals.length > 0 && (
          <View style={styles.goalsSection}>
            <View style={styles.goalsSectionHeader}>
              <View style={styles.goalsTitleContainer}>
                <Icon name="target" size={16} color={colors.textWhite} />
                <Text style={styles.goalsTitle}>
                  Active Goals ({activeGoalsCount})
                </Text>
              </View>
              <Text style={styles.goalsCount}>
                {balanceCardGoals.length} showing
              </Text>
            </View>

            <View style={styles.goalsList}>
              {balanceCardGoals.slice(0, 3).map(goal => {
                const progress = getGoalProgress(goal);
                return (
                  <View key={goal.id} style={styles.goalItem}>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalTitleRow}>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        {goal.type === 'debt' && (
                          <View style={styles.goalTypeBadge}>
                            <Text style={styles.goalTypeBadgeText}>DEBT</Text>
                          </View>
                        )}
                        {goal.type === 'spending' && (
                          <View
                            style={[
                              styles.goalTypeBadge,
                              {backgroundColor: colors.warningLight},
                            ]}>
                            <Text
                              style={[
                                styles.goalTypeBadgeText,
                                {color: colors.warning},
                              ]}>
                              BUDGET
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.goalAmount}>
                        {getGoalDisplayAmount(goal)}
                      </Text>
                    </View>
                    <View style={styles.goalProgressContainer}>
                      <View
                        style={[
                          styles.goalProgressBar,
                          {
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: getGoalProgressColor(goal),
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {totalGoalContributions > 0 && (
              <View style={styles.goalContributionsRow}>
                <Text style={styles.contributionsLabel}>
                  Monthly goal contributions:
                </Text>
                <Text style={styles.contributionsAmount}>
                  {formatCurrency(totalGoalContributions)}
                </Text>
              </View>
            )}

            {balanceCardGoals.length > 3 && (
              <Text style={styles.moreGoalsText}>
                +{balanceCardGoals.length - 3} more goals
              </Text>
            )}
          </View>
        )}

        <View style={styles.leftToSpendSection}>
          <Text style={styles.balanceLabel}>LEFT TO SPEND</Text>
          <View style={styles.leftAmountRow}>
            <Text
              style={[
                styles.leftAmount,
                isOverBudget && styles.overBudgetText,
                isCloseToLimit && styles.warningText,
              ]}>
              {loading ? '$0.00' : formatCurrency(leftToSpend)}
            </Text>
            {totalGoalContributions > 0 && (
              <View style={styles.adjustedAmountContainer}>
                <Text style={styles.adjustedLabel}>After goals:</Text>
                <Text style={styles.adjustedAmount}>
                  {formatCurrency(adjustedLeftToSpend)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.max(0, Math.min(100, percentageRemaining))}%`,
                },
                isOverBudget && styles.overBudgetBar,
                isCloseToLimit && styles.warningBar,
              ]}
            />
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.progressText}>
              {loading
                ? '0% of income remaining'
                : `${percentageRemaining}% of income remaining`}
            </Text>

            {!loading && dailyBudget > 0 && (
              <Text style={styles.dailyBudgetText}>
                {formatCurrency(dailyBudget)}/day
              </Text>
            )}
          </View>

          {/* Smart insights */}
          {isGoalImpact && (
            <Text style={styles.statusWarning}>
              💡 Consider reducing goal contributions by{' '}
              {formatCurrency(Math.abs(adjustedLeftToSpend - 500))} this month
            </Text>
          )}

          {isOverBudget && (
            <Text style={styles.statusWarning}>
              ⚠️ Over budget by {formatCurrency(Math.abs(leftToSpend))}
            </Text>
          )}

          {isCloseToLimit && !isGoalImpact && (
            <Text style={styles.statusWarning}>
              💡 Low balance - consider reducing expenses
            </Text>
          )}

          <View style={styles.bottomPadding} />
        </View>

        {/* Edit Income Icon */}
        <TouchableOpacity
          style={styles.editIcon}
          onPress={onEditIncome}
          activeOpacity={0.7}>
          <Icon
            name="edit-3"
            size={12}
            color={colors.textWhite}
            style={{opacity: 0.8}}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Goal Actions - Simplified to only show View Goals button */}
      {balanceCardGoals.length > 0 ? (
        <TouchableOpacity
          style={styles.viewGoalsButton}
          onPress={onGoalsPress}
          activeOpacity={0.7}>
          <Icon name="target" size={16} color={colors.textWhite} />
          <Text style={styles.viewGoalsButtonText}>
            View Goals ({activeGoalsCount})
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.setupGoalsButton}
          onPress={onGoalsPress}
          activeOpacity={0.7}>
          <Icon name="target" size={16} color={colors.textWhite} />
          <Text style={styles.setupGoalsButtonText}>
            {activeGoalsCount > 0
              ? `Active Goals (${activeGoalsCount})`
              : 'Set Up Goals'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  periodInfo: {
    marginBottom: 20,
  },
  currentMonth: {
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  payPeriod: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.8,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  frequencyDisplay: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.7,
    letterSpacing: -0.1,
  },
  balanceCard: {
    backgroundColor: colors.overlayLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.overlayDark,
    position: 'relative',
  },
  overBudgetCard: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceItem: {
    flex: 1,
  },
  balanceItemRight: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.8,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.2,
  },
  totalIncome: {
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.5,
  },
  goalsSection: {
    marginBottom: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.overlayLight,
  },
  goalsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalsTitle: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  goalsCount: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.7,
  },
  goalsList: {
    gap: 12,
  },
  goalItem: {
    marginBottom: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.95,
  },
  goalTypeBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goalTypeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalAmount: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.85,
  },
  goalProgressContainer: {
    height: 4,
    backgroundColor: colors.overlayLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  goalContributionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.overlayLight,
  },
  contributionsLabel: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.8,
  },
  contributionsAmount: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  moreGoalsText: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 10,
  },
  leftToSpendSection: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.overlayLight,
  },
  leftAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  leftAmount: {
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.3,
  },
  adjustedAmountContainer: {
    alignItems: 'flex-end',
  },
  adjustedLabel: {
    fontSize: 10,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.7,
  },
  adjustedAmount: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.1,
  },
  overBudgetText: {
    color: '#FF6B6B',
  },
  warningText: {
    color: '#FFB366',
  },
  progressContainer: {
    backgroundColor: colors.overlayLight,
    borderRadius: 10,
    height: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.progressGreen,
    borderRadius: 10,
  },
  overBudgetBar: {
    backgroundColor: '#FF6B6B',
  },
  warningBar: {
    backgroundColor: '#FFB366',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.8,
    letterSpacing: -0.1,
  },
  dailyBudgetText: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.9,
    letterSpacing: -0.1,
  },
  statusWarning: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: '#FFB366',
    marginTop: 8,
    textAlign: 'center',
  },

  editIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomPadding: {
    height: 32,
  },
  viewGoalsButton: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  viewGoalsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  setupGoalsButton: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  setupGoalsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
});

export default BalanceCard;
