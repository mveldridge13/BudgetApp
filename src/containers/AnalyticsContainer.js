import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {AppState, Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendAPIService from '../services/TrendAPIService';
import AnalyticsScreen from '../screens/AnalyticsScreen';

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

  // Transform backend data for UI - minimal processing
  const processedData = useMemo(() => {
    if (!analyticsData) {
      return {
        chartData: [],
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
        transactions: [],
      };
    }

    // Use backend monthlyTrends directly for chart
    const chartData =
      analyticsData.monthlyTrends?.map((trend, index) => {
        const date = new Date(trend.month);
        return {
          label:
            selectedPeriod === 'monthly'
              ? date.toLocaleDateString('en-US', {month: 'short'})
              : `Period ${index + 1}`,
          amount: trend.expenses || 0,
          discretionaryAmount: trend.expenses * 0.7, // Backend could provide this
          previousPeriod: 0, // Backend enhancement needed
          previousDiscretionary: 0,
          date,
        };
      }) || [];

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
        chartData.length > 0
          ? chartData.reduce((max, current) =>
              current.amount > max.amount ? current : max,
            )
          : null,
      highestDiscretionaryPeriod:
        chartData.length > 0
          ? chartData.reduce((max, current) =>
              current.discretionaryAmount > max.discretionaryAmount
                ? current
                : max,
            )
          : null,
    };

    return {
      chartData,
      statistics,
      transactions: [], // We don't need individual transactions for analytics
    };
  }, [analyticsData, selectedPeriod]);

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

  // Pass backend data directly to UI
  const screenProps = {
    // Backend data with minimal transformation
    transactions: processedData.transactions,
    data: processedData.chartData,
    isLoading,

    // UI state
    selectedPeriod,
    comparisonMode,
    refreshing,
    isPro,
    showBreakdown,

    // Backend-calculated statistics
    statistics: processedData.statistics,

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
