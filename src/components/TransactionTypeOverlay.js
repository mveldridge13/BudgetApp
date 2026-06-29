import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const TransactionTypeOverlay = ({
  visible,
  onClose,
  onTypeSelect,
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

  const handleClose = () => {
    // Animate out before closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Always render - visibility is controlled by parent's conditional rendering
  // When visible becomes false, we want to stay mounted so we can slide out with the parent modal
  return (
    <Animated.View style={[styles.overlayContainer, {opacity: fadeAnim}]}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={handleClose}
        activeOpacity={1}
      />

      <Animated.View
        style={[
          styles.overlayContent,
          {
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>New Transaction</Text>
            <Text style={styles.subtitle}>What type of transaction?</Text>
          </View>
        </View>

        <View style={styles.typeOptions}>
          <TouchableOpacity
            style={styles.typeButton}
            onPress={() => onTypeSelect('oneoff')}
            activeOpacity={0.7}>
            <View style={[styles.typeIconContainer, styles.oneoffIcon]}>
              <Icon name="flash-outline" size={24} color="#6366F1" />
            </View>
            <View style={styles.typeContent}>
              <Text style={styles.typeTitle}>One-off</Text>
              <Text style={styles.typeDescription}>A single transaction</Text>
            </View>
            <Icon
              name="chevron-forward"
              size={20}
              color={colors.textTertiary || '#9CA3AF'}
              style={styles.chevron}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeButton}
            onPress={() => onTypeSelect('recurring')}
            activeOpacity={0.7}>
            <View style={[styles.typeIconContainer, styles.recurringIcon]}>
              <Icon name="repeat-outline" size={24} color="#10B981" />
            </View>
            <View style={styles.typeContent}>
              <Text style={styles.typeTitle}>Recurring</Text>
              <Text style={styles.typeDescription}>Repeats on a schedule</Text>
            </View>
            <Icon
              name="chevron-forward"
              size={20}
              color={colors.textTertiary || '#9CA3AF'}
              style={styles.chevron}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeButton}
            onPress={() => onTypeSelect('debt')}
            activeOpacity={0.7}>
            <View style={[styles.typeIconContainer, styles.debtIcon]}>
              <Icon name="trending-down-outline" size={24} color="#EF4444" />
            </View>
            <View style={styles.typeContent}>
              <Text style={styles.typeTitle}>Debt Payment</Text>
              <Text style={styles.typeDescription}>Pay down a loan or card</Text>
            </View>
            <Icon
              name="chevron-forward"
              size={20}
              color={colors.textTertiary || '#9CA3AF'}
              style={styles.chevron}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  overlayContent: {
    backgroundColor: colors.background || '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    width: screenWidth,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border || '#E5E7EB',
    borderRadius: 2,
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary || '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary || '#6B7280',
  },
  closeButton: {
    display: 'none',
  },
  typeOptions: {
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.overlayLight || '#F9FAFB',
    borderRadius: 16,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  oneoffIcon: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  recurringIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  debtIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary || '#111827',
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 14,
    color: colors.textSecondary || '#6B7280',
  },
  chevron: {
    marginLeft: 8,
  },
});

export default TransactionTypeOverlay;
