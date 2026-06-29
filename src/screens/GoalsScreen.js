// screens/GoalsScreen.js
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  AppState,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import useGoals from '../hooks/useGoals';
import useRolloverAllocation from '../hooks/useRolloverAllocation';
import AddGoalModal from '../components/AddGoalModal';
import GoalCard from '../components/GoalCard';
import {formatCurrencySync} from '../utils/currencyHelper';
import {useAppSettings} from '../contexts/AppSettingsContext';
import TrendAPIService from '../services/TrendAPIService';
import TransactionCache from '../services/TransactionCache';

const GoalsScreen = ({route, navigation}) => {
  const insets = useSafeAreaInsets();

  // Extract rollover parameters from route
  const rolloverParams = route?.params || {};
  const {fromRollover} = rolloverParams;

  // Get currency setting from context
  const {appSettings} = useAppSettings();
  const currency = appSettings?.currency || 'AUD';

  const [activeTab, setActiveTab] = useState('active');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDebtGestureBanner, setShowDebtGestureBanner] = useState(true);

  // Refs to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  const lastActiveDate = useRef(new Date().toDateString());
  const isMountedRef = useRef(true);
  const hasLoadedOnce = useRef(false); // Track if we've loaded at least once
  const lastUpdateTime = useRef(0); // Track when we last updated goals
  const scrollViewRef = useRef(null); // Ref for ScrollView

  // Hooks
  const {
    goals,
    editingGoal,
    loadGoals,
    saveGoal,
    deleteGoal,
    prepareEditGoal,
    clearEditingGoal,
    toggleGoalBalanceDisplay,
    updateGoalProgress,
    getBalanceCardGoals,
    getGoalProgress,
    isGoalOverdue,
    completeGoal,
  } = useGoals();

  // Rollover allocation hook
  const {
    shouldShowModal: shouldShowRolloverModal,
    allocateToGoal,
    cancelRollover,
    resetRollover,
  } = useRolloverAllocation(rolloverParams, loadGoals);

  // Use ref to store loadGoals to prevent dependency loops
  const loadGoalsRef = useRef();
  useEffect(() => {
    loadGoalsRef.current = loadGoals;
  });

  // Consolidated data loading function
  const loadAllData = useCallback(
    async (force = false) => {
      if (isLoadingRef.current && !force) {
        return;
      }

      isLoadingRef.current = true;

      try {
        // Load goals
        if (loadGoalsRef.current) {
          await loadGoalsRef.current(force);
        }

        hasLoadedOnce.current = true;
      } catch (error) {
        console.warn('Error loading data:', error);
      } finally {
        if (isMountedRef.current) {
          isLoadingRef.current = false;
        }
      }
    },
    [], // ✅ FIXED: No dependencies to prevent infinite loops
  );

  // Initial load on mount
  useEffect(() => {
    isMountedRef.current = true;
    loadAllData();

    return () => {
      isMountedRef.current = false;
      // Clean up rollover state when component unmounts
      resetRollover();
    };
  }, [loadAllData, resetRollover]);

  // Monitor app state changes for automatic refresh
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active' && isMountedRef.current) {
        const now = new Date();
        const currentDateString = now.toDateString();

        // Only reload if it's a new day or forced
        if (lastActiveDate.current !== currentDateString) {
          lastActiveDate.current = currentDateString;
          loadAllData(true);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [loadAllData]);

  // Only reload on focus if data is stale (debounced)
  useFocusEffect(
    useCallback(() => {
      if (isMountedRef.current && !isLoadingRef.current) {
        const timeSinceUpdate = Date.now() - lastUpdateTime.current;

        // Always reload if:
        // 1. We've never loaded before
        // 2. We haven't updated in the last 3 seconds (reduced from 10 to catch quick navigations)
        if (!hasLoadedOnce.current || timeSinceUpdate >= 3000) {
          loadAllData();
        }
      }
      // Note: goals.length removed from deps to prevent infinite loop when global state updates
    }, [loadAllData]),
  );

  // Handle rollover flow - automatically open Add Goal modal when coming from rollover
  useEffect(() => {
    if (shouldShowRolloverModal && !showAddGoal) {
      clearEditingGoal();
      setShowAddGoal(true);
    }
  }, [shouldShowRolloverModal, showAddGoal, clearEditingGoal]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await loadAllData(true);
    setRefreshing(false);
  }, [loadAllData, refreshing]);

  const handleAddGoal = useCallback(() => {
    clearEditingGoal();
    setShowAddGoal(true);
  }, [clearEditingGoal]);

  const handleEditGoal = useCallback(
    async goal => {
      try {
        await prepareEditGoal(goal.id);
        setShowAddGoal(true);
      } catch (error) {
        console.warn('Error preparing edit goal:', error);
      }
    },
    [prepareEditGoal],
  );

  const handleSaveGoal = useCallback(
    async goalData => {
      try {
        const result = await saveGoal(goalData);

        if (result && result.success) {
          setShowAddGoal(false);
          clearEditingGoal();

          // Handle rollover allocation if this goal was created from rollover flow
          if (shouldShowRolloverModal && result.goal?.id) {
            const rolloverResult = await allocateToGoal(result.goal.id);

            if (!rolloverResult.success) {
              // Show error but don't fail the goal creation
              Alert.alert(
                'Rollover Allocation Failed',
                rolloverResult.error ||
                  'Failed to allocate rollover funds to goal. You can add them manually.',
                [{text: 'OK', style: 'default'}],
              );
            }
          }

          // No need to reload goals here - the global state listener already updated them
          // Reloading causes a visible flash/flicker when the modal closes

          // Update timestamp to prevent useFocusEffect from reloading unnecessarily
          lastUpdateTime.current = Date.now();

          // Navigate back to Home if this came from rollover flow
          if (fromRollover && navigation) {
            navigation.navigate('Home');
          }

          return {success: true, goal: result.goal};
        } else {
          return {
            success: false,
            error: result?.error || 'Failed to save goal. Please try again.',
          };
        }
      } catch (error) {
        console.error('Goal save error:', error);
        return {
          success: false,
          error:
            error.message || 'An unexpected error occurred. Please try again.',
        };
      }
    },
    [
      saveGoal,
      clearEditingGoal,
      shouldShowRolloverModal,
      allocateToGoal,
      fromRollover,
      navigation,
    ],
  );

  const handleDeleteGoal = useCallback(
    async goal => {
      try {
        // Check for linked transactions
        let linkedTransactions = [];
        try {
          const response = await TrendAPIService.getTransactions({
            linkedGoalId: goal.id,
          });
          linkedTransactions = Array.isArray(response)
            ? response
            : response?.transactions || response?.data || [];
        } catch (fetchError) {
          console.warn('Error fetching linked transactions:', fetchError);
        }

        // Build confirmation message
        let message = `Are you sure you want to delete "${goal.title}"? This action cannot be undone.`;
        if (linkedTransactions.length > 0) {
          message += `\n\nThis will also delete ${linkedTransactions.length} linked recurring transaction${linkedTransactions.length > 1 ? 's' : ''}.`;
        }

        // Show confirmation alert
        Alert.alert('Delete Goal', message, [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete linked transactions first
                let deletedTransactions = false;
                const currentUserId = TrendAPIService.getCurrentUserId();
                for (const transaction of linkedTransactions) {
                  const txId = transaction.id || transaction._id;
                  if (txId) {
                    try {
                      await TrendAPIService.deleteTransaction(txId);
                      // Also remove from local cache
                      if (currentUserId) {
                        await TransactionCache.removeTransaction(currentUserId, txId);
                      }
                      deletedTransactions = true;
                    } catch (txError) {
                      console.warn('Error deleting linked transaction:', txError);
                    }
                  }
                }
                // Emit event to refresh transactions in HomeContainer
                if (deletedTransactions) {
                  DeviceEventEmitter.emit('transactionsChanged');
                }
                // Then delete the goal
                await deleteGoal(goal.id);
              } catch (error) {
                console.warn('Error deleting goal:', error);
                Alert.alert('Error', 'Failed to delete goal. Please try again.');
              }
            },
          },
        ]);
      } catch (error) {
        console.warn('Error in delete goal flow:', error);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    },
    [deleteGoal],
  );

  const handleToggleBalanceDisplay = useCallback(
    async goalId => {
      try {
        await toggleGoalBalanceDisplay(goalId);
      } catch (error) {
        console.warn('Error toggling balance display:', error);
      }
    },
    [toggleGoalBalanceDisplay],
  );

  const handleUpdateProgress = useCallback(
    async (goalId, amount, paymentSource = 'income') => {
      console.log('🔍 GOALS_SCREEN: ===== handleUpdateProgress CALLED =====');
      console.log('🔍 GOALS_SCREEN: goalId:', goalId);
      console.log('🔍 GOALS_SCREEN: amount:', amount);
      console.log('🔍 GOALS_SCREEN: paymentSource:', paymentSource);

      try {
        await updateGoalProgress(goalId, amount, paymentSource);
        lastUpdateTime.current = Date.now();
      } catch (error) {
        console.warn('Error updating progress:', error);
        Alert.alert(
          'Payment Failed',
          error.message ||
            'Unable to save payment. Please check your connection and try again.',
          [
            {
              text: 'OK',
              style: 'default',
            },
          ],
        );
      }
    },
    [updateGoalProgress],
  );

  const handleCompleteGoal = useCallback(
    async goalId => {
      try {
        await completeGoal(goalId);
      } catch (error) {
        console.warn('Error completing goal:', error);
      }
    },
    [completeGoal],
  );

  const handleCloseAddGoal = useCallback(() => {
    // If user cancels goal creation during rollover flow, cancel the rollover
    if (shouldShowRolloverModal) {
      cancelRollover();
    }

    setShowAddGoal(false);
    clearEditingGoal();
  }, [clearEditingGoal, shouldShowRolloverModal, cancelRollover]);

  const formatCurrency = useCallback(
    amount => {
      return formatCurrencySync(amount, currency);
    },
    [currency],
  );

  // Handler for when a GoalCard expands for input
  const handleGoalCardExpand = useCallback(() => {
    // Add a delay to allow the card to expand, then scroll to show it
    setTimeout(() => {
      if (scrollViewRef.current) {
        // Scroll to a position that ensures the expanded card is visible
        // This scrolls to near the end but leaves some buffer space
        scrollViewRef.current.scrollToEnd({animated: true});
      }
    }, 250);
  }, []);

  // Memoize expensive calculations
  const activeGoals = React.useMemo(() => {
    return goals.filter(goal => goal.isActive !== false);
  }, [goals]);

  const completedGoals = React.useMemo(
    () => goals.filter(goal => goal.isActive === false),
    [goals],
  );

  const balanceCardGoals = React.useMemo(
    () => getBalanceCardGoals(),
    [getBalanceCardGoals],
  );

  const currentMonthContributions = React.useMemo(
    () =>
      activeGoals
        .filter(goal => goal.autoContribute)
        .reduce((sum, goal) => sum + goal.autoContribute, 0),
    [activeGoals],
  );

  // Group goals by type for organized display
  const groupedActiveGoals = React.useMemo(() => {
    const grouped = {
      spending: [],
      debt: [],
      savings: [],
    };

    activeGoals.forEach(goal => {
      if (goal.type === 'spending') {
        grouped.spending.push(goal);
      } else if (goal.type === 'debt') {
        grouped.debt.push(goal);
      } else if (goal.type === 'savings') {
        grouped.savings.push(goal);
      }
    });

    return grouped;
  }, [activeGoals]);

  // Filter non-debt active goals for Active tab (exclude debt goals)
  const nonDebtActiveGoals = React.useMemo(() => {
    return activeGoals.filter(goal => goal.type !== 'debt');
  }, [activeGoals]);

  // Get only debt goals
  const debtGoals = React.useMemo(() => {
    return groupedActiveGoals.debt;
  }, [groupedActiveGoals.debt]);

  // Check if we should show the Debt Goals tab
  const hasDebtGoals = debtGoals.length > 0;

  // Render goal cards for a specific type
  const renderGoalsByType = (typeGoals, type) => {
    if (typeGoals.length === 0) {
      return null;
    }

    const typeLabels = {
      spending: 'Spending Budgets',
      debt: 'Debt Payments',
      savings: 'Savings Goals',
    };

    const typeIcons = {
      spending: 'shopping-cart',
      debt: 'credit-card',
      savings: 'dollar-sign',
    };

    return (
      <View style={styles.goalTypeSection}>
        <View style={styles.sectionHeader}>
          <Icon
            name={typeIcons[type]}
            size={16}
            color={colors.primary}
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTypeTitle}>{typeLabels[type]}</Text>
          <View style={styles.goalCount}>
            <Text style={styles.goalCountText}>{typeGoals.length}</Text>
          </View>
        </View>
        {typeGoals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onEdit={handleEditGoal}
            onDelete={handleDeleteGoal}
            onToggleBalanceDisplay={handleToggleBalanceDisplay}
            onUpdateProgress={handleUpdateProgress}
            onComplete={handleCompleteGoal}
            getGoalProgress={getGoalProgress}
            isOverdue={isGoalOverdue(goal)}
            formatCurrency={formatCurrency}
            onExpand={handleGoalCardExpand}
          />
        ))}
      </View>
    );
  };

  const renderedCompletedGoals = React.useMemo(
    () =>
      completedGoals.map(goal => (
        <GoalCard
          key={goal.id}
          goal={goal}
          isCompleted={true}
          getGoalProgress={getGoalProgress}
          formatCurrency={formatCurrency}
        />
      )),
    [completedGoals, getGoalProgress, formatCurrency],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Goals</Text>
            <Text style={styles.headerSubtitle}>
              Track your financial objectives
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}>
            Active ({nonDebtActiveGoals.length})
          </Text>
        </TouchableOpacity>

        {hasDebtGoals && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'debt' && styles.activeTab]}
            onPress={() => setActiveTab('debt')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'debt' && styles.activeTabText,
              ]}>
              Debt Goals ({debtGoals.length})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}>
            Completed ({completedGoals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {activeTab === 'active' && (
          <>
            {/* Quick Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Active Goals</Text>
                <Text style={styles.statValue}>
                  {nonDebtActiveGoals.length}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>On Balance Card</Text>
                <Text style={styles.statValue}>{balanceCardGoals.length}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>This Month</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(currentMonthContributions)}
                </Text>
              </View>
            </View>

            {/* Active Goals - Grouped by Type (excluding debt) */}
            {nonDebtActiveGoals.length > 0 ? (
              <View style={styles.goalsSection}>
                {renderGoalsByType(groupedActiveGoals.spending, 'spending')}
                {renderGoalsByType(groupedActiveGoals.savings, 'savings')}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon
                  name="target"
                  size={48}
                  color={colors.textSecondary}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>No Goals Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Set your first financial goal to start tracking your progress
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'debt' && (
          <View style={styles.goalsSection}>
            {/* Swipe Gesture Banner */}
            {showDebtGestureBanner && debtGoals.length > 0 && (
              <View style={styles.gestureBanner}>
                <View style={styles.gestureBannerContent}>
                  <Icon
                    name="info"
                    size={20}
                    color={colors.primary}
                    style={styles.gestureBannerIcon}
                  />
                  <View style={styles.gestureBannerTextContainer}>
                    <Text style={styles.gestureBannerTitle}>Swipe Gestures</Text>
                    <Text style={styles.gestureBannerText}>
                      Swipe left to see Payment History • Swipe right to Make a Payment
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDebtGestureBanner(false)}
                    style={styles.gestureBannerClose}>
                    <Icon name="x" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {debtGoals.length > 0 ? (
              <>{renderGoalsByType(debtGoals, 'debt')}</>
            ) : (
              <View style={styles.emptyState}>
                <Icon
                  name="trending-down"
                  size={48}
                  color={colors.textSecondary}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>No Debt Goals</Text>
                <Text style={styles.emptySubtitle}>
                  Create a debt goal to track loan or credit card payments
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'completed' && (
          <View style={styles.goalsSection}>
            {completedGoals.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Completed Goals</Text>
                {renderedCompletedGoals}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Icon
                  name="check-circle"
                  size={48}
                  color={colors.textSecondary}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>No Completed Goals</Text>
                <Text style={styles.emptySubtitle}>
                  Completed goals will appear here
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Add Goal Button */}
        <TouchableOpacity style={styles.addGoalButton} onPress={handleAddGoal}>
          <View style={styles.addGoalIconContainer}>
            <Icon name="plus" size={24} color={colors.primary} />
          </View>
          <Text style={styles.addGoalText}>Add New Goal</Text>
          <Text style={styles.addGoalSubtext}>
            Set a savings, spending, or debt target
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Goal Modal */}
      <AddGoalModal
        visible={showAddGoal}
        onClose={handleCloseAddGoal}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
        formatCurrency={formatCurrency}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
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
    color: colors.textWhite,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.9,
    letterSpacing: -0.1,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background || '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary || '#6366F1',
  },
  activeTab: {
    backgroundColor: colors.primary || '#6366F1',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary || '#6366F1',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },
  activeTabText: {
    color: colors.textWhite || '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  goalsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  goalTypeSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTypeTitle: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    flex: 1,
  },
  goalCount: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCountText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.primary,
  },
  addGoalButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  addGoalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addGoalText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 4,
  },
  addGoalSubtext: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  gestureBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  gestureBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  gestureBannerIcon: {
    marginRight: 12,
  },
  gestureBannerTextContainer: {
    flex: 1,
  },
  gestureBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  gestureBannerText: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  gestureBannerClose: {
    padding: 4,
    marginLeft: 8,
  },
});

export default React.memo(GoalsScreen);
