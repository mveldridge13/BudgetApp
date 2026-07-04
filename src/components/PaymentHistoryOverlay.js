import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const PaymentHistoryOverlay = ({
  visible,
  onClose,
  goal,
  contributions = [],
  loading = false,
  onLoadMore,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) {
    return null;
  }

  // Calculate summary stats
  const totalPaid = contributions.reduce(
    (sum, contribution) => sum + (parseFloat(contribution.amount) || 0),
    0,
  );
  const paymentCount = contributions.length;

  // For debt goals: current = remaining debt (decreases as you pay)
  // For savings goals: current = amount saved, remaining = target - current
  const isDebtGoal = goal?.type === 'debt';
  const remaining = goal
    ? isDebtGoal
      ? Math.max(0, goal.current || 0) // For debt: current IS the remaining amount
      : Math.max(0, (goal.target || 0) - (goal.current || 0)) // For savings: target - current
    : 0;

  // Format currency
  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  // Always show the actual payment date (web parity) — the old relative
  // labels miscounted calendar days ("Yesterday" for a 2-day-old payment)
  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get contribution type display
  const getContributionTypeDisplay = type => {
    switch (type) {
      case 'MANUAL':
        return 'Manual Payment';
      case 'WITHDRAWAL':
        return 'Withdrawal';
      case 'AUTO':
        return 'Automatic Payment';
      case 'ROLLOVER':
        return 'Rollover Allocation';
      default:
        return 'Payment';
    }
  };

  // Render contribution item
  const renderContributionItem = ({item, index}) => {
    const amount = parseFloat(item.amount) || 0;
    const isWithdrawal = item.type === 'WITHDRAWAL';

    return (
      <View
        style={[
          styles.contributionItem,
          index === contributions.length - 1 && styles.contributionItemLast,
        ]}>
        <View style={styles.contributionLeft}>
          <View
            style={[
              styles.contributionIcon,
              isWithdrawal ? styles.withdrawalIcon : styles.paymentIcon,
            ]}>
            <Icon
              name={isWithdrawal ? 'arrow-up-outline' : 'arrow-down-outline'}
              size={16}
              color={isWithdrawal ? '#FF6B85' : '#4CAF50'}
            />
          </View>
          <View style={styles.contributionDetails}>
            <Text style={styles.contributionAmount}>
              {isWithdrawal ? '-' : ''}
              {formatCurrency(amount)}
            </Text>
            <Text style={styles.contributionDate}>{formatDate(item.date)}</Text>
            {item.description && (
              <Text style={styles.contributionDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.contributionRight}>
          <Text style={styles.contributionType}>
            {getContributionTypeDisplay(item.type)}
          </Text>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Icon name="calendar-outline" size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No Payment History</Text>
      <Text style={styles.emptyDescription}>
        Payments you make toward this goal will appear here
      </Text>
    </View>
  );

  // Render footer (loading indicator or load more)
  const renderFooter = () => {
    if (!loading) {return null;}
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}>
      <Animated.View style={[styles.overlayContainer, {opacity: fadeAnim}]}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.overlayContent,
            {
              transform: [{translateY: slideAnim}],
            },
          ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Payment History</Text>
            {goal && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {goal.title}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        {goal && paymentCount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(totalPaid)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Remaining</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(remaining)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Payments</Text>
                <Text style={styles.summaryValue}>{paymentCount}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment List */}
        <View style={styles.listContainer}>
          {paymentCount > 0 && (
            <Text style={styles.listTitle}>Recent Payments</Text>
          )}
          <ScrollView
            style={styles.list}
            contentContainerStyle={
              contributions.length === 0 && styles.listContentEmpty
            }
            showsVerticalScrollIndicator={true}>
            {contributions.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                {contributions.map((item, index) => (
                  <View key={item.id || `contribution-${index}`}>
                    {renderContributionItem({item, index})}
                  </View>
                ))}
                {renderFooter()}
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  overlayContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    paddingBottom: 0,
    width: screenWidth,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  summaryCard: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  listContainer: {
    flex: 1,
    marginBottom: 24,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  contributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contributionItemLast: {
    borderBottomWidth: 0,
  },
  contributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contributionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentIcon: {
    backgroundColor: '#4CAF5026',
  },
  withdrawalIcon: {
    backgroundColor: '#FF6B8526',
  },
  contributionDetails: {
    flex: 1,
  },
  contributionAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  contributionDate: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  contributionDescription: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginTop: 2,
  },
  contributionRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  contributionType: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default PaymentHistoryOverlay;
