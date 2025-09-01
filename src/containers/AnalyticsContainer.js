import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {AppState, Alert, Dimensions} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import TrendAPIService from '../services/TrendAPIService';
import billsAnalyticsCache from '../services/BillsAnalyticsCache';
import incomeAnalyticsCache from '../services/IncomeAnalyticsCache';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import {useAppSettings} from '../contexts/AppSettingsContext';
import {colors} from '../styles';

const AnalyticsContainer = () => {
  // Get Pro status and module settings from context
  const {isPro, moduleSettings} = useAppSettings();

  // UI state only
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Backend data - this is all we need
  const [analyticsData, setAnalyticsData] = useState(null);
  const [billsAnalytics, setBillsAnalytics] = useState(null);
  const [incomeAnalytics, setIncomeAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cache state for bills and income analytics
  const [isOnline, setIsOnline] = useState(true);

  // Refs for optimization
  const isLoadingRef = useRef(false);
  const lastActiveDate = useRef(new Date().toDateString());
  const isMountedRef = useRef(true);



  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Network state monitoring for offline fallback
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const isNowOnline = state.isConnected && state.isInternetReachable;

      setIsOnline(isNowOnline);

      // If coming back online and caches are stale, refresh
      if (wasOffline && isNowOnline && isMountedRef.current) {
        billsAnalyticsCache.isFresh().then(isFresh => {
          if (!isFresh) {
            console.log('📋 Back online, refreshing stale bills cache');
            loadBillsAnalytics(false); // Background refresh
          }
        });

        incomeAnalyticsCache.isFresh().then(isFresh => {
          if (!isFresh) {
            console.log('💰 Back online, refreshing stale income cache');
            loadIncomeAnalytics(false); // Background refresh
          }
        });
      }
    });

    return unsubscribe;
  }, [isOnline, loadBillsAnalytics, loadIncomeAnalytics]);

  // Get date range for selected period
  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'daily':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        endDate = new Date(now);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 27);
        endDate = new Date(now);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 4, 1);
        endDate = new Date(now);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        endDate = new Date(now);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [selectedPeriod]);

  // Load bills analytics with cache-first approach
  const loadBillsAnalytics = useCallback(
    async (forceRefresh = false) => {
      try {
        // 1. Load from cache immediately (instant UI)
        const cached = await billsAnalyticsCache.get();
        if (cached && cached.data && isMountedRef.current) {
          console.log('📋 Loading bills analytics from cache', {
            age: Math.round(cached.age / 1000 / 60),
            isStale: cached.isStale,
          });

          setBillsAnalytics(cached.data);

          // If data is fresh and not forcing refresh, we're done
          if (!cached.isStale && !forceRefresh) {
            return;
          }
        }

        // 2. Background fetch from backend (if stale or no cache)
        if (
          (cached?.isStale || !cached || forceRefresh) &&
          isMountedRef.current
        ) {
          await loadBillsAnalyticsFromBackend();
        }
      } catch (err) {
        console.error('Error in cache-first bills analytics loading:', err);

        // If cache loading fails, try backend directly
        if (isMountedRef.current) {
          await loadBillsAnalyticsFromBackend();
        }
      }
    },
    [loadBillsAnalyticsFromBackend],
  );

  // Backend bills analytics loading with cache update
  const loadBillsAnalyticsFromBackend = useCallback(async () => {
    try {
      // If offline, use cached data
      if (!isOnline) {
        console.log('📋 Offline - using cached bills analytics');
        const cached = await billsAnalyticsCache.get();
        if (cached && cached.data && isMountedRef.current) {
          setBillsAnalytics(cached.data);
        }
        return;
      }

      console.log('📋 Fetching bills analytics from backend...');

      // Try backend bills analytics first
      const billsResponse = await TrendAPIService.getBillsAnalytics();

      if (isMountedRef.current && billsResponse) {
        setBillsAnalytics(billsResponse);

        // Cache the response for future use
        await billsAnalyticsCache.set(billsResponse);
        console.log('📋 Bills analytics cached successfully');
      }
    } catch (err) {
      console.error('Error loading bills analytics from backend:', err);

      // Fallback: if backend endpoint doesn't exist yet, calculate client-side temporarily
      if (err.message && err.message.includes('404')) {
        console.warn(
          'Bills analytics endpoint not implemented yet, falling back to client-side processing',
        );
        await loadBillsAnalyticsFallback();
      } else {
        // For other errors, keep cached data if available, otherwise show empty
        const cached = await billsAnalyticsCache.get();
        if (cached && cached.data && isMountedRef.current) {
          console.log('📋 Backend failed, using stale cache data');
          setBillsAnalytics(cached.data);
        } else if (isMountedRef.current) {
          setBillsAnalytics(null);
        }
      }
    }
  }, [isOnline, loadBillsAnalyticsFallback]);

  // Temporary fallback processing until backend implements bills-analytics endpoint
  const loadBillsAnalyticsFallback = useCallback(async () => {
    try {
      // Get all transactions with due dates (bills)
      const response = await TrendAPIService.getTransactions();
      const allTransactions = response?.transactions || [];

      console.log('📋 Bills Analytics: Fetched transactions:', {
        responseType: typeof response,
        transactionsType: typeof allTransactions,
        isArray: Array.isArray(allTransactions),
        length: allTransactions?.length || 0,
        sample: allTransactions?.slice(0, 2) || 'no data',
      });

      // Check if transactions data is valid
      if (!allTransactions || !Array.isArray(allTransactions)) {
        console.warn('No transactions data available for bills analytics');
        if (isMountedRef.current) {
          setBillsAnalytics({
            totalBills: 0,
            paidBills: 0,
            unpaidBills: 0,
            overdueBills: 0,
            totalAmount: 0,
            paidAmount: 0,
            unpaidAmount: 0,
            overdueAmount: 0,
            upcomingBills: [],
            paidBillsList: [],
            unpaidBillsList: [],
            overdueBillsList: [],
            progress: 0,
          });
        }
        return;
      }

      const billTransactions = allTransactions.filter(
        tx => tx.dueDate || (tx.recurrence && tx.recurrence !== 'none'),
      );

      console.log('📋 Bills Analytics: Found bill transactions:', {
        totalTransactions: allTransactions.length,
        billTransactions: billTransactions.length,
        sampleBills: billTransactions.slice(0, 3).map(tx => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          dueDate: tx.dueDate,
          recurrence: tx.recurrence,
          status: tx.status,
        })),
      });

      // Process bills analytics client-side (temporary)
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyBills = billTransactions.filter(bill => {
        if (!bill.dueDate) {
          return false;
        }
        const billDate = new Date(bill.dueDate);
        return (
          billDate.getMonth() === currentMonth &&
          billDate.getFullYear() === currentYear
        );
      });

      // Categorize bills by status
      const paidBillsList = monthlyBills.filter(bill => bill.status === 'PAID');
      const unpaidBillsList = monthlyBills.filter(
        bill => bill.status === 'UPCOMING',
      );
      const overdueBillsList = monthlyBills.filter(bill => {
        if (bill.status === 'PAID') {
          return false;
        }
        return new Date(bill.dueDate) < now;
      });

      // Upcoming bills (next 7 days)
      const upcomingBills = monthlyBills.filter(bill => {
        if (bill.status === 'PAID') {
          return false;
        }
        const dueDate = new Date(bill.dueDate);
        return dueDate >= now && dueDate <= oneWeekFromNow;
      });

      // Calculate amounts
      const totalAmount = monthlyBills.reduce(
        (sum, bill) => sum + Math.abs(bill.amount),
        0,
      );
      const paidAmount = paidBillsList.reduce(
        (sum, bill) => sum + Math.abs(bill.amount),
        0,
      );
      const unpaidAmount = unpaidBillsList.reduce(
        (sum, bill) => sum + Math.abs(bill.amount),
        0,
      );
      const overdueAmount = overdueBillsList.reduce(
        (sum, bill) => sum + Math.abs(bill.amount),
        0,
      );

      // Calculate progress
      const progress =
        totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

      const fallbackAnalytics = {
        totalBills: monthlyBills.length,
        paidBills: paidBillsList.length,
        unpaidBills: unpaidBillsList.length,
        overdueBills: overdueBillsList.length,
        totalAmount,
        paidAmount,
        unpaidAmount,
        overdueAmount,
        upcomingBills: upcomingBills.sort(
          (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
        ),
        paidBillsList: paidBillsList.sort(
          (a, b) => new Date(b.dueDate) - new Date(a.dueDate),
        ),
        unpaidBillsList: unpaidBillsList.sort(
          (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
        ),
        overdueBillsList: overdueBillsList.sort(
          (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
        ),
        progress,
      };

      if (isMountedRef.current) {
        setBillsAnalytics(fallbackAnalytics);

        // Cache the fallback results for future use
        await billsAnalyticsCache.set(fallbackAnalytics);
        console.log('📋 Fallback bills analytics cached successfully');
      }
    } catch (fallbackErr) {
      console.error('Error in bills analytics fallback:', fallbackErr);
      if (isMountedRef.current) {
        setBillsAnalytics(null);
      }
    }
  }, []);

  // Load income analytics with cache-first approach (following same pattern as bills)
  const loadIncomeAnalytics = useCallback(
    async (forceRefresh = false) => {
      try {
        // 1. Load from cache immediately (instant UI)
        const cached = await incomeAnalyticsCache.get();
        if (cached && cached.data && isMountedRef.current) {
          console.log('💰 Loading income analytics from cache', {
            age: Math.round(cached.age / 1000 / 60),
            isStale: cached.isStale,
          });

          setIncomeAnalytics(cached.data);

          // If data is fresh and not forcing refresh, we're done
          if (!cached.isStale && !forceRefresh) {
            return;
          }
        }

        // 2. Background fetch from backend (if stale or no cache)
        if (
          (cached?.isStale || !cached || forceRefresh) &&
          isMountedRef.current
        ) {
          await loadIncomeAnalyticsFromBackend();
        }
      } catch (err) {
        console.error('Error in cache-first income analytics loading:', err);

        // If cache loading fails, try backend directly
        if (isMountedRef.current) {
          await loadIncomeAnalyticsFromBackend();
        }
      }
    },
    [loadIncomeAnalyticsFromBackend],
  );

  // Backend income analytics loading with cache update
  const loadIncomeAnalyticsFromBackend = useCallback(async () => {
    try {
      // If offline, use cached data
      if (!isOnline) {
        console.log('💰 Offline - using cached income analytics');
        const cached = await incomeAnalyticsCache.get();
        if (cached && cached.data && isMountedRef.current) {
          setIncomeAnalytics(cached.data);
        }
        return;
      }

      console.log('💰 Fetching income analytics from backend...');

      // Try backend income analytics
      const incomeResponse = await TrendAPIService.getIncomeAnalytics();

      console.log('💰 Backend income analytics response:', {
        responseType: typeof incomeResponse,
        keys: incomeResponse ? Object.keys(incomeResponse) : 'null',
        totalIncomeThisMonth: incomeResponse?.totalIncomeThisMonth,
        incomeBySourceLength: incomeResponse?.incomeBySource?.length,
        incomeBySourceSample: incomeResponse?.incomeBySource?.slice(0, 2),
        hasError: incomeResponse?.error,
        dataSource: incomeResponse?.dataSource,
        hasTransactionData: incomeResponse?.hasTransactionData,
        hasProfileData: incomeResponse?.hasProfileData,
      });

      if (isMountedRef.current && incomeResponse) {
        setIncomeAnalytics(incomeResponse);

        // Cache the response for future use
        await incomeAnalyticsCache.set(incomeResponse);
        console.log('💰 Income analytics cached successfully');
      }
    } catch (err) {
      console.error('Error loading income analytics from backend:', err);

      // For errors, keep cached data if available, otherwise show empty
      const cached = await incomeAnalyticsCache.get();
      if (cached && cached.data && isMountedRef.current) {
        console.log('💰 Backend failed, using stale cache data');
        setIncomeAnalytics(cached.data);
      } else if (isMountedRef.current) {
        setIncomeAnalytics(null);
      }
    }
  }, [isOnline]);

  // Load analytics from backend - let backend do ALL the work
  const loadAnalyticsData = useCallback(
    async (force = false) => {
      if (isLoadingRef.current && !force) {
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        const {startDate, endDate} = getDateRange();

        // Use ONLY backend analytics - no transaction processing
        const analyticsResponse = await TrendAPIService.getTransactionAnalytics(
          {
            startDate,
            endDate,
          },
        );

        if (isMountedRef.current) {
          setAnalyticsData(analyticsResponse);
        }

        // Also load bills and income analytics
        await loadBillsAnalytics();
        await loadIncomeAnalytics();
      } catch (err) {
        console.error('Error loading analytics data:', err);
        if (isMountedRef.current) {
          setAnalyticsData(null);
        }
      } finally {
        isLoadingRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [getDateRange, loadBillsAnalytics, loadIncomeAnalytics],
  );

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod, loadAnalyticsData]);

  // ============================================================================
  // CHART CONFIGURATION - MOVED FROM UI TO CONTAINER
  // ============================================================================

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

  // ============================================================================
  // DATA PROCESSING - BACKEND-FIRST WITH CHART FORMATTING
  // ============================================================================

  const processedData = useMemo(() => {
    if (!analyticsData) {
      return {
        chartData: [],
        formattedChartData: {
          labels: [],
          datasets: [],
        },
        statistics: {
          currentTotal: 0,
          currentDiscretionary: 0,
          previousTotal: 0,
          previousDiscretionary: 0,
          percentageChange: 0,
          discretionaryPercentageChange: 0,
          averageSpending: 0,
          averageDiscretionary: 0,
          highestSpendingPeriod: null,
          highestDiscretionaryPeriod: null,
        },
        spendingVelocity: null,
        transactions: [],
        billsAnalytics: null,
      };
    }

    // ✅ UPDATED: Use backend monthlyTrends with discretionary data
    const chartData =
      analyticsData.monthlyTrends?.map((trend, index) => {
        const date = new Date(trend.month);
        let label;

        if (selectedPeriod === 'monthly') {
          label = date.toLocaleDateString('en-US', {month: 'short'});
        } else if (selectedPeriod === 'weekly') {
          label = `W${index + 1}`;
        } else {
          // Daily period - use short day labels
          label = date.toLocaleDateString('en-US', {weekday: 'short'});
        }

        return {
          label,
          amount: trend.expenses || 0,
          discretionaryAmount: trend.discretionaryExpenses || 0, // ✅ FIXED: Use backend data
          previousPeriod: 0, // Backend should provide this
          previousDiscretionary: 0,
          date,
        };
      }) || [];

    // MINIMAL fallback - backend should fix monthlyTrends
    const finalChartData = chartData.length > 0 ? chartData : [];

    // ============================================================================
    // CHART DATA FORMATTING - MOVED FROM UI COMPONENT
    // ============================================================================

    // Format data specifically for react-native-chart-kit
    const formattedChartData =
      finalChartData.length > 0
        ? {
            labels: finalChartData.map(item => item.label),
            datasets: [
              {
                data: finalChartData.map(item => item.amount),
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                strokeWidth: 3,
              },
              ...(comparisonMode
                ? [
                    {
                      data: finalChartData.map(item => item.previousPeriod),
                      color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                      strokeWidth: 2,
                      withDots: false,
                    },
                  ]
                : []),
            ],
          }
        : {
            labels: ['No Data'],
            datasets: [
              {
                data: [0],
                color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                strokeWidth: 1,
              },
            ],
          };

    // ✅ UPDATED: Calculate discretionary statistics from backend data
    const totalDiscretionaryExpenses =
      analyticsData.monthlyTrends?.reduce(
        (sum, trend) => sum + (trend.discretionaryExpenses || 0),
        0,
      ) || 0;

    const averageDiscretionaryPerPeriod =
      analyticsData.monthlyTrends?.length > 0
        ? totalDiscretionaryExpenses / analyticsData.monthlyTrends.length
        : 0;

    // Use backend statistics with calculated discretionary data
    const statistics = {
      // Spending statistics
      currentTotal: analyticsData.totalExpenses || 0,
      currentDiscretionary: totalDiscretionaryExpenses, // ✅ FIXED: Use backend calculation
      previousTotal: 0, // Backend enhancement needed
      previousDiscretionary: 0,
      percentageChange: 0, // Backend enhancement needed
      discretionaryPercentageChange: 0,
      averageSpending: analyticsData.averageTransaction || 0,
      averageDiscretionary: averageDiscretionaryPerPeriod, // ✅ FIXED: Use backend calculation
      highestSpendingPeriod:
        finalChartData.length > 0
          ? finalChartData.reduce((max, current) =>
              current.amount > max.amount ? current : max,
            )
          : null,
      highestDiscretionaryPeriod:
        finalChartData.length > 0
          ? finalChartData.reduce((max, current) =>
              current.discretionaryAmount > max.discretionaryAmount
                ? current
                : max,
            )
          : null,

      // Income statistics (placeholder values for now)
      totalIncome: analyticsData.totalIncome || '$0.00',
      avgIncome: analyticsData.avgIncome || '$0.00',
      incomeChange: analyticsData.incomeChange || 0,
      totalExpenses: `$${(analyticsData.totalExpenses || 0).toFixed(2)}`,
      incomePercentage: analyticsData.incomePercentage || 100,
      expensePercentage:
        analyticsData.expensePercentage ||
        (analyticsData.totalExpenses > 0
          ? Math.min(
              (analyticsData.totalExpenses /
                (analyticsData.totalIncomeAmount ||
                  analyticsData.totalExpenses)) *
                100,
              100,
            )
          : 0),
      savingsPercentage:
        analyticsData.savingsPercentage ||
        (analyticsData.totalIncomeAmount
          ? Math.max(
              0,
              Math.round(
                ((analyticsData.totalIncomeAmount -
                  (analyticsData.totalExpenses || 0)) /
                  analyticsData.totalIncomeAmount) *
                  100,
              ),
            )
          : 0),
    };

    // ✅ NEW: Pass through spending velocity from backend
    const spendingVelocity = analyticsData.spendingVelocity || null;

    return {
      chartData: finalChartData, // Raw data for insights
      formattedChartData, // Ready-to-use chart data
      statistics,
      spendingVelocity, // ✅ NEW: Spending velocity data from backend
      transactions: [], // We don't need individual transactions for analytics
      billsAnalytics, // ✅ NEW: Backend bills analytics data - no processing needed
    };
  }, [analyticsData, selectedPeriod, comparisonMode, billsAnalytics]);

  // ============================================================================
  // SCREEN DIMENSIONS - MOVED FROM UI
  // ============================================================================

  const screenWidth = useMemo(() => Dimensions.get('window').width, []);

  // Simple helper for discretionary breakdown component
  const isRecurringTransaction = useCallback(transaction => {
    return (
      transaction.recurrence &&
      transaction.recurrence !== 'none' &&
      ['weekly', 'fortnightly', 'monthly', 'sixmonths', 'yearly'].includes(
        transaction.recurrence,
      )
    );
  }, []);

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

  const handleRefresh = useCallback(
    async (force = false) => {
      if (refreshing && !force) {
        return;
      }

      setRefreshing(true);
      await loadAnalyticsData(true);
      // Force refresh bills and income analytics caches
      await loadBillsAnalytics(true);
      await loadIncomeAnalytics(true);
      setRefreshing(false);
    },
    [loadAnalyticsData, loadBillsAnalytics, loadIncomeAnalytics, refreshing],
  );

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active' && isMountedRef.current) {
        const now = new Date();
        const currentDateString = now.toDateString();

        if (lastActiveDate.current !== currentDateString) {
          lastActiveDate.current = currentDateString;
          // Date changed - invalidate both caches and force refresh
          billsAnalyticsCache.invalidate();
          incomeAnalyticsCache.invalidate();
          handleRefresh(true);
        } else {
          // Same date - check if caches are stale and refresh in background
          billsAnalyticsCache.isFresh().then(isFresh => {
            if (!isFresh && isMountedRef.current) {
              console.log('📋 App became active, refreshing stale bills cache');
              loadBillsAnalytics(false); // Background refresh, don't force
            }
          });

          incomeAnalyticsCache.isFresh().then(isFresh => {
            if (!isFresh && isMountedRef.current) {
              console.log(
                '💰 App became active, refreshing stale income cache',
              );
              loadIncomeAnalytics(false); // Background refresh, don't force
            }
          });
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [handleRefresh, loadBillsAnalytics, loadIncomeAnalytics]);

  useFocusEffect(
    useCallback(() => {
      if (
        isMountedRef.current &&
        !isLoadingRef.current &&
        (!analyticsData || !billsAnalytics || !incomeAnalytics)
      ) {
        loadAnalyticsData();
      }
    }, [loadAnalyticsData, analyticsData, billsAnalytics, incomeAnalytics]),
  );

  // ============================================================================
  // PROPS FOR PURE UI COMPONENT - ALL PROCESSING DONE
  // ============================================================================

  const screenProps = {
    // Backend data with minimal transformation
    transactions: processedData.transactions,
    data: processedData.chartData, // Raw data for insights and breakdown modal

    // PRE-FORMATTED CHART DATA - READY TO USE
    chartData: processedData.formattedChartData, // ✅ Ready for react-native-chart-kit
    chartConfig, // ✅ Complete chart configuration
    screenWidth, // ✅ Pre-calculated screen width

    // Loading state
    isLoading,

    // UI state
    selectedPeriod,
    comparisonMode,
    refreshing,
    isPro,
    showBreakdown,

    // ✅ UPDATED: Backend-calculated statistics with real discretionary data
    statistics: processedData.statistics,

    // ✅ NEW: Spending velocity data from backend
    spendingVelocity: processedData.spendingVelocity,

    // ✅ NEW: Backend bills analytics data - direct pass-through
    billsAnalytics: billsAnalytics,

    // ✅ NEW: Backend income analytics data - direct pass-through
    incomeAnalytics: incomeAnalytics,

    // Module settings
    pokerTrackerEnabled: moduleSettings?.pokerTracker || false,

    // Event handlers
    onPeriodChange: handlePeriodChange,
    onComparisonToggle: handleComparisonToggle,
    onDiscretionaryClick: handleDiscretionaryClick,
    onCloseBreakdown: handleCloseBreakdown,
    onRefresh: handleRefresh,

    // Helper for breakdown component
    isRecurringTransaction,
  };

  return <AnalyticsScreen {...screenProps} />;
};

export default AnalyticsContainer;
