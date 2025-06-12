import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  AppState,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import {StorageCoordinator} from '../services/storage/StorageCoordinator';
import useGoals from '../hooks/useGoals';
import useTransactions from '../hooks/useTransactions';
import AddGoalModal from '../components/AddGoalModal';
import GoalCard from '../components/GoalCard';
import GoalSuggestionsCard from '../components/GoalSuggestionsCard';

// Memoized components to prevent unnecessary re-renders
const EmptyStateActive = React.memo(() => (
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
));

const EmptyStateCompleted = React.memo(() => (
  <View style={styles.emptyState}>
    <Icon
      name="check-circle"
      size={48}
      color={colors.textSecondary}
      style={styles.emptyIcon}
    />
    <Text style={styles.emptyTitle}>No Completed Goals</Text>
    <Text style={styles.emptySubtitle}>Completed goals will appear here</Text>
  </View>
));

const AddGoalButton = React.memo(({onPress}) => (
  <TouchableOpacity style={styles.addGoalButton} onPress={onPress}>
    <View style={styles.addGoalIconContainer}>
      <Icon name="plus" size={24} color={colors.primary} />
    </View>
    <Text style={styles.addGoalText}>Add New Goal</Text>
    <Text style={styles.addGoalSubtext}>
      Set a savings, spending, or debt target
    </Text>
  </TouchableOpacity>
));

const GoalsScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('active');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [incomeData, setIncomeData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);

  // Memoized storage instances
  const storageCoordinator = useMemo(
    () => StorageCoordinator.getInstance(),
    [],
  );
  const userStorageManager = useMemo(
    () => storageCoordinator.getUserStorageManager(),
    [storageCoordinator],
  );

  const isLoadingRef = useRef(false);
  const lastActiveDate = useRef(new Date().toDateString());
  const isMountedRef = useRef(true);
  const hasLoadedOnce = useRef(false);

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
    getSmartSuggestions,
    completeGoal,
  } = useGoals();

  const {transactions} = useTransactions();

  // Progressive storage ready check
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 15;
    let timeoutId;

    const checkStorageReady = () => {
      const isReady =
        storageCoordinator.isUserStorageInitialized() && userStorageManager;
      setIsStorageReady(isReady);

      if (!isReady && retryCount < maxRetries) {
        retryCount++;

        // Progressive delays: 50ms -> 200ms -> 500ms
        let delay;
        if (retryCount <= 3) {
          delay = 50;
        } else if (retryCount <= 8) {
          delay = 200;
        } else {
          delay = 500;
        }

        timeoutId = setTimeout(checkStorageReady, delay);
      }
    };

    checkStorageReady();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [storageCoordinator, userStorageManager]);

  // Optimized income data loading
  const loadIncomeData = useCallback(async () => {
    try {
      if (!isStorageReady || !userStorageManager) {
        return null;
      }

      const storedData = await userStorageManager.getUserData('user_setup');
      return storedData || null;
    } catch (error) {
      console.error('Error loading income data:', error);
      return null;
    }
  }, [isStorageReady, userStorageManager]);

  // Optimized data loading with better error handling
  const loadAllData = useCallback(
    async (force = false) => {
      if (isLoadingRef.current && !force) {
        return;
      }

      if (!isStorageReady) {
        return;
      }

      isLoadingRef.current = true;

      try {
        // Load goals first (critical data), then income in background
        await loadGoals(force);

        // Load income data in background
        const incomeResult = await loadIncomeData();
        if (isMountedRef.current) {
          setIncomeData(incomeResult);
        }

        hasLoadedOnce.current = true;
      } catch (error) {
        console.error('Error loading all data:', error);
      } finally {
        if (isMountedRef.current) {
          isLoadingRef.current = false;
        }
      }
    },
    [loadGoals, loadIncomeData, isStorageReady],
  );

  useEffect(() => {
    isMountedRef.current = true;
    if (isStorageReady) {
      loadAllData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [loadAllData, isStorageReady]);

  // Debounced app state change handler
  useEffect(() => {
    let timeoutId;

    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active' && isMountedRef.current && isStorageReady) {
        const now = new Date();
        const currentDateString = now.toDateString();

        if (lastActiveDate.current !== currentDateString) {
          lastActiveDate.current = currentDateString;
          // Debounce to prevent rapid calls
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => loadAllData(true), 200);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription?.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadAllData, isStorageReady]);

  // Simplified focus effect with debouncing
  useFocusEffect(
    useCallback(() => {
      let timeoutId;

      if (isMountedRef.current && !isLoadingRef.current && isStorageReady) {
        if (goals.length === 0 || !incomeData) {
          timeoutId = setTimeout(() => loadAllData(), 100);
        }
      }

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [loadAllData, goals.length, incomeData, isStorageReady]),
  );

  // Optimized refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await loadAllData(true);
    setRefreshing(false);
  }, [loadAllData, refreshing]);

  // Memoized event handlers
  const handleAddGoal = useCallback(() => {
    clearEditingGoal();
    setShowAddGoal(true);
  }, [clearEditingGoal]);

  const handleEditGoal = useCallback(
    async goal => {
      try {
        await prepareEditGoal(goal);
        setShowAddGoal(true);
      } catch (error) {
        console.error('Error preparing edit goal:', error);
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
          return {success: true};
        } else {
          return {
            success: false,
            error: result?.error || 'Failed to save goal. Please try again.',
          };
        }
      } catch (error) {
        return {
          success: false,
          error:
            error.message || 'An unexpected error occurred. Please try again.',
        };
      }
    },
    [saveGoal, clearEditingGoal],
  );

  const handleDeleteGoal = useCallback(
    async goalId => {
      try {
        await deleteGoal(goalId);
      } catch (error) {
        console.error('Error deleting goal:', error);
      }
    },
    [deleteGoal],
  );

  const handleToggleBalanceDisplay = useCallback(
    async goalId => {
      try {
        await toggleGoalBalanceDisplay(goalId);
      } catch (error) {
        console.error('Error toggling balance display:', error);
      }
    },
    [toggleGoalBalanceDisplay],
  );

  const handleUpdateProgress = useCallback(
    async (goalId, amount) => {
      try {
        await updateGoalProgress(goalId, amount);
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    },
    [updateGoalProgress],
  );

  const handleCompleteGoal = useCallback(
    async goalId => {
      try {
        await completeGoal(goalId);
      } catch (error) {
        console.error('Error completing goal:', error);
      }
    },
    [completeGoal],
  );

  const handleCloseAddGoal = useCallback(() => {
    setShowAddGoal(false);
    clearEditingGoal();
  }, [clearEditingGoal]);

  // Memoized currency formatter
  const formatCurrency = useCallback(amount => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }, []);

  // Optimized goal filtering and calculations - combined to reduce iterations
  const goalData = useMemo(() => {
    const activeGoals = goals.filter(goal => goal.isActive !== false);
    const completedGoals = goals.filter(goal => goal.isActive === false);

    const balanceCardGoals = getBalanceCardGoals();

    const currentMonthContributions = activeGoals
      .filter(goal => goal.autoContribute)
      .reduce((sum, goal) => sum + goal.autoContribute, 0);

    const smartSuggestions = getSmartSuggestions(transactions, incomeData);

    return {
      activeGoals,
      completedGoals,
      balanceCardGoals,
      currentMonthContributions,
      smartSuggestions,
    };
  }, [
    goals,
    getBalanceCardGoals,
    getSmartSuggestions,
    transactions,
    incomeData,
  ]);

  // Memoized rendered goal lists to prevent unnecessary re-renders
  const renderedActiveGoals = useMemo(() => {
    return goalData.activeGoals.map(goal => (
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
    ));
  }, [
    goalData.activeGoals,
    handleEditGoal,
    handleDeleteGoal,
    handleToggleBalanceDisplay,
    handleUpdateProgress,
    handleCompleteGoal,
    getGoalProgress,
    isGoalOverdue,
    formatCurrency,
  ]);

  const renderedCompletedGoals = useMemo(() => {
    return goalData.completedGoals.map(goal => (
      <GoalCard
        key={goal.id}
        goal={goal}
        isCompleted={true}
        getGoalProgress={getGoalProgress}
        formatCurrency={formatCurrency}
      />
    ));
  }, [goalData.completedGoals, getGoalProgress, formatCurrency]);

  // Memoized tab change handler
  const handleTabChange = useCallback(tab => {
    setActiveTab(tab);
  }, []);

  if (!isStorageReady) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Initializing storage...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <Text style={styles.headerTitle}>Goals</Text>
        <Text style={styles.headerSubtitle}>
          Track your financial objectives
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="target" size={16} color={colors.textWhite} />
              <Text style={styles.statLabel}>Active Goals</Text>
            </View>
            <Text style={styles.statValue}>{goalData.activeGoals.length}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="eye" size={16} color={colors.textWhite} />
              <Text style={styles.statLabel}>On Balance Card</Text>
            </View>
            <Text style={styles.statValue}>
              {goalData.balanceCardGoals.length}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="calendar" size={16} color={colors.textWhite} />
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <Text style={styles.statValue}>
              {formatCurrency(goalData.currentMonthContributions)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => handleTabChange('active')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}>
            Active Goals ({goalData.activeGoals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => handleTabChange('completed')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}>
            Completed ({goalData.completedGoals.length})
          </Text>
        </TouchableOpacity>
      </View>

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
            {goalData.smartSuggestions.length > 0 && (
              <GoalSuggestionsCard
                suggestions={goalData.smartSuggestions}
                onCreateGoal={handleAddGoal}
                formatCurrency={formatCurrency}
              />
            )}

            {goalData.activeGoals.length > 0 ? (
              <View style={styles.goalsSection}>
                <Text style={styles.sectionTitle}>Active Goals</Text>
                {renderedActiveGoals}
              </View>
            ) : (
              <EmptyStateActive />
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <View style={styles.goalsSection}>
            {goalData.completedGoals.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Completed Goals</Text>
                {renderedCompletedGoals}
              </>
            ) : (
              <EmptyStateCompleted />
            )}
          </View>
        )}

        <AddGoalButton onPress={handleAddGoal} />
      </ScrollView>

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
