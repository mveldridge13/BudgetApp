import React, {useState, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const SWIPE_THRESHOLD = 120;
const ACTIVATION_THRESHOLD = 15;

const TournamentCard = ({
  tournament,
  onPress = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onSwipeStart = () => {},
  onSwipeEnd = () => {},
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const editOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const {
    name,
    location,
    dateStart,
    dateEnd,
    accommodationCost,
    foodBudget,
    otherExpenses,
    venue,
  } = tournament;

  // Debug: Log tournament data to see actual structure
  console.log('🎲 TournamentCard: Tournament data:', {
    name,
    accommodationCost,
    foodBudget,
    otherExpenses,
    fullTournament: tournament
  });

  // Calculate total budget
  const totalBudget = (accommodationCost || 0) + (foodBudget || 0) + (otherExpenses || 0);

  // Swipe animation functions
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
      onDelete(tournament.id);
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
      onEdit(tournament);
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

  // Format dates
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const startDate = formatDate(dateStart);
  const endDate = formatDate(dateEnd);
  const dateRange = endDate ? `${startDate} - ${endDate}` : startDate;

  // Determine tournament status
  const now = new Date();
  const start = new Date(dateStart);
  const end = dateEnd ? new Date(dateEnd) : start;
  
  let status = 'upcoming';
  let statusColor = colors.warning;
  
  if (now >= start && now <= end) {
    status = 'active';
    statusColor = colors.success;
  } else if (now > end) {
    status = 'completed';
    statusColor = colors.textSecondary;
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return 'play-circle';
      case 'completed':
        return 'checkmark-circle';
      default:
        return 'time';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      default:
        return 'Upcoming';
    }
  };

  if (isDeleting) {
    return null;
  }

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
            style={styles.card}
            {...panResponder.panHandlers}>
        <TouchableOpacity style={styles.cardContent} onPress={onPress} activeOpacity={0.7}>
          <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.tournamentName} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.locationRow}>
            <Icon name="location" size={14} color={colors.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Icon name="calendar" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{dateRange}</Text>
          </View>
          
          <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
            <Icon name={getStatusIcon()} size={12} color={statusColor} />
            <Text style={[styles.statusText, {color: statusColor}]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {venue && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon name="business" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {venue}
              </Text>
            </View>
          </View>
        )}

        {totalBudget > 0 && (
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <Icon name="wallet" size={16} color={colors.textSecondary} />
              <Text style={styles.budgetLabel}>Total Budget</Text>
            </View>
            <Text style={styles.budgetAmount}>${totalBudget.toFixed(2)}</Text>
          </View>
        )}
          </View>
        </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 12,
  },
  cardContainer: {
    position: 'relative',
  },
  cardWrapper: {
    zIndex: 2,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  editButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  budgetSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default TournamentCard;