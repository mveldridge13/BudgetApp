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

  // Refs for component lifecycle management
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

  /**
   * Load user profile data for income information
   */
  const loadUserProfile = useCallback(async () => {
    try {
      console.log('👤 Loading user profile for spending velocity...');
      const profile = await TrendAPIService.getUserProfile();

      if (isMountedRef.current) {
        setUserProfile(profile);
        console.log('👤 User profile loaded:', {
          hasIncome: !!profile?.income,
          incomeFrequency: profile?.incomeFrequency,
          hasFixedExpenses: !!profile?.fixedExpenses,
        });
      }
    } catch (profileError) {
      console.error('Error loading user profile:', profileError);
      // Don't set error state for profile loading failures
    }
  }, []);

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
        console.log('🔥 Loading spending velocity analytics...');

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

        console.log('📊 Fetching analytics with filters:', filters);
        const analyticsResponse = await TrendAPIService.getTransactionAnalytics(
          filters,
        );

        console.log('📊 Analytics response received:', {
          hasSpendingVelocity: !!analyticsResponse?.spendingVelocity,
          hasDailyBurnRate: !!analyticsResponse?.dailyBurnRate,
          totalExpenses: analyticsResponse?.totalExpenses,
        });

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
   * Handle refresh action
   */
  const handleRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      console.log('🔄 Refreshing spending velocity data...');
      await Promise.all([
        loadUserProfile(),
        loadAnalyticsData(true), // Force reload
      ]);
    } catch (refreshingError) {
      console.error('Error refreshing data:', refreshingError);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadUserProfile, loadAnalyticsData]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    console.log('🚪 Closing spending velocity modal');
    onClose();
  }, [onClose]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback(
    nextAppState => {
      if (nextAppState === 'active' && visible) {
        console.log('📱 App became active, refreshing velocity data...');
        loadAnalyticsData(true);
      }
    },
    [visible, loadAnalyticsData],
  );

  // ==============================================
  // LIFECYCLE METHODS
  // ==============================================

  // Load data when modal becomes visible
  useEffect(() => {
    if (visible && isMountedRef.current) {
      console.log('👁️ Spending velocity modal became visible');
      loadUserProfile();
      loadAnalyticsData();
    }
  }, [visible, loadUserProfile, loadAnalyticsData]);

  // Handle component unmounting
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isLoadingRef.current = false;
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

  // Focus effect for navigation-based refresh
  useFocusEffect(
    useCallback(() => {
      if (visible) {
        console.log('🎯 Focus effect triggered for velocity modal');
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

            const response = await TrendAPIService.getTransactionAnalytics(
              filters,
            );
            if (isMountedRef.current) {
              setAnalyticsData(response);
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
   * Process analytics data for display
   */
  const processedData = React.useMemo(() => {
    if (!analyticsData) {
      return {
        dailyBurnRate: null,
        spendingVelocity: null,
        hasData: false,
      };
    }

    console.log('📊 Processing analytics data for UI:', {
      hasDailyBurnRate: !!analyticsData.dailyBurnRate,
      hasSpendingVelocity: !!analyticsData.spendingVelocity,
    });

    return {
      dailyBurnRate: analyticsData.dailyBurnRate || null,
      spendingVelocity: analyticsData.spendingVelocity || null,
      hasData: !!(
        analyticsData.dailyBurnRate || analyticsData.spendingVelocity
      ),
    };
  }, [analyticsData]);

  // ==============================================
  // DEBUGGING & ANALYTICS
  // ==============================================

  /**
   * Log component state for debugging
   */
  React.useEffect(() => {
    if (__DEV__) {
      console.log('🔥 SpendingVelocityContainer State:', {
        visible,
        isLoading,
        refreshing,
        hasAnalyticsData: !!analyticsData,
        hasUserProfile: !!userProfile,
      });
    }
  }, [visible, isLoading, refreshing, analyticsData, userProfile]);

  // ==============================================
  // RENDER UI COMPONENT - PURE UI PATTERN
  // ==============================================

  const screenProps = {
    // Core data from backend
    dailyBurnRate: processedData?.dailyBurnRate || null,
    spendingVelocity: processedData?.spendingVelocity || null,
    userProfile: userProfile || null,

    // UI state
    visible,
    refreshing,
    isLoading,
    hasData: processedData?.hasData || false,

    // Event handlers
    onClose: handleClose,
    onRefresh: handleRefresh,
  };

  console.log('🚀 Rendering SpendingVelocityBreakdown with props:', {
    visible,
    hasDailyBurnRate: !!screenProps.dailyBurnRate,
    hasUserProfile: !!screenProps.userProfile,
    userIncome: userProfile?.income,
    userFrequency: userProfile?.incomeFrequency,
  });

  return <SpendingVelocityBreakdown {...screenProps} />;
};

export default SpendingVelocityContainer;
