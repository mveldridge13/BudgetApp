import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LineChart} from 'react-native-chart-kit';
import {colors} from '../styles';
// ✅ FIXED: Import DiscretionaryContainer instead of DiscretionaryBreakdown
import DiscretionaryContainer from '../containers/DiscretionaryContainer';
import SpendingVelocityContainer from '../containers/SpendingVelocityContainer';

// Pro Badge Component - moved outside to prevent recreation on each render
const ProBadge = () => (
  <View style={styles.proBadge}>
    <Text style={styles.proBadgeText}>PRO</Text>
  </View>
);

const AnalyticsScreen = ({
  // Core data
  transactions,
  data,
  isLoading,

  // Pre-formatted chart data from container
  chartData,
  chartConfig,
  screenWidth,

  // UI state
  selectedPeriod,
  comparisonMode,
  refreshing,
  isPro,
  showBreakdown,

  // Calculated statistics
  statistics,

  // ✅ NEW: Spending velocity data
  spendingVelocity,

  // Event handlers
  onPeriodChange,
  onComparisonToggle,
  onDiscretionaryClick,
  onCloseBreakdown,
  onRefresh,

  // Helper functions
  isRecurringTransaction,
}) => {
  const insets = useSafeAreaInsets();

  // ✅ NEW: State for Spending Velocity Modal
  const [showSpendingVelocityModal, setShowSpendingVelocityModal] =
    useState(false);


  // ✅ NEW: Handle Spending Velocity tap
  const handleSpendingVelocityPress = () => {
    if (isPro) {
      setShowSpendingVelocityModal(true);
    } else {
      Alert.alert(
        'Upgrade to Pro',
        'Access detailed spending velocity analysis including daily burn rate charts, weekly trends, and personalized insights!',
        [
          {text: 'Maybe Later', style: 'cancel'},
          {text: 'Learn More', style: 'default'},
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>
              Track your spending patterns
            </Text>
          </View>
          {isPro && <ProBadge />}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary || '#6366F1']}
            tintColor={colors.primary || '#6366F1'}
            title="Pull to refresh..."
            titleColor={colors.textSecondary || '#6B7280'}
          />
        }>
        {/* Period Selector */}
        <View style={styles.selectorContainer}>
          <View style={styles.periodButtons}>
            {['daily', 'weekly', 'monthly'].map(period => (
              <TouchableOpacity
                key={period}
                onPress={() => onPeriodChange(period)}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}>
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.comparisonToggle}
            onPress={onComparisonToggle}>
            <View
              style={[
                styles.checkbox,
                comparisonMode && styles.checkboxActive,
              ]}>
              {comparisonMode && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.comparisonText}>
              Compare with previous period
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Spending</Text>
            <Text style={styles.statValue}>
              ${statistics.currentTotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}{' '}
              Average
            </Text>
            <Text style={styles.statValue}>
              ${statistics.averageSpending.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>vs Previous Period</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    statistics.percentageChange >= 0
                      ? colors.danger || '#EF4444'
                      : colors.success || '#10B981',
                },
              ]}>
              {statistics.percentageChange >= 0 ? '+' : ''}
              {statistics.percentageChange.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Discretionary Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary Spending</Text>
            <Text style={styles.statValue}>
              ${statistics.currentDiscretionary.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary Average</Text>
            <Text style={styles.statValue}>
              ${statistics.averageDiscretionary.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Discretionary vs Previous</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    statistics.discretionaryPercentageChange >= 0
                      ? colors.danger || '#EF4444'
                      : colors.success || '#10B981',
                },
              ]}>
              {statistics.discretionaryPercentageChange >= 0 ? '+' : ''}
              {statistics.discretionaryPercentageChange.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Chart - Using pre-formatted data from container */}
        {chartData && chartData.labels && chartData.labels.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Spending Over Time</Text>
            <LineChart
              data={chartData}
              width={screenWidth - 60}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withShadow={false}
              withVerticalLines={false}
              withHorizontalLines={true}
            />
          </View>
        )}

        {/* Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Key Insights</Text>

          {statistics.highestSpendingPeriod && (
            <View
              style={[styles.insightCard, {borderLeftColor: colors.primary}]}>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>Highest total spending:</Text>{' '}
                {statistics.highestSpendingPeriod.label} with $
                {statistics.highestSpendingPeriod.amount.toFixed(2)}
              </Text>
            </View>
          )}

          {statistics.highestDiscretionaryPeriod &&
            statistics.highestDiscretionaryPeriod.discretionaryAmount > 0 && (
              <TouchableOpacity
                style={[
                  styles.insightCard,
                  styles.clickableInsight,
                  {borderLeftColor: colors.secondary || '#10B981'},
                ]}
                onPress={onDiscretionaryClick}>
                <View style={styles.insightContentClean}>
                  <Text style={styles.insightText}>
                    <Text style={styles.insightBold}>
                      Highest discretionary spending:
                    </Text>{' '}
                    {statistics.highestDiscretionaryPeriod.label} with $
                    {statistics.highestDiscretionaryPeriod.discretionaryAmount.toFixed(
                      2,
                    )}
                  </Text>
                  {isPro ? (
                    <Text style={styles.tapHint}>Tap for details</Text>
                  ) : (
                    <View style={styles.proIndicator}>
                      <ProBadge />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

          <View
            style={[
              styles.insightCard,
              {
                borderLeftColor:
                  statistics.percentageChange >= 0
                    ? colors.danger || '#EF4444'
                    : colors.success || '#10B981',
              },
            ]}>
            <Text style={styles.insightText}>
              <Text style={styles.insightBold}>Total spending trend:</Text>{' '}
              You're spending {Math.abs(statistics.percentageChange).toFixed(1)}
              % {statistics.percentageChange >= 0 ? 'more' : 'less'} than last
              period
            </Text>
          </View>

          <View
            style={[
              styles.insightCard,
              {
                borderLeftColor:
                  statistics.discretionaryPercentageChange >= 0
                    ? colors.danger || '#EF4444'
                    : colors.success || '#10B981',
              },
            ]}>
            <Text style={styles.insightText}>
              <Text style={styles.insightBold}>Discretionary trend:</Text> Your
              discretionary spending is{' '}
              {Math.abs(statistics.discretionaryPercentageChange).toFixed(1)}%{' '}
              {statistics.discretionaryPercentageChange >= 0
                ? 'higher'
                : 'lower'}{' '}
              than last period
            </Text>
          </View>

          {/* ✅ ENHANCED: Spending Velocity Insight - Pro Feature with Modal */}
          {spendingVelocity ? (
            <TouchableOpacity
              style={[
                styles.insightCard,
                isPro && styles.clickableInsight, // Only clickable if Pro
                {
                  borderLeftColor:
                    spendingVelocity.velocityStatus === 'ON_TRACK'
                      ? colors.success || '#10B981'
                      : spendingVelocity.velocityStatus === 'SLIGHTLY_HIGH'
                      ? colors.warning || '#F59E0B'
                      : colors.danger || '#EF4444',
                },
              ]}
              onPress={handleSpendingVelocityPress}>
              <View style={styles.insightContentClean}>
                <Text style={styles.insightText}>
                  <Text style={styles.insightBold}>Spending Velocity:</Text>{' '}
                  {spendingVelocity.velocityStatus === 'ON_TRACK' && 'On Track'}
                  {spendingVelocity.velocityStatus === 'SLIGHTLY_HIGH' &&
                    'Slightly High'}
                  {spendingVelocity.velocityStatus === 'HIGH' && 'High'}
                  {spendingVelocity.velocityStatus === 'VERY_HIGH' &&
                    'Very High'}
                </Text>
                {isPro ? (
                  <Text style={styles.tapHint}>Tap for details</Text>
                ) : (
                  <View style={styles.proIndicator}>
                    <ProBadge />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            // Fallback for no velocity data
            <View
              style={[
                styles.insightCard,
                {borderLeftColor: colors.warning || '#F59E0B'},
              ]}>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>No data:</Text> Start adding
                transactions to see your spending trends
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ✅ FIXED: Use DiscretionaryContainer instead of DiscretionaryBreakdown */}
      <DiscretionaryContainer
        visible={showBreakdown}
        onClose={onCloseBreakdown}
        selectedPeriod={selectedPeriod}
      />

      {/* ✅ NEW: Spending Velocity Modal */}
      <SpendingVelocityContainer
        visible={showSpendingVelocityModal}
        onClose={() => setShowSpendingVelocityModal(false)}
        selectedPeriod={selectedPeriod}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#F8FAFC',
  },
  header: {
    backgroundColor: colors.primary || '#6366F1',
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
    color: colors.textWhite || '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.textWhite || '#FFFFFF',
    opacity: 0.9,
  },
  proBadge: {
    backgroundColor: colors.warning || '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textWhite || '#FFFFFF',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  selectorContainer: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  periodButtons: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background || '#F8FAFC',
  },
  periodButtonActive: {
    backgroundColor: colors.primary || '#6366F1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text || '#1F2937',
  },
  periodButtonTextActive: {
    fontFamily: 'System',
    color: colors.textWhite || '#FFFFFF',
  },
  comparisonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.border || '#E5E7EB',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary || '#6366F1',
    borderColor: colors.primary || '#6366F1',
  },
  checkmark: {
    color: colors.textWhite || '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  comparisonText: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.text || '#1F2937',
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
  chartContainer: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  insightsContainer: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    marginBottom: 16,
  },
  insightCard: {
    padding: 12,
    backgroundColor: colors.background || '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  clickableInsight: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  insightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightContentClean: {
    flexDirection: 'column',
    gap: 8,
  },
  insightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightActionText: {
    fontSize: 12,
    color: colors.primary || '#6366F1',
    fontWeight: '500',
    fontFamily: 'System',
  },
  tapHint: {
    fontSize: 12,
    color: colors.primary || '#6366F1',
    fontWeight: '500',
    fontFamily: 'System',
    alignSelf: 'flex-end',
    fontStyle: 'italic',
  },
  proIndicator: {
    alignSelf: 'flex-end',
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    lineHeight: 20,
    flex: 1,
  },
  insightBold: {
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default AnalyticsScreen;
