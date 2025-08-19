import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const SWIPE_THRESHOLD = 120;
const ACTIVATION_THRESHOLD = 15;

const EventCard = ({
  event,
  onPress = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onRebuy = () => {},
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
      onDelete(event.id);
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
      onEdit(event);
    }
    resetPosition();
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMinMovement = Math.abs(gestureState.dx) > ACTIVATION_THRESHOLD;

        return isHorizontal && hasMinMovement;
      },
      onPanResponderGrant: () => {
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
      onPanResponderMove: (_, gestureState) => {
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
      onPanResponderRelease: (_, gestureState) => {
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
          <View style={styles.card} {...panResponder.panHandlers}>
            <TouchableOpacity
              style={styles.cardContent}
              onPress={onPress}
              activeOpacity={0.7}>
              <View style={styles.eventHeader}>
                <View style={styles.eventTitleSection}>
                  <Text style={styles.eventName}>{event.eventName}</Text>
                  {event.eventNumber && (
                    <Text style={styles.eventNumber}>#{event.eventNumber}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.rebuyButton}
                  onPress={() => onRebuy(event)}
                  activeOpacity={0.7}>
                  <Icon
                    name="add-circle-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.rebuyButtonText}>Re-Buy</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.eventDetails}>
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventLabel}>Buy-in:</Text>
                  <Text style={styles.eventValue}>${event.buyIn || 0}</Text>
                </View>
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventLabel}>
                    Re-Buy ({event.rebuyCount || 0}):
                  </Text>
                  <Text style={styles.eventValue}>
                    ${event.rebuyAmount || 0}
                  </Text>
                </View>
                {event.winnings > 0 && (
                  <View style={styles.eventDetailRow}>
                    <Text style={styles.eventLabel}>Winnings:</Text>
                    <Text style={[styles.eventValue, {color: colors.success}]}>
                      ${event.winnings}
                    </Text>
                  </View>
                )}
                {event.finishPosition && (
                  <View style={styles.eventDetailRow}>
                    <Text style={styles.eventLabel}>Finish:</Text>
                    <Text style={styles.eventValue}>
                      #{event.finishPosition}
                    </Text>
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
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  eventNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  rebuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  rebuyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 4,
  },
  eventDetails: {
    // No specific styles needed
  },
  eventDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  eventValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});

export default EventCard;
