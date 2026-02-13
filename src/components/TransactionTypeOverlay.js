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
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Transaction Type</Text>
            <Text style={styles.subtitle}>Choose how often this transaction occurs</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.typeOptions}>
          <TouchableOpacity
            style={styles.typeButton}
            onPress={() => onTypeSelect('oneoff')}
            activeOpacity={0.7}>
            <View style={[styles.typeIconContainer, styles.oneoffIcon]}>
              <Icon name="flash-outline" size={32} color="#6366f1" />
            </View>
            <Text style={styles.typeTitle}>One-off</Text>
            <Text style={styles.typeDescription}>
              A single transaction that happens once
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeButton}
            onPress={() => onTypeSelect('recurring')}
            activeOpacity={0.7}>
            <View style={[styles.typeIconContainer, styles.recurringIcon]}>
              <Icon name="repeat-outline" size={32} color="#10b981" />
            </View>
            <Text style={styles.typeTitle}>Recurring</Text>
            <Text style={styles.typeDescription}>
              A transaction that repeats over time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeButton}
            onPress={() => onTypeSelect('debt')}
            activeOpacity={0.7}>
            <View style={[styles.typeIconContainer, styles.debtIcon]}>
              <Icon name="trending-down-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.typeTitle}>Debt Payment</Text>
            <Text style={styles.typeDescription}>
              Pay down a loan or credit card
            </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  overlayContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    paddingBottom: 40,
    width: screenWidth,
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
    marginBottom: 32,
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
  typeOptions: {
    gap: 16,
  },
  typeButton: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  oneoffIcon: {
    backgroundColor: '#6366f140',
  },
  recurringIcon: {
    backgroundColor: '#10b98140',
  },
  debtIcon: {
    backgroundColor: '#EF444440',
  },
  typeTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TransactionTypeOverlay;
