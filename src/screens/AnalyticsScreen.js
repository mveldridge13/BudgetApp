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

const ProBadge = () => (
  <View style={styles.proBadge}>
    <Text style={styles.proBadgeText}>PRO</Text>
  </View>
);

const AnalyticsScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const storageCoordinator = StorageCoordinator.getInstance();
  const userStorageManager = storageCoordinator.getUserStorageManager();

  const isLoadingRef = useRef(false);
  const lastActiveDate = useRef(new Date().toDateString());
  const isMountedRef = useRef(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const checkStorageReady = () => {
      const isReady =
        storageCoordinator.isUserStorageInitialized() && userStorageManager;
      setIsStorageReady(isReady);
    };

    checkStorageReady();
    const interval = setInterval(checkStorageReady, 1000);

    return () => clearInterval(interval);
  }, [storageCoordinator, userStorageManager]);

  useEffect(() => {
    const checkProStatus = async () => {
      if (!isStorageReady || !userStorageManager) {
        return;
      }

      try {
        const proStatus = await userStorageManager.getUserData('isPro');
        setIsPro(proStatus === true || proStatus === 'true');
      } catch (error) {
        console.error('Error checking Pro status:', error);
      }
    };

    if (isStorageReady) {
      checkProStatus();
    }
  }, [isStorageReady, userStorageManager]);

  useFocusEffect(
    useCallback(() => {
      const checkProStatus = async () => {
        if (!isStorageReady || !userStorageManager) {
          return;
        }

        try {
          const proStatus = await userStorageManager.getUserData('isPro');
          setIsPro(proStatus === true || proStatus === 'true');
        } catch (error) {
          console.error('Error checking Pro status:', error);
        }
      };

      if (isStorageReady) {
        checkProStatus();
      }
    }, [isStorageReady, userStorageManager]),
  );

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
        if (
          storedTransactions &&
          Array.isArray(storedTransactions) &&
          isMountedRef.current
        ) {
          setTransactions(storedTransactions);
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

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active' && isMountedRef.current && isStorageReady) {
        const now = new Date();
        const currentDateString = now.toDateString();

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
  }, [loadTransactions, isStorageReady]);

  useFocusEffect(
    useCallback(() => {
      if (isMountedRef.current && !isLoadingRef.current && isStorageReady) {
        if (transactions.length === 0) {
          loadTransactions();
        }
      }
    }, [loadTransactions, transactions.length, isStorageReady]),
  );

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await loadTransactions(true);
    setRefreshing(false);
  }, [loadTransactions, refreshing]);

  const isRecurringTransaction = useCallback(transaction => {
    return (
      transaction.recurrence &&
      transaction.recurrence !== 'none' &&
      ['weekly', 'fortnightly', 'monthly', 'sixmonths', 'yearly'].includes(
        transaction.recurrence,
      )
    );
  }, []);

  const getPeriodData = useCallback(() => {
    if (transactions.length === 0) {
      return [];
    }

    const now = new Date();
    const data = [];

    switch (selectedPeriod) {
      case 'daily':
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

          const dailyDiscretionary = dayTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

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
        }
        break;

      case 'weekly':
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

          const weeklyDiscretionary = weekTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

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

      case 'monthly':
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

          const monthlyDiscretionary = monthTransactions
            .filter(t => !isRecurringTransaction(t))
            .reduce((sum, t) => sum + t.amount, 0);

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

    return data;
  }, [transactions, selectedPeriod, isRecurringTransaction]);

  const data = useMemo(() => getPeriodData(), [getPeriodData]);

  const getCurrentTotal = useMemo(() => {
    return data.reduce((sum, item) => sum + item.amount, 0);
  }, [data]);

  const getCurrentDiscretionary = useMemo(() => {
    return data.reduce((sum, item) => sum + item.discretionaryAmount, 0);
  }, [data]);

  const getPreviousTotal = useMemo(() => {
    return data.reduce((sum, item) => sum + item.previousPeriod, 0);
  }, [data]);

  const getPreviousDiscretionary = useMemo(() => {
    return data.reduce((sum, item) => sum + item.previousDiscretionary, 0);
  }, [data]);

  const getPercentageChange = useMemo(() => {
    const current = getCurrentTotal;
    const previous = getPreviousTotal;
    if (previous === 0) {
      return 0;
    }
    return ((current - previous) / previous) * 100;
  }, [getCurrentTotal, getPreviousTotal]);

  const getDiscretionaryPercentageChange = useMemo(() => {
    const current = getCurrentDiscretionary;
    const previous = getPreviousDiscretionary;
    if (previous === 0) {
      return 0;
    }
    return ((current - previous) / previous) * 100;
  }, [getCurrentDiscretionary, getPreviousDiscretionary]);

  const getAverageSpending = useMemo(() => {
    if (data.length === 0) {
      return 0;
    }
    return getCurrentTotal / data.length;
  }, [data.length, getCurrentTotal]);

  const getAverageDiscretionary = useMemo(() => {
    if (data.length === 0) {
      return 0;
    }
    return getCurrentDiscretionary / data.length;
  }, [data.length, getCurrentDiscretionary]);

  const getHighestSpendingPeriod = useMemo(() => {
    if (data.length === 0) {
      return null;
    }
    return data.reduce((max, current) =>
      current.amount > max.amount ? current : max,
    );
  }, [data]);

  const getHighestDiscretionaryPeriod = useMemo(() => {
    if (data.length === 0) {
      return null;
    }
    return data.reduce((max, current) =>
      current.discretionaryAmount > max.discretionaryAmount ? current : max,
    );
  }, [data]);

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

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary Spending</Text>
            <Text style={styles.statValue}>
              ${getCurrentDiscretionary.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary Average</Text>
            <Text style={styles.statValue}>
              ${getAverageDiscretionary.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary vs Previous</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    getDiscretionaryPercentageChange >= 0
                      ? colors.danger || '#EF4444'
                      : colors.success || '#10B981',
                },
              ]}>
              {getDiscretionaryPercentageChange >= 0 ? '+' : ''}
              {getDiscretionaryPercentageChange.toFixed(1)}%
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

          {getHighestSpendingPeriod && (
            <View
              style={[styles.insightCard, {borderLeftColor: colors.primary}]}>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>Highest total spending:</Text>{' '}
                {getHighestSpendingPeriod.label} with $
                {getHighestSpendingPeriod.amount.toFixed(2)}
              </Text>
            </View>
          )}

          {getHighestDiscretionaryPeriod &&
            getHighestDiscretionaryPeriod.discretionaryAmount > 0 && (
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
                    {getHighestDiscretionaryPeriod.label} with $
                    {getHighestDiscretionaryPeriod.discretionaryAmount.toFixed(
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
                  getPercentageChange >= 0
                    ? colors.danger || '#EF4444'
                    : colors.success || '#10B981',
              },
            ]}>
            <Text style={styles.insightText}>
              <Text style={styles.insightBold}>Total spending trend:</Text>{' '}
              You're spending {Math.abs(getPercentageChange).toFixed(1)}%{' '}
              {getPercentageChange >= 0 ? 'more' : 'less'} than last period
            </Text>
          </View>

          <View
            style={[
              styles.insightCard,
              {
                borderLeftColor:
                  getDiscretionaryPercentageChange >= 0
                    ? colors.danger || '#EF4444'
                    : colors.success || '#10B981',
              },
            ]}>
            <Text style={styles.insightText}>
              <Text style={styles.insightBold}>Discretionary trend:</Text> Your
              discretionary spending is{' '}
              {Math.abs(getDiscretionaryPercentageChange).toFixed(1)}%{' '}
              {getDiscretionaryPercentageChange >= 0 ? 'higher' : 'lower'} than
              last period
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

export default AnalyticsScreen;
