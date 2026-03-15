import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const RecurrenceOverlay = ({
  visible,
  onClose,
  onContinue,
  selectedRecurrence,
  selectedDueDate,
  onRecurrenceSelect,
  onDueDatePress,
  recurrenceOptions,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showPicker, setShowPicker] = useState(false);
  const wasCompleteRef = useRef(false);

  useEffect(() => {
    if (visible) {
      // Reset the completion tracker when overlay opens
      const isComplete = selectedRecurrence && selectedRecurrence !== 'none' && selectedDueDate;
      wasCompleteRef.current = isComplete;

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
      setShowPicker(false);
      wasCompleteRef.current = false;
    }
  }, [visible, slideAnim, fadeAnim]);

  // Auto-continue when both frequency and date are selected
  useEffect(() => {
    if (!visible) return;

    const isComplete = selectedRecurrence && selectedRecurrence !== 'none' && selectedDueDate;

    // Only auto-continue if transitioning from incomplete to complete
    if (isComplete && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      // Brief delay for user to see their selection registered
      const timer = setTimeout(() => {
        onContinue();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible, selectedRecurrence, selectedDueDate, onContinue]);

  const handleClose = () => {
    // Instant transition back
    onClose();
  };

  const handleRecurrenceSelect = (optionId) => {
    onRecurrenceSelect(optionId);
    setShowPicker(false);
  };

  if (!visible) {
    return null;
  }

  const getRecurrenceDisplayText = () => {
    if (selectedRecurrence && selectedRecurrence !== 'none') {
      const option = recurrenceOptions?.find(opt => opt.id === selectedRecurrence);
      return option?.name || 'Select Frequency';
    }
    return 'Select Frequency';
  };

  const getDueDateDisplayText = () => {
    if (selectedDueDate) {
      return selectedDueDate.toLocaleDateString();
    }
    return 'Select Due Date';
  };

  const filteredOptions = recurrenceOptions?.filter(option => option.id !== 'none') || [];

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
          <View style={styles.headerPlaceholder} />
          <Text style={styles.title}>Recurring Transaction</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {/* Recurrence Dropdown Field */}
          <TouchableOpacity
            style={[
              styles.field,
              !selectedRecurrence || selectedRecurrence === 'none' ? styles.fieldEmpty : null,
            ]}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}>
            <View style={styles.fieldLeft}>
              <View style={styles.iconContainer}>
                <Icon
                  name="repeat-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.fieldText,
                  (!selectedRecurrence || selectedRecurrence === 'none') && styles.placeholderText,
                ]}>
                {getRecurrenceDisplayText()}
              </Text>
            </View>
            <Icon
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Due Date Field */}
          <TouchableOpacity
            style={[
              styles.field,
              !selectedDueDate && styles.fieldEmpty,
            ]}
            onPress={onDueDatePress}
            activeOpacity={0.7}>
            <View style={styles.fieldLeft}>
              <View style={styles.iconContainer}>
                <Icon
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.fieldText,
                  !selectedDueDate && styles.placeholderText,
                ]}>
                {getDueDateDisplayText()}
              </Text>
            </View>
            <Icon
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Recurrence Picker Modal */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          onPress={() => setShowPicker(false)}
          activeOpacity={1}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Frequency</Text>
            </View>
            {filteredOptions.map(option => {
              const isSelected = selectedRecurrence === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={styles.pickerOption}
                  onPress={() => handleRecurrenceSelect(option.id)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      isSelected && styles.pickerOptionTextSelected,
                    ]}>
                    {option.name}
                  </Text>
                  {isSelected && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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
    width: screenWidth,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 24,
  },
  headerPlaceholder: {
    width: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldEmpty: {
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.overlayLight,
  },
  fieldText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  // Picker Modal Styles
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: screenWidth - 48,
    maxWidth: 320,
    overflow: 'hidden',
  },
  pickerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.overlayLight,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.overlayLight,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
});

export default RecurrenceOverlay;
