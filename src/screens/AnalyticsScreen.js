import React, {useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  RefreshControl,
  Alert,
  Animated,
  PanResponder,
  Modal,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LineChart} from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';
// ✅ FIXED: Import DiscretionaryContainer instead of DiscretionaryBreakdown
import DiscretionaryContainer from '../containers/DiscretionaryContainer';
import SpendingVelocityContainer from '../containers/SpendingVelocityContainer';
import HighestEarningBreakdownModal from '../components/HighestEarningBreakdownModal';

// Pro Badge Component - moved outside to prevent recreation on each render
const ProBadge = () => (
  <View style={styles.proBadge}>
    <Text style={styles.proBadgeText}>PRO</Text>
  </View>
);

// Constants for swipe gestures
const SWIPE_THRESHOLD = 120;
const ACTIVATION_THRESHOLD = 15;

// BillItem Component with swipe gestures
const BillItem = ({ bill, onDelete, onMarkPaid, formatDueDate }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const paidOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(deleteOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(paidOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const performDelete = () => {
    setIsDeleting(true);

    if (onDelete) {
      onDelete(bill);
    }

    // Animate card out
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -400,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(deleteOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const performMarkPaid = () => {
    if (onMarkPaid) {
      onMarkPaid(bill);
    }
    resetPosition();
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMinMovement = Math.abs(gestureState.dx) > ACTIVATION_THRESHOLD;
        return isHorizontal && hasMinMovement;
      },
      onPanResponderGrant: (evt, gestureState) => {
        Animated.spring(cardScale, {
          toValue: 0.98,
          useNativeDriver: true,
          tension: 150,
          friction: 7,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        const newTranslateX = gestureState.dx;
        translateX.setValue(newTranslateX);

        if (newTranslateX < 0) {
          // Left swipe - delete
          const progress = Math.min(1, Math.abs(newTranslateX) / SWIPE_THRESHOLD);
          deleteOpacity.setValue(progress);
          paidOpacity.setValue(0);
        } else if (newTranslateX > 0) {
          // Right swipe - mark paid
          const progress = Math.min(1, Math.abs(newTranslateX) / SWIPE_THRESHOLD);
          paidOpacity.setValue(progress);
          deleteOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeDistance = gestureState.dx;
        const swipeVelocity = gestureState.vx;

        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 7,
        }).start();

        if (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -0.5) {
          performDelete();
        } else if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 0.5) {
          performMarkPaid();
        } else {
          resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        resetPosition();
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }),
  ).current;

  if (isDeleting) {
    return null;
  }

  return (
    <View style={styles.billItemContainer}>
      {/* Delete Background */}
      <Animated.View
        style={[
          styles.billDeleteBackground,
          {
            opacity: deleteOpacity,
          },
        ]}>
        <View style={styles.billDeleteContent}>
          <Icon name="trash-outline" size={24} color="#FFFFFF" />
          <Text style={styles.billDeleteText}>Delete</Text>
        </View>
      </Animated.View>

      {/* Mark Paid Background */}
      <Animated.View
        style={[
          styles.billPaidBackground,
          {
            opacity: paidOpacity,
          },
        ]}>
        <View style={styles.billPaidContent}>
          <Icon name="checkmark-outline" size={24} color="#FFFFFF" />
          <Text style={styles.billPaidText}>Mark Paid</Text>
        </View>
      </Animated.View>

      {/* Main Bill Item */}
      <Animated.View
        style={[
          styles.billItemWrapper,
          {
            transform: [{translateX: translateX}, {scale: cardScale}],
            opacity: cardOpacity,
          },
        ]}>
        <View style={styles.billsListItem} {...panResponder.panHandlers}>
          <View style={styles.billsListLeft}>
            <Text style={styles.billsListName}>
              {bill.description || bill.category?.name || 'Bill'}
            </Text>
            <Text style={styles.billsListCategory}>
              {bill.category?.name || 'General'}
            </Text>
            <Text style={styles.billsListDueDate}>
              {formatDueDate(bill.dueDate)}
            </Text>
          </View>
          <View style={styles.billsListRight}>
            <Text style={styles.billsListAmount}>
              ${Math.abs(bill.amount).toFixed(2)}
            </Text>
            <View
              style={[
                styles.billsStatusBadge,
                styles.billsStatusUpcoming,
              ]}>
              <Text style={styles.billsStatusText}>Due Soon</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const AnalyticsScreen = ({
  // Core data
  transactions,
  data,
  isLoading,

  // Pre-formatted chart data from container
  chartData,
  chartConfig,
  screenWidth,

  // UI state
  selectedPeriod,
  comparisonMode,
  refreshing,
  isPro,
  proFeatures,
  showBreakdown,
  breakdownInitialDate,

  // Calculated statistics
  statistics,

  // ✅ NEW: Spending velocity data
  spendingVelocity,

  // ✅ NEW: Bills analytics data - cache-first, background sync
  billsAnalytics,

  // ✅ NEW: Income analytics data
  incomeAnalytics,

  // Module settings
  pokerTrackerEnabled,

  // Event handlers
  onPeriodChange,
  onComparisonToggle,
  onDiscretionaryClick,
  onCloseBreakdown,
  onRefresh,

  // Bill event handlers
  onBillDelete,
  onBillMarkPaid,

  // Helper functions
  isRecurringTransaction,
}) => {
  // Tab navigation state
  const [selectedTab, setSelectedTab] = useState('spending');
  const insets = useSafeAreaInsets();

  // ✅ NEW: State for Spending Velocity Modal
  const [showSpendingVelocityModal, setShowSpendingVelocityModal] =
    useState(false);

  // Ad-hoc income breakdown modal (web parity) - the "Ad-hoc" row in Income
  // by Source is an aggregate, so it's tappable to reveal what's inside it.
  const [showAdhocBreakdown, setShowAdhocBreakdown] = useState(false);
  const [showHighestEarningBreakdown, setShowHighestEarningBreakdown] =
    useState(false);
  const adhocIncomeSource =
    incomeAnalytics?.incomeBySource?.find(source => source.isAdhoc) || null;

  // ✅ NEW: Handle Spending Velocity tap
  const handleSpendingVelocityPress = () => {
    if (proFeatures?.spendingVelocityDetails) {
      setShowSpendingVelocityModal(true);
    } else {
      Alert.alert(
        'Upgrade to Pro',
        'Access detailed spending velocity analysis including daily burn rate charts, weekly trends, and personalized insights!',
        [
          {text: 'Maybe Later', style: 'cancel'},
          {text: 'Learn More', style: 'default'},
        ],
      );
    }
  };

  // Helper function to format due dates
  const formatDueDate = dueDate => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Due: Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Due: Tomorrow';
    } else if (date < today) {
      return `Overdue: ${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`;
    } else {
      return `Due: ${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>
              Track your spending patterns
            </Text>
          </View>
          {isPro && <ProBadge />}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'spending' && styles.tabButtonActive,
          ]}
          onPress={() => setSelectedTab('spending')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'spending' && styles.tabTextActive,
            ]}>
            Spending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'income' && styles.tabButtonActive,
          ]}
          onPress={() => setSelectedTab('income')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'income' && styles.tabTextActive,
            ]}>
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'bills' && styles.tabButtonActive,
          ]}
          onPress={() => setSelectedTab('bills')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'bills' && styles.tabTextActive,
            ]}>
            Bills
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary || '#6366F1']}
            tintColor={colors.primary || '#6366F1'}
            title="Pull to refresh..."
            titleColor={colors.textSecondary || '#6B7280'}
          />
        }>
        {selectedTab === 'spending' && (
          <>
            {/* Period Selector */}
            <View style={styles.selectorContainer}>
              <View>
                <View style={styles.periodButtons}>
                  {['7d', '30d', '12m'].map(period => (
                    <TouchableOpacity
                      key={period}
                      onPress={() => onPeriodChange(period)}
                      style={[
                        styles.periodButton,
                        selectedPeriod === period && styles.periodButtonActive,
                      ]}>
                      <Text
                        style={[
                          styles.periodButtonText,
                          selectedPeriod === period &&
                            styles.periodButtonTextActive,
                        ]}>
                        {period.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.periodCaption}>
                  {selectedPeriod === '7d'
                    ? 'Last 7 days'
                    : selectedPeriod === '30d'
                    ? 'Rolling 30 days'
                    : 'Last 12 months'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.comparisonToggle}
                onPress={onComparisonToggle}>
                <View
                  style={[
                    styles.checkbox,
                    comparisonMode && styles.checkboxActive,
                  ]}>
                  {comparisonMode && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.comparisonText}>
                  Compare with previous period
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Spending</Text>
                <Text style={styles.statValue}>
                  ${statistics.currentTotal.toFixed(2)}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>
                  {selectedPeriod === '12m' ? 'Monthly' : 'Daily'} Average
                </Text>
                <Text style={styles.statValue}>
                  ${statistics.averageSpending.toFixed(2)}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>vs Previous Period</Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        statistics.percentageChange >= 0
                          ? colors.danger || '#EF4444'
                          : colors.success || '#10B981',
                    },
                  ]}>
                  {statistics.percentageChange >= 0 ? '+' : ''}
                  {statistics.percentageChange.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Discretionary Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Discretionary Spending</Text>
                <Text style={styles.statValue}>
                  ${statistics.currentDiscretionary.toFixed(2)}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Discretionary Average</Text>
                <Text style={styles.statValue}>
                  ${statistics.averageDiscretionary.toFixed(2)}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Discretionary vs Previous</Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        statistics.discretionaryPercentageChange >= 0
                          ? colors.danger || '#EF4444'
                          : colors.success || '#10B981',
                    },
                  ]}>
                  {statistics.discretionaryPercentageChange >= 0 ? '+' : ''}
                  {statistics.discretionaryPercentageChange.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Chart - Using pre-formatted data from container */}
            {chartData && chartData.labels && chartData.labels.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Spending Over Time</Text>
                <LineChart
                  data={chartData}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  withDots={true}
                  withShadow={false}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                />
              </View>
            )}

            {/* Insights */}
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>Key Insights</Text>

              {statistics.highestSpendingPeriod && (
                <View
                  style={[
                    styles.insightCard,
                    {borderLeftColor: colors.primary},
                  ]}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>
                      Highest total spending:
                    </Text>{' '}
                    {statistics.highestSpendingPeriod.label} with $
                    {statistics.highestSpendingPeriod.amount.toFixed(2)}
                  </Text>
                </View>
              )}

              {statistics.highestDiscretionaryPeriod &&
                statistics.highestDiscretionaryPeriod.discretionaryAmount >
                  0 && (
                  <TouchableOpacity
                    style={[
                      styles.insightCard,
                      styles.clickableInsight,
                      {borderLeftColor: colors.secondary || '#10B981'},
                    ]}
                    onPress={onDiscretionaryClick}>
                    <View style={styles.insightContentClean}>
                      <Text style={styles.insightText}>
                        <Text style={styles.insightBold}>
                          Highest discretionary spending:
                        </Text>{' '}
                        {statistics.highestDiscretionaryPeriod.label} with $
                        {statistics.highestDiscretionaryPeriod.discretionaryAmount.toFixed(
                          2,
                        )}
                      </Text>
                      {proFeatures?.advancedAnalytics ? (
                        <Text style={styles.tapHint}>Tap for details</Text>
                      ) : (
                        <View style={styles.proIndicator}>
                          <ProBadge />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}

              <View
                style={[
                  styles.insightCard,
                  {
                    borderLeftColor:
                      statistics.percentageChange >= 0
                        ? colors.danger || '#EF4444'
                        : colors.success || '#10B981',
                  },
                ]}>
                <Text style={styles.insightText}>
                  <Text style={styles.insightBold}>Total spending trend:</Text>{' '}
                  You're spending{' '}
                  {Math.abs(statistics.percentageChange).toFixed(1)}%{' '}
                  {statistics.percentageChange >= 0 ? 'more' : 'less'} than last
                  period
                </Text>
              </View>

              <View
                style={[
                  styles.insightCard,
                  {
                    borderLeftColor:
                      statistics.discretionaryPercentageChange >= 0
                        ? colors.danger || '#EF4444'
                        : colors.success || '#10B981',
                  },
                ]}>
                <Text style={styles.insightText}>
                  <Text style={styles.insightBold}>Discretionary trend:</Text>{' '}
                  Your discretionary spending is{' '}
                  {Math.abs(statistics.discretionaryPercentageChange).toFixed(
                    1,
                  )}
                  %{' '}
                  {statistics.discretionaryPercentageChange >= 0
                    ? 'higher'
                    : 'lower'}{' '}
                  than last period
                </Text>
              </View>

              {/* ✅ ENHANCED: Spending Velocity Insight - Pro Feature with Modal */}
              {spendingVelocity ? (
                <TouchableOpacity
                  style={[
                    styles.insightCard,
                    proFeatures?.spendingVelocityDetails && styles.clickableInsight,
                    {
                      borderLeftColor:
                        spendingVelocity.velocityStatus === 'ON_TRACK'
                          ? colors.success || '#10B981'
                          : spendingVelocity.velocityStatus === 'SLIGHTLY_HIGH'
                          ? colors.warning || '#F59E0B'
                          : colors.danger || '#EF4444',
                    },
                  ]}
                  onPress={handleSpendingVelocityPress}>
                  <View style={styles.insightContentClean}>
                    <Text style={styles.insightText}>
                      <Text style={styles.insightBold}>Spending Velocity:</Text>{' '}
                      {spendingVelocity.velocityStatus === 'ON_TRACK' &&
                        'On Track'}
                      {spendingVelocity.velocityStatus === 'SLIGHTLY_HIGH' &&
                        'Slightly High'}
                      {spendingVelocity.velocityStatus === 'HIGH' && 'High'}
                      {spendingVelocity.velocityStatus === 'VERY_HIGH' &&
                        'Very High'}
                    </Text>
                    {proFeatures?.spendingVelocityDetails ? (
                      <Text style={styles.tapHint}>Tap for details</Text>
                    ) : (
                      <View style={styles.proIndicator}>
                        <ProBadge />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                // Fallback for no velocity data
                <View
                  style={[
                    styles.insightCard,
                    {borderLeftColor: colors.warning || '#F59E0B'},
                  ]}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>No data:</Text> Start
                    adding transactions to see your spending trends
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {selectedTab === 'income' && (
          <>
            {/* Highest Earning Period - hero insight, web parity. Tappable
                when it has a breakdown to show. */}
            {incomeAnalytics?.highestEarningPeriod && (
              <TouchableOpacity
                style={styles.highestEarningCard}
                activeOpacity={
                  (incomeAnalytics.highestEarningPeriod.breakdown?.length ?? 0) > 0
                    ? 0.7
                    : 1
                }
                onPress={() =>
                  (incomeAnalytics.highestEarningPeriod.breakdown?.length ?? 0) >
                    0 && setShowHighestEarningBreakdown(true)
                }>
                <View style={styles.highestEarningHeaderRow}>
                  <Text style={styles.highestEarningLabel}>
                    🏆 Highest Earning Period
                  </Text>
                  {(incomeAnalytics.highestEarningPeriod.breakdown?.length ?? 0) >
                    0 && (
                    <Icon
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary || '#9CA3AF'}
                    />
                  )}
                </View>
                <Text style={styles.highestEarningDates}>
                  {new Date(
                    incomeAnalytics.highestEarningPeriod.start,
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  –{' '}
                  {new Date(
                    incomeAnalytics.highestEarningPeriod.end,
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.highestEarningAmount}>
                  ${incomeAnalytics.highestEarningPeriod.totalAmount.toFixed(2)}
                </Text>
                {incomeAnalytics.highestEarningPeriod.percentAboveAverage > 0 && (
                  <Text style={styles.highestEarningSubtext}>
                    {incomeAnalytics.highestEarningPeriod.percentAboveAverage.toFixed(
                      0,
                    )}
                    % above your average
                    {incomeAnalytics.insights?.growthTrend === 'growing' &&
                      ', and part of a broader upward trend'}
                    {incomeAnalytics.insights?.growthTrend === 'declining' &&
                      ', though your income has trended down recently'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Income Stats Cards - row 1, web parity order (see memory:
                income-analytics-redesign-direction) */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Income</Text>
                <Text style={styles.statValue}>
                  ${incomeAnalytics?.lifetimeTotalIncome?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.statSubtext}>all-time, never resets</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Year to Date</Text>
                <Text style={styles.statValue}>
                  ${incomeAnalytics?.totalIncomeYTD?.toFixed(2) || '0.00'}
                </Text>
                {incomeAnalytics?.hasYearOverYearData && incomeAnalytics?.ytdChangePercentage !== undefined ? (
                  <Text
                    style={[
                      styles.statChange,
                      {
                        color:
                          incomeAnalytics.ytdChangePercentage >= 0
                            ? colors.success || '#10B981'
                            : colors.danger || '#EF4444',
                      },
                    ]}>
                    {incomeAnalytics.ytdChangePercentage >= 0 ? '+' : ''}
                    {incomeAnalytics.ytdChangePercentage.toFixed(1)}% vs last year
                  </Text>
                ) : (
                  <Text style={styles.statSubtext}>
                    Since {incomeAnalytics?.anniversaryStartDate ? new Date(incomeAnalytics.anniversaryStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'signup'}
                  </Text>
                )}
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>This Pay Period</Text>
                <Text style={styles.statValue}>
                  $
                  {incomeAnalytics?.totalIncomeThisPayPeriod?.toFixed(2) ||
                    '0.00'}
                </Text>
                {incomeAnalytics?.payPeriodChangePercentage !== undefined && (
                  <Text
                    style={[
                      styles.statChange,
                      {
                        color:
                          incomeAnalytics.payPeriodChangePercentage >= 0
                            ? colors.success || '#10B981'
                            : colors.danger || '#EF4444',
                      },
                    ]}>
                    {incomeAnalytics.payPeriodChangePercentage >= 0 ? '+' : ''}
                    {incomeAnalytics.payPeriodChangePercentage.toFixed(1)}% from
                    last period
                  </Text>
                )}
              </View>
            </View>

            {/* Income Stats Cards - row 2 (2x2 wrap, unlike row 1's 3-across:
                4 cards at flex:1 would be unreadably narrow on phone width) */}
            <View style={styles.statsContainerWrap}>
              <View style={styles.statCardWrap}>
                <Text style={styles.statLabel}>Average Income</Text>
                <Text style={styles.statValue}>
                  ${incomeAnalytics?.averagePeriodIncome?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.statSubtext}>per pay period</Text>
              </View>

              <View style={styles.statCardWrap}>
                <Text style={styles.statLabel}>This Week</Text>
                <Text style={styles.statValue}>
                  ${incomeAnalytics?.totalIncomeThisWeek?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.statSubtext}>7 days</Text>
              </View>

              <View style={styles.statCardWrap}>
                <Text style={styles.statLabel}>Best Pay Period</Text>
                <Text style={styles.statValue}>
                  $
                  {incomeAnalytics?.highestEarningPeriod?.totalAmount?.toFixed(
                    2,
                  ) || '0.00'}
                </Text>
                <Text style={styles.statSubtext}>
                  {incomeAnalytics?.highestEarningPeriod
                    ? `${new Date(
                        incomeAnalytics.highestEarningPeriod.start,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })} – ${new Date(
                        incomeAnalytics.highestEarningPeriod.end,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}`
                    : 'No data yet'}
                </Text>
              </View>

              <View style={styles.statCardWrap}>
                <Text style={styles.statLabel}>Income Sources</Text>
                <Text style={styles.statValue}>
                  {(incomeAnalytics?.incomeBySource ?? []).filter(
                    source =>
                      source.categoryId !== 'profile_income' &&
                      !source.isAdhoc,
                  ).length}
                </Text>
                <Text style={styles.statSubtext}>this pay period</Text>
              </View>
            </View>

            {/* Income by Source */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Income by Source</Text>
              <View style={styles.incomeSourceContainer}>
                {incomeAnalytics?.incomeBySource?.length > 0 ? (
                  incomeAnalytics.incomeBySource.map((source, index) => {
                    const isClickableAdhoc =
                      source.isAdhoc && (source.breakdown?.length ?? 0) > 0;
                    const clampedWidth = Math.max(
                      0,
                      Math.min(100, source.percentage),
                    );
                    return (
                      <View
                        key={source.categoryId || index}
                        style={styles.incomeSourceItem}>
                        {isClickableAdhoc ? (
                          <TouchableOpacity
                            style={styles.incomeSourceHeader}
                            onPress={() => setShowAdhocBreakdown(true)}
                            activeOpacity={0.7}>
                            <View
                              style={[
                                styles.incomeSourceDot,
                                {backgroundColor: source.color || colors.primary},
                              ]}
                            />
                            <Text style={styles.incomeSourceLabel}>
                              {source.categoryName}
                            </Text>
                            <Icon
                              name="chevron-forward"
                              size={16}
                              color={colors.textSecondary || '#9CA3AF'}
                              style={styles.incomeSourceChevron}
                            />
                            <Text style={styles.incomeSourceAmount}>
                              ${source.totalAmount.toFixed(2)}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.incomeSourceHeader}>
                            <View
                              style={[
                                styles.incomeSourceDot,
                                {backgroundColor: source.color || colors.primary},
                              ]}
                            />
                            <Text style={styles.incomeSourceLabel}>
                              {source.categoryName}
                            </Text>
                            <Text style={styles.incomeSourceAmount}>
                              ${source.totalAmount.toFixed(2)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.incomeSourceBar}>
                          <View
                            style={[
                              styles.incomeSourceBarFill,
                              {
                                width: `${clampedWidth}%`,
                                backgroundColor: source.color || colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.incomeSourceItem}>
                    <Text style={styles.incomeSourceLabel}>
                      No income sources found for this pay period
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Recurring vs Ad-hoc Income */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Recurring vs Ad-hoc Income</Text>
              <View style={styles.incomeTypeContainer}>
                <View style={styles.incomeTypeItem}>
                  <Text style={styles.incomeTypeLabel}>Recurring</Text>
                  <Text style={styles.incomeTypeAmount}>
                    $
                    {incomeAnalytics?.incomeBreakdown?.recurring?.amount?.toFixed(
                      2,
                    ) || '0.00'}
                  </Text>
                  <Text style={styles.incomeTypePercentage}>
                    {incomeAnalytics?.incomeBreakdown?.recurring?.percentage?.toFixed(
                      0,
                    ) || '0'}
                    %
                  </Text>
                </View>
                <View style={styles.incomeTypeItem}>
                  <Text style={styles.incomeTypeLabel}>Ad-hoc</Text>
                  <Text style={styles.incomeTypeAmount}>
                    $
                    {incomeAnalytics?.incomeBreakdown?.adhoc?.amount?.toFixed(
                      2,
                    ) || '0.00'}
                  </Text>
                  <Text style={styles.incomeTypePercentage}>
                    {incomeAnalytics?.incomeBreakdown?.adhoc?.percentage?.toFixed(
                      0,
                    ) || '0'}
                    %
                  </Text>
                </View>
              </View>
            </View>

            {/* Poker Insights */}
            {pokerTrackerEnabled && (
              <TouchableOpacity style={styles.chartContainer}>
                <View style={styles.pokerTitleContainer}>
                  <Icon
                    name="trophy-outline"
                    size={20}
                    color={colors.warning || '#F59E0B'}
                    style={styles.pokerTitleIcon}
                  />
                  <Text style={[styles.chartTitle, styles.pokerTitle]}>Poker Insights</Text>
                </View>
                <Text style={styles.pokerInsightText}>
                  See how your poker games are performing — tap for insights
                </Text>
              </TouchableOpacity>
            )}

            {/* Recent Income Entries */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Recent Income Entries</Text>
              <View style={styles.incomeListContainer}>
                {incomeAnalytics?.recentIncomeEntries?.length > 0 ? (
                  incomeAnalytics.recentIncomeEntries.map((entry, index) => (
                    <View key={entry.id || index} style={styles.incomeListItem}>
                      <View style={styles.incomeListLeft}>
                        <Text style={styles.incomeListSource}>
                          {entry.categoryName || entry.description}
                        </Text>
                        <Text style={styles.incomeListDate}>
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                      <Text style={styles.incomeListAmount}>
                        ${entry.amount.toFixed(2)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.incomeListItem}>
                    <Text style={styles.incomeListSource}>
                      No recent income entries found
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Income Insights */}
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>Income Insights</Text>

              {/* Income Insights from backend */}
              {incomeAnalytics?.insights && (
                <>
                  <View
                    style={[
                      styles.insightCard,
                      {borderLeftColor: colors.success || '#10B981'},
                    ]}>
                    <Text style={styles.insightText}>
                      <Text style={styles.insightBold}>
                        Income consistency:
                      </Text>{' '}
                      Your income consistency score is{' '}
                      {incomeAnalytics.insights.consistencyScore}%
                      {incomeAnalytics.insights.consistencyScore >= 80
                        ? ' - Excellent!'
                        : incomeAnalytics.insights.consistencyScore >= 60
                        ? ' - Good'
                        : ' - Room for improvement'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.insightCard,
                      {borderLeftColor: colors.primary || '#6366F1'},
                    ]}>
                    <Text style={styles.insightText}>
                      <Text style={styles.insightBold}>Income trend:</Text> Your
                      income is{' '}
                      {incomeAnalytics.insights.growthTrend === 'growing'
                        ? 'growing'
                        : incomeAnalytics.insights.growthTrend === 'declining'
                        ? 'declining'
                        : 'stable'}
                      {incomeAnalytics.insights.primaryIncomeSource &&
                        ` with ${incomeAnalytics.insights.primaryIncomeSource} as your primary source`}
                    </Text>
                  </View>
                </>
              )}

              {/* Fallback insights if no backend data */}
              {!incomeAnalytics?.insights && (
                <View
                  style={[
                    styles.insightCard,
                    {borderLeftColor: colors.primary || '#6366F1'},
                  ]}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>Get started:</Text> Add
                    income transactions to see detailed insights about your
                    income patterns and trends.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {selectedTab === 'bills' && (
          <>
            {/* Bills Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Bills This Month</Text>
                <Text style={styles.statValue}>
                  ${billsAnalytics?.totalAmount?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.statSubtext}>
                  {billsAnalytics?.totalBills || 0} bills total
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Paid</Text>
                <Text style={[styles.statValue, {color: colors.success}]}>
                  ${billsAnalytics?.paidAmount?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.statSubtext}>
                  {billsAnalytics?.paidBills || 0} of{' '}
                  {billsAnalytics?.totalBills || 0} bills
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>
                  {billsAnalytics?.overdueBills > 0 ? 'Overdue' : 'Unpaid'}
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        billsAnalytics?.overdueBills > 0
                          ? colors.danger
                          : colors.warning,
                    },
                  ]}>
                  $
                  {billsAnalytics?.overdueBills > 0
                    ? billsAnalytics?.overdueAmount?.toFixed(2) || '0.00'
                    : billsAnalytics?.unpaidAmount?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.statSubtext}>
                  {billsAnalytics?.overdueBills > 0
                    ? `${billsAnalytics.overdueBills} overdue`
                    : `${billsAnalytics?.unpaidBills || 0} remaining`}
                </Text>
              </View>
            </View>

            {/* Progress Tracker */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Bills Progress</Text>
              <View style={styles.billsProgressContainer}>
                <Text style={styles.billsProgressText}>
                  {billsAnalytics?.paidBills || 0} of{' '}
                  {billsAnalytics?.totalBills || 0} bills paid • $
                  {billsAnalytics?.paidAmount?.toFixed(2) || '0.00'} of $
                  {billsAnalytics?.totalAmount?.toFixed(2) || '0.00'} settled
                </Text>
                <View style={styles.billsProgressBar}>
                  <View
                    style={[
                      styles.billsProgressFill,
                      {width: `${billsAnalytics?.progress || 0}%`},
                    ]}
                  />
                </View>
                <Text style={styles.billsProgressPercentage}>
                  {billsAnalytics?.progress || 0}% complete
                </Text>
              </View>
            </View>

            {/* Upcoming Bills (Next 7 Days) */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>
                Upcoming Bills
              </Text>
              <Text style={styles.chartSubtitle}>
                Swipe left to delete • Swipe right to mark paid
              </Text>
              <View style={styles.billsListContainer}>
                {billsAnalytics?.upcomingBills?.length > 0 ? (
                  billsAnalytics.upcomingBills.map((bill, index) => (
                    <BillItem
                      key={bill.id || `bill-${index}`}
                      bill={bill}
                      onDelete={onBillDelete}
                      onMarkPaid={onBillMarkPaid}
                      formatDueDate={formatDueDate}
                    />
                  ))
                ) : (
                  <View style={styles.billsListItem}>
                    <Text style={styles.billsListName}>
                      No upcoming bills
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* All Bills by Status */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>All Bills by Status</Text>

              {/* Paid Bills */}
              {billsAnalytics?.paidBillsList?.length > 0 && (
                <>
                  <Text style={styles.billsSubheading}>Paid Bills</Text>
                  <View style={styles.billsListContainer}>
                    {billsAnalytics.paidBillsList.map((bill, index) => (
                      <View key={index} style={styles.billsListItem}>
                        <View style={styles.billsListLeft}>
                          <Text style={styles.billsListName}>
                            {bill.description || bill.category?.name || 'Bill'}
                          </Text>
                          <Text style={styles.billsListCategory}>
                            {bill.category?.name || 'General'}
                          </Text>
                          <Text style={styles.billsListDueDate}>
                            Paid:{' '}
                            {new Date(bill.dueDate).toLocaleDateString(
                              'en-US',
                              {month: 'short', day: 'numeric', year: 'numeric'},
                            )}
                          </Text>
                        </View>
                        <View style={styles.billsListRight}>
                          <Text style={styles.billsListAmount}>
                            ${Math.abs(bill.amount).toFixed(2)}
                          </Text>
                          <View
                            style={[
                              styles.billsStatusBadge,
                              styles.billsStatusPaid,
                            ]}>
                            <Text style={styles.billsStatusText}>Paid</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Overdue Bills */}
              {billsAnalytics?.overdueBillsList?.length > 0 && (
                <>
                  <Text style={styles.billsSubheading}>Overdue Bills</Text>
                  <View style={styles.billsListContainer}>
                    {billsAnalytics.overdueBillsList.map((bill, index) => (
                      <View
                        key={index}
                        style={[
                          styles.billsListItem,
                          styles.billsListItemLate,
                        ]}>
                        <View style={styles.billsListLeft}>
                          <Text style={styles.billsListName}>
                            {bill.description || bill.category?.name || 'Bill'}
                          </Text>
                          <Text style={styles.billsListCategory}>
                            {bill.category?.name || 'General'}
                          </Text>
                          <Text style={styles.billsListDueDate}>
                            {formatDueDate(bill.dueDate)}
                          </Text>
                        </View>
                        <View style={styles.billsListRight}>
                          <Text style={styles.billsListAmount}>
                            ${Math.abs(bill.amount).toFixed(2)}
                          </Text>
                          <View
                            style={[
                              styles.billsStatusBadge,
                              styles.billsStatusLate,
                            ]}>
                            <Text style={styles.billsStatusText}>Late</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Unpaid Bills */}
              {billsAnalytics?.unpaidBillsList?.length > 0 && (
                <>
                  <Text style={styles.billsSubheading}>Unpaid Bills</Text>
                  <View style={styles.billsListContainer}>
                    {billsAnalytics.unpaidBillsList.map((bill, index) => (
                      <View key={index} style={styles.billsListItem}>
                        <View style={styles.billsListLeft}>
                          <Text style={styles.billsListName}>
                            {bill.description || bill.category?.name || 'Bill'}
                          </Text>
                          <Text style={styles.billsListCategory}>
                            {bill.category?.name || 'General'}
                          </Text>
                          <Text style={styles.billsListDueDate}>
                            {formatDueDate(bill.dueDate)}
                          </Text>
                        </View>
                        <View style={styles.billsListRight}>
                          <Text style={styles.billsListAmount}>
                            ${Math.abs(bill.amount).toFixed(2)}
                          </Text>
                          <View
                            style={[
                              styles.billsStatusBadge,
                              styles.billsStatusUnpaid,
                            ]}>
                            <Text style={styles.billsStatusText}>Unpaid</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* No Bills Message */}
              {(!billsAnalytics?.totalBills ||
                billsAnalytics.totalBills === 0) && (
                <View style={styles.billsListContainer}>
                  <View style={styles.billsListItem}>
                    <Text style={styles.billsListName}>
                      No bills found for this month. Add transactions with due
                      dates to track your bills here.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bills Insights */}
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>Bills Insights</Text>

              {/* Overdue Bills Alert */}
              {billsAnalytics?.overdueBills > 0 && (
                <View
                  style={[
                    styles.insightCard,
                    {borderLeftColor: colors.danger || '#EF4444'},
                  ]}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>Late payment alert:</Text>{' '}
                    You have {billsAnalytics.overdueBills} overdue{' '}
                    {billsAnalytics.overdueBills === 1 ? 'bill' : 'bills'}{' '}
                    totaling ${billsAnalytics.overdueAmount.toFixed(2)}.
                    Consider setting up automatic payments.
                  </Text>
                </View>
              )}

              {/* Upcoming Bills Warning */}
              {billsAnalytics?.upcomingBills?.length > 0 && (
                <View
                  style={[
                    styles.insightCard,
                    {borderLeftColor: colors.warning || '#F59E0B'},
                  ]}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>Upcoming deadlines:</Text>{' '}
                    You have {billsAnalytics.upcomingBills.length}{' '}
                    {billsAnalytics.upcomingBills.length === 1
                      ? 'upcoming bill'
                      : 'upcoming bills'}{' '}
                    totaling $
                    {billsAnalytics.upcomingBills
                      .reduce((sum, bill) => sum + Math.abs(bill.amount), 0)
                      .toFixed(2)}
                    .
                  </Text>
                </View>
              )}

              {/* Progress Insight */}
              {billsAnalytics?.totalBills > 0 && (
                <View
                  style={[
                    styles.insightCard,
                    {
                      borderLeftColor:
                        billsAnalytics.progress >= 50
                          ? colors.success || '#10B981'
                          : colors.warning || '#F59E0B',
                    },
                  ]}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>
                      {billsAnalytics.progress >= 80
                        ? 'Excellent progress:'
                        : billsAnalytics.progress >= 50
                        ? 'Good progress:'
                        : 'Room for improvement:'}
                    </Text>{' '}
                    You've paid {billsAnalytics.progress}% of your monthly
                    bills.
                    {billsAnalytics.progress >= 80
                      ? ' Keep up the great work!'
                      : billsAnalytics.progress >= 50
                      ? " You're on track!"
                      : ' Consider setting up automatic payments to stay on top of your bills.'}
                  </Text>
                </View>
              )}

              {/* No Bills Insight */}
              {(!billsAnalytics?.totalBills ||
                billsAnalytics.totalBills === 0) && (
                <View
                  style={[
                    styles.insightCard,
                    {borderLeftColor: colors.primary || '#6366F1'},
                  ]}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>Get started:</Text> Add
                    your recurring bills and expenses with due dates to track
                    them here. This helps you stay on top of your financial
                    obligations.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ✅ FIXED: Use DiscretionaryContainer instead of DiscretionaryBreakdown */}
      <DiscretionaryContainer
        visible={showBreakdown}
        onClose={onCloseBreakdown}
        selectedPeriod={selectedPeriod}
        initialDate={breakdownInitialDate}
      />

      {/* ✅ NEW: Spending Velocity Modal */}
      <SpendingVelocityContainer
        visible={showSpendingVelocityModal}
        onClose={() => setShowSpendingVelocityModal(false)}
        selectedPeriod={selectedPeriod}
      />

      {/* Ad-hoc Income Breakdown Modal (web parity) */}
      <Modal
        visible={showAdhocBreakdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAdhocBreakdown(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAdhocBreakdown(false)}>
          <View style={styles.adhocModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.adhocModalContent}>
                <View style={styles.adhocModalHeader}>
                  <Text style={styles.adhocModalTitle}>
                    Ad-hoc Income Breakdown
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAdhocBreakdown(false)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Icon
                      name="close"
                      size={22}
                      color={colors.textSecondary || '#9CA3AF'}
                    />
                  </TouchableOpacity>
                </View>
                {adhocIncomeSource?.breakdown?.length > 0 ? (
                  adhocIncomeSource.breakdown.map(item => (
                    <View key={item.categoryId} style={styles.adhocModalRow}>
                      <View style={styles.adhocModalRowLeft}>
                        <View
                          style={[
                            styles.incomeSourceDot,
                            {backgroundColor: item.color || colors.primary},
                          ]}
                        />
                        <Text
                          style={styles.adhocModalRowLabel}
                          numberOfLines={1}>
                          {item.categoryName}
                        </Text>
                      </View>
                      <Text style={styles.adhocModalRowAmount}>
                        ${item.totalAmount.toFixed(2)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.adhocModalEmptyText}>
                    No ad-hoc income this period.
                  </Text>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Highest Earning Period Breakdown Modal - same donut/expandable-list
          pattern as DiscretionaryBreakdown */}
      <HighestEarningBreakdownModal
        visible={showHighestEarningBreakdown}
        onClose={() => setShowHighestEarningBreakdown(false)}
        data={incomeAnalytics?.highestEarningPeriod}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#F8FAFC',
  },
  header: {
    backgroundColor: colors.primary || '#6366F1',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite || '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.textWhite || '#FFFFFF',
    opacity: 0.9,
  },
  proBadge: {
    backgroundColor: colors.warning || '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textWhite || '#FFFFFF',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  selectorContainer: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  periodButtons: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  periodCaption: {
    fontSize: 12,
    fontFamily: 'System',
    color: colors.textSecondary || '#9CA3AF',
    marginBottom: 16,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background || '#F8FAFC',
  },
  periodButtonActive: {
    backgroundColor: colors.primary || '#6366F1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text || '#1F2937',
  },
  periodButtonTextActive: {
    fontFamily: 'System',
    color: colors.textWhite || '#FFFFFF',
  },
  comparisonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.border || '#E5E7EB',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary || '#6366F1',
    borderColor: colors.primary || '#6366F1',
  },
  checkmark: {
    color: colors.textWhite || '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  comparisonText: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.text || '#1F2937',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statsContainerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCardWrap: {
    width: '48%',
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
    color: colors.text || '#1F2937',
  },
  statChange: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  highestEarningCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  highestEarningHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highestEarningLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },
  highestEarningDates: {
    fontSize: 13,
    fontFamily: 'System',
    color: colors.textSecondary || '#9CA3AF',
    marginTop: 4,
  },
  highestEarningAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'System',
    color: colors.primary || '#6366f1',
    marginTop: 8,
  },
  highestEarningSubtext: {
    fontSize: 13,
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
    marginTop: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  insightsContainer: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    marginBottom: 16,
  },
  insightCard: {
    padding: 12,
    backgroundColor: colors.background || '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  clickableInsight: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  insightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightContentClean: {
    flexDirection: 'column',
    gap: 8,
  },
  insightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightActionText: {
    fontSize: 12,
    color: colors.primary || '#6366F1',
    fontWeight: '500',
    fontFamily: 'System',
  },
  tapHint: {
    fontSize: 12,
    color: colors.primary || '#6366F1',
    fontWeight: '500',
    fontFamily: 'System',
    alignSelf: 'flex-end',
    fontStyle: 'italic',
  },
  proIndicator: {
    alignSelf: 'flex-end',
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    lineHeight: 20,
    flex: 1,
  },
  insightBold: {
    fontWeight: '600',
    fontFamily: 'System',
  },

  // Tab navigation styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background || '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary || '#6366F1', // Show the underline for inactive tabs
  },
  tabButtonActive: {
    backgroundColor: colors.primary || '#6366F1',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary || '#6366F1', // Same color as background to hide the underline
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },
  tabTextActive: {
    color: colors.textWhite || '#FFFFFF',
    fontWeight: '600',
  },

  // Income analytics styles
  statSubtext: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
    marginTop: 2,
  },

  // Income by Source styles
  incomeSourceContainer: {
    gap: 16,
    marginTop: 16,
  },
  incomeSourceItem: {
    gap: 8,
  },
  incomeSourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incomeSourceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  incomeSourceLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    flex: 1,
  },
  incomeSourceAmount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
  },
  incomeSourceBar: {
    height: 8,
    backgroundColor: colors.background || '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  incomeSourceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  incomeSourceChevron: {
    marginRight: 8,
  },
  adhocModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  adhocModalContent: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  adhocModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  adhocModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
  },
  adhocModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background || '#F3F4F6',
  },
  adhocModalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  adhocModalRowLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    flexShrink: 1,
  },
  adhocModalRowAmount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
  },
  adhocModalEmptyText: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.textSecondary || '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Recurring vs Ad-hoc styles
  incomeTypeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  incomeTypeItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.overlayLight || '#E5E7EB',
  },
  incomeTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
    marginBottom: 8,
  },
  incomeTypeAmount: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    marginBottom: 4,
  },
  incomeTypePercentage: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.primary || '#6366F1',
  },

  // Recent Income Entries styles
  incomeListContainer: {
    gap: 12,
    marginTop: 16,
  },
  incomeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.overlayLight || '#E5E7EB',
  },
  incomeListLeft: {
    flex: 1,
  },
  incomeListSource: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    marginBottom: 4,
  },
  incomeListDate: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },
  incomeListAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.success || '#10B981',
  },

  // Bills analytics styles
  billsProgressContainer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  billsProgressText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    textAlign: 'center',
  },
  billsProgressBar: {
    width: '100%',
    height: 12,
    backgroundColor: colors.background || '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  billsProgressFill: {
    height: '100%',
    backgroundColor: colors.success || '#10B981',
    borderRadius: 6,
  },
  billsProgressPercentage: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },

  // Bills list styles
  billsSubheading: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  billsListContainer: {
    gap: 12,
  },
  billsListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billsListItemLate: {
    borderColor: colors.danger || '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  billsListLeft: {
    flex: 1,
  },
  billsListName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    marginBottom: 4,
  },
  billsListCategory: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
    marginBottom: 4,
  },
  billsListDueDate: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },
  billsListRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  billsListAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
  },

  // Bills status badges
  billsStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  billsStatusPaid: {
    backgroundColor: colors.successLight || 'rgba(16, 185, 129, 0.1)',
  },
  billsStatusUnpaid: {
    backgroundColor: colors.warningLight || 'rgba(245, 158, 11, 0.1)',
  },
  billsStatusUpcoming: {
    backgroundColor: colors.primaryLight || 'rgba(99, 102, 241, 0.1)',
  },
  billsStatusLate: {
    backgroundColor: colors.dangerLight || 'rgba(239, 68, 68, 0.1)',
  },
  billsStatusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    textTransform: 'uppercase',
  },

  // Poker Insights styles
  pokerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pokerTitleIcon: {
    marginRight: 8,
  },
  pokerTitle: {
    marginBottom: 0,
  },
  pokerListContainer: {
    gap: 12,
    marginTop: 16,
  },
  pokerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.overlayLight || '#E5E7EB',
  },
  pokerListLeft: {
    flex: 1,
  },
  pokerListLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    marginBottom: 4,
  },
  pokerListSubtext: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },
  pokerListValue: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.warning || '#F59E0B',
  },
  pokerInsightText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary || '#1F2937',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Placeholder styles
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },

  // Chart subtitle for instructions
  chartSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Bill swipe styles
  billItemContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  billItemWrapper: {
    zIndex: 2,
  },
  billDeleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B85',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
    zIndex: 1,
  },
  billDeleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billDeleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  billPaidBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#52C788',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
    zIndex: 1,
  },
  billPaidContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billPaidText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
});

export default AnalyticsScreen;
