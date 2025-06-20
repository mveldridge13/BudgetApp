import React, {useState, useRef} from 'react';
import {View, Text, StyleSheet, Animated, PanResponder} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

// Default fallback categories (only used as last resort)
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
  categories = [], // ✅ NEW: Receive categories as props from parent
  onDelete,
  onEdit,
  onSwipeStart,
  onSwipeEnd,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const editOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  // ✅ UPDATED: Get category data from backend response and passed props
  const getCategoryData = () => {
    console.log('🔍 TransactionCard: Full transaction object:', transaction);

    // Get IDs from transaction (priority: subcategory > category)
    const categoryId = transaction.categoryId;
    const subcategoryId = transaction.subcategoryId;

    console.log('🔍 TransactionCard: categoryId:', categoryId);
    console.log('🔍 TransactionCard: subcategoryId:', subcategoryId);
    console.log(
      '🔍 TransactionCard: Available categories:',
      categories?.length,
    );

    // ✅ FIRST: Check if backend returned subcategory object directly
    if (
      transaction.subcategory &&
      typeof transaction.subcategory === 'object'
    ) {
      console.log(
        '🔍 TransactionCard: Using backend subcategory object:',
        transaction.subcategory,
      );
      return {
        id: transaction.subcategory.id,
        name: transaction.subcategory.name,
        icon: transaction.subcategory.icon || 'albums-outline',
        color: transaction.subcategory.color || '#4ECDC4',
      };
    }

    // ✅ SECOND: Check if backend returned category object directly
    if (transaction.category && typeof transaction.category === 'object') {
      console.log(
        '🔍 TransactionCard: Using backend category object:',
        transaction.category,
      );
      return {
        id: transaction.category.id,
        name: transaction.category.name,
        icon: transaction.category.icon || 'albums-outline',
        color: transaction.category.color || '#4ECDC4',
      };
    }

    // ✅ THIRD: Use passed categories to look up by ID
    if (categories && categories.length > 0) {
      // If we have a subcategoryId, prioritize finding the subcategory
      if (subcategoryId) {
        // Look through all categories and their subcategories
        for (const mainCategory of categories) {
          if (
            mainCategory.subcategories &&
            Array.isArray(mainCategory.subcategories)
          ) {
            const subcategory = mainCategory.subcategories.find(
              sub => sub.id === subcategoryId,
            );
            if (subcategory) {
              console.log(
                '🔍 TransactionCard: Found subcategory in categories:',
                subcategory,
              );
              return {
                ...subcategory,
                color: subcategory.color || mainCategory.color,
                icon: subcategory.icon || mainCategory.icon,
              };
            }
          }
        }
      }

      // If no subcategory found, look for main category
      if (categoryId) {
        const mainCategory = categories.find(cat => cat.id === categoryId);
        if (mainCategory) {
          console.log(
            '🔍 TransactionCard: Found main category in categories:',
            mainCategory,
          );
          return mainCategory;
        }
      }

      // Fallback: look for "other" category in passed categories
      const otherCategory = categories.find(
        cat => cat.name.toLowerCase() === 'other' || cat.id === 'other',
      );
      if (otherCategory) {
        console.log(
          '🔍 TransactionCard: Using other category from passed categories',
        );
        return otherCategory;
      }
    }

    // ✅ FINAL FALLBACK: Use default categories
    console.log('🔍 TransactionCard: Using default fallback category');
    return defaultCategories[defaultCategories.length - 1]; // "Other" category
  };

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

  // ✅ CRITICAL FIX: Modified performEdit to pass transaction ID instead of full object
  const performEdit = () => {
    // ✅ FIXED: Pass transaction ID only, let HomeContainer find fresh data
    if (onEdit) {
      console.log(
        '🔍 TransactionCard: Calling onEdit with transaction ID:',
        transaction.id,
      );
      onEdit(transaction.id); // Pass ID instead of full transaction object
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

  // ✅ FIXED: Metadata display logic - show MAIN category name, not subcategory
  const getMetadataText = () => {
    const recurrenceText = getRecurrenceText(transaction.recurrence);

    // ✅ FIXED: Show main category name, not subcategory name
    let categoryName = categoryData.name;

    // If we found a subcategory, we need to show the MAIN category name
    if (
      transaction.subcategory &&
      typeof transaction.subcategory === 'object'
    ) {
      // We have subcategory object from backend - need to find main category
      const mainCategory = categories.find(
        cat =>
          cat.subcategories &&
          cat.subcategories.some(sub => sub.id === transaction.subcategory.id),
      );
      if (mainCategory) {
        categoryName = mainCategory.name;
      }
    } else if (transaction.subcategoryId && categories.length > 0) {
      // We have subcategoryId - find main category
      const mainCategory = categories.find(
        cat =>
          cat.subcategories &&
          cat.subcategories.some(sub => sub.id === transaction.subcategoryId),
      );
      if (mainCategory) {
        categoryName = mainCategory.name;
      }
    }

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

  // ✅ UPDATED: Support both Income and Expense display
  const getAmountDisplay = () => {
    const formattedAmount = formatCurrency(transaction.amount);

    // Check transaction type and display accordingly
    if (transaction.type === 'INCOME') {
      return `+${formattedAmount}`;
    } else {
      return `-${formattedAmount}`;
    }
  };

  const getAmountColor = () => {
    // Green for income, red for expense
    if (transaction.type === 'INCOME') {
      return '#4CAF50';
    } else {
      return '#FF4757';
    }
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

            {/* ✅ UPDATED: Dynamic amount display with color coding */}
            <Text style={[styles.amount, {color: getAmountColor()}]}>
              {getAmountDisplay()}
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
    letterSpacing: -0.2,
  },
});

export default TransactionCard;
