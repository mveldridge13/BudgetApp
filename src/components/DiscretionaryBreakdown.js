/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useMemo, useState, useEffect, useCallback} from 'react';
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
import CategoryService from '../services/categoryService';
import InsightsService from '../services/InsightsService';

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
  visible,
  onClose,
  transactions,
  selectedPeriod,
  periodData,
  isRecurringTransaction,
  allTransactions, // Complete transaction history
  previousPeriodData, // Previous period data for comparison
}) => {
  // Animations
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const loadedCategories = await CategoryService.getCategories();
      setCategories(loadedCategories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      await loadCategories();
    } catch (error) {
      console.error('Error refreshing breakdown data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  // Helper to get transactions for current period
  const getCurrentPeriodTransactions = useCallback(
    period => {
      return InsightsService.getTransactionsForPeriod(
        allTransactions || transactions,
        period,
        selectedPeriod,
        isRecurringTransaction,
      );
    },
    [allTransactions, transactions, selectedPeriod, isRecurringTransaction],
  );

  // Helper to get previous period
  const getPreviousPeriod = useCallback(
    currentPeriod => {
      if (previousPeriodData && previousPeriodData.length > 0) {
        // Try to find matching previous period from provided data
        if (selectedPeriod === 'daily' && currentPeriod.date) {
          const targetDate = new Date(currentPeriod.date);
          targetDate.setDate(targetDate.getDate() - 1);
          return previousPeriodData.find(p => {
            if (!p.date) {
              return false;
            }
            return (
              p.date.getDate() === targetDate.getDate() &&
              p.date.getMonth() === targetDate.getMonth() &&
              p.date.getFullYear() === targetDate.getFullYear()
            );
          });
        } else if (selectedPeriod === 'weekly' && currentPeriod.startDate) {
          const targetStart = new Date(currentPeriod.startDate);
          targetStart.setDate(targetStart.getDate() - 7);
          return previousPeriodData.find(p => {
            if (!p.startDate) {
              return false;
            }
            return (
              Math.abs(p.startDate.getTime() - targetStart.getTime()) <
              24 * 60 * 60 * 1000
            );
          });
        } else if (selectedPeriod === 'monthly' && currentPeriod.monthDate) {
          const targetMonth = new Date(currentPeriod.monthDate);
          targetMonth.setMonth(targetMonth.getMonth() - 1);
          return previousPeriodData.find(p => {
            if (!p.monthDate) {
              return false;
            }
            return (
              p.monthDate.getMonth() === targetMonth.getMonth() &&
              p.monthDate.getFullYear() === targetMonth.getFullYear()
            );
          });
        }
      }

      // Fallback: calculate previous period
      return InsightsService.calculatePreviousPeriod(
        currentPeriod,
        selectedPeriod,
      );
    },
    [previousPeriodData, selectedPeriod],
  );

  // Function to get category color based on category name
  const getCategoryColor = categoryName => {
    const category = categoryName.toLowerCase();
    switch (category) {
      case 'food':
      case 'restaurant':
      case 'dining':
      case 'groceries':
        return '#FF6B6B';
      case 'transport':
      case 'transportation':
      case 'gas':
      case 'fuel':
      case 'car':
        return '#4ECDC4';
      case 'shopping':
      case 'retail':
      case 'clothes':
      case 'clothing':
        return '#45B7D1';
      case 'entertainment':
      case 'movies':
      case 'gaming':
        return '#96CEB4';
      case 'health':
      case 'medical':
      case 'pharmacy':
        return '#FF9FF3';
      case 'home':
      case 'utilities':
      case 'household':
      case 'bills':
        return '#FECA57';
      case 'education':
      case 'books':
      case 'learning':
        return '#A8A8A8';
      case 'travel':
      case 'vacation':
      case 'hotel':
        return '#FF8C42';
      case 'gifts':
      case 'donations':
        return '#6C5CE7';
      case 'coffee':
      case 'cafe':
        return '#FD79A8';
      default:
        return '#A8A8A8';
    }
  };

  // Helper function to create dynamic category icon style
  const getCategoryIconStyle = color => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return {
      ...styles.categoryIconContainer,
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
    };
  };

  // Map category names to CategoryService IDs
  const getCategoryIdFromName = useCallback(categoryName => {
    const categoryMap = {
      food: 'food',
      restaurant: 'food',
      dining: 'food',
      groceries: 'food',
      transport: 'transport',
      transportation: 'transport',
      gas: 'transport',
      fuel: 'transport',
      car: 'transport',
      shopping: 'shopping',
      retail: 'shopping',
      clothes: 'shopping',
      clothing: 'shopping',
      entertainment: 'entertainment',
      movies: 'entertainment',
      gaming: 'entertainment',
      health: 'health',
      medical: 'health',
      pharmacy: 'health',
      home: 'bills',
      utilities: 'bills',
      household: 'bills',
      bills: 'bills',
    };
    return categoryMap[categoryName.toLowerCase()] || 'other';
  }, []);

  // Get category info from CategoryService
  const getCategoryInfo = useCallback(
    categoryName => {
      const categoryId = getCategoryIdFromName(categoryName);
      return categories.find(cat => cat.id === categoryId) || null;
    },
    [categories, getCategoryIdFromName],
  );

  // Handle category expand/collapse
  const handleCategoryPress = useCallback(
    categoryName => {
      const category = getCategoryInfo(categoryName);
      if (category?.hasSubcategories) {
        setExpandedCategories(prev => {
          const newSet = new Set(prev);
          if (newSet.has(categoryName)) {
            newSet.delete(categoryName);
          } else {
            newSet.add(categoryName);
          }
          return newSet;
        });
      }
    },
    [getCategoryInfo],
  );

  // Reset form function
  const resetForm = () => {
    modalAnim.setValue(screenWidth);
    fadeAnim.setValue(0);
    setShowCalendar(false);
    setSelectedDate(new Date());
    setExpandedCategories(new Set());
    setRefreshing(false);
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

  // Get the breakdown data for selected date or highest spending period
  const breakdownData = useMemo(() => {
    if (!transactions.length || !periodData.length) {
      return {period: null, categories: [], insights: [], isCustomDate: false};
    }

    let targetPeriod = null;
    let isCustomDate = false;

    // Check if we should show data for the selected date instead of highest period
    if (selectedDate) {
      if (selectedPeriod === 'daily') {
        targetPeriod = periodData.find(p => {
          if (!p.date) {
            return false;
          }
          return (
            p.date.getDate() === selectedDate.getDate() &&
            p.date.getMonth() === selectedDate.getMonth() &&
            p.date.getFullYear() === selectedDate.getFullYear()
          );
        });
      } else if (selectedPeriod === 'weekly') {
        targetPeriod = periodData.find(p => {
          if (!p.startDate || !p.endDate) {
            return false;
          }
          return selectedDate >= p.startDate && selectedDate <= p.endDate;
        });
      } else if (selectedPeriod === 'monthly') {
        targetPeriod = periodData.find(p => {
          if (!p.monthDate) {
            return false;
          }
          return (
            p.monthDate.getMonth() === selectedDate.getMonth() &&
            p.monthDate.getFullYear() === selectedDate.getFullYear()
          );
        });
      }

      if (targetPeriod) {
        isCustomDate = true;
      }
    }

    // If no custom date period found, use highest spending period
    if (!targetPeriod) {
      targetPeriod = periodData.reduce((max, current) =>
        current.discretionaryAmount > max.discretionaryAmount ? current : max,
      );
    }

    if (!targetPeriod || targetPeriod.discretionaryAmount === 0) {
      return {period: null, categories: [], insights: [], isCustomDate};
    }

    // Get transactions for the target period
    let periodTransactions = [];

    if (selectedPeriod === 'daily' && targetPeriod.date) {
      periodTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate.getDate() === targetPeriod.date.getDate() &&
          transactionDate.getMonth() === targetPeriod.date.getMonth() &&
          transactionDate.getFullYear() === targetPeriod.date.getFullYear() &&
          !isRecurringTransaction(t)
        );
      });
    } else if (
      selectedPeriod === 'weekly' &&
      targetPeriod.startDate &&
      targetPeriod.endDate
    ) {
      periodTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate >= targetPeriod.startDate &&
          transactionDate <= targetPeriod.endDate &&
          !isRecurringTransaction(t)
        );
      });
    } else if (selectedPeriod === 'monthly' && targetPeriod.monthDate) {
      periodTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate.getMonth() === targetPeriod.monthDate.getMonth() &&
          transactionDate.getFullYear() ===
            targetPeriod.monthDate.getFullYear() &&
          !isRecurringTransaction(t)
        );
      });
    }

    // Group by category and calculate totals
    const categoryTotals = {};
    const categoryTransactions = {};

    periodTransactions.forEach(transaction => {
      const category = transaction.category || 'Other';
      const amount = Math.abs(transaction.amount);

      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
        categoryTransactions[category] = [];
      }
      categoryTotals[category] += amount;
      categoryTransactions[category].push(transaction);
    });

    // Helper function to create lighter colors for pie chart
    const getLightColor = color => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.8)`;
    };

    // Convert to chart format with colors and add subcategory breakdown
    const processedCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => {
        const categoryInfo = getCategoryInfo(category);
        const color = getCategoryColor(category);

        // Calculate subcategories for this category
        const subcategories = [];
        const categoryTransactionList = categoryTransactions[category] || [];

        if (
          categoryInfo?.hasSubcategories &&
          categoryTransactionList.length > 0
        ) {
          const subcategoryMap = {};

          categoryTransactionList.forEach(transaction => {
            // Use CategoryService subcategories instead of hardcoded logic
            let subcategoryName = 'General';
            const desc = (transaction.description || '').toLowerCase();

            // Check against all subcategories in the CategoryService
            if (
              categoryInfo.subcategories &&
              categoryInfo.subcategories.length > 0
            ) {
              // Try to match transaction description to subcategory names
              const matchedSubcategory = categoryInfo.subcategories.find(
                sub => {
                  const subName = sub.name.toLowerCase();
                  // Direct name match
                  if (desc.includes(subName)) {
                    return true;
                  }

                  // Additional keyword matching based on subcategory names
                  if (
                    subName.includes('takeout') &&
                    (desc.includes('uber') ||
                      desc.includes('doordash') ||
                      desc.includes('delivery'))
                  ) {
                    return true;
                  }
                  if (
                    subName.includes('grocery') &&
                    (desc.includes('woolworth') ||
                      desc.includes('coles') ||
                      desc.includes('supermarket'))
                  ) {
                    return true;
                  }
                  if (
                    subName.includes('coffee') &&
                    (desc.includes('starbucks') || desc.includes('cafe'))
                  ) {
                    return true;
                  }
                  if (
                    subName.includes('fuel') &&
                    (desc.includes('gas') ||
                      desc.includes('petrol') ||
                      desc.includes('shell') ||
                      desc.includes('bp'))
                  ) {
                    return true;
                  }
                  if (
                    subName.includes('pharmacy') &&
                    (desc.includes('chemist') || desc.includes('medication'))
                  ) {
                    return true;
                  }
                  if (
                    subName.includes('subscription') &&
                    (desc.includes('netflix') ||
                      desc.includes('spotify') ||
                      desc.includes('monthly'))
                  ) {
                    return true;
                  }

                  return false;
                },
              );

              if (matchedSubcategory) {
                subcategoryName = matchedSubcategory.name;
              }
            }

            const subAmount = Math.abs(transaction.amount);
            subcategoryMap[subcategoryName] =
              (subcategoryMap[subcategoryName] || 0) + subAmount;
          });

          // Convert to subcategory array
          Object.entries(subcategoryMap).forEach(([subName, subAmount]) => {
            subcategories.push({
              name: subName,
              amount: subAmount,
              percentage: ((subAmount / amount) * 100).toFixed(1),
            });
          });

          // Sort subcategories by amount
          subcategories.sort((a, b) => b.amount - a.amount);
        }

        return {
          name: category,
          categoryName: category,
          amount: amount,
          color: getLightColor(color),
          originalColor: color,
          legendFontColor: colors.text || '#1F2937',
          legendFontSize: 12,
          transactions: categoryTransactionList,
          subcategories: subcategories,
          hasSubcategories: categoryInfo?.hasSubcategories || false,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Generate insights using InsightsService
    const currentTransactions = getCurrentPeriodTransactions(targetPeriod);
    const previousPeriod = getPreviousPeriod(targetPeriod);
    const previousTransactions = previousPeriod
      ? getCurrentPeriodTransactions(previousPeriod)
      : [];

    const insights = InsightsService.generateInsights(
      processedCategories,
      targetPeriod,
      previousPeriod,
      currentTransactions,
      previousTransactions,
      selectedPeriod,
    );

    // ADD DEBUG LOGS:
    console.log('=== INSIGHT DEBUG ===');
    console.log('selectedPeriod:', selectedPeriod);
    console.log('targetPeriod:', targetPeriod);
    console.log('previousPeriod:', previousPeriod);
    console.log('currentTransactions count:', currentTransactions.length);
    console.log('previousTransactions count:', previousTransactions.length);
    console.log('currentTransactions:', currentTransactions);
    console.log('previousTransactions:', previousTransactions);
    console.log('insights generated:', insights);
    console.log('===================');

    return {
      period: targetPeriod,
      categories: processedCategories,
      insights,
      isCustomDate,
    };
  }, [
    transactions,
    periodData,
    selectedPeriod,
    isRecurringTransaction,
    selectedDate,
    getCategoryInfo,
    getCurrentPeriodTransactions,
    getPreviousPeriod,
  ]);

  // Donut Chart Renderer
  const renderDonutChart = () => {
    const chartWidth = screenWidth - 40; // Less padding for bigger chart
    const chartHeight = 280; // Increased from 220
    const radius = Math.min(chartWidth, chartHeight) / 2 - 20;
    const strokeWidth = 50; // Thick but proportional to larger chart
    const innerRadius = radius - strokeWidth;
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;

    // Debug logging
    console.log('=== DONUT CHART DEBUG ===');
    console.log('currentData:', currentData);
    console.log('currentData length:', currentData.length);
    console.log('breakdownData.period:', breakdownData.period);
    console.log('chartWidth:', chartWidth, 'chartHeight:', chartHeight);
    console.log(
      'radius:',
      radius,
      'innerRadius:',
      innerRadius,
      'strokeWidth:',
      strokeWidth,
    );

    // Check if we have data
    if (!currentData || currentData.length === 0) {
      console.log('No currentData available');
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

    // Calculate total value and expense count
    const total = currentData.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );
    const totalExpenses = currentData.reduce(
      (sum, item) => sum + (item.transactions?.length || 0),
      0,
    );
    console.log('Total amount:', total, 'Total expenses:', totalExpenses);

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

    // Calculate angles for each segment
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

      console.log(`Segment ${index}:`, {
        name: item.name,
        amount: amount,
        angle: angle,
        startAngle: segment.startAngle,
        endAngle: segment.endAngle,
        color: item.color,
      });

      return segment;
    });

    // Convert degrees to radians
    const toRadians = degrees => degrees * (Math.PI / 180);

    // Create SVG path for donut segment
    // eslint-disable-next-line no-shadow
    const createPath = (startAngle, endAngle, outerRadius, innerRadius) => {
      // Skip tiny segments
      if (endAngle - startAngle < 0.1) {
        return '';
      }

      // Ensure we don't have invalid radii
      if (innerRadius <= 0 || outerRadius <= innerRadius) {
        console.log('Invalid radii:', {innerRadius, outerRadius});
        return '';
      }

      // Handle full circle (360 degree) case
      if (endAngle - startAngle >= 359.9) {
        // Create a full circle donut using two semi-circles
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
        console.log('Full circle path data:', pathData);
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

      console.log('Path data:', pathData);
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
                  console.log(`Skipping segment ${index} - invalid path`);
                  return null;
                }

                console.log(`Rendering segment ${index}:`, {
                  name: segment.name,
                  color: segment.color,
                  angle: segment.angle,
                });

                return (
                  <Path
                    key={index}
                    d={pathData}
                    fill={segment.color || '#CCCCCC'}
                    stroke="#ffffff"
                    strokeWidth="4"
                  />
                );
              })}
            </G>
          </Svg>

          {/* Center content - like screenshot 2 */}
          <View style={styles.donutCenterContent}>
            <Text style={styles.donutCenterNumber}>{totalExpenses}</Text>
            <Text style={styles.donutCenterLabel}>Expenses</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render insights
  const renderInsights = () => {
    if (breakdownData.insights.length === 0) {
      return null;
    }

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Spending Insights</Text>
        {breakdownData.insights.map((insight, index) => (
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

  // Helper to get period label for no data message
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

  // Render no data state with calendar access
  const renderNoDataState = () => {
    const periodLabel = getCurrentPeriodLabel();

    // Create a mock period for display purposes
    const displayPeriod = {
      label:
        selectedPeriod === 'daily'
          ? selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
            })
          : selectedPeriod === 'weekly'
          ? `Week of ${selectedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}`
          : selectedDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            }),
      discretionaryAmount: 0,
    };

    return (
      <View style={styles.noDataFullContainer}>
        {/* Period Summary - consistent with data state */}
        <TouchableOpacity
          style={styles.summaryCard}
          onPress={() => setShowCalendar(true)}
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

        {/* No data message */}
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

  const currentData = breakdownData.categories;
  const totalAmount = breakdownData.period?.discretionaryAmount || 0;

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Discretionary Spending Breakdown</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
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
            {breakdownData.period ? (
              <>
                {/* Period Summary */}
                <TouchableOpacity
                  style={styles.summaryCard}
                  onPress={() => setShowCalendar(true)}
                  activeOpacity={0.7}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryLabel}>
                      {breakdownData.isCustomDate
                        ? 'Selected Period'
                        : 'Highest Spending Period'}
                    </Text>
                    <Icon
                      name="calendar-outline"
                      size={16}
                      color={colors.primary || '#6366F1'}
                    />
                  </View>
                  <Text style={styles.summaryTitle}>
                    {breakdownData.period.label}
                  </Text>
                  <Text style={styles.summaryAmount}>
                    ${breakdownData.period.discretionaryAmount.toFixed(2)}
                  </Text>
                  <Text style={styles.summarySubtext}>
                    in discretionary spending
                  </Text>
                  <Text style={styles.tapHint}>Tap to change date</Text>
                </TouchableOpacity>

                {currentData.length > 0 ? (
                  <>
                    {/* Donut Chart */}
                    {renderDonutChart()}

                    {/* Category List */}
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
                        const isExpanded = expandedCategories.has(item.name);
                        const canExpand =
                          item.hasSubcategories &&
                          item.subcategories.length > 0;

                        return (
                          <View key={index} style={styles.categoryItem}>
                            <TouchableOpacity
                              onPress={() =>
                                canExpand && handleCategoryPress(item.name)
                              }
                              disabled={!canExpand}>
                              <View style={styles.categoryHeader}>
                                <View style={styles.categoryLeft}>
                                  <View
                                    style={getCategoryIconStyle(
                                      item.originalColor,
                                    )}>
                                    <Icon
                                      name={iconName}
                                      size={20}
                                      color={item.originalColor}
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
                                    ${item.amount.toFixed(2)}
                                  </Text>
                                  <Text style={styles.categoryPercentage}>
                                    {percentage}%
                                  </Text>
                                </View>
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

                            {/* Subcategory breakdown */}
                            {isExpanded && item.subcategories.length > 0 && (
                              <View style={styles.subcategoriesContainer}>
                                {item.subcategories.map((subItem, subIndex) => (
                                  <View
                                    key={subIndex}
                                    style={styles.subcategoryItem}>
                                    <View style={styles.subcategoryLeft}>
                                      <View style={styles.subcategoryDot} />
                                      <Text style={styles.subcategoryName}>
                                        {subItem.name}
                                      </Text>
                                    </View>
                                    <View style={styles.subcategoryRight}>
                                      <Text style={styles.subcategoryAmount}>
                                        ${subItem.amount.toFixed(2)}
                                      </Text>
                                      <Text
                                        style={styles.subcategoryPercentage}>
                                        {subItem.percentage}%
                                      </Text>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Insights */}
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

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
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
