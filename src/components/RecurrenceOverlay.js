import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

  if (!visible) {
    return null;
  }

  const getDueDateDisplayText = () => {
    if (selectedDueDate) {
      return selectedDueDate.toLocaleDateString();
    }
    return 'Select Due Date';
  };

  const canContinue =
    selectedRecurrence && selectedRecurrence !== 'none' && selectedDueDate;

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
          <Text style={styles.title}>Recurring Transaction</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.subtitle}>
          <Text style={styles.subtitleText}>
            Configure how often this transaction repeats and when it's due
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Recurrence Options */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recurrence</Text>
            </View>

            {recurrenceOptions && recurrenceOptions.length > 0 ? (
              recurrenceOptions
                .filter(option => option.id !== 'none') // Exclude "Does not repeat" since this overlay is for recurring transactions
                .map(option => {
                const isSelected = selectedRecurrence === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionButton,
                      isSelected && styles.selectedOption,
                    ]}
                    onPress={() => onRecurrenceSelect(option.id)}
                    activeOpacity={0.7}>
                    <View style={styles.optionContent}>
                      <View style={styles.optionLeft}>
                        <View style={styles.optionIconContainer}>
                          <Icon
                            name="repeat-outline"
                            size={20}
                            color={
                              isSelected ? colors.primary : colors.textSecondary
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.selectedOptionText,
                          ]}>
                          {option.name}
                        </Text>
                      </View>
                      {isSelected && (
                        <Icon
                          name="checkmark"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
                })
            ) : (
              <Text style={styles.noOptionsText}>No recurrence options available</Text>
            )}

            {/* Due Date Field */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Due Date</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.field,
                styles.dueDateField,
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
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>Due Date</Text>
                  <Text
                    style={[
                      styles.fieldText,
                      !selectedDueDate && styles.placeholderText,
                    ]}>
                    {getDueDateDisplayText()}
                  </Text>
                </View>
              </View>
              <Icon
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              canContinue && styles.continueButtonActive,
            ]}
            onPress={onContinue}
            disabled={!canContinue}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.continueButtonText,
                canContinue && styles.continueButtonTextActive,
              ]}>
              Continue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleClose}
            activeOpacity={0.7}>
            <Text style={styles.skipButtonText}>Cancel</Text>
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
    width: screenWidth,
    maxHeight: '80%',
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
    paddingBottom: 8,
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
  subtitle: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flexGrow: 1,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  optionButton: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: '500',
    color: colors.primary,
  },
  noOptionsText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
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
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  fieldText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  recurrenceField: {
    // Specific styling for recurrence field if needed
  },
  dueDateField: {
    // Specific styling for due date field if needed
  },
  footer: {
    padding: 24,
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueButtonActive: {
    backgroundColor: '#FF6B85',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  continueButtonTextActive: {
    color: colors.background,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
});

export default RecurrenceOverlay;
