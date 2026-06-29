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
  // DEBUGGING HELPER (REMOVED - METHOD NOT AVAILABLE)
  // ==============================================

  // const debugAPIConnection = async () => {
  //   // Debug code removed - methods don't exist in current API service
  // };

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
      const userProfile = await TrendAPIService.getIncomeProfile();
      console.log('💰 IncomeSetup EDIT MODE - Backend data:', {
        income: userProfile?.income,
        incomeFrequency: userProfile?.incomeFrequency,
        nextPayDate: userProfile?.nextPayDate,
        nextPayDateType: typeof userProfile?.nextPayDate,
      });

      if (userProfile?.income) {
        setIncome(userProfile.income.toString());
      }

      // ✅ ENHANCED: Load frequency and nextPayDate from backend if available
      if (userProfile?.incomeFrequency) {
        setSelectedFrequency(userProfile.incomeFrequency.toLowerCase()); // 'MONTHLY' → 'monthly'
      }

      if (userProfile?.nextPayDate) {
        // Parse the date and create a local date (ignoring time component)
        const backendDate = new Date(userProfile.nextPayDate);
        const localDate = new Date(backendDate.getFullYear(), backendDate.getMonth(), backendDate.getDate());
        console.log('💰 IncomeSetup - Processing nextPayDate:', {
          original: userProfile.nextPayDate,
          parsed: backendDate,
          localDate: localDate,
          parsedLocalDate: backendDate.toLocaleDateString(),
          localDateLocal: localDate.toLocaleDateString(),
          parsedLocalTime: backendDate.toLocaleString(),
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffset: backendDate.getTimezoneOffset(),
          isValid: !isNaN(localDate.getTime()),
          currentNextPayDate: nextPayDate,
        });
        if (!isNaN(localDate.getTime())) {
          setNextPayDate(localDate);
          setHasSelectedDate(true);
          console.log('💰 IncomeSetup - Set nextPayDate to:', localDate);
        } else {
          console.error('💰 IncomeSetup - Invalid date from backend:', userProfile.nextPayDate);
        }
      } else {
        console.log('💰 IncomeSetup - No nextPayDate from backend');
      }

      // Secondary: Load from AsyncStorage for any missing data
      const existingData = await AsyncStorage.getItem('userSetup');
      if (existingData) {
        const parsedData = JSON.parse(existingData);

        // Use AsyncStorage income only if backend doesn't have it
        if (!userProfile?.income && parsedData.income) {
          setIncome(parsedData.income.toString());
        }

        // Use AsyncStorage frequency only if backend doesn't have it
        if (!userProfile?.incomeFrequency && parsedData.frequency) {
          setSelectedFrequency(parsedData.frequency);
        }

        // Use AsyncStorage nextPayDate only if backend doesn't have it
        if (!userProfile?.nextPayDate && parsedData.nextPayDate) {
          const storedDate = new Date(parsedData.nextPayDate);
          if (!isNaN(storedDate.getTime())) {
            setNextPayDate(storedDate);
            setHasSelectedDate(true);
          }
        }
      }
    } catch (error) {
      console.error('📥 Error loading existing data from backend:', error);

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
        console.error(
          '📥 Error loading from AsyncStorage fallback:',
          fallbackError,
        );
      }
    }
  }, [isEditMode, nextPayDate]);

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
      // Debug API connection (commented out - method doesn't exist yet)
      // console.log('💰 IncomeSetup: Starting debug checks...');
      // const debugResults = await debugAPIConnection();
      // console.log('💰 IncomeSetup: Debug results:', debugResults);

      // Check authentication status before making API call
      console.log('💰 IncomeSetup: Checking authentication status...');

      // Ensure API service is initialized
      await TrendAPIService.initialize();

      const isAuthenticated = TrendAPIService.isAuthenticated();
      console.log('💰 IncomeSetup: Is authenticated:', isAuthenticated);

      if (!isAuthenticated) {
        console.error('💰 IncomeSetup: User is not authenticated');
        Alert.alert(
          'Authentication Error',
          'You need to be logged in to save your income information. Please restart the app and try again.',
        );
        return;
      }

      const incomeAmount = parseFloat(income);

      // ✅ FIXED: Save complete income data to backend API (primary storage)
      const profileUpdateData = {
        income: incomeAmount,
        incomeFrequency: selectedFrequency.toUpperCase(), // Convert to WEEKLY/FORTNIGHTLY/MONTHLY
        nextPayDate: new Date(nextPayDate.getFullYear(), nextPayDate.getMonth(), nextPayDate.getDate(), 12, 0, 0).toISOString(), // ✅ Send as noon local time to avoid timezone issues
        setupComplete: true,
      };

      // ✅ ENHANCED: Validate data before sending
      console.log('💰 IncomeSetup: Validating profile data...');
      console.log('💰 IncomeSetup: Profile data to save:', {
        income: incomeAmount,
        incomeType: typeof incomeAmount,
        incomeFrequency: selectedFrequency.toUpperCase(),
        nextPayDate: nextPayDate.toISOString().split('T')[0],
        nextPayDateFull: nextPayDate.toISOString(),
        nextPayDateLocal: nextPayDate.toLocaleDateString(),
        setupComplete: true,
        hasSelectedDate: hasSelectedDate,
      });

      // Validate income amount
      if (!incomeAmount || isNaN(incomeAmount) || incomeAmount <= 0) {
        throw new Error('Invalid income amount: must be a positive number');
      }

      // Validate frequency
      const validFrequencies = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'];
      if (!validFrequencies.includes(selectedFrequency.toUpperCase())) {
        throw new Error(
          'Invalid income frequency: must be WEEKLY, FORTNIGHTLY, or MONTHLY',
        );
      }

      // Validate date format
      if (!nextPayDate || isNaN(nextPayDate.getTime())) {
        throw new Error('Invalid date: must be a valid date');
      }

      console.log(
        '💰 IncomeSetup: Data validation passed, saving to backend...',
      );

      // ✅ ENHANCED: Try to save and handle specific errors
      try {
        await TrendAPIService.updateIncomeProfile(profileUpdateData);
        console.log('💰 IncomeSetup: Income profile update successful');
      } catch (saveError) {
        console.error('💰 IncomeSetup: Save error details:', {
          message: saveError.message,
          stack: saveError.stack,
          profileData: profileUpdateData,
        });

        // Re-throw with more context
        throw new Error(`Failed to save income data: ${saveError.message}`);
      }

      // Save complete data to AsyncStorage (backward compatibility)
      const setupData = {
        income: incomeAmount,
        frequency: selectedFrequency,
        nextPayDate: nextPayDate.toISOString().split('T')[0],
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
      console.error('💥 Error saving income data:', error);

      // ✅ ENHANCED: Provide more specific error messages
      let errorMessage =
        'Failed to save your income information. Please check your connection and try again.';

      if (error.message?.includes('Authentication')) {
        errorMessage =
          'Authentication failed. Please log out and log back in to continue.';
      } else if (
        error.message?.includes('Network') ||
        error.message?.includes('fetch')
      ) {
        errorMessage =
          'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message?.includes('401')) {
        errorMessage = 'Session expired. Please log out and log back in.';
      } else if (error.message?.includes('400')) {
        errorMessage =
          'Invalid data provided. Please check your inputs and try again.';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Server error. Please try again in a few moments.';
      } else if (error.message?.includes('404')) {
        errorMessage =
          'The income setup feature is not available on the server. Please contact support.';
      }

      // ✅ ENHANCED: Offer to save locally as fallback
      Alert.alert('Error', errorMessage, [
        {
          text: 'Try Again',
          onPress: () => {
            // User can try again
          },
        },
        {
          text: 'Save Locally',
          onPress: async () => {
            try {
              // Save to AsyncStorage as fallback
              const setupData = {
                income: parseFloat(income),
                frequency: selectedFrequency,
                nextPayDate: nextPayDate.toISOString(), // ✅ Full DateTime
                setupComplete: true,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                savedLocally: true, // Flag to indicate local save
              };

              await AsyncStorage.setItem(
                'userSetup',
                JSON.stringify(setupData),
              );

              Alert.alert(
                'Saved Locally',
                'Your income data has been saved locally. It will sync when the server connection is restored.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      if (isEditMode) {
                        navigation.goBack();
                      } else {
                        navigation.replace('MainTabs');
                      }
                    },
                  },
                ],
              );
            } catch (localSaveError) {
              console.error('Failed to save locally:', localSaveError);
              Alert.alert(
                'Error',
                'Failed to save data locally. Please try again.',
              );
            }
          },
        },
      ]);
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
    console.log('💰 IncomeSetup - Date changed:', {
      previousDate: nextPayDate,
      previousDateLocal: nextPayDate.toLocaleDateString(),
      newDate: selectedDate,
      newDateISO: selectedDate.toISOString(),
      newDateLocal: selectedDate.toLocaleDateString(),
      newDateLocaleString: selectedDate.toLocaleString(),
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      today: new Date().toLocaleDateString(),
    });
    setNextPayDate(selectedDate);
    setHasSelectedDate(true);
  }, [nextPayDate]);

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
