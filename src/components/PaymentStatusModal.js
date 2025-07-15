import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const PaymentStatusModal = ({
  visible,
  onClose,
  selectedPaymentStatus,
  onPaymentStatusSelect,
  paymentStatusOptions,
}) => {
  const insets = useSafeAreaInsets();

  // Animation values
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations to starting positions
      slideAnim.setValue(screenWidth);
      fadeAnim.setValue(0);

      // Slide in from right with fade
      Animated.parallel([
        Animated.timing(slideAnim, {
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
      // Reset positions when modal is closed
      slideAnim.setValue(screenWidth);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = () => {
    // Slide out to right with fade
    Animated.parallel([
      Animated.timing(slideAnim, {
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
      onClose();
    });
  };

  const handlePaymentStatusSelect = status => {
    onPaymentStatusSelect(status);
    handleClose(); // Use animated close
  };

  const getPaymentStatusIcon = status => {
    switch (status) {
      case 'UPCOMING':
        return 'time-outline';
      case 'PAID':
        return 'checkmark-circle-outline';
      case 'OVERDUE':
        return 'warning-outline';
      default:
        return 'time-outline';
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

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{translateX: slideAnim}],
            },
          ]}>
          <View style={styles.content}>
            {/* Status bar spacer to prevent header color bleeding */}
            <View style={[styles.statusBarSpacer, {height: insets.top}]} />

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.backButton}>
                <Icon name="chevron-back" size={24} color={colors.textWhite} />
              </TouchableOpacity>
              <Text style={styles.title}>Payment Status</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}>
              {paymentStatusOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.statusOption,
                    selectedPaymentStatus === option.id &&
                      styles.selectedOption,
                  ]}
                  onPress={() => handlePaymentStatusSelect(option.id)}
                  activeOpacity={0.7}>
                  <View style={styles.statusLeft}>
                    <Icon
                      name={getPaymentStatusIcon(option.id)}
                      size={18}
                      color={getPaymentStatusColor(option.id)}
                      style={styles.statusIcon}
                    />
                    <Text style={styles.statusName}>{option.name}</Text>
                  </View>
                  {selectedPaymentStatus === option.id && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  statusBarSpacer: {
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 32,
  },
  scrollContainer: {
    padding: 20,
    flex: 1,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: colors.overlayLight,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 12,
  },
  statusName: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
});

export default PaymentStatusModal;
