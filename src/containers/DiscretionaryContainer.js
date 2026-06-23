import React, {useState, useEffect, useCallback, useRef} from 'react';
import {AppState, Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrendAPIService from '../services/TrendAPIService';
import DiscretionaryBreakdown from '../components/DiscretionaryBreakdown';

const DiscretionaryContainer = ({
  visible,
  onClose,
  selectedPeriod = 'daily', // Default to daily for discretionary breakdown
  initialDate = null, // Day to open on (e.g. the highest-discretionary period)
}) => {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [discretionaryData, setDiscretionaryData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today;
  });
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showCalendar, setShowCalendar] = useState(false);

  // Refs for component lifecycle management
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // When the modal opens with a target day (e.g. the highest-discretionary
  // period), jump to it. Later in-modal calendar changes are preserved.
  // initialDate is parsed from a date-only string (UTC midnight), so read its
  // UTC calendar parts to build the intended local day in any timezone.
  useEffect(() => {
    if (visible && initialDate) {
      const d = new Date(initialDate);
      setSelectedDate(
        new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      );
    }
  }, [visible, initialDate]);

  // ==============================================
  // TIMEZONE-SAFE DATE UTILITIES
  // ==============================================

  /**
   * Create a date string in local timezone (YYYY-MM-DD format)
   * This avoids timezone conversion issues
   */
  const formatDateForAPI = useCallback(date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  /**
   * Create a datetime string for API with time portion
   * Format: YYYY-MM-DD HH:mm:ss (in local timezone)
   */
  const formatDateTimeForAPI = useCallback(date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }, []);

  /**
   * Create local date range without timezone conversion
   */
  const createLocalDateRange = useCallback(
    (baseDate, period) => {
      // Create start and end dates with explicit time boundaries
      let startDate, endDate;

      switch (period) {
        case 'daily':
          // Start at 00:00:00 of selected day, end at 23:59:59 of same day
          startDate = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            0,
            0,
            0,
            0,
          );
          endDate = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            23,
            59,
            59,
            999,
          );
          break;
        case 'weekly':
          // Week containing the selected date (Sunday to Saturday)
          const startOfWeek = new Date(baseDate);
          startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());
          startDate = new Date(
            startOfWeek.getFullYear(),
            startOfWeek.getMonth(),
            startOfWeek.getDate(),
            0,
            0,
            0,
            0,
          );

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endDate = new Date(
            endOfWeek.getFullYear(),
            endOfWeek.getMonth(),
            endOfWeek.getDate(),
            23,
            59,
            59,
            999,
          );
          break;
        case 'monthly':
          // First day of month to last day of month
          startDate = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            1,
            0,
            0,
            0,
            0,
          );
          endDate = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
          break;
        default:
          startDate = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            0,
            0,
            0,
            0,
          );
          endDate = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            23,
            59,
            59,
            999,
          );
      }

      const result = {
        startDate: formatDateForAPI(startDate),
        endDate: formatDateForAPI(endDate),
        startDateTime: formatDateTimeForAPI(startDate),
        endDateTime: formatDateTimeForAPI(endDate),
        // Unambiguous UTC instants for the API — the backend buckets these into
        // the user's calendar day. This is the contract the web already uses.
        startISO: startDate.toISOString(),
        endISO: endDate.toISOString(),
      };

      return result;
    },
    [formatDateForAPI, formatDateTimeForAPI],
  );

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
        // ✅ FIXED: Use timezone-safe date range creation
        const dateRange = createLocalDateRange(selectedDate, selectedPeriod);

        // Send unambiguous UTC instants; the backend resolves the user's day.
        const filters = {
          startDate: dateRange.startISO,
          endDate: dateRange.endISO,
        };

        // ✅ FIXED: Use the new TrendAPIService method
        const discretionaryResponse =
          await TrendAPIService.getDiscretionaryBreakdown(filters);

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
    [selectedDate, selectedPeriod, createLocalDateRange],
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
    setSelectedDate(newDate);
  }, []);

  /**
   * Handle calendar modal open
   */
  const handleCalendarOpen = useCallback(() => {
    setShowCalendar(true);
  }, []);

  /**
   * Handle category expansion/collapse
   */
  const handleCategoryPress = useCallback(categoryName => {
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
      loadDiscretionaryData();
    }
  }, [visible, loadDiscretionaryData]);

  // Reload data when selected date changes
  useEffect(() => {
    if (visible && isMountedRef.current) {
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
   * Helper function to format period labels
   */
  const formatPeriodLabel = useCallback(
    (_, period) => {
      const date = selectedDate;

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

        return {
          name: category.categoryName,
          amount: category.amount,
          color: category.categoryColor || category.color || '#CCCCCC',
          originalColor:
            category.originalColor ||
            category.categoryColor ||
            category.color ||
            '#CCCCCC',
          transactions: category.transactions || [],
          subcategories: subcategories,
          hasSubcategories: subcategories.length > 0,
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

  return <DiscretionaryBreakdown {...uiProps} />;
};

export default DiscretionaryContainer;
