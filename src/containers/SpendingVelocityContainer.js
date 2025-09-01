import React, {useState, useEffect, useCallback, useRef} from 'react';
import {AppState, Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrendAPIService from '../services/TrendAPIService';
import SpendingVelocityBreakdown from '../components/SpendingVelocityBreakdown';

const SpendingVelocityContainer = ({
  visible,
  onClose,
  selectedPeriod = 'monthly', // Default to monthly for velocity analysis
}) => {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // ✅ NEW: Day/time patterns state
  const [dayTimePatternsData, setDayTimePatternsData] = useState(null);
  const [isDayTimePatternsLoading, setIsDayTimePatternsLoading] =
    useState(false);

  // Refs for component lifecycle management
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const isDayTimePatternsLoadingRef = useRef(false); // ✅ NEW: Ref for patterns loading state

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

  /**
   * Load user profile data for income information
   */
  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await TrendAPIService.getUserProfile();

      if (isMountedRef.current) {
        setUserProfile(profile);
      }
    } catch (profileError) {
      console.error('Error loading user profile:', profileError);
      // Don't set error state for profile loading failures
    }
  }, []);

  /**
   * ✅ NEW: Load day/time patterns data
   */
  const loadDayTimePatterns = useCallback(
    async (force = false) => {
      // Use ref instead of state to avoid dependency issues
      if (isDayTimePatternsLoadingRef.current && !force) {
        console.log('⏸️ Skipping day/time patterns load - already loading');
        return;
      }

      console.log('🕐 Loading day/time patterns with filters - starting');

      isDayTimePatternsLoadingRef.current = true;
      if (isMountedRef.current) {
        setIsDayTimePatternsLoading(true);
      }

      try {
        // Calculate date range based on selected period
        const now = new Date();
        let startDate, endDate;

        switch (selectedPeriod) {
          case 'daily':
            // Last 7 days for daily patterns
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 7,
            );
            endDate = new Date(now);
            break;
          case 'weekly':
            // Last 4 weeks for weekly patterns
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 28,
            );
            endDate = new Date(now);
            break;
          case 'monthly':
          default:
            // Last 3 months for comprehensive patterns
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            endDate = new Date(now);
            break;
        }

        const filters = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };

        console.log('🕐 Loading day/time patterns with filters:', filters);

        const patternsResponse = await TrendAPIService.getDayTimePatterns(
          filters,
        );

        console.log('✅ Day/time patterns loaded:', patternsResponse);

        // ✅ DEBUG: Log detailed breakdown to understand the $1065
        if (patternsResponse?.dayOfWeekBreakdown) {
          console.log('📊 Day of Week Breakdown Details:');
          patternsResponse.dayOfWeekBreakdown.forEach((day, index) => {
            console.log(
              `${day.day}: ${day.amount.toFixed(2)} (${
                day.transactionCount
              } transactions)`,
            );
          });
        }

        if (patternsResponse?.transactions) {
          console.log('💰 All Transactions in Period:');
          patternsResponse.transactions.forEach((t, index) => {
            const dayOfWeek = new Date(t.date).toLocaleDateString('en-US', {
              weekday: 'long',
            });
            console.log(
              `${index + 1}. ${dayOfWeek} - ${t.amount} - ${t.description} - ${
                t.categoryName || 'No category'
              }`,
            );
          });
        }

        if (isMountedRef.current) {
          setDayTimePatternsData(patternsResponse);
        }
      } catch (patternsError) {
        console.error('Error loading day/time patterns:', patternsError);
        // Don't show alert for patterns loading failures - it's supplementary data
        if (isMountedRef.current) {
          setDayTimePatternsData(null);
        }
      } finally {
        isDayTimePatternsLoadingRef.current = false;
        if (isMountedRef.current) {
          setIsDayTimePatternsLoading(false);
        }
      }
    },
    [selectedPeriod], // Clean dependency array - no state dependencies
  );

  /**
   * Load analytics data with daily burn rate calculations
   */
  const loadAnalyticsData = useCallback(
    async (force = false) => {
      if (isLoadingRef.current && !force) {
        return;
      }

      isLoadingRef.current = true;
      if (isMountedRef.current) {
        setIsLoading(true);
      }

      try {
        // Calculate date range based on selected period for comprehensive data
        const now = new Date();
        let startDate, endDate;

        switch (selectedPeriod) {
          case 'daily':
            // Last 30 days for daily burn rate context
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 30,
            );
            endDate = new Date(now);
            break;
          case 'weekly':
            // Last 12 weeks for weekly context
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 84,
            );
            endDate = new Date(now);
            break;
          case 'monthly':
          default:
            // Last 6 months for comprehensive analysis
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            endDate = new Date(now);
            break;
        }

        const filters = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };

        const analyticsResponse = await TrendAPIService.getTransactionAnalytics(
          filters,
        );

        if (isMountedRef.current) {
          setAnalyticsData(analyticsResponse);
        }
      } catch (loadError) {
        console.error('Error loading analytics data:', loadError);
        if (isMountedRef.current) {
          Alert.alert(
            'Error',
            'Failed to load spending analytics. Please check your connection and try again.',
            [{text: 'OK'}],
          );
        }
      } finally {
        isLoadingRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [selectedPeriod],
  );

  /**
   * ✅ ENHANCED: Handle refresh action with day/time patterns
   */
  const handleRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all([
        loadUserProfile(),
        loadAnalyticsData(true), // Force reload
        loadDayTimePatterns(true), // ✅ NEW: Also reload day/time patterns
      ]);
    } catch (refreshingError) {
      console.error('Error refreshing data:', refreshingError);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadUserProfile, loadAnalyticsData, loadDayTimePatterns]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * ✅ ENHANCED: Handle app state changes with day/time patterns
   */
  const handleAppStateChange = useCallback(
    nextAppState => {
      if (nextAppState === 'active' && visible) {
        loadAnalyticsData(true);
        loadDayTimePatterns(true); // ✅ NEW: Also reload patterns on app focus
      }
    },
    [visible, loadAnalyticsData, loadDayTimePatterns],
  );

  // ==============================================
  // LIFECYCLE METHODS
  // ==============================================

  // ✅ ENHANCED: Load data when modal becomes visible
  useEffect(() => {
    if (visible && isMountedRef.current) {
      loadUserProfile();
      loadAnalyticsData();
      loadDayTimePatterns(); // ✅ NEW: Load day/time patterns
    }
  }, [visible, loadUserProfile, loadAnalyticsData, loadDayTimePatterns]);

  // Handle component unmounting
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isLoadingRef.current = false;
      isDayTimePatternsLoadingRef.current = false; // ✅ NEW: Reset patterns loading ref
    };
  }, []);

  // Listen to app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // ✅ ENHANCED: Focus effect for navigation-based refresh
  useFocusEffect(
    useCallback(() => {
      if (visible) {
        // Force reload analytics when focused
        const reloadData = async () => {
          try {
            const now = new Date();
            const startDate = new Date(
              now.getFullYear(),
              now.getMonth() - 6,
              1,
            );
            const endDate = new Date(now);

            const filters = {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            };

            // ✅ NEW: Load both analytics and day/time patterns
            const [analyticsResponse, patternsResponse] =
              await Promise.allSettled([
                TrendAPIService.getTransactionAnalytics(filters),
                TrendAPIService.getDayTimePatterns(filters),
              ]);

            if (isMountedRef.current) {
              if (analyticsResponse.status === 'fulfilled') {
                setAnalyticsData(analyticsResponse.value);
              }
              if (patternsResponse.status === 'fulfilled') {
                setDayTimePatternsData(patternsResponse.value);
              }
            }
          } catch (focusReloadError) {
            console.error('Error reloading on focus:', focusReloadError);
          }
        };

        reloadData();
      }
    }, [visible]),
  );

  // ==============================================
  // DATA PROCESSING FOR UI
  // ==============================================

  /**
   * ✅ ENHANCED: Process analytics data for display with day/time patterns
   */
  const processedData = React.useMemo(() => {
    if (!analyticsData) {
      return {
        dailyBurnRate: null,
        spendingVelocity: null,
        dayTimePatterns: null,
        hasData: false,
        hasPatternsData: false,
      };
    }

    return {
      dailyBurnRate: analyticsData.dailyBurnRate || null,
      spendingVelocity: analyticsData.spendingVelocity || null,
      dayTimePatterns: dayTimePatternsData || null, // ✅ PASS RAW DATA - no processing needed
      hasData: !!(
        analyticsData.dailyBurnRate || analyticsData.spendingVelocity
      ),
      hasPatternsData: !!dayTimePatternsData,
    };
  }, [analyticsData, dayTimePatternsData]);

  // ==============================================
  // DEBUGGING & ANALYTICS
  // ==============================================

  /**
   * ✅ ENHANCED: Log component state for debugging
   */
  React.useEffect(() => {
    console.log('🔄 SpendingVelocityContainer State:', {
      visible,
      isLoading,
      isDayTimePatternsLoading,
      refreshing,
      hasAnalyticsData: !!analyticsData,
      hasPatternsData: !!dayTimePatternsData,
      hasUserProfile: !!userProfile,
    });
  }, [
    visible,
    isLoading,
    isDayTimePatternsLoading,
    refreshing,
    analyticsData,
    dayTimePatternsData,
    userProfile,
  ]);

  // ==============================================
  // RENDER UI COMPONENT - PURE UI PATTERN
  // ==============================================

  const screenProps = {
    // Core data from backend
    dailyBurnRate: processedData?.dailyBurnRate || null,
    spendingVelocity: processedData?.spendingVelocity || null,
    dayTimePatterns: processedData?.dayTimePatterns || null, // ✅ NEW: Pass patterns data
    userProfile: userProfile || null,

    // UI state
    visible,
    refreshing,
    isLoading,
    isDayTimePatternsLoading, // ✅ NEW: Pass patterns loading state
    hasData: processedData?.hasData || false,
    hasPatternsData: processedData?.hasPatternsData || false, // ✅ NEW: Patterns data flag

    // Event handlers
    onClose: handleClose,
    onRefresh: handleRefresh,
  };

  console.log('📊 SpendingVelocityContainer rendering with props:', {
    hasDailyBurnRate: !!screenProps.dailyBurnRate,
    hasSpendingVelocity: !!screenProps.spendingVelocity,
    hasDayTimePatterns: !!screenProps.dayTimePatterns,
    isLoading: screenProps.isLoading,
    isDayTimePatternsLoading: screenProps.isDayTimePatternsLoading,
  });

  return <SpendingVelocityBreakdown {...screenProps} />;
};

export default SpendingVelocityContainer;
