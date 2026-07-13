/* eslint-disable react-native/no-inline-styles */
// components/BalanceCard.js (Improved goal readability with larger fonts and better spacing)
import React, {useMemo, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import {formatCurrencySync} from '../utils/currencyHelper';
import {getExpenseBreakdownSync} from '../utils/expenseBreakdownCalculator';

const BalanceCard = ({
  incomeData,
  loading,
  totalExpenses,
  totalIncomePayments = 0,
  totalAdditionalIncome = 0,
  onEditIncome,
  onCalendarPress,
  selectedDate,
  balanceCardRef,
  // New goal-related props
  goals = [],
  onGoalsPress,
  // Currency setting
  currency = 'AUD',
  // Transactions for expense breakdown
  transactions = [],
  // Rollover props
  rolloverAmount = 0,
  rolloverBanner = null,
  onDismissRolloverBanner = null,
  onReassignRollover = null,
  // Pay period UI state (calculated by HomeContainer)
  isNewPayPeriodForUI = false,
  // Backend home summary (single source of truth)
  homeSummary = null,
}) => {
  const formatCurrency = amount => {
    return formatCurrencySync(amount, currency);
  };

  // Carousel state (only used when there's an additional account; the
  // "Everything" card already represents the main income, so the carousel
  // only adds one slide per additional income account, web parity).
  const [activeSlide, setActiveSlide] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const carouselScrollRef = useRef(null);

  const handleCarouselScrollEnd = e => {
    if (!carouselWidth) {
      return;
    }
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setActiveSlide(index);
  };

  const scrollToSlide = index => {
    carouselScrollRef.current?.scrollTo({
      x: index * carouselWidth,
      animated: true,
    });
  };

  const additionalAccounts = (homeSummary?.accounts || []).filter(
    account => !account.isSalary,
  );

  const getCurrentDate = () => {
    const day = selectedDate.getDate();
    const month = selectedDate.toLocaleDateString('en-AU', {
      month: 'short',
    });
    return `${month} ${day}`;
  };

  // Use the pay period state calculated by HomeContainer (maintains separation of concerns)
  const isNewPayPeriod = isNewPayPeriodForUI;

  // Get pay period status text (simplified - no countdown)
  const getPayPeriodStatus = () => {
    if (!incomeData?.nextPayDate) {
      return null;
    }

    if (isNewPayPeriod) {
      return 'New period started!';
    }

    return null; // No countdown display
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

  // Calculate total local income payments for goals not synced to backend
  const localIncomePayments = goals.reduce((sum, goal) => {
    // Only count local goals' income payments (backend payments are in totalIncomePayments prop)
    if (goal.id.startsWith('local_')) {
      return sum + (goal.totalIncomePayments || 0);
    }
    return sum;
  }, 0);

  // Check if rollover preview should be shown (1 day before new pay period)
  const shouldShowRolloverPreview = useMemo(() => {
    if (!incomeData?.nextPayDate || adjustedLeftToSpend <= 0) {
      return false;
    }

    try {
      // Parse nextPayDate as local date
      let nextPayDate;
      if (incomeData.nextPayDate.includes('T')) {
        const dateOnly = incomeData.nextPayDate.split('T')[0];
        nextPayDate = new Date(dateOnly + 'T12:00:00');
      } else {
        nextPayDate = new Date(incomeData.nextPayDate + 'T12:00:00');
      }

      // Get today's date
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      // Get tomorrow's date
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get pay date start (without time)
      const payDateStart = new Date(
        nextPayDate.getFullYear(),
        nextPayDate.getMonth(),
        nextPayDate.getDate(),
      );

      // Show preview if tomorrow is the pay date (i.e., today is 1 day before)
      return tomorrow.getTime() === payDateStart.getTime();
    } catch (error) {
      return false;
    }
  }, [incomeData?.nextPayDate, adjustedLeftToSpend]);

  // Calculate expense breakdown with memoization - filter to current pay period only
  // Uses homeSummary.period from backend as single source of truth for period dates
  const expenseBreakdown = useMemo(() => {
    if (!Array.isArray(transactions)) {
      return getExpenseBreakdownSync([]);
    }

    // Use backend's period dates if available (YYYY-MM-DD strings)
    // This ensures alignment with backend pay period calculations
    if (homeSummary?.period?.start && homeSummary?.period?.end) {
      try {
        // Parse period dates as local dates at start/end of day
        const periodStart = new Date(homeSummary.period.start + 'T00:00:00');
        const periodEnd = new Date(homeSummary.period.end + 'T23:59:59.999');

        // Filter transactions to current pay period only
        const currentPeriodTransactions = transactions.filter(transaction => {
          try {
            const transactionDate = new Date(transaction.date);
            if (isNaN(transactionDate.getTime())) {
              return false;
            }
            return (
              transactionDate >= periodStart && transactionDate <= periodEnd
            );
          } catch (error) {
            return false;
          }
        });

        return getExpenseBreakdownSync(currentPeriodTransactions);
      } catch (error) {
        return getExpenseBreakdownSync(transactions); // Fallback to all transactions
      }
    }

    // Fallback: return all transactions if no period data
    return getExpenseBreakdownSync(transactions);
  }, [transactions, homeSummary?.period?.start, homeSummary?.period?.end]);

  // Calculate values - prefer backend homeSummary when available
  const incomeAmount =
    homeSummary?.income?.totalInflow ??
    (incomeData?.income || 0) + rolloverAmount;

  // Use backend leftToSpendSafe as single source of truth
  const adjustedLeftToSpend =
    homeSummary?.totals?.leftToSpendSafe ??
    incomeAmount -
      totalExpenses -
      totalGoalContributions -
      totalIncomePayments -
      localIncomePayments;

  // leftToSpend is only used for over-budget detection
  const leftToSpend = homeSummary
    ? adjustedLeftToSpend
    : incomeAmount - totalExpenses;

  // Use adjustedLeftToSpend for percentage to match displayed value (consistency fix)
  const percentageRemaining =
    incomeAmount > 0
      ? Math.round((adjustedLeftToSpend / incomeAmount) * 100)
      : 0;

  // Additional calculated metrics - prefer backend daysRemaining
  const getDaysUntilNextPay = () => {
    // Use backend value if available
    if (homeSummary?.period?.daysRemaining) {
      return Math.max(1, homeSummary.period.daysRemaining);
    }

    if (!incomeData?.nextPayDate) {
      // Fallback to frequency-based calculation
      return incomeData?.frequency === 'weekly'
        ? 7
        : incomeData?.frequency === 'fortnightly'
        ? 14
        : 30;
    }

    try {
      // Parse nextPayDate as local date
      let nextPayDate;
      if (incomeData.nextPayDate.includes('T')) {
        const dateOnly = incomeData.nextPayDate.split('T')[0];
        nextPayDate = new Date(dateOnly + 'T12:00:00');
      } else {
        nextPayDate = new Date(incomeData.nextPayDate + 'T12:00:00');
      }

      // Get today's date
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      // Get pay date start (without time)
      const payDateStart = new Date(
        nextPayDate.getFullYear(),
        nextPayDate.getMonth(),
        nextPayDate.getDate(),
      );

      // Calculate days remaining
      const timeDiff = payDateStart.getTime() - todayStart.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return Math.max(1, daysDiff); // Minimum 1 day to avoid division by zero
    } catch (error) {
      // Fallback to frequency-based calculation
      return incomeData?.frequency === 'weekly'
        ? 7
        : incomeData?.frequency === 'fortnightly'
        ? 14
        : 30;
    }
  };

  const daysUntilNextPay = getDaysUntilNextPay();
  const dailyBudget = adjustedLeftToSpend / daysUntilNextPay;

  // Calculate weekly budget based on pay frequency
  const weeklyBudget = (() => {
    const frequency = incomeData?.frequency?.toLowerCase();

    if (frequency === 'weekly') {
      // For weekly pay: weekly budget is the current remaining amount
      return adjustedLeftToSpend;
    } else if (frequency === 'fortnightly') {
      // For fortnightly pay: calculate weekly portion of remaining budget
      return dailyBudget * Math.min(7, daysUntilNextPay);
    } else {
      // For monthly or other frequencies: standard 7-day calculation
      return dailyBudget * 7;
    }
  })();

  const isOverBudget = leftToSpend < 0;
  const isCloseToLimit = percentageRemaining < 20 && percentageRemaining >= 0;
  const isLowBalance = percentageRemaining < 50 && percentageRemaining >= 20;
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

  const periodInfo = incomeData && !loading && (
    <TouchableOpacity
      style={styles.periodInfo}
      onPress={onCalendarPress}
      activeOpacity={0.7}>
      <Text style={styles.currentMonth}>{getCurrentDate()}</Text>
      <Text style={styles.frequencyDisplay}>Paid {incomeData.frequency}</Text>
      {getPayPeriodStatus() && (
        <Text
          style={[
            styles.payPeriodStatus,
            isNewPayPeriod && styles.newPeriodStatus,
          ]}>
          {getPayPeriodStatus()}
        </Text>
      )}
    </TouchableOpacity>
  );

  const mainCard = (
    <>
      {/* Balance Card */}
      <View
        ref={balanceCardRef}
        style={[styles.balanceCard, isOverBudget && styles.overBudgetCard]}
        collapsable={false}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>STARTING FUNDS</Text>
            {loading ? (
              <Text style={styles.totalIncome}>$0.00</Text>
            ) : rolloverAmount > 0 ? (
              <View style={styles.incomeBreakdown}>
                <Text style={styles.totalIncome}>
                  {formatCurrency(incomeAmount)}
                </Text>
                <Text style={styles.incomeBreakdownText}>
                  {formatCurrency(incomeData?.income || 0)} +{' '}
                  {formatCurrency(rolloverAmount)} rollover
                </Text>
              </View>
            ) : (
              <Text style={styles.totalIncome}>
                {formatCurrency(incomeAmount)}
              </Text>
            )}
          </View>
          <View style={[styles.balanceItem, styles.balanceItemRight]}>
            <Text style={styles.balanceLabel}>ALLOCATED THIS PERIOD</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(
                homeSummary?.totals?.totalExpensesAllocated ?? totalExpenses,
              )}
            </Text>

            {/* Expense Breakdown: Committed (planned), Discretionary (spent), Goals (paid) */}
            {!loading &&
              (homeSummary?.outflows?.committed?.plannedTotal > 0 ||
                homeSummary?.outflows?.discretionary?.spentSoFar > 0 ||
                homeSummary?.outflows?.goals?.paidSoFar > 0 ||
                expenseBreakdown?.committed > 0 ||
                expenseBreakdown?.discretionary > 0) && (
                <View style={styles.expenseBreakdown}>
                  <View style={styles.expenseBreakdownRow}>
                    <Text style={styles.expenseBreakdownLabel}>
                      └─ Committed:
                    </Text>
                    <Text style={styles.expenseBreakdownAmount}>
                      {formatCurrency(
                        homeSummary?.outflows?.committed?.plannedTotal ??
                          expenseBreakdown?.committed ??
                          0,
                      )}
                    </Text>
                  </View>
                  <View style={styles.expenseBreakdownRow}>
                    <Text style={styles.expenseBreakdownLabel}>
                      └─ Discretionary:
                    </Text>
                    <Text style={styles.expenseBreakdownAmount}>
                      {formatCurrency(
                        homeSummary?.outflows?.discretionary?.spentSoFar ??
                          expenseBreakdown?.discretionary ??
                          0,
                      )}
                    </Text>
                  </View>
                  {homeSummary?.outflows?.goals?.paidSoFar > 0 && (
                    <View style={styles.expenseBreakdownRow}>
                      <Text style={styles.expenseBreakdownLabel}>
                        └─ Goals:
                      </Text>
                      <Text style={styles.expenseBreakdownAmount}>
                        {formatCurrency(homeSummary.outflows.goals.paidSoFar)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
          </View>
        </View>

        {/* Rollover Banner - shown after auto-rollover occurs */}
        {rolloverBanner && (
          <View style={styles.rolloverBanner}>
            <View style={styles.rolloverBannerContent}>
              <TouchableOpacity
                onPress={() => {
                  console.log('🔄 Arrow pressed! Props:', {
                    hasCallback: !!onReassignRollover,
                    amount: rolloverBanner?.amount,
                  });
                  if (onReassignRollover && rolloverBanner?.amount) {
                    console.log(
                      '🔄 Calling onReassignRollover with:',
                      rolloverBanner.amount,
                    );
                    onReassignRollover(rolloverBanner.amount);
                  } else {
                    console.log('🔄 Missing callback or amount');
                  }
                }}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon
                  name="arrow-right-circle"
                  size={20}
                  color={colors.textWhite}
                />
              </TouchableOpacity>
              <View style={styles.rolloverBannerText}>
                <Text style={styles.rolloverBannerTitle}>
                  {formatCurrency(rolloverBanner.amount)} has been rolled into
                  this period
                </Text>
              </View>
              {onDismissRolloverBanner && (
                <TouchableOpacity
                  style={styles.rolloverBannerDismiss}
                  onPress={onDismissRolloverBanner}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Icon name="x" size={16} color={colors.textWhite} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

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
          <View style={styles.leftToSpendHeader}>
            <Text style={styles.balanceLabel}>LEFT TO SPEND</Text>
          </View>
          <View style={styles.leftAmountRow}>
            <View style={styles.leftAmountContainer}>
              <Text
                style={[
                  styles.leftAmount,
                  isOverBudget && styles.overBudgetText,
                ]}>
                {loading ? '$0.00' : formatCurrency(adjustedLeftToSpend)}
              </Text>
              {shouldShowRolloverPreview && !loading && (
                <Text style={styles.rolloverPreviewText}>
                  {formatCurrency(adjustedLeftToSpend)} scheduled to roll to
                  next period
                </Text>
              )}
            </View>
            {totalAdditionalIncome > 0 && (
              <View style={styles.adjustedAmountContainer}>
                <Text style={styles.adjustedLabel}>Additional income:</Text>
                <Text style={styles.adjustedAmount}>
                  +{formatCurrency(totalAdditionalIncome)}
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
                isCloseToLimit && styles.overBudgetBar,
                isLowBalance && styles.warningBar,
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
                {formatCurrency(dailyBudget)}/day (
                {formatCurrency(weeklyBudget)}/week)
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
    </>
  );

  // No income sources → the card renders exactly as it always has
  if (additionalAccounts.length === 0) {
    return (
      <View style={styles.container}>
        {periodInfo}
        {mainCard}
      </View>
    );
  }

  // Carousel: the "Everything" card first, then one card per additional
  // income account (web parity, see BalanceCard.tsx on the website).
  return (
    <View style={styles.container}>
      {periodInfo}

      <View
        style={styles.carouselWrapper}
        onLayout={e => setCarouselWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={carouselScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleCarouselScrollEnd}>
          <View style={{width: carouselWidth}}>{mainCard}</View>
          {additionalAccounts.map(account => (
            <View key={account.id} style={{width: carouselWidth}}>
              <AccountCard account={account} currency={currency} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.carouselDots}>
        {['Everything', ...additionalAccounts.map(a => a.name)].map(
          (name, i) => (
            <TouchableOpacity
              key={name + i}
              onPress={() => scrollToSlide(i)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              style={[styles.dot, activeSlide === i && styles.dotActive]}
            />
          ),
        )}
      </View>
    </View>
  );
};

/**
 * One additional income account in the carousel, laid out like the main
 * balance card: the account's received total as the headline, then Left to
 * Spend + Total Expenses (with the same Committed/Discretionary/Goals
 * breakdown as the main card), then Received + Next payment. Attribution
 * only — a negative account is over-spent, not blocked. Web parity
 * (budget-web-mockup BalanceCard.tsx AccountCard).
 */
function AccountCard({account, currency}) {
  const format = amount => formatCurrencySync(amount, currency);

  const pctLeft =
    account.received > 0 ? Math.round((account.left / account.received) * 100) : 0;
  const isOverspent = account.left < 0;
  const isCloseToLimit = pctLeft < 20 && pctLeft >= 0;
  const isLowBalance = pctLeft < 50 && pctLeft >= 20;
  const frequencyLabel = account.frequency
    ? account.frequency.charAt(0) + account.frequency.slice(1).toLowerCase()
    : null;
  const nextPaymentLabel = account.nextPaymentDate
    ? (() => {
        const d = new Date(account.nextPaymentDate);
        return `${d.toLocaleDateString('en-AU', {month: 'short'})} ${d.getDate()}`;
      })()
    : '—';

  return (
    <View style={styles.balanceCard}>
      <View style={styles.accountHeaderRow}>
        <Text style={styles.balanceLabel}>{account.name.toUpperCase()}</Text>
        {frequencyLabel && (
          <View style={styles.frequencyBadge}>
            <Text style={styles.frequencyBadgeText}>{frequencyLabel}</Text>
          </View>
        )}
      </View>
      <View style={styles.balanceRow}>
        {/* Headline — unlabeled, matching the web AccountCard (the name/badge
            row above already identifies it; a "RECEIVED" label here would
            duplicate the Received tile lower down). */}
        <View style={styles.balanceItem}>
          <Text style={styles.totalIncome}>{format(account.received)}</Text>
        </View>
        <View style={[styles.balanceItem, styles.balanceItemRight]}>
          <Text style={styles.balanceLabel}>TOTAL EXPENSES</Text>
          <Text style={styles.balanceAmount}>{format(account.spent)}</Text>

          <View style={styles.expenseBreakdown}>
            <View style={styles.expenseBreakdownRow}>
              <Text style={styles.expenseBreakdownLabel}>└─ Committed:</Text>
              <Text style={styles.expenseBreakdownAmount}>
                {format(account.committed)}
              </Text>
            </View>
            <View style={styles.expenseBreakdownRow}>
              <Text style={styles.expenseBreakdownLabel}>
                └─ Discretionary:
              </Text>
              <Text style={styles.expenseBreakdownAmount}>
                {format(account.discretionary)}
              </Text>
            </View>
            {account.goals > 0 && (
              <View style={styles.expenseBreakdownRow}>
                <Text style={styles.expenseBreakdownLabel}>└─ Goals:</Text>
                <Text style={styles.expenseBreakdownAmount}>
                  {format(account.goals)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Left to Spend — its own full-width section, matching the main
          balance card's leftToSpendSection (big number + progress bar +
          status), not squeezed into a column like Total Expenses. */}
      <View style={styles.leftToSpendSection}>
        <View style={styles.leftToSpendHeader}>
          <Text style={styles.balanceLabel}>LEFT TO SPEND</Text>
        </View>
        <Text
          style={[styles.leftAmount, isOverspent && styles.overBudgetText]}>
          {format(account.left)}
        </Text>

        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {width: `${Math.max(0, Math.min(100, pctLeft))}%`},
              (isOverspent || isCloseToLimit) && styles.overBudgetBar,
              isLowBalance && styles.warningBar,
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {isOverspent
            ? `Over-spent by ${format(Math.abs(account.left))}`
            : `${pctLeft}% remaining`}
        </Text>
      </View>

      <View style={[styles.balanceRow, styles.accountReceivedRow]}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>RECEIVED</Text>
          <Text style={styles.balanceAmount}>{format(account.received)}</Text>
        </View>
        <View style={[styles.balanceItem, styles.balanceItemRight]}>
          <Text style={styles.balanceLabel}>NEXT PAYMENT</Text>
          <Text style={styles.balanceAmount}>{nextPaymentLabel}</Text>
        </View>
      </View>
    </View>
  );
}

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
  payPeriodStatus: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.8,
    letterSpacing: -0.1,
    marginTop: 2,
  },
  newPeriodStatus: {
    color: colors.progressGreen,
    fontWeight: '500',
    opacity: 1,
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
    alignItems: 'flex-start',
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
  expenseBreakdown: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.overlayLight,
  },
  expenseBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  expenseBreakdownLabel: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.7,
  },
  expenseBreakdownAmount: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.7,
  },
  totalIncome: {
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.5,
  },
  incomeBreakdown: {
    alignItems: 'flex-start',
  },
  incomeBreakdownText: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.7,
    marginTop: 2,
    letterSpacing: -0.2,
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
  leftToSpendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  leftAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  leftAmountContainer: {
    alignItems: 'flex-start',
  },
  leftAmount: {
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.5,
  },
  rolloverPreviewText: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.7,
    marginTop: 2,
    letterSpacing: -0.2,
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
  rolloverBanner: {
    marginVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rolloverBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  rolloverBannerText: {
    flex: 1,
  },
  rolloverBannerTitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    textAlign: 'center',
  },
  rolloverBannerDismiss: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.overlayLight,
  },
  // Carousel (additional-accounts) styles — web parity
  carouselWrapper: {
    width: '100%',
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.overlayDark,
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.textWhite,
  },
  accountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  frequencyBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  frequencyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  accountReceivedRow: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.overlayLight,
  },
});

export default BalanceCard;
