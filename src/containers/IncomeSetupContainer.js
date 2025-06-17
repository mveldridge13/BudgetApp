// containers/IncomeSetupContainer.js
import React, {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendAPIService from '../services/TrendAPIService';
import IncomeSetupScreen from '../screens/IncomeSetupScreen';

const frequencies = [
  {id: 'weekly', label: 'Weekly', days: 7},
  {id: 'fortnightly', label: 'Fortnightly', days: 14},
  {id: 'monthly', label: 'Monthly', days: 30},
];

const IncomeSetupContainer = ({navigation, route}) => {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  const [income, setIncome] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [nextPayDate, setNextPayDate] = useState(new Date());
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditMode = route?.params?.editMode || false;

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

  /**
   * Load existing income data from backend with AsyncStorage fallback
   */
  const loadExistingData = useCallback(async () => {
    if (!isEditMode) {
      return;
    }

    try {
      // Primary: Load income from backend
      const userProfile = await TrendAPIService.getUserProfile();
      if (userProfile?.income) {
        setIncome(userProfile.income.toString());
      }

      // Secondary: Load frequency and nextPayDate from AsyncStorage
      const existingData = await AsyncStorage.getItem('userSetup');
      if (existingData) {
        const parsedData = JSON.parse(existingData);

        // Use AsyncStorage income only if backend doesn't have it
        if (!userProfile?.income && parsedData.income) {
          setIncome(parsedData.income.toString());
        }

        if (parsedData.frequency) {
          setSelectedFrequency(parsedData.frequency);
        }

        if (parsedData.nextPayDate) {
          const storedDate = new Date(parsedData.nextPayDate);
          if (!isNaN(storedDate.getTime())) {
            setNextPayDate(storedDate);
            setHasSelectedDate(true);
          }
        }
      }
    } catch (error) {
      // Fallback to AsyncStorage only
      try {
        const existingData = await AsyncStorage.getItem('userSetup');
        if (existingData) {
          const parsedData = JSON.parse(existingData);
          setIncome(parsedData.income?.toString() || '');
          setSelectedFrequency(parsedData.frequency || '');

          if (parsedData.nextPayDate) {
            const storedDate = new Date(parsedData.nextPayDate);
            if (!isNaN(storedDate.getTime())) {
              setNextPayDate(storedDate);
              setHasSelectedDate(true);
            }
          }
        }
      } catch (fallbackError) {
        // Silent fallback failure
      }
    }
  }, [isEditMode]);

  /**
   * Save income data to backend and AsyncStorage
   */
  const saveIncomeData = useCallback(async () => {
    if (!income || !selectedFrequency || !hasSelectedDate) {
      Alert.alert(
        'Missing Information',
        'Please fill in all fields to continue.',
      );
      return;
    }

    setLoading(true);

    try {
      const incomeAmount = parseFloat(income);

      // Save to backend API (primary storage)
      await TrendAPIService.updateUserProfile({
        income: incomeAmount,
        setupComplete: true,
      });

      // Save complete data to AsyncStorage (backward compatibility)
      const setupData = {
        income: incomeAmount,
        frequency: selectedFrequency,
        nextPayDate: nextPayDate.toISOString(),
        setupComplete: true,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem('userSetup', JSON.stringify(setupData));

      // Handle navigation based on mode
      if (isEditMode) {
        Alert.alert('Success', 'Your income has been updated successfully.', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        navigation.replace('MainTabs');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save your income information. Please check your connection and try again.',
        [{text: 'OK'}],
      );
    } finally {
      setLoading(false);
    }
  }, [
    income,
    selectedFrequency,
    nextPayDate,
    hasSelectedDate,
    isEditMode,
    navigation,
  ]);

  /**
   * Handle income input change
   */
  const handleIncomeChange = useCallback(value => {
    setIncome(value);
  }, []);

  /**
   * Handle frequency selection
   */
  const handleFrequencySelect = useCallback(
    frequencyId => {
      if (loading) {
        return;
      }
      setSelectedFrequency(frequencyId);
    },
    [loading],
  );

  /**
   * Handle date selection
   */
  const handleDateChange = useCallback(selectedDate => {
    setNextPayDate(selectedDate);
    setHasSelectedDate(true);
  }, []);

  /**
   * Handle cancel action
   */
  const handleCancel = useCallback(() => {
    if (isEditMode) {
      navigation.goBack();
    }
  }, [isEditMode, navigation]);

  // ==============================================
  // LIFECYCLE METHODS
  // ==============================================

  // Load existing data on mount if in edit mode
  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // ==============================================
  // RENDER UI COMPONENT
  // ==============================================

  return (
    <IncomeSetupScreen
      // Data props
      income={income}
      selectedFrequency={selectedFrequency}
      nextPayDate={nextPayDate}
      hasSelectedDate={hasSelectedDate}
      loading={loading}
      isEditMode={isEditMode}
      frequencies={frequencies}
      // Event handlers
      onIncomeChange={handleIncomeChange}
      onFrequencySelect={handleFrequencySelect}
      onDateChange={handleDateChange}
      onSave={saveIncomeData}
      onCancel={handleCancel}
      // Navigation prop
      navigation={navigation}
    />
  );
};

export default IncomeSetupContainer;
