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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import useGoals from '../hooks/useGoals';
import AddGoalModal from '../components/AddGoalModal';
import GoalCard from '../components/GoalCard';
import {formatCurrencySync} from '../utils/currencyHelper';
import {useAppSettings} from '../contexts/AppSettingsContext';

const GoalsScreen = () => {
  const insets = useSafeAreaInsets();

  // Get currency setting from context
  const {appSettings} = useAppSettings();
  const currency = appSettings?.currency || 'AUD';

  const [activeTab, setActiveTab] = useState('active');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [incomeData, setIncomeData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Refs to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  const lastActiveDate = useRef(new Date().toDateString());
  const isMountedRef = useRef(true);
  const hasLoadedOnce = useRef(false); // Track if we've loaded at least once
  const lastUpdateTime = useRef(0); // Track when we last updated goals

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
    // eslint-disable-next-line no-unused-vars
    updateCounter,
  } = useGoals();

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
        // Load goals and income data in parallel
        const [, incomeResult] = await Promise.all([
          loadGoalsRef.current
            ? loadGoalsRef.current(force)
            : Promise.resolve(), // Use ref to prevent dependency loop
          loadIncomeData(),
        ]);

        if (isMountedRef.current && incomeResult) {
          setIncomeData(incomeResult);
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
    [loadIncomeData], // ✅ FIXED: Removed loadGoals dependency to prevent infinite loops
  );

  const loadIncomeData = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem('userSetup');
      if (storedData) {
        return JSON.parse(storedData);
      }
      return null;
    } catch (error) {
      console.warn('Error loading income data:', error);
      return null;
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    isMountedRef.current = true;
    loadAllData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadAllData]);

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
      // Remove the delay - load immediately but silently
      if (isMountedRef.current && !isLoadingRef.current) {
        // Don't reload if we just updated goals (within 10 seconds)
        const timeSinceUpdate = Date.now() - lastUpdateTime.current;
        if (timeSinceUpdate < 10000) {
          console.log(
            '🔍 GOALS_SCREEN: Skipping reload - recent update within',
            timeSinceUpdate,
            'ms',
          );
          return;
        }

        // Only reload if goals are empty OR if we've never loaded before
        const currentGoalsLength = goals.length;
        if (
          !hasLoadedOnce.current ||
          (currentGoalsLength === 0 && !incomeData)
        ) {
          console.log(
            '🔍 GOALS_SCREEN: Loading data (hasLoadedOnce:',
            hasLoadedOnce.current,
            'goals.length:',
            currentGoalsLength,
            ')',
          );
          loadAllData();
        } else {
          console.log(
            '🔍 GOALS_SCREEN: Skipping reload - already loaded with',
            currentGoalsLength,
            'goals',
          );
        }
      }
    }, [loadAllData, incomeData, goals.length]),
  );

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
        console.log('🔍 GOALS_SCREEN: Saving goal with data:', {
          title: goalData.title,
          type: goalData.type,
          category: goalData.category,
          target: goalData.target,
        });

        const result = await saveGoal(goalData);

        if (result && result.success) {
          console.log('🔍 GOALS_SCREEN: Goal saved successfully:', {
            id: result.goal?.id,
            type: result.goal?.type,
            category: result.goal?.category,
          });

          setShowAddGoal(false);
          clearEditingGoal();
          // Reload goals to show the new goal
          console.log('🔍 GOALS_SCREEN: Reloading goals after save...');
          try {
            if (loadGoalsRef.current) {
              await loadGoalsRef.current(true);
              console.log('🔍 GOALS_SCREEN: Goals reloaded successfully');
            }
          } catch (reloadError) {
            console.error(
              '🔍 GOALS_SCREEN: Failed to reload goals:',
              reloadError,
            );
          }
          return {success: true, goal: result.goal};
        } else {
          console.error('🔍 GOALS_SCREEN: Goal save failed:', result?.error);
          return {
            success: false,
            error: result?.error || 'Failed to save goal. Please try again.',
          };
        }
      } catch (error) {
        console.error('🔍 GOALS_SCREEN: Goal save error:', error);
        return {
          success: false,
          error:
            error.message || 'An unexpected error occurred. Please try again.',
        };
      }
    },
    [saveGoal, clearEditingGoal], // ✅ FIXED: Removed loadGoals dependency to prevent infinite loops
  );

  const handleDeleteGoal = useCallback(
    async goalId => {
      try {
        await deleteGoal(goalId);
      } catch (error) {
        console.warn('Error deleting goal:', error);
      }
    },
    [deleteGoal],
  );

  const handleToggleBalanceDisplay = useCallback(
    async goalId => {
      try {
        console.log(
          '🎯 GoalsScreen: Toggling balance display for goal:',
          goalId,
        );
        const result = await toggleGoalBalanceDisplay(goalId);
        console.log('🎯 GoalsScreen: Toggle result:', result);

        // Log the updated goals state
        const updatedGoal = goals.find(g => g.id === goalId);
        console.log('🎯 GoalsScreen: Updated goal state:', {
          id: updatedGoal?.id,
          title: updatedGoal?.title,
          showOnBalanceCard: updatedGoal?.showOnBalanceCard,
        });
      } catch (error) {
        console.warn('Error toggling balance display:', error);
      }
    },
    [toggleGoalBalanceDisplay, goals],
  );

  const handleUpdateProgress = useCallback(
    async (goalId, amount, paymentSource = 'income') => {
      try {
        await updateGoalProgress(goalId, amount, paymentSource);
        lastUpdateTime.current = Date.now(); // Mark when we updated
        console.log('🔍 GOALS_SCREEN: Goal progress updated successfully');
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
    setShowAddGoal(false);
    clearEditingGoal();
  }, [clearEditingGoal]);

  const formatCurrency = useCallback(
    amount => {
      return formatCurrencySync(amount, currency);
    },
    [currency],
  );

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
        <Text style={styles.headerTitle}>Goals</Text>
        <Text style={styles.headerSubtitle}>
          Track your financial objectives
        </Text>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="target" size={16} color={colors.textWhite} />
              <Text style={styles.statLabel}>Active Goals</Text>
            </View>
            <Text style={styles.statValue}>{activeGoals.length}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="eye" size={16} color={colors.textWhite} />
              <Text style={styles.statLabel}>On Balance Card</Text>
            </View>
            <Text style={styles.statValue}>{balanceCardGoals.length}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="calendar" size={16} color={colors.textWhite} />
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <Text style={styles.statValue}>
              {formatCurrency(currentMonthContributions)}
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
            Active Goals ({activeGoals.length})
          </Text>
        </TouchableOpacity>

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
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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
            {/* Active Goals - Grouped by Type */}
            {activeGoals.length > 0 ? (
              <View style={styles.goalsSection}>
                {renderGoalsByType(groupedActiveGoals.spending, 'spending')}
                {renderGoalsByType(groupedActiveGoals.debt, 'debt')}
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

// Styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '400',
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  statIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.9,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.3,
  },
  tabContainer: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
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
});

export default React.memo(GoalsScreen);
