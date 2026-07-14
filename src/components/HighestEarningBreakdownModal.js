/* eslint-disable react-native/no-inline-styles */
// components/HighestEarningBreakdownModal.js
// Same chrome/donut/interaction pattern as DiscretionaryBreakdown.js's
// modal (slide-in from right, indigo header, SVG donut, inline-expandable
// list rows) - built for the Highest Earning Period hero card's drill-down.
import React, {useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, {Path, G, Text as SvgText} from 'react-native-svg';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const HighestEarningBreakdownModal = ({visible, onClose, data}) => {
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [expandedItem, setExpandedItem] = useState(null);

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
      setExpandedItem(null);
      onClose();
    });
  };

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

  const breakdown = data?.breakdown || [];

  const renderDonutChart = () => {
    const chartWidth = screenWidth - 40;
    const chartHeight = 280;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 20;
    const strokeWidth = 50;
    const innerRadius = radius - strokeWidth;
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;

    const total = breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);

    if (breakdown.length === 0 || total === 0) {
      return (
        <View style={[styles.chartContainer, {height: chartHeight}]}>
          <View style={styles.donutCenterContent}>
            <Text style={styles.donutCenterNumber}>0</Text>
            <Text style={styles.donutCenterLabel}>Sources</Text>
          </View>
          <Text style={styles.noDataText}>No income data available</Text>
        </View>
      );
    }

    let currentAngle = 0;
    const segments = breakdown.map(item => {
      const amount = item.amount || 0;
      const angle = (amount / total) * 360;
      const segment = {
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        angle,
      };
      currentAngle += angle;
      return segment;
    });

    const toRadians = degrees => degrees * (Math.PI / 180);

    const createPath = (startAngle, endAngle, outerRadius, innerR) => {
      if (endAngle - startAngle < 0.1) {
        return '';
      }
      if (innerR <= 0 || outerRadius <= innerR) {
        return '';
      }
      if (endAngle - startAngle >= 359.9) {
        return `
          M 0,${-outerRadius}
          A ${outerRadius},${outerRadius} 0 1,1 0,${outerRadius}
          A ${outerRadius},${outerRadius} 0 1,1 0,${-outerRadius}
          M 0,${-innerR}
          A ${innerR},${innerR} 0 1,0 0,${innerR}
          A ${innerR},${innerR} 0 1,0 0,${-innerR}
          Z`
          .replace(/\s+/g, ' ')
          .trim();
      }

      const start = toRadians(startAngle - 90);
      const end = toRadians(endAngle - 90);

      const x1 = Math.cos(start) * outerRadius;
      const y1 = Math.sin(start) * outerRadius;
      const x2 = Math.cos(end) * outerRadius;
      const y2 = Math.sin(end) * outerRadius;

      const x3 = Math.cos(end) * innerR;
      const y3 = Math.sin(end) * innerR;
      const x4 = Math.cos(start) * innerR;
      const y4 = Math.sin(start) * innerR;

      const largeArc = endAngle - startAngle > 180 ? 1 : 0;

      return `M ${x1.toFixed(2)},${y1.toFixed(
        2,
      )} A ${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2.toFixed(
        2,
      )},${y2.toFixed(2)} L ${x3.toFixed(2)},${y3.toFixed(
        2,
      )} A ${innerR},${innerR} 0 ${largeArc},0 ${x4.toFixed(2)},${y4.toFixed(
        2,
      )} Z`;
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

              {segments.map((segment, index) => {
                const percentage = (segment.angle / 360) * 100;
                if (percentage < 7) {
                  return null;
                }
                const midAngle = (segment.startAngle + segment.endAngle) / 2;
                const rad = toRadians(midAngle - 90);
                const labelRadius = (radius + innerRadius) / 2;
                return (
                  <SvgText
                    key={`label-${index}`}
                    x={Math.cos(rad) * labelRadius}
                    y={Math.sin(rad) * labelRadius}
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="700"
                    textAnchor="middle"
                    alignmentBaseline="central">
                    {`${Math.round(percentage)}%`}
                  </SvgText>
                );
              })}
            </G>
          </Svg>

          <View style={styles.donutCenterContent}>
            <Text style={styles.donutCenterNumber}>{breakdown.length}</Text>
            <Text style={styles.donutCenterLabel}>Sources</Text>
          </View>
        </View>
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
      <Animated.View style={[styles.modalOverlay, {opacity: fadeAnim}]}>
        <Animated.View
          style={[
            styles.modalContent,
            {transform: [{translateX: modalAnim}]},
          ]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Highest Earning Period Breakdown
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {data && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryLabel}>Highest Earning Period</Text>
                </View>
                <Text style={styles.summaryTitle}>
                  {new Date(data.start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  –{' '}
                  {new Date(data.end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.summaryAmount}>
                  ${data.totalAmount.toFixed(2)}
                </Text>
                {data.percentAboveAverage > 0 && (
                  <Text style={styles.summarySubtext}>
                    {data.percentAboveAverage.toFixed(0)}% above your average
                  </Text>
                )}
              </View>
            )}

            {breakdown.length > 0 ? (
              <>
                {renderDonutChart()}

                <View style={styles.categoriesContainer}>
                  <Text style={styles.categoriesTitle}>Income Breakdown</Text>
                  {breakdown.map((item, index) => {
                    const isExpanded = expandedItem === item.name;
                    const canExpand = item.transactions?.length > 0;

                    return (
                      <View key={index} style={styles.categoryItem}>
                        <TouchableOpacity
                          onPress={() =>
                            canExpand &&
                            setExpandedItem(prev =>
                              prev === item.name ? null : item.name,
                            )
                          }
                          activeOpacity={canExpand ? 0.7 : 1}>
                          <View style={styles.categoryHeader}>
                            <View style={styles.categoryLeft}>
                              <View
                                style={[
                                  styles.categoryDot,
                                  {backgroundColor: item.color || colors.primary},
                                ]}
                              />
                              <Text style={styles.categoryName}>
                                {item.name}
                              </Text>
                            </View>
                            <View style={styles.categoryRight}>
                              <Text style={styles.categoryAmount}>
                                ${item.amount.toFixed(2)}
                              </Text>
                            </View>
                            {canExpand && (
                              <Icon
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color="#999"
                                style={styles.chevron}
                              />
                            )}
                          </View>
                        </TouchableOpacity>

                        {isExpanded && canExpand && (
                          <View style={styles.subcategoriesContainer}>
                            {item.transactions.map((tx, txIndex) => (
                              <View key={txIndex} style={styles.subcategoryItem}>
                                <View style={styles.subcategoryLeft}>
                                  <View
                                    style={[
                                      styles.subcategoryDot,
                                      {backgroundColor: item.color || colors.primary},
                                    ]}
                                  />
                                  <View>
                                    <Text style={styles.subcategoryName}>
                                      {tx.description}
                                    </Text>
                                    <Text style={styles.subcategoryDate}>
                                      {new Date(tx.date).toLocaleDateString(
                                        'en-US',
                                        {month: 'short', day: 'numeric'},
                                      )}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.subcategoryAmount}>
                                  ${tx.amount.toFixed(2)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  No breakdown available for this period.
                </Text>
              </View>
            )}
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
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '300',
    color: colors.textSecondary || '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  noDataText: {
    fontSize: 16,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'System',
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
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
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
    marginTop: 4,
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  subcategoryDate: {
    fontSize: 11,
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
    opacity: 0.7,
    marginTop: 1,
  },
  subcategoryAmount: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.textSecondary || '#6B7280',
    fontFamily: 'System',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
});

export default HighestEarningBreakdownModal;
