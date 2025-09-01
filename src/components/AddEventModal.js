import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles';
import CalendarModal from './CalendarModal';

const {width: screenWidth} = Dimensions.get('window');

const EVENT_TYPES = [
  { value: 'NO_LIMIT_HOLDEM', label: 'No-Limit Hold\'em' },
  { value: 'SATELLITE', label: 'Satellite' },
  { value: 'FREEZEOUT', label: 'Freezeout' },
  { value: 'BOUNTY', label: 'Bounty' },
  { value: 'TURBO', label: 'Turbo' },
  { value: 'DEEPSTACK', label: 'Deepstack' },
  { value: 'TEAM_EVENT', label: 'Team Event' },
];

const AddEventModal = ({
  visible,
  onClose,
  onSave,
  isEditMode = false,
  isCloseOutMode = false,

  // Form data
  eventName,
  eventNumber,
  gameType,
  buyIn,
  startingStack,
  blindStructure,
  eventDate,
  start,
  lateRego,
  finishPosition,
  prize,

  // Calendar state
  showCalendar,

  // Event handlers
  onEventNameChange,
  onEventNumberChange,
  onGameTypeChange,
  onBuyInChange,
  onStartingStackChange,
  onBlindStructureChange,
  onStartChange,
  onLateRegoChange,
  onFinishPositionChange,
  onPrizeChange,
  onShowCalendar,
  onHideCalendar,
  onDateChange,
}) => {
  const insets = useSafeAreaInsets();

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ==============================================
  // ANIMATION HANDLING
  // ==============================================

  useEffect(() => {
    if (visible) {
      // Reset animations to starting positions
      slideAnim.setValue(0);
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);

      // Animate modal in from right with fade
      Animated.parallel([
        Animated.timing(modalAnim, {
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
      slideAnim.setValue(0);
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, modalAnim, fadeAnim]);

  // ==============================================
  // UI EVENT HANDLERS
  // ==============================================

  const handleSave = () => {
    const currentValue = slideAnim._value;

    if (currentValue === 0) {
      Animated.parallel([
        Animated.timing(modalAnim, {
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
        onSave();
      });
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        Animated.parallel([
          Animated.timing(modalAnim, {
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
          onSave();
        });
      });
    }
  };

  const handleClose = () => {
    const currentValue = slideAnim._value;

    if (currentValue === 0) {
      Animated.parallel([
        Animated.timing(modalAnim, {
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
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        Animated.parallel([
          Animated.timing(modalAnim, {
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
      });
    }
  };

  // Navigation functions
  const showEventTypePicker = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideEventTypePicker = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleEventTypeSelect = (type) => {
    console.log('🎲 AddEventModal: handleEventTypeSelect called with:', type);
    onGameTypeChange(type);
    console.log('🎲 AddEventModal: Called onGameTypeChange, hiding picker');
    hideEventTypePicker();
  };

  // ==============================================
  // HELPER FUNCTIONS
  // ==============================================

  const formatDate = date => {
    if (!date) {
      return 'Select Date';
    }
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // ==============================================
  // RENDER
  // ==============================================

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}>
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{translateX: modalAnim}],
            },
          ]}>
          {/* Container for all views */}
          <Animated.View
            style={[
              styles.viewContainer,
              {
                transform: [{translateX: slideAnim}],
              },
            ]}>
            {/* Event Form View */}
            <View style={styles.view}>
              {/* Header */}
              <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isCloseOutMode
                ? 'Close Event'
                : isEditMode
                ? 'Edit Event'
                : 'Add Event'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveButton,
                !eventName && styles.saveButtonDisabled,
              ]}
              disabled={!eventName}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.saveText,
                  !eventName && styles.saveTextDisabled,
                ]}>
                {isCloseOutMode ? 'Close' : isEditMode ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <ScrollView
              style={styles.formContainer}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {!isCloseOutMode && (
                <>
                  {/* Event Details Section */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Event Details</Text>
                  </View>

                  {/* Event Name Field */}
                  <TextInput
                    style={styles.nameInput}
                    value={eventName}
                    onChangeText={onEventNameChange}
                    placeholder="Event Name"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="words"
                  />

                  {/* Event Number Field */}
                  <TextInput
                    style={styles.numberInput}
                    value={eventNumber}
                    onChangeText={onEventNumberChange}
                    placeholder="Event Number (optional)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />

                  {/* Game Type Field */}
                  <TouchableOpacity
                    style={styles.typePickerField}
                    onPress={showEventTypePicker}
                    activeOpacity={0.7}>
                    <Icon
                      name="list-outline"
                      size={18}
                      color={gameType ? colors.primary : colors.textSecondary}
                      style={styles.typeIcon}
                    />
                    <Text
                      style={[
                        styles.typePickerText,
                        gameType && styles.typePickerTextActive,
                      ]}>
                      {(() => {
                        console.log('🎲 AddEventModal: Current gameType for display:', gameType);
                        const foundType = EVENT_TYPES.find(type => type.value === gameType);
                        console.log('🎲 AddEventModal: Found type:', foundType);
                        return foundType?.label || 'Game Type';
                      })()}
                    </Text>
                    <Icon
                      name="chevron-forward"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Event Date Field */}
                  <TouchableOpacity
                    style={styles.dateField}
                    onPress={onShowCalendar}
                    activeOpacity={0.7}>
                    <Icon
                      name="calendar-outline"
                      size={18}
                      color={eventDate ? colors.primary : colors.textSecondary}
                      style={styles.dateIcon}
                    />
                    <Text
                      style={[
                        styles.dateText,
                        eventDate && styles.dateTextActive,
                      ]}>
                      {eventDate ? formatDate(eventDate) : 'Event Date'}
                    </Text>
                  </TouchableOpacity>

                  {/* Start Time Field */}
                  <View style={styles.timeInputContainer}>
                    <Icon
                      name="time-outline"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.timeIcon}
                    />
                    <TextInput
                      style={styles.timeInput}
                      value={start}
                      onChangeText={onStartChange}
                      placeholder="Start (e.g., 2:00 PM)"
                      placeholderTextColor={colors.textSecondary}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Late Rego Field */}
                  <View style={styles.timeInputContainer}>
                    <Icon
                      name="timer-outline"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.timeIcon}
                    />
                    <TextInput
                      style={styles.timeInput}
                      value={lateRego}
                      onChangeText={onLateRegoChange}
                      placeholder="Late Rego (e.g., 4:00 PM)"
                      placeholderTextColor={colors.textSecondary}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Buy-in Structure Section */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Buy-in Structure</Text>
                  </View>

                  {/* Initial Buy-In Field */}
                  <View style={styles.expenseInputContainer}>
                    <Icon
                      name="card-outline"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.expenseIcon}
                    />
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.expenseInput}
                      value={buyIn}
                      onChangeText={onBuyInChange}
                      placeholder="Initial Buy-In"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Starting Stack Field */}
                  <View style={styles.stackInputContainer}>
                    <Icon
                      name="layers-outline"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.stackIcon}
                    />
                    <TextInput
                      style={styles.stackInput}
                      value={startingStack}
                      onChangeText={onStartingStackChange}
                      placeholder="Starting Stack (chips)"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Blind Structure Field */}
                  <TextInput
                    style={styles.blindStructureInput}
                    value={blindStructure}
                    onChangeText={onBlindStructureChange}
                    placeholder="Blind Structure (e.g., 20min levels)"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="words"
                  />
                </>
              )}

              {/* Event Results Section - Only shown in close-out mode */}
              {isCloseOutMode && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Event Results</Text>
                  </View>

                  {/* Final Position Field */}
                  <View style={styles.stackInputContainer}>
                    <Icon
                      name="trophy-outline"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.stackIcon}
                    />
                    <TextInput
                      style={styles.stackInput}
                      value={finishPosition}
                      onChangeText={onFinishPositionChange}
                      placeholder="Final Position (e.g., 9/119)"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="default"
                    />
                  </View>

                  {/* Prize Field */}
                  <View style={styles.expenseInputContainer}>
                    <Icon
                      name="cash-outline"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.expenseIcon}
                    />
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.expenseInput}
                      value={prize}
                      onChangeText={onPrizeChange}
                      placeholder="Prize"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              {/* Read-only Event Info for Close-out Mode */}
              {isCloseOutMode && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Event Information (Read-only)
                    </Text>
                  </View>

                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyLabel}>Event Name:</Text>
                    <Text style={styles.readOnlyValue}>{eventName}</Text>
                  </View>

                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyLabel}>Buy-in:</Text>
                    <Text style={styles.readOnlyValue}>${buyIn}</Text>
                  </View>
                </>
              )}
            </ScrollView>
              </KeyboardAvoidingView>
            </View>

            {/* Event Type Picker View */}
            <View style={styles.view}>
              <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
                <TouchableOpacity
                  onPress={hideEventTypePicker}
                  style={styles.cancelButton}>
                  <Icon
                    name="chevron-back"
                    size={24}
                    color={colors.textWhite}
                  />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Game Type</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.formContainer}
                showsVerticalScrollIndicator={false}>
                {EVENT_TYPES.map((type, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.eventTypeOption,
                      gameType === type.value && styles.selectedOption,
                    ]}
                    onPress={() => handleEventTypeSelect(type.value)}
                    activeOpacity={0.7}>
                    <Text style={styles.eventTypeName}>{type.label}</Text>
                    {gameType === type.value && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={onHideCalendar}
        selectedDate={eventDate || new Date()}
        onDateChange={onDateChange}
      />

    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  viewContainer: {
    flexDirection: 'row',
    width: screenWidth * 2, // 2 views: Event Form, Event Type Picker
    height: '100%',
  },
  view: {
    width: screenWidth,
    height: '100%',
  },
  modalHeader: {
    backgroundColor: colors.warning,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 0,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  nameInput: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  numberInput: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  typeInput: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  dateIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  dateTextActive: {
    color: colors.textPrimary,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  timeIcon: {
    marginRight: 12,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    padding: 0,
  },
  expenseInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  expenseIcon: {
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginRight: 8,
  },
  expenseInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    padding: 0,
  },
  stackInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  stackIcon: {
    marginRight: 12,
  },
  stackInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    padding: 0,
  },
  blindStructureInput: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  readOnlyField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight + '50',
    borderRadius: 12,
    marginBottom: 12,
  },
  readOnlyLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  readOnlyValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  typePickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  typeIcon: {
    marginRight: 12,
  },
  typePickerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  typePickerTextActive: {
    color: colors.textPrimary,
  },
  eventTypeOption: {
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
  eventTypeName: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
});

export default AddEventModal;
