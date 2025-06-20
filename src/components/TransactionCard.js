import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, Animated, PanResponder} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';
import TrendAPIService from '../services/TrendAPIService'; // Changed import

// Default fallback categories (in case service fails)
const defaultCategories = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: 'restaurant-outline',
    color: '#FF6B6B',
  },
  {id: 'transport', name: 'Transport', icon: 'car-outline', color: '#4ECDC4'},
  {id: 'shopping', name: 'Shopping', icon: 'bag-outline', color: '#45B7D1'},
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film-outline',
    color: '#96CEB4',
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    icon: 'flash-outline',
    color: '#FECA57',
  },
  {
    id: 'health',
    name: 'Health & Fitness',
    icon: 'fitness-outline',
    color: '#FF9FF3',
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'document-text-outline',
    color: '#95A5A6',
  },
];

const SWIPE_THRESHOLD = 120; // Positive for right swipe, negative for left swipe
const ACTIVATION_THRESHOLD = 15;

const TransactionCard = ({
  transaction,
  onDelete,
  onEdit,
  onSwipeStart,
  onSwipeEnd,
}) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const editOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const loadCategories = useCallback(async () => {
    try {
      // Check if authenticated before making API call
      if (!TrendAPIService.isAuthenticated()) {
        console.warn(
          'TrendAPIService not authenticated, using default categories',
        );
        setCategories(defaultCategories);
        setIsLoading(false);
        return;
      }

      // Use TrendAPIService to get categories
      const response = await TrendAPIService.getCategories();
      const loadedCategories = response?.categories || [];

      if (Array.isArray(loadedCategories) && loadedCategories.length > 0) {
        setCategories(loadedCategories);
      } else {
        // Fallback to default categories if no categories returned
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.warn('Error loading categories:', error);
      // Fallback to default categories if service fails
      setCategories(defaultCategories);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

    // Call onDelete immediately
    if (onDelete) {
      onDelete(transaction.id);
    }

    // Animate card out (just for visual effect)
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
    // Call onEdit callback
    if (onEdit) {
      onEdit(transaction);
    }

    // Reset position after edit action
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
        // Disable parent ScrollView
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

        // Calculate opacity for delete (left swipe) and edit (right swipe)
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

        // Re-enable parent ScrollView
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
          // Left swipe threshold reached - delete
          performDelete();
        } else if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 0.5) {
          // Right swipe threshold reached - edit
          performEdit();
        } else {
          // Not enough swipe - reset position
          resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        // Re-enable parent ScrollView if gesture is terminated
        if (onSwipeEnd) {
          onSwipeEnd();
        }
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }),
  ).current;

  const getCategoryData = () => {
    if (isLoading) {
      return defaultCategories[defaultCategories.length - 1];
    }

    const categoryData = categories.find(
      cat => cat.id === transaction.category,
    );

    if (categoryData) {
      return categoryData;
    }

    return (
      categories.find(cat => cat.id === 'other') ||
      defaultCategories[defaultCategories.length - 1]
    );
  };

  const categoryData = getCategoryData();

  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount || 0);
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

  const getRecurrenceText = recurrence => {
    switch (recurrence) {
      case 'monthly':
        return 'Monthly';
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

  const getMetadataText = () => {
    const recurrenceText = getRecurrenceText(transaction.recurrence);

    if (recurrenceText) {
      return `${categoryData.name} • ${recurrenceText}`;
    } else {
      return `${categoryData.name} • ${formatDate(transaction.date)}`;
    }
  };

  const getLightBackgroundColor = color => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  const isRecurring =
    transaction.recurrence && transaction.recurrence !== 'none';

  if (isDeleting) {
    return null;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.cardContainer}>
        {/* Edit Background - positioned on the left side */}
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

        {/* Delete Background - positioned on the right side */}
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
            style={[styles.card, isRecurring && styles.recurringCard]}
            {...panResponder.panHandlers}>
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: getLightBackgroundColor(
                      categoryData.color,
                    ),
                  },
                ]}>
                <Icon
                  name={categoryData.icon}
                  size={20}
                  color={categoryData.color}
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
            </View>

            <Text style={styles.amount}>
              -{formatCurrency(transaction.amount)}
            </Text>
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
    backgroundColor: '#52C788', // Lighter green background for edit
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
    backgroundColor: '#FF6B85', // Lighter red background for delete
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
  amount: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'System',
    color: '#FF4757',
    letterSpacing: -0.2,
  },
});

export default TransactionCard;
