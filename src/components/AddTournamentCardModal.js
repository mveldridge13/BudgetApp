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

const AddTournamentCardModal = ({
  visible,
  onClose,
  onSave,
  isEditMode = false,

  // Form data
  tournamentName,
  location,
  startDate,
  endDate,
  accommodation,
  food,
  otherExpenses,

  // Calendar state
  showCalendar,
  calendarMode,

  // Event handlers
  onTournamentNameChange,
  onLocationChange,
  onStartDateChange,
  onEndDateChange,
  onAccommodationChange,
  onFoodChange,
  onOtherExpensesChange,
  onShowCalendar,
  onHideCalendar,
  onDateChange,
}) => {
  const insets = useSafeAreaInsets();

  // Animation values
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ==============================================
  // ANIMATION HANDLING
  // ==============================================

  useEffect(() => {
    if (visible) {
      // Reset animations to starting positions
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
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);
    }
  }, [visible, modalAnim, fadeAnim]);

  // ==============================================
  // UI EVENT HANDLERS
  // ==============================================

  const handleSave = () => {
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
  };

  const handleClose = () => {
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
          {/* Header */}
          <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditMode ? 'Edit Tournament' : 'Create Tournament'}</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveButton,
                !tournamentName && styles.saveButtonDisabled,
              ]}
              disabled={!tournamentName}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.saveText,
                  !tournamentName && styles.saveTextDisabled,
                ]}>
{isEditMode ? 'Update' : 'Save'}
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
            {/* Tournament Name Field */}
            <TextInput
              style={styles.nameInput}
              value={tournamentName}
              onChangeText={onTournamentNameChange}
              placeholder="Tournament Name"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Location Field */}
            <TextInput
              style={styles.locationInput}
              value={location}
              onChangeText={onLocationChange}
              placeholder="Location"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Start Date Field */}
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => onShowCalendar('start')}
              activeOpacity={0.7}>
              <Icon
                name="calendar-outline"
                size={18}
                color={startDate ? colors.primary : colors.textSecondary}
                style={styles.dateIcon}
              />
              <Text
                style={[styles.dateText, startDate && styles.dateTextActive]}>
                {startDate ? formatDate(startDate) : 'Start Date'}
              </Text>
            </TouchableOpacity>

            {/* End Date Field */}
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => onShowCalendar('end')}
              activeOpacity={0.7}>
              <Icon
                name="calendar-outline"
                size={18}
                color={endDate ? colors.primary : colors.textSecondary}
                style={styles.dateIcon}
              />
              <Text style={[styles.dateText, endDate && styles.dateTextActive]}>
                {endDate ? formatDate(endDate) : 'End Date (Optional)'}
              </Text>
            </TouchableOpacity>

            {/* Shared Expenses Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shared Expenses</Text>
            </View>

            {/* Accommodation Field */}
            <View style={styles.expenseInputContainer}>
              <Icon
                name="bed-outline"
                size={18}
                color={colors.textSecondary}
                style={styles.expenseIcon}
              />
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.expenseInput}
                value={accommodation}
                onChangeText={onAccommodationChange}
                placeholder="Accommodation"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* Food Field */}
            <View style={styles.expenseInputContainer}>
              <Icon
                name="fast-food-outline"
                size={18}
                color={colors.textSecondary}
                style={styles.expenseIcon}
              />
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.expenseInput}
                value={food}
                onChangeText={onFoodChange}
                placeholder="Food Budget"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* Other Expenses Field */}
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
                value={otherExpenses}
                onChangeText={onOtherExpensesChange}
                placeholder="Other Expenses"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={onHideCalendar}
        selectedDate={
          calendarMode === 'start'
            ? startDate || new Date()
            : endDate || new Date()
        }
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
  locationInput: {
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
});

export default AddTournamentCardModal;
