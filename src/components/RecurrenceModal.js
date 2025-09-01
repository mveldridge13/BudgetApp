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

const RecurrenceModal = ({
  visible,
  onClose,
  selectedRecurrence,
  onRecurrenceSelect,
  recurrenceOptions,
}) => {
  const insets = useSafeAreaInsets();

  // Animation values - matching PaymentStatusModal exactly
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations to starting positions
      slideAnim.setValue(screenWidth);
      fadeAnim.setValue(0);

      // Slide in from right with fade - parallel animation restored
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
    // Slide out to right with fade - parallel animation restored
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

  const handleRecurrenceSelect = recurrenceId => {
    // Slide out to right with fade - parallel animation restored
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
      onRecurrenceSelect(recurrenceId);
      onClose();
    });
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

            {/* Header - PaymentStatusModal design with back button */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                <Icon name="chevron-back" size={24} color={colors.textWhite} />
              </TouchableOpacity>
              <Text style={styles.title}>Repeat</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}>
              {recurrenceOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.option,
                    selectedRecurrence === option.id && styles.selectedOption,
                  ]}
                  onPress={() => handleRecurrenceSelect(option.id)}
                  activeOpacity={0.7}>
                  <View style={styles.optionLeft}>
                    <Text style={styles.optionText}>{option.name}</Text>
                  </View>
                  {selectedRecurrence === option.id && (
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
  option: {
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
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
});

export default RecurrenceModal;
