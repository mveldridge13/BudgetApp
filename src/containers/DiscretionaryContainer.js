import React, {useState, useEffect, useCallback, useRef} from 'react';
import {AppState, Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrendAPIService from '../services/TrendAPIService';
import DiscretionaryBreakdown from '../components/DiscretionaryBreakdown';

const DiscretionaryContainer = ({
  visible,
  onClose,
  selectedPeriod = 'daily', // Default to daily for discretionary breakdown
}) => {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [discretionaryData, setDiscretionaryData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showCalendar, setShowCalendar] = useState(false);

  // Refs for component lifecycle management
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

  /**
   * Load discretionary breakdown data for selected date
   */
  const loadDiscretionaryData = useCallback(
    async (force = false) => {
      if (isLoadingRef.current && !force) {
        return;
      }

      isLoadingRef.current = true;
      if (isMountedRef.current) {
        setIsLoading(true);
      }

      try {
        console.log(
          '🔍 Loading discretionary breakdown for:',
          selectedDate.toISOString().split('T')[0],
        );

        // Calculate date range based on selected period
        const now = new Date(selectedDate);
        let startDate, endDate;

        switch (selectedPeriod) {
          case 'daily':
            // Get the specific day
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            );
            endDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
            );
            break;
          case 'weekly':
            // Get the week containing the selected date
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            break;
          case 'monthly':
            // Get the month containing the selected date
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
          default:
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            );
            endDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
            );
        }

        const filters = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };

        console.log(
          '📊 Fetching discretionary breakdown with filters:',
          filters,
        );

        // ✅ FIXED: Use the new TrendAPIService method
        const discretionaryResponse =
          await TrendAPIService.getDiscretionaryBreakdown(filters);

        console.log('📊 Discretionary breakdown response received:', {
          selectedDate: discretionaryResponse?.selectedDate,
          selectedPeriod: discretionaryResponse?.selectedPeriod,
          totalAmount: discretionaryResponse?.totalDiscretionaryAmount,
          transactionCount: discretionaryResponse?.transactions?.length,
          categoryCount: discretionaryResponse?.categoryBreakdown?.length,
        });

        if (isMountedRef.current) {
          setDiscretionaryData(discretionaryResponse);
        }
      } catch (loadError) {
        console.error('Error loading discretionary breakdown:', loadError);
        if (isMountedRef.current) {
          Alert.alert(
            'Error',
            'Failed to load discretionary breakdown. Please check your connection and try again.',
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
    [selectedDate, selectedPeriod],
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
      console.log('🔄 Refreshing discretionary breakdown data...');
      await loadDiscretionaryData(true); // Force reload
    } catch (refreshingError) {
      console.error('Error refreshing data:', refreshingError);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadDiscretionaryData]);

  /**
   * Handle date selection from calendar
   */
  const handleDateChange = useCallback(newDate => {
    console.log('📅 Date changed to:', newDate.toISOString().split('T')[0]);
    setSelectedDate(newDate);
  }, []);

  /**
   * Handle calendar modal open
   */
  const handleCalendarOpen = useCallback(() => {
    console.log('📅 Opening calendar modal');
    setShowCalendar(true);
  }, []);

  /**
   * Handle category expansion/collapse
   */
  const handleCategoryPress = useCallback(categoryName => {
    console.log('📂 Category pressed:', categoryName);
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    console.log('🚪 Closing discretionary breakdown modal');
    // Reset state when closing
    setExpandedCategories(new Set());
    setShowCalendar(false);
    onClose();
  }, [onClose]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback(
    nextAppState => {
      if (nextAppState === 'active' && visible) {
        console.log('📱 App became active, refreshing discretionary data...');
        loadDiscretionaryData(true);
      }
    },
    [visible, loadDiscretionaryData],
  );

  // ==============================================
  // LIFECYCLE METHODS
  // ==============================================

  // Load data when modal becomes visible
  useEffect(() => {
    if (visible && isMountedRef.current) {
      console.log('👁️ Discretionary breakdown modal became visible');
      loadDiscretionaryData();
    }
  }, [visible, loadDiscretionaryData]);

  // Reload data when selected date changes
  useEffect(() => {
    if (visible && isMountedRef.current) {
      console.log(
        '📅 Reloading data for new date:',
        selectedDate.toISOString().split('T')[0],
      );
      loadDiscretionaryData(true);
    }
  }, [selectedDate, visible, loadDiscretionaryData]);

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
        console.log('🎯 Focus effect triggered for discretionary modal');
        // Force reload data when focused
        const reloadData = async () => {
          try {
            await loadDiscretionaryData(true);
          } catch (focusReloadError) {
            console.error('Error reloading on focus:', focusReloadError);
          }
        };

        reloadData();
      }
    }, [visible, loadDiscretionaryData]),
  );

  // ==============================================
  // DATA PROCESSING FOR UI
  // ==============================================

  /**
   * Helper function to format period labels - SIMPLIFIED to use local date
   */
  const formatPeriodLabel = useCallback(
    (dateStr, period) => {
      // ✅ MUCH SIMPLER: Just use the local selectedDate state instead of parsing backend date
      const date = selectedDate; // This is already a local Date object

      console.log('🗓️ Formatting date:', {
        backend: dateStr,
        selectedDate: selectedDate.toISOString(),
        formatted: date.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
      });

      switch (period) {
        case 'daily':
          return date.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });
        case 'weekly':
          return `Week of ${date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}`;
        case 'monthly':
          return date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          });
        default:
          return date.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });
      }
    },
    [selectedDate],
  );

  /**
   * Process discretionary data for display
   */
  const processedBreakdownData = React.useMemo(() => {
    if (!discretionaryData) {
      return {
        period: null,
        categories: [],
        insights: [],
        totalAmount: 0,
        totalTransactions: 0,
      };
    }

    console.log('📊 Processing discretionary data for UI:', {
      selectedDate: discretionaryData.selectedDate,
      selectedPeriod: discretionaryData.selectedPeriod,
      totalAmount: discretionaryData.totalDiscretionaryAmount,
      categoryCount: discretionaryData.categoryBreakdown?.length,
      transactionCount: discretionaryData.transactions?.length,
    });

    // Create period object compatible with UI
    const period = {
      label: formatPeriodLabel(
        discretionaryData.selectedDate,
        discretionaryData.selectedPeriod,
      ),
      discretionaryAmount: discretionaryData.totalDiscretionaryAmount || 0,
      date: new Date(discretionaryData.selectedDate),
      isCustomDate: true, // Always true since we're using calendar selection
    };

    // Process categories for UI consumption
    const processedCategories = (discretionaryData.categoryBreakdown || []).map(
      category => {
        // ✅ FIXED: Convert Map subcategories to plain array
        let subcategories = [];

        if (category.subcategories) {
          if (category.subcategories instanceof Map) {
            // Convert Map to array
            subcategories = Array.from(category.subcategories.values()).map(
              sub => ({
                subcategoryId: sub.subcategoryId,
                subcategoryName: sub.subcategoryName,
                amount: sub.amount,
                transactionCount: sub.transactionCount,
                percentage: sub.percentage,
                transactions: sub.transactions || [],
              }),
            );
          } else if (Array.isArray(category.subcategories)) {
            // Already an array
            subcategories = category.subcategories;
          } else {
            // Try to convert object to array
            subcategories = Object.values(category.subcategories || {});
          }
        }

        console.log('🔄 Processing category:', {
          name: category.categoryName,
          backendCategoryColor: category.categoryColor,
          backendColor: category.color,
          originalSubcategories: category.subcategories,
          processedSubcategories: subcategories,
          isMap: category.subcategories instanceof Map,
        });

        return {
          name: category.categoryName,
          amount: category.amount,
          color: category.categoryColor || category.color || '#CCCCCC', // ✅ FIXED: Use categoryColor first
          originalColor:
            category.originalColor ||
            category.categoryColor ||
            category.color ||
            '#CCCCCC',
          transactions: category.transactions || [],
          subcategories: subcategories,
          hasSubcategories: subcategories.length > 0, // ✅ FIXED: Base on actual subcategories
        };
      },
    );

    // Calculate total transactions count
    const totalTransactions = processedCategories.reduce(
      (sum, category) => sum + (category.transactions?.length || 0),
      0,
    );

    return {
      period: period,
      categories: processedCategories,
      insights: discretionaryData.insights || [],
      totalAmount: discretionaryData.totalDiscretionaryAmount || 0,
      totalTransactions: totalTransactions,
    };
  }, [discretionaryData, formatPeriodLabel]);

  // ==============================================
  // DEBUGGING & ANALYTICS
  // ==============================================

  /**
   * Log component state for debugging
   */
  React.useEffect(() => {
    if (__DEV__) {
      console.log('🔍 DiscretionaryContainer State:', {
        visible,
        isLoading,
        refreshing,
        hasDiscretionaryData: !!discretionaryData,
        selectedDate: selectedDate.toISOString().split('T')[0],
        selectedPeriod,
        expandedCategoriesCount: expandedCategories.size,
        showCalendar,
      });
    }
  }, [
    visible,
    isLoading,
    refreshing,
    discretionaryData,
    selectedDate,
    selectedPeriod,
    expandedCategories,
    showCalendar,
  ]);

  // ==============================================
  // RENDER UI COMPONENT - PURE UI PATTERN
  // ==============================================

  // ✅ FIXED: Props structure matches the pure UI component
  const uiProps = {
    // Core UI state
    visible,
    isLoading,
    refreshing,
    selectedDate,
    selectedPeriod,
    expandedCategories,
    showCalendar,

    // Processed data for UI
    breakdownData: processedBreakdownData,

    // Event handlers
    onClose: handleClose,
    onRefresh: handleRefresh,
    onCalendarOpen: handleCalendarOpen,
    onDateChange: handleDateChange,
    onCategoryPress: handleCategoryPress,
  };

  console.log('🚀 Rendering DiscretionaryBreakdown with props:', {
    visible,
    hasData: processedBreakdownData.totalAmount > 0,
    selectedDate: selectedDate.toISOString().split('T')[0],
    totalAmount: processedBreakdownData.totalAmount,
    totalTransactions: processedBreakdownData.totalTransactions,
    categoryCount: processedBreakdownData.categories.length,
    insightCount: processedBreakdownData.insights.length,
    expandedCategoriesCount: expandedCategories.size,
  });

  return <DiscretionaryBreakdown {...uiProps} />;
};

export default DiscretionaryContainer;
