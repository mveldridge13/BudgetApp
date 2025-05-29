/* eslint-disable react-native/no-inline-styles */
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
  balanceCardRef, // Pass the ref as a prop
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

    // Parse the next pay date (DD/MM/YYYY format)
    const [dayStr, monthStr, yearStr] = incomeData.nextPayDate.split('/');
    const nextPayDate = new Date(
      2000 + parseInt(yearStr, 10),
      parseInt(monthStr, 10) - 1,
      parseInt(dayStr, 10),
    );

    // Calculate days based on frequency
    const frequencyDays = {
      weekly: 7,
      fortnightly: 14,
      monthly: 30,
    };

    const days = frequencyDays[incomeData.frequency] || 30;

    // Calculate the previous pay date to get the current period start
    let periodStart;
    if (incomeData.frequency === 'monthly') {
      // For monthly, go to the same day of the previous month
      periodStart = new Date(nextPayDate);
      periodStart.setMonth(periodStart.getMonth() - 1);
    } else {
      // For weekly/fortnightly, subtract the exact number of days
      periodStart = new Date(nextPayDate);
      periodStart.setDate(periodStart.getDate() - days);
    }

    // Current period runs from previous pay date to day before next pay
    const periodEnd = new Date(nextPayDate);
    periodEnd.setDate(periodEnd.getDate() - 1);

    // Adjust dates based on selected month
    const monthDiff = selectedDate.getMonth() - new Date().getMonth();
    if (monthDiff !== 0) {
      periodStart.setMonth(periodStart.getMonth() + monthDiff);
      periodEnd.setMonth(periodEnd.getMonth() + monthDiff);
    }

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

  // Calculate values
  const incomeAmount = incomeData?.income || 0;
  const leftToSpend = incomeAmount - totalExpenses;
  const percentageRemaining =
    incomeAmount > 0 ? Math.round((leftToSpend / incomeAmount) * 100) : 0;

  // Additional calculated metrics for future features
  const dailyBudget =
    incomeData?.frequency === 'weekly'
      ? leftToSpend / 7
      : incomeData?.frequency === 'fortnightly'
      ? leftToSpend / 14
      : leftToSpend / 30;

  const isOverBudget = leftToSpend < 0;
  const isCloseToLimit = percentageRemaining < 20 && percentageRemaining > 0;

  return (
    <View style={styles.container}>
      {/* Period Info - Touchable (NOT highlighted) */}
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
            Paid {incomeData.frequency} • Next: {incomeData.nextPayDate}
          </Text>
        </TouchableOpacity>
      )}

      {/* Balance Card - Only this part gets the ref */}
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

        <View style={styles.leftToSpendSection}>
          <Text style={styles.balanceLabel}>LEFT TO SPEND</Text>
          <Text
            style={[
              styles.leftAmount,
              isOverBudget && styles.overBudgetText,
              isCloseToLimit && styles.warningText,
            ]}>
            {loading ? '$0.00' : formatCurrency(leftToSpend)}
          </Text>

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

            {/* Daily budget indicator - ready for future features */}
            {!loading && dailyBudget > 0 && (
              <Text style={styles.dailyBudgetText}>
                {formatCurrency(dailyBudget)}/day
              </Text>
            )}
          </View>

          {/* Extra padding to prevent overlap with edit icon */}
          <View style={styles.bottomPadding} />

          {/* Status indicators - ready for future features */}
          {isOverBudget && (
            <Text style={styles.statusWarning}>
              ⚠️ Over budget by {formatCurrency(Math.abs(leftToSpend))}
            </Text>
          )}

          {isCloseToLimit && (
            <Text style={styles.statusWarning}>
              💡 Low balance - consider reducing expenses
            </Text>
          )}
        </View>

        {/* Edit Income Icon - Bottom right corner */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container for the entire balance section
  },
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
  leftToSpendSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.overlayLight,
  },
  leftAmount: {
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    marginBottom: 10,
    letterSpacing: -0.3,
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
});

export default BalanceCard;
