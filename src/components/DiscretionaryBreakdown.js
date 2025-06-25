/* eslint-disable react-native/no-inline-styles */
// eslint-disable-next-line no-unused-vars
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
import Svg, {Path, G} from 'react-native-svg';
import {colors} from '../styles';
import CalendarModal from './CalendarModal';

const {width: screenWidth} = Dimensions.get('window');

// Function to get category icon
const getCategoryIcon = categoryName => {
  const category = categoryName.toLowerCase();
  switch (category) {
    case 'food':
    case 'restaurant':
    case 'dining':
    case 'groceries':
      return 'restaurant-outline';
    case 'transport':
    case 'transportation':
    case 'gas':
    case 'fuel':
    case 'car':
      return 'car-outline';
    case 'shopping':
    case 'retail':
    case 'clothes':
    case 'clothing':
      return 'bag-outline';
    case 'entertainment':
    case 'movies':
    case 'gaming':
      return 'game-controller-outline';
    case 'health':
    case 'medical':
    case 'pharmacy':
      return 'medical-outline';
    case 'home':
    case 'utilities':
    case 'household':
      return 'home-outline';
    case 'education':
    case 'books':
    case 'learning':
      return 'book-outline';
    case 'travel':
    case 'vacation':
    case 'hotel':
      return 'airplane-outline';
    case 'gifts':
    case 'donations':
      return 'gift-outline';
    case 'coffee':
    case 'cafe':
      return 'cafe-outline';
    default:
      return 'ellipsis-horizontal-outline';
  }
};

const DiscretionaryBreakdown = ({
  // ✅ PURE UI PROPS - All data comes from container
  visible,
  onClose,
  onRefresh,
  onCalendarOpen,
  onDateChange,
  onCategoryPress,

  // ✅ DATA PROPS - Processed by container
  isLoading,
  refreshing,
  selectedDate,
  selectedPeriod,
  breakdownData,
  expandedCategories,
  showCalendar,

  // ✅ BREAKDOWN DATA STRUCTURE
  // breakdownData = {
  //   period: {
  //     label: string,
  //     discretionaryAmount: number,
  //     isCustomDate: boolean
  //   },
  //   categories: [{
  //     name: string,
  //     amount: number,
  //     color: string,
  //     originalColor: string,
  //     transactions: array,
  //     subcategories: [{
  //       name: string,
  //       amount: number,
  //       percentage: string
  //     }],
  //     hasSubcategories: boolean
  //   }],
  //   insights: [{
  //     category: string,
  //     message: string,
  //     suggestion: string,
  //     type: 'warning' | 'success' | 'info'
  //   }],
  //   totalAmount: number,
  //   totalTransactions: number
  // }
}) => {
  // ✅ ANIMATIONS - Keep original animations
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ PURE UI STATE - Only UI-related state
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // ✅ Helper function like TransactionCard uses
  const getLightBackgroundColor = color => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  // ✅ UI EVENT HANDLERS - Pass events to container
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
      onClose();
    });
  };

  const handleCalendarOpen = () => {
    setCalendarModalVisible(true);
    onCalendarOpen?.();
  };

  const handleCalendarClose = () => {
    setCalendarModalVisible(false);
  };

  const handleDateChange = date => {
    setCalendarModalVisible(false);
    onDateChange?.(date);
  };

  const handleCategoryPress = categoryName => {
    onCategoryPress?.(categoryName);
  };

  const handleRefresh = () => {
    onRefresh?.();
  };

  // ✅ OPEN ANIMATION - Keep original animation
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

  // ✅ DONUT CHART RENDERER - Keep original chart logic
  const renderDonutChart = () => {
    const chartWidth = screenWidth - 40;
    const chartHeight = 280;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 20;
    const strokeWidth = 50;
    const innerRadius = radius - strokeWidth;
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;

    const currentData = breakdownData?.categories || [];
    const totalTransactions = breakdownData?.totalTransactions || 0;

    if (!currentData || currentData.length === 0) {
      return (
        <View style={[styles.chartContainer, {height: chartHeight}]}>
          <View style={styles.donutCenterContent}>
            <Text style={styles.donutCenterNumber}>0</Text>
            <Text style={styles.donutCenterLabel}>Expenses</Text>
          </View>
          <Text style={styles.noDataText}>No category data available</Text>
        </View>
      );
    }

    const total = currentData.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );

    if (total === 0) {
      return (
        <View style={[styles.chartContainer, {height: chartHeight}]}>
          <View style={styles.donutCenterContent}>
            <Text style={styles.donutCenterNumber}>0</Text>
            <Text style={styles.donutCenterLabel}>Expenses</Text>
          </View>
          <Text style={styles.noDataText}>No spending data available</Text>
        </View>
      );
    }

    let currentAngle = 0;
    const segments = currentData.map((item, index) => {
      const amount = item.amount || 0;
      const angle = (amount / total) * 360;
      const segment = {
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        angle: angle,
      };
      currentAngle += angle;

      return segment;
    });

    const toRadians = degrees => degrees * (Math.PI / 180);

    // eslint-disable-next-line no-shadow
    const createPath = (startAngle, endAngle, outerRadius, innerRadius) => {
      if (endAngle - startAngle < 0.1) {
        return '';
      }

      if (innerRadius <= 0 || outerRadius <= innerRadius) {
        return '';
      }

      if (endAngle - startAngle >= 359.9) {
        const pathData = `
          M 0,${-outerRadius}
          A ${outerRadius},${outerRadius} 0 1,1 0,${outerRadius}
          A ${outerRadius},${outerRadius} 0 1,1 0,${-outerRadius}
          M 0,${-innerRadius}
          A ${innerRadius},${innerRadius} 0 1,0 0,${innerRadius}
          A ${innerRadius},${innerRadius} 0 1,0 0,${-innerRadius}
          Z`
          .replace(/\s+/g, ' ')
          .trim();
        return pathData;
      }

      const start = toRadians(startAngle - 90);
      const end = toRadians(endAngle - 90);

      const x1 = Math.cos(start) * outerRadius;
      const y1 = Math.sin(start) * outerRadius;
      const x2 = Math.cos(end) * outerRadius;
      const y2 = Math.sin(end) * outerRadius;

      const x3 = Math.cos(end) * innerRadius;
      const y3 = Math.sin(end) * innerRadius;
      const x4 = Math.cos(start) * innerRadius;
      const y4 = Math.sin(start) * innerRadius;

      const largeArc = endAngle - startAngle > 180 ? 1 : 0;

      const pathData = `M ${x1.toFixed(2)},${y1.toFixed(
        2,
      )} A ${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2.toFixed(
        2,
      )},${y2.toFixed(2)} L ${x3.toFixed(2)},${y3.toFixed(
        2,
      )} A ${innerRadius},${innerRadius} 0 ${largeArc},0 ${x4.toFixed(
        2,
      )},${y4.toFixed(2)} Z`;

      return pathData;
    };

    return (
      <View style={styles.chartContainer}>
        <View
          style={{
            position: 'relative',
            width: chartWidth,
            height: chartHeight,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Svg
            width={chartWidth}
            height={chartHeight}
            style={{position: 'absolute'}}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            <G transform={`translate(${centerX}, ${centerY})`}>
              {segments.map((segment, index) => {
                const pathData = createPath(
                  segment.startAngle,
                  segment.endAngle,
                  radius,
                  innerRadius,
                );

                if (!pathData) {
                  return null;
                }

                // ✅ FIXED: Use backend category color directly (like TransactionCard)
                const categoryColor = segment.color || '#CCCCCC';

                return (
                  <Path
                    key={index}
                    d={pathData}
                    fill={categoryColor}
                    stroke="#ffffff"
                    strokeWidth="4"
                  />
                );
              })}
            </G>
          </Svg>

          <View style={styles.donutCenterContent}>
            <Text style={styles.donutCenterNumber}>{totalTransactions}</Text>
            <Text style={styles.donutCenterLabel}>Expenses</Text>
          </View>
        </View>
      </View>
    );
  };

  // ✅ INSIGHTS RENDERER - Keep original insights UI
  const renderInsights = () => {
    const insights = breakdownData?.insights || [];

    if (insights.length === 0) {
      return null;
    }

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Spending Insights</Text>
        {insights.map((insight, index) => (
          <View
            key={index}
            style={[
              styles.insightCard,
              {
                borderLeftColor:
                  insight.type === 'warning'
                    ? '#FF6B6B'
                    : insight.type === 'success'
                    ? '#10B981'
                    : '#6366F1',
              },
            ]}>
            <View style={styles.insightContent}>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>{insight.category}:</Text>{' '}
                {insight.message}
              </Text>
            </View>
            <Text style={styles.insightSuggestion}>{insight.suggestion}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ✅ PERIOD LABEL HELPER
  const getCurrentPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily':
        return 'today';
      case 'weekly':
        return 'this week';
      case 'monthly':
        return 'this month';
      default:
        return 'this period';
    }
  };

  // ✅ NO DATA STATE - Keep original no data UI
  const renderNoDataState = () => {
    const periodLabel = getCurrentPeriodLabel();

    const displayPeriod = {
      label:
        selectedPeriod === 'daily'
          ? selectedDate?.toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
            }) || 'Today'
          : selectedPeriod === 'weekly'
          ? `Week of ${
              selectedDate?.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }) || 'This Week'
            }`
          : selectedDate?.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            }) || 'This Month',
      discretionaryAmount: 0,
    };

    return (
      <View style={styles.noDataFullContainer}>
        <TouchableOpacity
          style={styles.summaryCard}
          onPress={handleCalendarOpen}
          activeOpacity={0.7}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>Selected Period</Text>
            <Icon
              name="calendar-outline"
              size={16}
              color={colors.primary || '#6366F1'}
            />
          </View>
          <Text style={styles.summaryTitle}>{displayPeriod.label}</Text>
          <Text style={styles.summaryAmount}>$0.00</Text>
          <Text style={styles.summarySubtext}>in discretionary spending</Text>
          <Text style={styles.tapHint}>Tap to change date</Text>
        </TouchableOpacity>

        <View style={styles.noDataMessageContainer}>
          <Text style={styles.noDataText}>
            No transaction data {periodLabel}.
          </Text>
          <Text style={styles.noDataSubtext}>
            Try checking a different date or add some transactions to see the
            breakdown.
          </Text>
        </View>
      </View>
    );
  };

  if (!visible) {
    return null;
  }

  const currentData = breakdownData?.categories || [];
  const totalAmount = breakdownData?.totalAmount || 0;
  const period = breakdownData?.period;

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
            <Text style={styles.title}>Discretionary Spending Breakdown</Text>
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
                onRefresh={handleRefresh}
                colors={[colors.primary || '#6366F1']}
                tintColor={colors.primary || '#6366F1'}
                title="Pull to refresh..."
                titleColor={colors.textSecondary || '#6B7280'}
              />
            }>
            {period ? (
              <>
                <TouchableOpacity
                  style={styles.summaryCard}
                  onPress={handleCalendarOpen}
                  activeOpacity={0.7}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryLabel}>
                      {period.isCustomDate
                        ? 'Selected Period'
                        : 'Highest Spending Period'}
                    </Text>
                    <Icon
                      name="calendar-outline"
                      size={16}
                      color={colors.primary || '#6366F1'}
                    />
                  </View>
                  <Text style={styles.summaryTitle}>{period.label}</Text>
                  <Text style={styles.summaryAmount}>
                    ${period.discretionaryAmount?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.summarySubtext}>
                    in discretionary spending
                  </Text>
                  <Text style={styles.tapHint}>Tap to change date</Text>
                </TouchableOpacity>

                {currentData.length > 0 ? (
                  <>
                    {renderDonutChart()}

                    <View style={styles.categoriesContainer}>
                      <Text style={styles.categoriesTitle}>
                        Category Breakdown
                      </Text>
                      {currentData.map((item, index) => {
                        const percentage =
                          totalAmount > 0
                            ? ((item.amount / totalAmount) * 100).toFixed(1)
                            : '0.0';
                        const iconName = getCategoryIcon(item.name);
                        const isExpanded =
                          expandedCategories?.has?.(item.name) || false;
                        const canExpand = item.subcategories?.length > 0; // ✅ FIXED: Just check if subcategories exist

                        // ✅ FIXED: Use backend category color directly (like TransactionCard)
                        const categoryColor = item.color || '#CCCCCC';

                        console.log('🎨 Category color debug:', {
                          name: item.name,
                          backendColor: item.color,
                          originalColor: item.originalColor,
                          hasSubcategories: item.hasSubcategories,
                          subcategoriesLength: item.subcategories?.length,
                          canExpand: canExpand,
                          isExpanded: isExpanded,
                        });

                        return (
                          <View key={index} style={styles.categoryItem}>
                            <TouchableOpacity
                              onPress={() => handleCategoryPress(item.name)}
                              activeOpacity={0.7}>
                              <View style={styles.categoryHeader}>
                                <View style={styles.categoryLeft}>
                                  <View
                                    style={[
                                      styles.categoryIconContainer,
                                      {
                                        backgroundColor:
                                          getLightBackgroundColor(
                                            categoryColor,
                                          ),
                                      },
                                    ]}>
                                    <Icon
                                      name={iconName}
                                      size={20}
                                      color={categoryColor}
                                    />
                                  </View>
                                  <View style={styles.categoryInfo}>
                                    <Text style={styles.categoryName}>
                                      {item.name}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.categoryRight}>
                                  <Text style={styles.categoryAmount}>
                                    ${item.amount?.toFixed(2) || '0.00'}
                                  </Text>
                                  <Text style={styles.categoryPercentage}>
                                    {percentage}%
                                  </Text>
                                </View>
                                {/* ✅ FIXED: Show chevron only if subcategories exist */}
                                {canExpand && (
                                  <Icon
                                    name={
                                      isExpanded ? 'chevron-up' : 'chevron-down'
                                    }
                                    size={16}
                                    color="#999"
                                    style={styles.chevron}
                                  />
                                )}
                              </View>
                            </TouchableOpacity>

                            {isExpanded && item.subcategories?.length > 0 && (
                              <View style={styles.subcategoriesContainer}>
                                {item.subcategories.map((subItem, subIndex) => {
                                  // ✅ FIXED: Proper logging outside JSX
                                  console.log(
                                    '🔍 Subcategory',
                                    subIndex,
                                    ':',
                                    subItem,
                                  );

                                  return (
                                    <View
                                      key={subIndex}
                                      style={styles.subcategoryItem}>
                                      <View style={styles.subcategoryLeft}>
                                        <View
                                          style={[
                                            styles.subcategoryDot,
                                            {backgroundColor: categoryColor},
                                          ]}
                                        />
                                        <Text style={styles.subcategoryName}>
                                          {subItem.subcategoryName ||
                                            subItem.name ||
                                            'General'}
                                        </Text>
                                      </View>
                                      <View style={styles.subcategoryRight}>
                                        <Text style={styles.subcategoryAmount}>
                                          ${(subItem.amount || 0).toFixed(2)}
                                        </Text>
                                        <Text
                                          style={styles.subcategoryPercentage}>
                                          {(subItem.percentage || 0).toFixed(1)}
                                          %
                                        </Text>
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {renderInsights()}
                  </>
                ) : (
                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>
                      No discretionary spending categories found for this
                      period.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              renderNoDataState()
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>

      <CalendarModal
        visible={calendarModalVisible}
        onClose={handleCalendarClose}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />
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
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '300',
    color: colors.textSecondary || '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
    fontFamily: 'System',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.text || '#1F2937',
    marginBottom: 4,
    fontFamily: 'System',
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.primary || '#6366F1',
    marginBottom: 4,
    fontFamily: 'System',
  },
  summarySubtext: {
    fontSize: 14,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  tapHint: {
    fontSize: 12,
    color: colors.primary || '#6366F1',
    fontFamily: 'System',
    marginTop: 8,
    opacity: 0.8,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  donutCenterContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text || '#1F2937',
    fontFamily: 'System',
  },
  donutCenterLabel: {
    fontSize: 14,
    color: colors.textSecondary || '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
    textAlign: 'center',
    marginTop: 2,
  },
  donutCenterValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary || '#6366F1',
    fontFamily: 'System',
    marginTop: 4,
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
    padding: 12,
    backgroundColor: colors.background || '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  insightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.text || '#1F2937',
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
  },
  insightBold: {
    fontWeight: '600',
    fontFamily: 'System',
  },
  insightFrequency: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.primary || '#6366F1',
    backgroundColor: `${colors.primary || '#6366F1'}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  insightSuggestion: {
    fontSize: 13,
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
    lineHeight: 18,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: colors.text || '#1F2937',
    marginBottom: 16,
    fontFamily: 'System',
  },
  categoryItem: {
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '300',
    color: colors.text || '#1F2937',
    fontFamily: 'System',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '300',
    color: colors.text || '#1F2937',
    fontFamily: 'System',
  },
  categoryPercentage: {
    fontSize: 12,
    color: colors.textSecondary || '#6B7280',
    marginTop: 2,
    fontFamily: 'System',
  },
  chevron: {
    marginLeft: 8,
  },
  subcategoriesContainer: {
    marginTop: 12,
    paddingLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: colors.border || '#E5E7EB',
  },
  subcategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  subcategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subcategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary || '#6B7280',
    marginRight: 12,
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  subcategoryRight: {
    alignItems: 'flex-end',
  },
  subcategoryAmount: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  subcategoryPercentage: {
    fontSize: 11,
    color: colors.textSecondary || '#6B7280',
    marginTop: 1,
    fontFamily: 'System',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noDataFullContainer: {
    flex: 1,
  },
  noDataMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  calendarAccessCard: {
    backgroundColor: colors.surface || '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
  },
  calendarIcon: {
    marginBottom: 12,
  },
  calendarAccessTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: colors.text || '#1F2937',
    marginBottom: 8,
    fontFamily: 'System',
  },
  calendarAccessSubtext: {
    fontSize: 14,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    fontFamily: 'System',
  },
  noDataText: {
    fontSize: 16,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'System',
  },
  noDataSubtext: {
    fontSize: 14,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    opacity: 0.8,
    fontFamily: 'System',
  },
});

export default DiscretionaryBreakdown;
