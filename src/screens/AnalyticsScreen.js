/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  AppState,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {LineChart} from 'react-native-chart-kit';
import {colors} from '../styles';
import {StorageCoordinator} from '../services/storage/StorageCoordinator';
import DiscretionaryBreakdown from '../components/DiscretionaryBreakdown';

const ProBadge = React.memo(() => (
  <View style={styles.proBadge}>
    <Text style={styles.proBadgeText}>PRO</Text>
  </View>
));

// Memoized calculation utilities
const DateUtils = {
  // Cache for date operations to avoid recreating
  getDateKey: date =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,

  isSameDay: (date1, date2) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  },

  isSameMonth: (date1, date2) => {
    return (
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  },

  isInWeek: (date, weekStart, weekEnd) => {
    return date >= weekStart && date <= weekEnd;
  },
};

// Pre-process transactions for better performance
const useProcessedTransactions = transactions => {
  return useMemo(() => {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return {byDate: new Map(), byMonth: new Map(), total: 0};
    }

    const byDate = new Map();
    const byMonth = new Map();
    let total = 0;

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dateKey = DateUtils.getDateKey(date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      // Group by date
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey).push(transaction);

      // Group by month
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, []);
      }
      byMonth.get(monthKey).push(transaction);

      total += transaction.amount;
    });

    return {byDate, byMonth, total};
  }, [transactions]);
};

const AnalyticsScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const storageCoordinator = useMemo(
    () => StorageCoordinator.getInstance(),
    [],
  );
  const userStorageManager = useMemo(
    () => storageCoordinator.getUserStorageManager(),
    [storageCoordinator],
  );

  const isLoadingRef = useRef(false);
  const lastActiveDate = useRef(new Date().toDateString());
  const isMountedRef = useRef(true);
  const hasLoadedOnce = useRef(false);

  // Pre-processed transactions for performance
  const processedTransactions = useProcessedTransactions(transactions);

  // Progressive storage check with optimized retry
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 15;
    let timeoutId;

    const checkStorageReady = () => {
      const isReady =
        storageCoordinator.isUserStorageInitialized() && userStorageManager;
      setIsStorageReady(isReady);

      if (!isReady && retryCount < maxRetries) {
        retryCount++;

        // Progressive delays: 50ms -> 200ms -> 500ms
        let delay;
        if (retryCount <= 3) {
          delay = 50;
        } else if (retryCount <= 8) {
          delay = 200;
        } else {
          delay = 500;
        }

        timeoutId = setTimeout(checkStorageReady, delay);
      }
    };

    checkStorageReady();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [storageCoordinator, userStorageManager]);

  // Memoized recurring transaction check
  const isRecurringTransaction = useCallback(transaction => {
    return (
      transaction.recurrence &&
      transaction.recurrence !== 'none' &&
      ['weekly', 'fortnightly', 'monthly', 'sixmonths', 'yearly'].includes(
        transaction.recurrence,
      )
    );
  }, []);

  // Optimized period data calculation
  const getPeriodData = useCallback(() => {
    if (transactions.length === 0) {
      return [];
    }

    const now = new Date();
    const data = [];

    switch (selectedPeriod) {
      case 'daily': {
        // Pre-calculate date ranges to avoid repeated operations
        const dates = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          dates.push(date);
        }

        dates.forEach(date => {
          const dateKey = DateUtils.getDateKey(date);
          const dayTransactions =
            processedTransactions.byDate.get(dateKey) || [];

          const dailyTotal = dayTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );
          const dailyDiscretionary = dayTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

          // Previous week calculation (simplified)
          const previousWeekDate = new Date(date);
          previousWeekDate.setDate(previousWeekDate.getDate() - 7);
          const prevDateKey = DateUtils.getDateKey(previousWeekDate);
          const previousDayTransactions =
            processedTransactions.byDate.get(prevDateKey) || [];

          const previousDayTotal = previousDayTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );
          const previousDayDiscretionary = previousDayTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

          data.push({
            label: date.toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
            }),
            amount: dailyTotal,
            discretionaryAmount: dailyDiscretionary,
            previousPeriod: previousDayTotal,
            previousDiscretionary: previousDayDiscretionary,
            date: new Date(date),
          });
        });
        break;
      }

      case 'weekly': {
        // Simplified weekly calculation
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          // Use more efficient filtering
          const weekTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return DateUtils.isInWeek(transactionDate, weekStart, weekEnd);
          });

          const weeklyTotal = weekTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );
          const weeklyDiscretionary = weekTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

          // Previous period calculation (simplified)
          const previousWeekStart = new Date(weekStart);
          previousWeekStart.setDate(previousWeekStart.getDate() - 28);
          const previousWeekEnd = new Date(previousWeekStart);
          previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);

          const previousWeekTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return DateUtils.isInWeek(
              transactionDate,
              previousWeekStart,
              previousWeekEnd,
            );
          });

          const previousWeekTotal = previousWeekTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );
          const previousWeekDiscretionary = previousWeekTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

          data.push({
            label: `Week ${4 - i}`,
            amount: weeklyTotal,
            discretionaryAmount: weeklyDiscretionary,
            previousPeriod: previousWeekTotal,
            previousDiscretionary: previousWeekDiscretionary,
            startDate: new Date(weekStart),
            endDate: new Date(weekEnd),
          });
        }
        break;
      }

      case 'monthly': {
        for (let i = 4; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
          const monthTransactions =
            processedTransactions.byMonth.get(monthKey) || [];

          const monthlyTotal = monthTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );
          const monthlyDiscretionary = monthTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

          // Previous year calculation
          const previousYearMonth = new Date(monthDate);
          previousYearMonth.setFullYear(previousYearMonth.getFullYear() - 1);
          const prevMonthKey = `${previousYearMonth.getFullYear()}-${previousYearMonth.getMonth()}`;
          const previousMonthTransactions =
            processedTransactions.byMonth.get(prevMonthKey) || [];

          const previousMonthTotal = previousMonthTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );
          const previousMonthDiscretionary = previousMonthTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

          data.push({
            label: monthDate.toLocaleDateString('en-US', {month: 'short'}),
            amount: monthlyTotal,
            discretionaryAmount: monthlyDiscretionary,
            previousPeriod: previousMonthTotal,
            previousDiscretionary: previousMonthDiscretionary,
            monthDate: new Date(monthDate),
          });
        }
        break;
      }
    }

    return data;
  }, [
    transactions,
    selectedPeriod,
    isRecurringTransaction,
    processedTransactions,
  ]);

  // Memoize data with proper dependencies
  const data = useMemo(() => getPeriodData(), [getPeriodData]);

  // Combine all calculations into single useMemo to reduce recalculations
  const analytics = useMemo(() => {
    const currentTotal = data.reduce((sum, item) => sum + item.amount, 0);
    const currentDiscretionary = data.reduce(
      (sum, item) => sum + item.discretionaryAmount,
      0,
    );
    const previousTotal = data.reduce(
      (sum, item) => sum + item.previousPeriod,
      0,
    );
    const previousDiscretionary = data.reduce(
      (sum, item) => sum + item.previousDiscretionary,
      0,
    );

    const percentageChange =
      previousTotal === 0
        ? 0
        : ((currentTotal - previousTotal) / previousTotal) * 100;
    const discretionaryPercentageChange =
      previousDiscretionary === 0
        ? 0
        : ((currentDiscretionary - previousDiscretionary) /
            previousDiscretionary) *
          100;

    const averageSpending = data.length === 0 ? 0 : currentTotal / data.length;
    const averageDiscretionary =
      data.length === 0 ? 0 : currentDiscretionary / data.length;

    const highestSpendingPeriod =
      data.length === 0
        ? null
        : data.reduce((max, current) =>
            current.amount > max.amount ? current : max,
          );
    const highestDiscretionaryPeriod =
      data.length === 0
        ? null
        : data.reduce((max, current) =>
            current.discretionaryAmount > max.discretionaryAmount
              ? current
              : max,
          );

    return {
      currentTotal,
      currentDiscretionary,
      previousTotal,
      previousDiscretionary,
      percentageChange,
      discretionaryPercentageChange,
      averageSpending,
      averageDiscretionary,
      highestSpendingPeriod,
      highestDiscretionaryPeriod,
    };
  }, [data]);

  // Optimized Pro status check with debouncing
  useEffect(() => {
    let timeoutId;

    const checkProStatus = async () => {
      if (!isStorageReady || !userStorageManager) {
        return;
      }

      try {
        const proStatus = await userStorageManager.getUserData('isPro');
        if (isMountedRef.current) {
          setIsPro(proStatus === true || proStatus === 'true');
        }
      } catch (error) {
        console.error('Error checking Pro status:', error);
      }
    };

    if (isStorageReady) {
      timeoutId = setTimeout(checkProStatus, 100); // Debounce
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isStorageReady, userStorageManager]);

  // Optimized transaction loading
  const loadTransactions = useCallback(
    async (force = false) => {
      if (isLoadingRef.current && !force) {
        return;
      }
      if (!isStorageReady || !userStorageManager) {
        return;
      }

      isLoadingRef.current = true;

      try {
        const storedTransactions = await userStorageManager.getUserData(
          'transactions',
        );
        if (isMountedRef.current) {
          setTransactions(
            Array.isArray(storedTransactions) ? storedTransactions : [],
          );
          hasLoadedOnce.current = true;
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
        if (isMountedRef.current) {
          setTransactions([]);
        }
      } finally {
        isLoadingRef.current = false;
      }
    },
    [isStorageReady, userStorageManager],
  );

  useEffect(() => {
    isMountedRef.current = true;
    if (isStorageReady) {
      loadTransactions();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [loadTransactions, isStorageReady]);

  // Debounced app state change handler
  useEffect(() => {
    let timeoutId;

    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active' && isMountedRef.current && isStorageReady) {
        const now = new Date();
        const currentDateString = now.toDateString();

        if (lastActiveDate.current !== currentDateString) {
          lastActiveDate.current = currentDateString;
          // Debounce to prevent rapid calls
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => loadTransactions(true), 200);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription?.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadTransactions, isStorageReady]);

  // Simplified focus effect
  useFocusEffect(
    useCallback(() => {
      if (
        isMountedRef.current &&
        !isLoadingRef.current &&
        isStorageReady &&
        transactions.length === 0
      ) {
        loadTransactions();
      }
    }, [loadTransactions, transactions.length, isStorageReady]),
  );

  // Separate focus effect for Pro status - this was missing!
  useFocusEffect(
    useCallback(() => {
      const checkProStatus = async () => {
        if (!isStorageReady || !userStorageManager) {
          return;
        }

        try {
          const proStatus = await userStorageManager.getUserData('isPro');
          if (isMountedRef.current) {
            setIsPro(proStatus === true || proStatus === 'true');
          }
        } catch (error) {
          console.error('Error checking Pro status:', error);
        }
      };

      if (isStorageReady) {
        checkProStatus();
      }
    }, [isStorageReady, userStorageManager]),
  );

  // Optimized refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await loadTransactions(true);
    setRefreshing(false);
  }, [loadTransactions, refreshing]);

  // Static chart configuration
  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.surface || '#ffffff',
      backgroundGradientFrom: colors.surface || '#ffffff',
      backgroundGradientTo: colors.surface || '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
      style: {borderRadius: 16},
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.primary || '#6366F1',
      },
    }),
    [],
  );

  // Optimized chart data
  const chartData = useMemo(() => {
    const baseData = {
      labels: data.map(item => item.label),
      datasets: [
        {
          data: data.map(item => item.amount),
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };

    if (comparisonMode) {
      baseData.datasets.push({
        data: data.map(item => item.previousPeriod),
        color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
        strokeWidth: 2,
        withDots: false,
      });
    }

    return baseData;
  }, [data, comparisonMode]);

  // Static screen width
  const screenWidth = useMemo(() => Dimensions.get('window').width, []);

  // Event handlers
  const handlePeriodChange = useCallback(period => {
    setSelectedPeriod(period);
  }, []);

  const handleComparisonToggle = useCallback(() => {
    setComparisonMode(prev => !prev);
  }, []);

  const handleDiscretionaryClick = useCallback(() => {
    if (isPro) {
      setShowBreakdown(true);
    } else {
      Alert.alert(
        'Upgrade to Pro',
        'Access advanced analytics and detailed breakdowns with Pro features!',
        [
          {text: 'Maybe Later', style: 'cancel'},
          {text: 'Learn More', style: 'default'},
        ],
      );
    }
  }, [isPro]);

  const handleCloseBreakdown = useCallback(() => {
    setShowBreakdown(false);
  }, []);

  if (!isStorageReady) {
    return (
      <View
        style={[
          styles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <Text style={{fontSize: 16, color: colors.textSecondary}}>
          Initializing storage...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.selectorContainer}>
          <View style={styles.periodButtons}>
            {['daily', 'weekly', 'monthly'].map(period => (
              <TouchableOpacity
                key={period}
                onPress={() => handlePeriodChange(period)}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}>
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.comparisonToggle}
            onPress={handleComparisonToggle}>
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

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Spending</Text>
            <Text style={styles.statValue}>
              ${analytics.currentTotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}{' '}
              Average
            </Text>
            <Text style={styles.statValue}>
              ${analytics.averageSpending.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>vs Previous Period</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    analytics.percentageChange >= 0
                      ? colors.danger || '#EF4444'
                      : colors.success || '#10B981',
                },
              ]}>
              {analytics.percentageChange >= 0 ? '+' : ''}
              {analytics.percentageChange.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary Spending</Text>
            <Text style={styles.statValue}>
              ${analytics.currentDiscretionary.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary Average</Text>
            <Text style={styles.statValue}>
              ${analytics.averageDiscretionary.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary vs Previous</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    analytics.discretionaryPercentageChange >= 0
                      ? colors.danger || '#EF4444'
                      : colors.success || '#10B981',
                },
              ]}>
              {analytics.discretionaryPercentageChange >= 0 ? '+' : ''}
              {analytics.discretionaryPercentageChange.toFixed(1)}%
            </Text>
          </View>
        </View>

        {data.length > 0 && (
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

        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Key Insights</Text>

          {analytics.highestSpendingPeriod && (
            <View
              style={[styles.insightCard, {borderLeftColor: colors.primary}]}>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>Highest total spending:</Text>{' '}
                {analytics.highestSpendingPeriod.label} with $
                {analytics.highestSpendingPeriod.amount.toFixed(2)}
              </Text>
            </View>
          )}

          {analytics.highestDiscretionaryPeriod &&
            analytics.highestDiscretionaryPeriod.discretionaryAmount > 0 && (
              <TouchableOpacity
                style={[
                  styles.insightCard,
                  styles.clickableInsight,
                  {borderLeftColor: colors.secondary || '#10B981'},
                ]}
                onPress={handleDiscretionaryClick}>
                <View style={styles.insightContentClean}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>
                      Highest discretionary spending:
                    </Text>{' '}
                    {analytics.highestDiscretionaryPeriod.label} with $
                    {analytics.highestDiscretionaryPeriod.discretionaryAmount.toFixed(
                      2,
                    )}
                  </Text>
                  {isPro ? (
                    <Text style={styles.tapHint}>Tap for breakdown</Text>
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
                  analytics.percentageChange >= 0
                    ? colors.danger || '#EF4444'
                    : colors.success || '#10B981',
              },
            ]}>
            <Text style={styles.insightText}>
              <Text style={styles.insightBold}>Total spending trend:</Text>{' '}
              You're spending {Math.abs(analytics.percentageChange).toFixed(1)}%{' '}
              {analytics.percentageChange >= 0 ? 'more' : 'less'} than last
              period
            </Text>
          </View>

          <View
            style={[
              styles.insightCard,
              {
                borderLeftColor:
                  analytics.discretionaryPercentageChange >= 0
                    ? colors.danger || '#EF4444'
                    : colors.success || '#10B981',
              },
            ]}>
            <Text style={styles.insightText}>
              <Text style={styles.insightBold}>Discretionary trend:</Text> Your
              discretionary spending is{' '}
              {Math.abs(analytics.discretionaryPercentageChange).toFixed(1)}%{' '}
              {analytics.discretionaryPercentageChange >= 0
                ? 'higher'
                : 'lower'}{' '}
              than last period
            </Text>
          </View>

          {transactions.length === 0 && (
            <View
              style={[
                styles.insightCard,
                {borderLeftColor: colors.warning || '#F59E0B'},
              ]}>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>No data:</Text> Start adding
                transactions to see your spending trends
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <DiscretionaryBreakdown
        visible={showBreakdown}
        onClose={handleCloseBreakdown}
        transactions={transactions}
        selectedPeriod={selectedPeriod}
        periodData={data}
        isRecurringTransaction={isRecurringTransaction}
        allTransactions={transactions}
        previousPeriodData={data}
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
    marginBottom: 16,
    gap: 8,
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
});

export default React.memo(AnalyticsScreen);
