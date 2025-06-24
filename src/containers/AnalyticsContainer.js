import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {AppState, Alert, Dimensions} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendAPIService from '../services/TrendAPIService';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import {colors} from '../styles';

const AnalyticsContainer = () => {
  // UI state only
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Backend data - this is all we need
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for optimization
  const isLoadingRef = useRef(false);
  const lastActiveDate = useRef(new Date().toDateString());
  const isMountedRef = useRef(true);

  // Check Pro status
  useEffect(() => {
    const checkProStatus = async () => {
      try {
        const proStatus = await AsyncStorage.getItem('isPro');
        setIsPro(proStatus === 'true');
      } catch (err) {
        console.error('Error checking Pro status:', err);
      }
    };
    checkProStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkProStatus = async () => {
        try {
          const proStatus = await AsyncStorage.getItem('isPro');
          setIsPro(proStatus === 'true');
        } catch (err) {
          console.error('Error checking Pro status:', err);
        }
      };
      checkProStatus();
    }, []),
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
          console.log('Backend analytics:', analyticsResponse);
          console.log('Monthly trends:', analyticsResponse?.monthlyTrends);
          console.log('Total expenses:', analyticsResponse?.totalExpenses);
          console.log(
            'Spending velocity:',
            analyticsResponse?.spendingVelocity,
          );
          setAnalyticsData(analyticsResponse);
        }
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
    [getDateRange],
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
      };
    }

    // Use backend monthlyTrends directly for chart - BACKEND SHOULD PROVIDE THIS
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
          discretionaryAmount: trend.expenses * 0.7, // Backend should provide this
          previousPeriod: 0, // Backend should provide this
          previousDiscretionary: 0,
          date,
        };
      }) || [];

    console.log('Processed chart data:', chartData);
    console.log('Chart data length:', chartData.length);

    // MINIMAL fallback - backend should fix monthlyTrends
    const finalChartData = chartData.length > 0 ? chartData : [];

    console.log('Final chart data:', finalChartData);

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

    // Use backend statistics directly
    const statistics = {
      currentTotal: analyticsData.totalExpenses || 0,
      currentDiscretionary: analyticsData.totalExpenses * 0.7 || 0, // Backend could calculate this
      previousTotal: 0, // Backend enhancement needed
      previousDiscretionary: 0,
      percentageChange: 0, // Backend enhancement needed
      discretionaryPercentageChange: 0,
      averageSpending: analyticsData.averageTransaction || 0,
      averageDiscretionary: analyticsData.averageTransaction * 0.7 || 0,
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
    };

    // ✅ NEW: Pass through spending velocity from backend
    const spendingVelocity = analyticsData.spendingVelocity || null;

    return {
      chartData: finalChartData, // Raw data for insights
      formattedChartData, // Ready-to-use chart data
      statistics,
      spendingVelocity, // ✅ NEW: Spending velocity data from backend
      transactions: [], // We don't need individual transactions for analytics
    };
  }, [analyticsData, selectedPeriod, comparisonMode]);

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
      setRefreshing(false);
    },
    [loadAnalyticsData, refreshing],
  );

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active' && isMountedRef.current) {
        const now = new Date();
        const currentDateString = now.toDateString();

        if (lastActiveDate.current !== currentDateString) {
          lastActiveDate.current = currentDateString;
          handleRefresh(true);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [handleRefresh]);

  useFocusEffect(
    useCallback(() => {
      if (isMountedRef.current && !isLoadingRef.current && !analyticsData) {
        loadAnalyticsData();
      }
    }, [loadAnalyticsData, analyticsData]),
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

    // Backend-calculated statistics
    statistics: processedData.statistics,

    // ✅ NEW: Spending velocity data from backend
    spendingVelocity: processedData.spendingVelocity,

    // Event handlers
    onPeriodChange: handlePeriodChange,
    onComparisonToggle: handleComparisonToggle,
    onDiscretionaryClick: handleDiscretionaryClick,
    onCloseBreakdown: handleCloseBreakdown,
    onRefresh: handleRefresh,

    // Helper for breakdown component
    isRecurringTransaction,
  };

  // Debug logging
  console.log(
    '📦 Container passing spendingVelocity:',
    processedData.spendingVelocity,
  );
  console.log('📦 Container screenProps keys:', Object.keys(screenProps));

  return <AnalyticsScreen {...screenProps} />;
};

export default AnalyticsContainer;
