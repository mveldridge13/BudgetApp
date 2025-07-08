/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, {
  Circle,
  G,
  Text as SvgText,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const SpendingVelocityBreakdown = ({
  visible,
  onClose,
  refreshing,
  onRefresh,
  // Daily Burn Rate data from backend
  dailyBurnRate,
  spendingVelocity,
  // User profile data for context
  userProfile,
  // ✅ NEW: Day/time patterns data
  dayTimePatterns,
  isDayTimePatternsLoading,
  hasPatternsData,
}) => {
  // Animations
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  // eslint-disable-next-line no-unused-vars
  const [showInsights, setShowInsights] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [selectedPatternPeriod, setSelectedPatternPeriod] = useState('weekly'); // daily, weekly, monthly

  // Reset form function
  const resetForm = () => {
    modalAnim.setValue(screenWidth);
    fadeAnim.setValue(0);
    setShowInsights(true);
  };

  // Handle modal animations
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(modalAnim, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetForm();
      onClose();
    });
  };

  // Open animation
  React.useEffect(() => {
    if (visible) {
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);
    }
  }, [visible, modalAnim, fadeAnim]);

  // Get status color based on burn rate status
  const getStatusColor = useCallback(status => {
    switch (status) {
      case 'LOW':
        return '#10B981'; // Green
      case 'NORMAL':
        return '#6366F1'; // Blue
      case 'HIGH':
        return '#F59E0B'; // Orange
      case 'CRITICAL':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }, []);

  // Format currency
  const formatCurrency = useCallback(amount => {
    return `$${Math.abs(amount).toFixed(2)}`;
  }, []);

  // ✅ NEW: Render Day/Time Patterns Chart (similar to reference image style)
  const renderDayTimePatternsChart = () => {
    if (!hasPatternsData || !dayTimePatterns) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Day/Time Spending Patterns</Text>
          <View style={styles.loadingContainer}>
            {isDayTimePatternsLoading ? (
              <Text style={styles.loadingText}>Loading patterns...</Text>
            ) : (
              <Text style={styles.noDataText}>No pattern data available</Text>
            )}
          </View>
        </View>
      );
    }

    // Use dayOfWeekBreakdown for the line chart data
    const {dayOfWeekBreakdown, weekdayVsWeekend, summary} = dayTimePatterns;

    if (!dayOfWeekBreakdown || dayOfWeekBreakdown.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Day/Time Spending Patterns</Text>
          <Text style={styles.noDataText}>No pattern data available</Text>
        </View>
      );
    }

    const chartWidth = screenWidth - 80;
    const chartHeight = 160;
    const paddingX = 65; // Increased from 50 to 65 for more left space
    const paddingY = 30;
    const dataWidth = chartWidth - paddingX * 2;
    const dataHeight = chartHeight - paddingY * 2;

    // Prepare data for line chart
    const maxAmount = Math.max(...dayOfWeekBreakdown.map(d => d.amount), 1);
    const minAmount = Math.min(...dayOfWeekBreakdown.map(d => d.amount), 0);
    const range = maxAmount - minAmount || 1;

    // Create points for the line chart
    const points = dayOfWeekBreakdown.map((data, index) => {
      const x =
        paddingX + (index * dataWidth) / (dayOfWeekBreakdown.length - 1);
      const y =
        paddingY +
        dataHeight -
        ((data.amount - minAmount) / range) * dataHeight;
      return {x, y, data};
    });

    // Create SVG path for the line
    const pathData = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      // Create smooth curves
      const prevPoint = points[index - 1];
      const controlX1 = prevPoint.x + (point.x - prevPoint.x) * 0.3;
      const controlX2 = point.x - (point.x - prevPoint.x) * 0.3;
      return (
        path +
        ` C ${controlX1} ${prevPoint.y} ${controlX2} ${point.y} ${point.x} ${point.y}`
      );
    }, '');

    // Create area fill path
    const areaPath =
      pathData +
      ` L ${points[points.length - 1].x} ${paddingY + dataHeight}` +
      ` L ${points[0].x} ${paddingY + dataHeight} Z`;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Day/Time Spending Patterns</Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>
              Peak: {summary?.mostActiveDay?.day}
            </Text>
          </View>
        </View>

        {/* Line Chart */}
        <View style={styles.lineChartContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient
                id="areaGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%">
                <Stop
                  offset="0%"
                  stopColor={colors.primary || '#6366F1'}
                  stopOpacity="0.3"
                />
                <Stop
                  offset="100%"
                  stopColor={colors.primary || '#6366F1'}
                  stopOpacity="0.05"
                />
              </LinearGradient>
              <LinearGradient
                id="lineGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%">
                <Stop offset="0%" stopColor="#8B5CF6" />
                <Stop offset="50%" stopColor={colors.primary || '#6366F1'} />
                <Stop offset="100%" stopColor="#06B6D4" />
              </LinearGradient>
            </Defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = paddingY + dataHeight * ratio;
              return (
                <Path
                  key={index}
                  d={`M ${paddingX} ${y} L ${chartWidth - paddingX} ${y}`}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  opacity="0.5"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Area fill */}
            <Path d={areaPath} fill="url(#areaGradient)" />

            {/* Line */}
            <Path
              d={pathData}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="5"
                fill={colors.primary || '#6366F1'}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            ))}

            {/* Y-axis labels - positioned with more space */}
            <SvgText
              x={paddingX - 25}
              y={paddingY + 5}
              fontSize="10"
              fill={colors.textSecondary || '#6B7280'}
              textAnchor="end">
              {formatCurrency(maxAmount)}
            </SvgText>
            <SvgText
              x={paddingX - 25}
              y={paddingY + dataHeight + 5}
              fontSize="10"
              fill={colors.textSecondary || '#6B7280'}
              textAnchor="end">
              {formatCurrency(minAmount)}
            </SvgText>
          </Svg>

          {/* X-axis labels */}
          <View style={styles.xAxisLabels}>
            {dayOfWeekBreakdown.map((data, index) => (
              <Text key={index} style={styles.xAxisLabel}>
                {data.day.substring(0, 3)}
              </Text>
            ))}
          </View>
        </View>

        {/* Pattern Insights */}
        <View style={styles.patternInsights}>
          <View style={styles.insightRow}>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Weekdays</Text>
              <Text style={styles.insightValue}>
                {weekdayVsWeekend?.weekdays?.percentage?.toFixed(1)}%
              </Text>
              <Text style={styles.insightSubtext}>
                {formatCurrency(weekdayVsWeekend?.weekdays?.amount || 0)}
              </Text>
            </View>
            <View style={styles.insightDivider} />
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Weekends</Text>
              <Text style={styles.insightValue}>
                {weekdayVsWeekend?.weekends?.percentage?.toFixed(1)}%
              </Text>
              <Text style={styles.insightSubtext}>
                {formatCurrency(weekdayVsWeekend?.weekends?.amount || 0)}
              </Text>
            </View>
            <View style={styles.insightDivider} />
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Peak Hour</Text>
              <Text style={styles.insightValue}>
                {summary?.peakSpendingHour?.hourFormatted || 'N/A'}
              </Text>
              <Text style={styles.insightSubtext}>
                {formatCurrency(summary?.peakSpendingHour?.amount || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Pattern Recommendations */}
        {dayTimePatterns.insights && dayTimePatterns.insights.length > 0 && (
          <View style={styles.patternRecommendations}>
            <Text style={styles.recommendationTitle}>Pattern Insights</Text>
            {dayTimePatterns.insights.slice(0, 2).map((insight, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View
                  style={[
                    styles.recommendationIcon,
                    {
                      backgroundColor:
                        insight.type === 'warning' ? '#FEF3C7' : '#DBEAFE',
                    },
                  ]}>
                  <Icon
                    name={
                      insight.type === 'warning'
                        ? 'warning-outline'
                        : insight.type === 'tip'
                        ? 'bulb-outline'
                        : 'information-circle-outline'
                    }
                    size={16}
                    color={
                      insight.type === 'warning'
                        ? '#F59E0B'
                        : insight.type === 'tip'
                        ? '#8B5CF6'
                        : colors.primary
                    }
                  />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationText}>
                    {insight.message}
                  </Text>
                  {insight.suggestion && (
                    <Text style={styles.recommendationSuggestion}>
                      {insight.suggestion}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Render Daily Burn Rate Gauge Chart
  const renderBurnRateGauge = () => {
    if (!dailyBurnRate || typeof dailyBurnRate !== 'object') {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>No burn rate data available</Text>
        </View>
      );
    }

    const {
      currentDailyBurnRate = 0,
      sustainableDailyRate = 0,
      burnRateStatus = 'NORMAL',
    } = dailyBurnRate;

    const chartSize = screenWidth - 80;
    const radius = (chartSize - 40) / 2;
    const strokeWidth = 20;
    const centerX = chartSize / 2;
    const centerY = chartSize / 2;

    // Calculate gauge values
    const maxValue = Math.max(
      sustainableDailyRate * 1.5,
      currentDailyBurnRate * 1.2,
      100,
    );
    const currentAngle = (currentDailyBurnRate / maxValue) * 180; // 180 degrees for semicircle
    const sustainableAngle = (sustainableDailyRate / maxValue) * 180;

    // Create gauge arcs
    const circumference = Math.PI * radius;
    const sustainableOffset =
      circumference - (sustainableAngle / 180) * circumference;
    const currentOffset = circumference - (currentAngle / 180) * circumference;

    const statusColor = getStatusColor(burnRateStatus);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Daily Burn Rate</Text>

        <View
          style={[
            styles.gaugeContainer,
            {width: chartSize, height: chartSize / 2 + 40},
          ]}>
          <Svg
            width={chartSize}
            height={chartSize / 2 + 40}
            viewBox={`0 0 ${chartSize} ${chartSize / 2 + 40}`}>
            <G transform={`translate(${centerX}, ${centerY})`}>
              {/* Background arc */}
              <Circle
                cx={0}
                cy={0}
                r={radius}
                fill="none"
                stroke={colors.border || '#E5E7EB'}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={circumference / 2}
                strokeLinecap="round"
                transform="rotate(-90)"
              />

              {/* Sustainable rate arc */}
              <Circle
                cx={0}
                cy={0}
                r={radius}
                fill="none"
                stroke="#10B981"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={sustainableOffset}
                strokeLinecap="round"
                transform="rotate(-90)"
                opacity={0.3}
              />

              {/* Current burn rate arc */}
              <Circle
                cx={0}
                cy={0}
                r={radius}
                fill="none"
                stroke={statusColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={currentOffset}
                strokeLinecap="round"
                transform="rotate(-90)"
              />
            </G>

            {/* Center content */}
            <SvgText
              x={centerX}
              y={centerY - 10}
              textAnchor="middle"
              fontSize="24"
              fontWeight="bold"
              fill={colors.text || '#1F2937'}>
              {formatCurrency(currentDailyBurnRate)}
            </SvgText>
            <SvgText
              x={centerX}
              y={centerY + 15}
              textAnchor="middle"
              fontSize="14"
              fill={colors.textSecondary || '#6B7280'}>
              per day
            </SvgText>
          </Svg>
        </View>

        {/* Burn rate legend */}
        <View style={styles.burnRateLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: statusColor}]} />
            <Text style={styles.legendText}>
              Current: {formatCurrency(currentDailyBurnRate)}/day
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {backgroundColor: '#10B981', opacity: 0.6},
              ]}
            />
            <Text style={styles.legendText}>
              Sustainable: {formatCurrency(sustainableDailyRate)}/day
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ✅ FIXED: Render Weekly Trend Chart using weeklyTrendWithLabels
  const renderWeeklyTrend = () => {
    // Try to use the new weeklyTrendWithLabels first
    if (
      dailyBurnRate?.weeklyTrendWithLabels &&
      Array.isArray(dailyBurnRate.weeklyTrendWithLabels)
    ) {
      const {weeklyTrendWithLabels} = dailyBurnRate;
      const maxValue = Math.max(
        ...weeklyTrendWithLabels.map(item => item.amount),
        1,
      );
      const chartWidth = screenWidth - 80;
      const chartHeight = 120;
      const barWidth = (chartWidth - 60) / 7;

      return (
        <View style={styles.trendContainer}>
          <Text style={styles.trendTitle}>7-Day Spending Pattern</Text>

          <View style={styles.barChart}>
            {weeklyTrendWithLabels.map((item, index) => {
              const barHeight = (item.amount / maxValue) * chartHeight;
              const isToday = item.isToday;

              return (
                <View key={`${item.day}-${index}`} style={styles.barContainer}>
                  <View style={[styles.barColumn, {height: chartHeight}]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: isToday ? colors.primary : '#E5E7EB',
                          width: barWidth * 0.7,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isToday && styles.todayLabel]}>
                    {item.day}
                  </Text>
                  <Text style={styles.barValue}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    // Fallback to old method if weeklyTrendWithLabels is not available
    if (
      !dailyBurnRate?.weeklyTrend ||
      !Array.isArray(dailyBurnRate.weeklyTrend)
    ) {
      return null;
    }

    const {weeklyTrend} = dailyBurnRate;
    const maxValue = Math.max(...weeklyTrend, 1);
    const chartWidth = screenWidth - 80;
    const chartHeight = 120;
    const barWidth = (chartWidth - 60) / 7;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <View style={styles.trendContainer}>
        <Text style={styles.trendTitle}>7-Day Spending Pattern</Text>

        <View style={styles.barChart}>
          {weeklyTrend.map((amount, index) => {
            const barHeight = (amount / maxValue) * chartHeight;
            const isToday = index === weeklyTrend.length - 1; // Assume last bar is today

            return (
              <View key={index} style={styles.barContainer}>
                <View style={[styles.barColumn, {height: chartHeight}]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isToday ? colors.primary : '#E5E7EB',
                        width: barWidth * 0.7,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{days[index]}</Text>
                <Text style={styles.barValue}>{formatCurrency(amount)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Render insights and recommendations
  const renderInsights = () => {
    if (!dailyBurnRate) {
      return null;
    }

    const {
      burnRateStatus,
      daysUntilBudgetExceeded,
      recommendedDailySpending,
      monthlyIncomeCapacity,
      projectedMonthlySpending,
      sustainableDailyRate,
      currentDailyBurnRate,
    } = dailyBurnRate;

    const insights = [];

    // Generate insights based on burn rate status
    if (burnRateStatus === 'LOW') {
      insights.push({
        type: 'success',
        title: 'Great Spending Pace!',
        message:
          "You're spending well below your sustainable rate. You have room to increase spending if needed.",
        suggestion: `Consider setting aside the extra ${formatCurrency(
          sustainableDailyRate - currentDailyBurnRate,
        )}/day for savings or investments.`,
      });
    } else if (burnRateStatus === 'NORMAL') {
      insights.push({
        type: 'info',
        title: 'Balanced Spending',
        message: 'Your spending pace is sustainable based on your income.',
        suggestion:
          'Keep monitoring your daily spending to maintain this healthy balance.',
      });
    } else if (burnRateStatus === 'HIGH') {
      insights.push({
        type: 'warning',
        title: 'Above Sustainable Rate',
        message: "You're spending faster than your income can support.",
        suggestion: `Try to reduce daily spending to ${formatCurrency(
          recommendedDailySpending,
        )} to get back on track.`,
      });
    } else if (burnRateStatus === 'CRITICAL') {
      insights.push({
        type: 'error',
        title: 'Unsustainable Spending',
        message:
          'Your current spending pace is significantly above your income capacity.',
        suggestion: `Immediate action needed: reduce spending to ${formatCurrency(
          recommendedDailySpending,
        )}/day to avoid financial stress.`,
      });
    }

    // Add projection insight
    if (monthlyIncomeCapacity > 0) {
      const overspend = projectedMonthlySpending - monthlyIncomeCapacity;
      if (overspend > 0) {
        insights.push({
          type: 'warning',
          title: 'Monthly Projection',
          message: `At current pace, you'll overspend by ${formatCurrency(
            overspend,
          )} this month.`,
          suggestion: `Reduce spending by ${formatCurrency(
            overspend / 30,
          )}/day to stay within income.`,
        });
      }
    }

    // Add runway insight
    if (daysUntilBudgetExceeded && daysUntilBudgetExceeded < 30) {
      insights.push({
        type: 'error',
        title: 'Financial Runway',
        message: `At current spending rate, you'll exceed your monthly capacity in ${daysUntilBudgetExceeded} days.`,
        suggestion: 'Take immediate action to reduce daily expenses.',
      });
    }

    if (insights.length === 0) {
      return null;
    }

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Insights & Recommendations</Text>
        {insights.map((insight, index) => (
          <View
            key={index}
            style={[
              styles.insightCard,
              {
                borderLeftColor:
                  insight.type === 'error'
                    ? '#EF4444'
                    : insight.type === 'warning'
                    ? '#F59E0B'
                    : insight.type === 'success'
                    ? '#10B981'
                    : '#6366F1',
              },
            ]}>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightMessage}>{insight.message}</Text>
            </View>
            <Text style={styles.insightSuggestion}>{insight.suggestion}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}>
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{translateX: modalAnim}],
            },
          ]}>
          <View style={styles.header}>
            <Text style={styles.title}>Spending Analysis</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
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
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Icon
                  name="speedometer-outline"
                  size={20}
                  color={colors.primary || '#6366F1'}
                />
                <Text style={styles.summaryLabel}>Daily Burn Rate Status</Text>
              </View>
              <Text
                style={[
                  styles.summaryStatus,
                  {
                    color: getStatusColor(
                      dailyBurnRate?.burnRateStatus || 'NORMAL',
                    ),
                  },
                ]}>
                {dailyBurnRate?.burnRateStatus || 'NORMAL'}
              </Text>
              {userProfile?.income && (
                <Text style={styles.summarySubtext}>
                  Based on your {userProfile.incomeFrequency?.toLowerCase()}{' '}
                  income of {formatCurrency(userProfile.income)}
                </Text>
              )}
            </View>

            {/* Daily Burn Rate Gauge */}
            {renderBurnRateGauge()}

            {/* Weekly Trend */}
            {renderWeeklyTrend()}

            {/* ✅ NEW: Day/Time Patterns Chart */}
            {renderDayTimePatternsChart()}

            {/* Insights */}
            {renderInsights()}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.background || '#F8FAFC',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E5E7EB',
    backgroundColor: colors.primary || '#6366F1',
  },
  title: {
    fontSize: 18,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite || '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.textWhite || '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: colors.surface || '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.textSecondary || '#6B7280',
    marginLeft: 8,
    fontFamily: 'System',
  },
  summaryStatus: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'System',
  },
  summarySubtext: {
    fontSize: 12,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    fontFamily: 'System',
  },
  chartContainer: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: colors.text || '#1F2937',
    fontFamily: 'System',
  },
  summaryBadge: {
    backgroundColor: colors.primary || '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textWhite || '#FFFFFF',
    fontFamily: 'System',
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  lineChartContainer: {
    marginBottom: 20,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 65, // Updated to match the increased paddingX
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
    textAlign: 'center',
    flex: 1,
  },
  patternInsights: {
    marginBottom: 16,
  },
  insightRow: {
    flexDirection: 'row',
    backgroundColor: colors.background || '#F8FAFC',
    borderRadius: 8,
    padding: 16,
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightDivider: {
    width: 1,
    backgroundColor: colors.border || '#E5E7EB',
    marginHorizontal: 16,
  },
  insightLabel: {
    fontSize: 12,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text || '#1F2937',
    fontFamily: 'System',
    marginBottom: 2,
  },
  insightSubtext: {
    fontSize: 10,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  patternRecommendations: {
    marginTop: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text || '#1F2937',
    fontFamily: 'System',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationText: {
    fontSize: 13,
    color: colors.text || '#1F2937',
    fontFamily: 'System',
    lineHeight: 18,
    marginBottom: 4,
  },
  recommendationSuggestion: {
    fontSize: 12,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: '8%',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.background || '#F8FAFC',
    zIndex: 10,
    elevation: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
    textAlign: 'center',
  },
  burnRateLegend: {
    marginTop: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  trendContainer: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: colors.text || '#1F2937',
    marginBottom: 20,
    fontFamily: 'System',
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 4,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barColumn: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary || '#6B7280',
    marginBottom: 2,
    fontFamily: 'System',
  },
  // ✅ NEW: Style for today's label
  todayLabel: {
    fontSize: 10,
    color: colors.primary || '#6366F1',
    marginBottom: 2,
    fontFamily: 'System',
    fontWeight: '600',
  },
  barValue: {
    fontSize: 9,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  insightsContainer: {
    marginBottom: 24,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'System',
    marginBottom: 15,
    color: colors.text || '#1F2937',
  },
  insightCard: {
    padding: 16,
    backgroundColor: colors.background || '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  insightContent: {
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text || '#1F2937',
    marginBottom: 4,
    fontFamily: 'System',
  },
  insightMessage: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    lineHeight: 20,
  },
  insightSuggestion: {
    fontSize: 13,
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 16,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    marginVertical: 40,
    fontFamily: 'System',
  },
});

export default SpendingVelocityBreakdown;
