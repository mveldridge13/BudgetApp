// screens/IncomeSetupScreen.js - PURE UI COMPONENT
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CalendarModal from '../components/CalendarModal';

const FrequencyButton = ({frequency, selectedFrequency, onSelect}) => (
  <TouchableOpacity
    style={[
      styles.frequencyButton,
      selectedFrequency === frequency.id && styles.selectedFrequency,
    ]}
    onPress={() => onSelect(frequency.id)}>
    <Text
      style={[
        styles.frequencyText,
        selectedFrequency === frequency.id && styles.selectedFrequencyText,
      ]}>
      {frequency.label}
    </Text>
  </TouchableOpacity>
);

const formatDateForDisplay = date => {
  if (!date) {
    return '';
  }
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const IncomeSetupScreen = ({
  // ==============================================
  // DATA PROPS (from IncomeSetupContainer)
  // ==============================================
  income = '',
  selectedFrequency = '',
  nextPayDate = new Date(),
  hasSelectedDate = false,
  loading = false,
  isEditMode = false,
  frequencies = [
    {id: 'weekly', label: 'Weekly', days: 7},
    {id: 'fortnightly', label: 'Fortnightly', days: 14},
    {id: 'monthly', label: 'Monthly', days: 30},
  ], // Default frequencies if not provided

  // ==============================================
  // EVENT HANDLER PROPS (from IncomeSetupContainer)
  // ==============================================
  onIncomeChange = () => {},
  onFrequencySelect = () => {},
  onDateChange = () => {},
  onSave = () => {},
  onCancel = () => {},
}) => {
  // ==============================================
  // UI-ONLY STATE (No Business Logic)
  // ==============================================

  const [showDatePicker, setShowDatePicker] = useState(false);

  // ==============================================
  // UI EVENT HANDLERS (Pure UI Logic Only)
  // ==============================================

  const handleCalendarClose = () => {
    setShowDatePicker(false);
  };

  const handleDateSelect = selectedDate => {
    onDateChange(selectedDate);
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    if (!loading) {
      setShowDatePicker(true);
    }
  };

  // ==============================================
  // RENDER UI (Pure UI Component)
  // ==============================================

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditMode ? 'Edit Income Setup' : "Let's get started"}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode
                ? 'Update your income information'
                : 'Tell us about your income to set up your budget'}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Income Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Income Amount</Text>
              <View style={styles.incomeInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.incomeInput}
                  value={income}
                  onChangeText={onIncomeChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#A0A0A0"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="none"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Frequency Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>How often are you paid?</Text>
              <View style={styles.frequencyContainer}>
                {frequencies.map(frequency => (
                  <FrequencyButton
                    key={frequency.id}
                    frequency={frequency}
                    selectedFrequency={selectedFrequency}
                    onSelect={onFrequencySelect}
                  />
                ))}
              </View>
            </View>

            {/* Next Pay Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Next Pay Date</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  loading && styles.disabledButton,
                ]}
                onPress={openDatePicker}
                disabled={loading}>
                <Text
                  style={[
                    styles.datePickerText,
                    !hasSelectedDate && styles.placeholderText,
                  ]}>
                  {hasSelectedDate
                    ? formatDateForDisplay(nextPayDate)
                    : 'Select date'}
                </Text>
                <Icon
                  name="calendar-today"
                  size={18}
                  color="#8E8E93"
                  style={styles.datePickerIcon}
                />
              </TouchableOpacity>
              <Text style={styles.helperText}>
                This helps us calculate your current budget period
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {/* Cancel Button - only in edit mode */}
            {isEditMode && (
              <TouchableOpacity
                style={[styles.cancelButton, loading && styles.disabledButton]}
                onPress={onCancel}
                disabled={loading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                isEditMode && styles.editSaveButton,
                loading && styles.disabledSaveButton,
              ]}
              onPress={onSave}
              disabled={loading}>
              <Text style={styles.saveButtonText}>
                {loading
                  ? 'Saving...'
                  : isEditMode
                  ? 'Save Changes'
                  : 'Get Started'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar Modal */}
        <CalendarModal
          visible={showDatePicker && !loading}
          selectedDate={nextPayDate}
          onDateChange={handleDateSelect}
          onClose={handleCalendarClose}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'System',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'System',
    color: '#8E8E93',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  form: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'System',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  incomeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'System',
    color: '#1A1A1A',
    marginRight: 4,
  },
  incomeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'System',
    color: '#1A1A1A',
    paddingVertical: 12,
    letterSpacing: -0.2,
  },
  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  selectedFrequency: {
    backgroundColor: '#A78BFA',
    borderColor: '#A78BFA',
  },
  frequencyText: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'System',
    color: '#1A1A1A',
    letterSpacing: -0.1,
  },
  selectedFrequencyText: {
    color: '#FFFFFF',
    fontWeight: '400',
    fontFamily: 'System',
    letterSpacing: -0.1,
  },
  datePickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'System',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  placeholderText: {
    color: '#A0A0A0',
  },
  datePickerIcon: {
    marginLeft: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minWidth: 120,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '400',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 140,
  },
  editSaveButton: {
    // Additional styling when in edit mode if needed
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledSaveButton: {
    opacity: 0.6,
    backgroundColor: '#A78BFA',
  },
});

export default IncomeSetupScreen;
