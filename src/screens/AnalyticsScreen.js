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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LineChart} from 'react-native-chart-kit';
import {colors} from '../styles';

const AnalyticsScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Refs to prevent multiple simultaneous loads and flicker
  const isLoadingRef = useRef(false);
  const lastActiveDate = useRef(new Date().toDateString());
  const isMountedRef = useRef(true);
  const hasLoadedOnce = useRef(false);

  // Consolidated data loading function
  const loadTransactions = useCallback(async (force = false) => {
    if (isLoadingRef.current && !force) {
      return;
    }

    isLoadingRef.current = true;

    try {
      const storedTransactions = await AsyncStorage.getItem('transactions');
      if (storedTransactions && isMountedRef.current) {
        const parsedTransactions = JSON.parse(storedTransactions);
        setTransactions(parsedTransactions);
      } else if (isMountedRef.current) {
        setTransactions([]);
      }
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('Error loading transactions:', error);
      if (isMountedRef.current) {
        setTransactions([]);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    isMountedRef.current = true;
    loadTransactions();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadTransactions]);

  // Monitor app state changes for automatic refresh
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active' && isMountedRef.current) {
        const now = new Date();
        const currentDateString = now.toDateString();

        // Only reload if it's a new day
        if (lastActiveDate.current !== currentDateString) {
          lastActiveDate.current = currentDateString;
          loadTransactions(true);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [loadTransactions]);

  // Only reload on focus if data is empty
  useFocusEffect(
    useCallback(() => {
      if (isMountedRef.current && !isLoadingRef.current) {
        // Only reload if transactions are empty
        if (transactions.length === 0) {
          loadTransactions();
        }
      }
    }, [loadTransactions, transactions.length]),
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await loadTransactions(true);
    setRefreshing(false);
  }, [loadTransactions, refreshing]);

  // Memoized expensive calculations
  const getPeriodData = useCallback(() => {
    if (transactions.length === 0) {
      return [];
    }

    const now = new Date();
    const data = [];

    switch (selectedPeriod) {
      case 'daily':
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);

          const dayTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return (
              transactionDate.getDate() === date.getDate() &&
              transactionDate.getMonth() === date.getMonth() &&
              transactionDate.getFullYear() === date.getFullYear()
            );
          });

          const dailyTotal = dayTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );

          // Previous week same day for comparison
          const previousWeekDate = new Date(date);
          previousWeekDate.setDate(previousWeekDate.getDate() - 7);

          const previousDayTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return (
              transactionDate.getDate() === previousWeekDate.getDate() &&
              transactionDate.getMonth() === previousWeekDate.getMonth() &&
              transactionDate.getFullYear() === previousWeekDate.getFullYear()
            );
          });

          const previousDayTotal = previousDayTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );

          data.push({
            label: date.toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
            }),
            amount: dailyTotal,
            previousPeriod: previousDayTotal,
          });
        }
        break;

      case 'weekly':
        // Last 4 weeks
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          const weekTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= weekStart && transactionDate <= weekEnd;
          });

          const weeklyTotal = weekTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );

          // Previous month same week for comparison
          const previousWeekStart = new Date(weekStart);
          previousWeekStart.setDate(previousWeekStart.getDate() - 28);
          const previousWeekEnd = new Date(previousWeekStart);
          previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);

          const previousWeekTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return (
              transactionDate >= previousWeekStart &&
              transactionDate <= previousWeekEnd
            );
          });

          const previousWeekTotal = previousWeekTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );

          data.push({
            label: `Week ${4 - i}`,
            amount: weeklyTotal,
            previousPeriod: previousWeekTotal,
          });
        }
        break;

      case 'monthly':
        // Last 5 months
        for (let i = 4; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);

          const monthTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return (
              transactionDate.getMonth() === monthDate.getMonth() &&
              transactionDate.getFullYear() === monthDate.getFullYear()
            );
          });

          const monthlyTotal = monthTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );

          // Previous year same month for comparison
          const previousYearMonth = new Date(monthDate);
          previousYearMonth.setFullYear(previousYearMonth.getFullYear() - 1);

          const previousMonthTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return (
              transactionDate.getMonth() === previousYearMonth.getMonth() &&
              transactionDate.getFullYear() === previousYearMonth.getFullYear()
            );
          });

          const previousMonthTotal = previousMonthTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );

          data.push({
            label: monthDate.toLocaleDateString('en-US', {month: 'short'}),
            amount: monthlyTotal,
            previousPeriod: previousMonthTotal,
          });
        }
        break;
    }

    return data;
  }, [transactions, selectedPeriod]);

  // Memoize all derived data
  const data = useMemo(() => getPeriodData(), [getPeriodData]);

  const getCurrentTotal = useMemo(() => {
    return data.reduce((sum, item) => sum + item.amount, 0);
  }, [data]);

  const getPreviousTotal = useMemo(() => {
    return data.reduce((sum, item) => sum + item.previousPeriod, 0);
  }, [data]);

  const getPercentageChange = useMemo(() => {
    const current = getCurrentTotal;
    const previous = getPreviousTotal;
    if (previous === 0) {
      return 0;
    }
    return ((current - previous) / previous) * 100;
  }, [getCurrentTotal, getPreviousTotal]);

  const getAverageSpending = useMemo(() => {
    if (data.length === 0) {
      return 0;
    }
    return getCurrentTotal / data.length;
  }, [data.length, getCurrentTotal]);

  const getHighestSpendingPeriod = useMemo(() => {
    if (data.length === 0) {
      return null;
    }
    return data.reduce((max, current) =>
      current.amount > max.amount ? current : max,
    );
  }, [data]);

  // Memoize chart configuration
  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.surface || '#ffffff',
      backgroundGradientFrom: colors.surface || '#ffffff',
      backgroundGradientTo: colors.surface || '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.primary || '#6366F1',
      },
    }),
    [],
  );

  const chartData = useMemo(
    () => ({
      labels: data.map(item => item.label),
      datasets: [
        {
          data: data.map(item => item.amount),
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          strokeWidth: 3,
        },
        ...(comparisonMode
          ? [
              {
                data: data.map(item => item.previousPeriod),
                color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                strokeWidth: 2,
                withDots: false,
              },
            ]
          : []),
      ],
    }),
    [data, comparisonMode],
  );

  const screenWidth = useMemo(() => Dimensions.get('window').width, []);

  // Memoized handlers
  const handlePeriodChange = useCallback(period => {
    setSelectedPeriod(period);
  }, []);

  const handleComparisonToggle = useCallback(() => {
    setComparisonMode(prev => !prev);
  }, []);

  // Never show loading screen to prevent flicker
  if (false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Track your spending patterns</Text>
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
        {/* Period Selector */}
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

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Spending</Text>
            <Text style={styles.statValue}>${getCurrentTotal.toFixed(2)}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}{' '}
              Average
            </Text>
            <Text style={styles.statValue}>
              ${getAverageSpending.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>vs Previous Period</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    getPercentageChange >= 0
                      ? colors.danger || '#EF4444'
                      : colors.success || '#10B981',
                },
              ]}>
              {getPercentageChange >= 0 ? '+' : ''}
              {getPercentageChange.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Chart */}
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

        {/* Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Key Insights</Text>

          {getHighestSpendingPeriod && (
            <View
              style={[styles.insightCard, {borderLeftColor: colors.primary}]}>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>Highest spending:</Text>{' '}
                {getHighestSpendingPeriod.label} with $
                {getHighestSpendingPeriod.amount.toFixed(2)}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.insightCard,
              {
                borderLeftColor:
                  getPercentageChange >= 0
                    ? colors.danger || '#EF4444'
                    : colors.success || '#10B981',
              },
            ]}>
            <Text style={styles.insightText}>
              <Text style={styles.insightBold}>Trend:</Text> You're spending{' '}
              {Math.abs(getPercentageChange).toFixed(1)}%{' '}
              {getPercentageChange >= 0 ? 'more' : 'less'} than last period
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#F8FAFC',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },
  header: {
    backgroundColor: colors.primary || '#6366F1',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  insightText: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    lineHeight: 20,
  },
  insightBold: {
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default React.memo(AnalyticsScreen);
