import React, {useState, useRef} from 'react';
import {View, Text, StyleSheet, Animated, PanResponder} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';
import {formatCurrencySync} from '../utils/currencyHelper';
import {useAppSettings} from '../contexts/AppSettingsContext';

const SWIPE_THRESHOLD = 120;
const ACTIVATION_THRESHOLD = 15;

const TransactionCard = ({
  transaction,
  categoryData, // ✅ PRE-RESOLVED category data from container
  onDelete,
  onEdit,
  onSwipeStart,
  onSwipeEnd,
}) => {
  // Get currency setting from context
  const {appSettings} = useAppSettings();
  const currency = appSettings?.currency || 'AUD';
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const editOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(deleteOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(editOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const performDelete = () => {
    setIsDeleting(true);

    if (onDelete) {
      onDelete(transaction.id);
    }

    // Animate card out
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -400,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(deleteOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const performEdit = () => {
    if (onEdit) {
      onEdit(transaction);
    }
    resetPosition();
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMinMovement = Math.abs(gestureState.dx) > ACTIVATION_THRESHOLD;

        return isHorizontal && hasMinMovement;
      },
      onPanResponderGrant: (evt, gestureState) => {
        if (onSwipeStart) {
          onSwipeStart();
        }

        Animated.spring(cardScale, {
          toValue: 0.98,
          useNativeDriver: true,
          tension: 150,
          friction: 7,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        const newTranslateX = gestureState.dx;
        translateX.setValue(newTranslateX);

        if (newTranslateX < 0) {
          // Left swipe - delete
          const progress = Math.min(
            1,
            Math.abs(newTranslateX) / SWIPE_THRESHOLD,
          );
          deleteOpacity.setValue(progress);
          editOpacity.setValue(0);
        } else if (newTranslateX > 0) {
          // Right swipe - edit
          const progress = Math.min(1, newTranslateX / SWIPE_THRESHOLD);
          editOpacity.setValue(progress);
          deleteOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeDistance = gestureState.dx;
        const swipeVelocity = gestureState.vx;

        if (onSwipeEnd) {
          onSwipeEnd();
        }

        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 7,
        }).start();

        if (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -0.5) {
          performDelete();
        } else if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 0.5) {
          performEdit();
        } else {
          resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        if (onSwipeEnd) {
          onSwipeEnd();
        }
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }),
  ).current;

  // ✅ PURE UI FORMATTING FUNCTIONS (no business logic)
  const formatCurrency = amount => {
    return formatCurrencySync(amount, currency);
  };

  const formatDate = date => {
    const transactionDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (transactionDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (transactionDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return transactionDate.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const formatDueDate = dueDate => {
    if (!dueDate) {
      return null;
    }

    const dueDateObj = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dueDateObj.toDateString() === today.toDateString()) {
      return 'Due today';
    } else if (dueDateObj.toDateString() === tomorrow.toDateString()) {
      return 'Due tomorrow';
    } else {
      return `Due ${dueDateObj.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
      })}`;
    }
  };

  const getRecurrenceText = recurrence => {
    switch (recurrence) {
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'sixmonths':
        return 'Every 6 months';
      case 'weekly':
        return 'Weekly';
      case 'fortnightly':
        return 'Fortnightly';
      case 'yearly':
        return 'Yearly';
      default:
        return null;
    }
  };

  const getPaymentStatusText = status => {
    switch (status) {
      case 'UPCOMING':
        return 'Upcoming';
      case 'PAID':
        return 'Paid';
      case 'OVERDUE':
        return 'Overdue';
      default:
        return null;
    }
  };

  const getPaymentStatusColor = status => {
    switch (status) {
      case 'UPCOMING':
        return '#007AFF';
      case 'PAID':
        return '#4CAF50';
      case 'OVERDUE':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };


  // ✅ PURE UI DISPLAY LOGIC (uses pre-resolved categoryData)
  const getMetadataText = () => {
    const recurrenceText = getRecurrenceText(transaction.recurrence);
    const categoryName = categoryData?.name || 'Other';

    if (recurrenceText) {
      return `${categoryName} • ${recurrenceText}`;
    } else {
      return `${categoryName} • ${formatDate(transaction.date)}`;
    }
  };

  const getLightBackgroundColor = color => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  const getAmountDisplay = () => {
    const formattedAmount = formatCurrency(transaction.amount);

    if (transaction.type === 'INCOME') {
      return `+${formattedAmount}`;
    } else {
      return `-${formattedAmount}`;
    }
  };

  const getAmountColor = () => {
    if (transaction.type === 'INCOME') {
      return '#4CAF50';
    } else {
      return '#FF4757';
    }
  };

  const isRecurring =
    transaction.recurrence && transaction.recurrence !== 'none';

  // Check if this is a non-editable transaction (TRANSFER or ROLLOVER)
  const isNonEditable =
    transaction.type === 'TRANSFER' || transaction.type === 'ROLLOVER';

  if (isDeleting) {
    return null;
  }

  // ✅ SAFE FALLBACK if categoryData is not provided
  const safeCategory = categoryData || {
    name: 'Other',
    icon: 'document-text-outline',
    color: '#95A5A6',
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.cardContainer}>
        {/* Edit Background */}
        <Animated.View
          style={[
            styles.editBackground,
            {
              opacity: editOpacity,
            },
          ]}>
          <View style={styles.editContent}>
            <Icon name="create-outline" size={24} color="#FFFFFF" />
            <Text style={styles.editText}>Edit</Text>
          </View>
        </Animated.View>

        {/* Delete Background */}
        <Animated.View
          style={[
            styles.deleteBackground,
            {
              opacity: deleteOpacity,
            },
          ]}>
          <View style={styles.deleteContent}>
            <Icon name="trash-outline" size={24} color="#FFFFFF" />
            <Text style={styles.deleteText}>Delete</Text>
          </View>
        </Animated.View>

        {/* Main Card */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              transform: [{translateX: translateX}, {scale: cardScale}],
              opacity: cardOpacity,
            },
          ]}>
          <View
            style={[
              styles.card,
              isRecurring && styles.recurringCard,
            ]}
            {...(!isNonEditable && panResponder.panHandlers)}>
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: getLightBackgroundColor(
                      safeCategory.color,
                    ),
                  },
                ]}>
                <Icon
                  name={safeCategory.icon}
                  size={20}
                  color={safeCategory.color}
                />
              </View>
            </View>

            <View style={styles.transactionInfo}>
              <View style={styles.descriptionRow}>
                <Text style={styles.description}>
                  {transaction.description}
                </Text>
                {isRecurring && (
                  <View style={styles.recurringBadge}>
                    <Icon
                      name="refresh-outline"
                      size={12}
                      color={colors.primary}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.metadata}>{getMetadataText()}</Text>
              {transaction.dueDate && (
                <Text style={styles.dueDate}>{formatDueDate(transaction.dueDate)}</Text>
              )}
              {transaction.status && (
                <Text style={[styles.paymentStatus, {color: getPaymentStatusColor(transaction.status)}]}>
                  {getPaymentStatusText(transaction.status)}
                </Text>
              )}
            </View>

            <View style={styles.amountContainer}>
              {isNonEditable && (
                <Icon
                  name="lock-closed"
                  size={14}
                  color={colors.textSecondary}
                  style={styles.lockIcon}
                />
              )}
              <Text style={[styles.amount, {color: getAmountColor()}]}>
                {getAmountDisplay()}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 8,
  },
  cardContainer: {
    position: 'relative',
  },
  cardWrapper: {
    zIndex: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recurringCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  editBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#52C788',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
    zIndex: 1,
  },
  editContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B85',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
    zIndex: 1,
  },
  deleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  description: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    flex: 1,
  },
  recurringBadge: {
    marginLeft: 8,
    padding: 2,
  },
  metadata: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
  dueDate: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'System',
    color: '#FF6B35',
    letterSpacing: -0.1,
    marginTop: 2,
  },
  paymentStatus: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'System',
    letterSpacing: -0.1,
    marginTop: 2,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockIcon: {
    marginRight: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'System',
    letterSpacing: -0.2,
  },
});

export default TransactionCard;
