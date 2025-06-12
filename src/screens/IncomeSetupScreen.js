import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CalendarModal from '../components/CalendarModal';
import {StorageCoordinator} from '../services/storage/StorageCoordinator';

const frequencies = [
  {id: 'weekly', label: 'Weekly', days: 7},
  {id: 'fortnightly', label: 'Fortnightly', days: 14},
  {id: 'monthly', label: 'Monthly', days: 30},
];

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

const IncomeSetupScreen = ({navigation, route}) => {
  const [income, setIncome] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [nextPayDate, setNextPayDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const isEditMode = route?.params?.editMode || false;

  const storageCoordinator = StorageCoordinator.getInstance();
  const userStorageManager = storageCoordinator.getUserStorageManager();

  useEffect(() => {
    const checkStorageReady = () => {
      const isReady =
        storageCoordinator.isUserStorageInitialized() && userStorageManager;
      setIsStorageReady(isReady);

    };

    checkStorageReady();
    const interval = setInterval(checkStorageReady, 1000);

    return () => clearInterval(interval);
  }, [storageCoordinator, userStorageManager]);

  useEffect(() => {
    const loadExistingData = async () => {
      if (isEditMode && isStorageReady && userStorageManager) {
        try {
          const existingData = await userStorageManager.getUserData(
            'user_setup',
          );
          if (existingData) {
            setIncome(existingData.income?.toString() || '');
            setSelectedFrequency(existingData.frequency || '');

            if (existingData.nextPayDate) {
              const storedDate = new Date(existingData.nextPayDate);
              if (!isNaN(storedDate.getTime())) {
                setNextPayDate(storedDate);
                setHasSelectedDate(true);
              }
            }
          }
        } catch (error) {
        }
      }
    };

    loadExistingData();
  }, [isEditMode, isStorageReady, userStorageManager]);

  const handleDateChange = selectedDate => {
    setNextPayDate(selectedDate);
    setHasSelectedDate(true);
  };

  const handleCalendarClose = () => {
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!income || !selectedFrequency || !hasSelectedDate) {
      Alert.alert(
        'Missing Information',
        'Please fill in all fields to continue.',
      );
      return;
    }

    if (!isStorageReady || !userStorageManager) {
      Alert.alert('Storage Not Ready', 'Please wait a moment and try again.');
      return;
    }

    try {
      const setupData = {
        income: parseFloat(income),
        frequency: selectedFrequency,
        nextPayDate: nextPayDate.toISOString(),
        setupComplete: true,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const success = await userStorageManager.setUserData(
        'user_setup',
        setupData,
      );

      if (!success) {
        throw new Error('Failed to save data to user storage');
      }


      if (isEditMode) {
        navigation.goBack();
      } else {
        navigation.replace('MainTabs');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save your information. Please try again.',
      );
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigation.goBack();
    }
  };

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
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Income Amount</Text>
              <View style={styles.incomeInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.incomeInput}
                  value={income}
                  onChangeText={setIncome}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#A0A0A0"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>How often are you paid?</Text>
              <View style={styles.frequencyContainer}>
                {frequencies.map(frequency => (
                  <FrequencyButton
                    key={frequency.id}
                    frequency={frequency}
                    selectedFrequency={selectedFrequency}
                    onSelect={setSelectedFrequency}
                  />
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Next Pay Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}>
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
            {isEditMode && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                isEditMode && styles.editSaveButton,
                !isStorageReady && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={!isStorageReady}>
              <Text
                style={[
                  styles.saveButtonText,
                  !isStorageReady && styles.disabledButtonText,
                ]}>
                {!isStorageReady
                  ? 'Loading...'
                  : isEditMode
                  ? 'Save Changes'
                  : 'Get Started'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <CalendarModal
          visible={showDatePicker}
          selectedDate={nextPayDate}
          onDateChange={handleDateChange}
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
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E5E5E5',
  },
  disabledButtonText: {
    color: '#8E8E93',
  },
});

export default IncomeSetupScreen;
