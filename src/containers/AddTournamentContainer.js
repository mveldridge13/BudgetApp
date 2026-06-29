// containers/AddTournamentContainer.js
import React, {useState, useCallback, useEffect} from 'react';
import {Alert} from 'react-native';
import AddTournamentCardModal from '../components/AddTournamentCardModal';
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';
import TournamentCache from '../services/TournamentCache';

const AddTournamentContainer = ({
  visible,
  onClose,
  onSave, // Called when tournament is successfully created/updated
  editingTournament = null, // Tournament to edit (null for create mode)
}) => {
  // ==============================================
  // FORM STATE
  // ==============================================
  const [tournamentName, setTournamentName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [accommodation, setAccommodation] = useState('');
  const [food, setFood] = useState('');
  const [otherExpenses, setOtherExpenses] = useState('');

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState('start'); // 'start' or 'end'

  // ==============================================
  // EDITING MODE INITIALIZATION
  // ==============================================
  useEffect(() => {
    if (editingTournament && visible) {
      console.log(
        '🎲 AddTournamentContainer: Initializing form with editing tournament:',
        editingTournament,
      );

      // Initialize form with editing tournament data (using Prisma field names)
      const accommodationValue =
        editingTournament.accommodationCost?.toString() || '';
      const foodValue = editingTournament.foodBudget?.toString() || '';
      const otherExpensesValue =
        editingTournament.otherExpenses?.toString() || '';

      console.log('🎲 AddTournamentContainer: Extracted values:', {
        accommodationValue,
        foodValue,
        otherExpensesValue,
        accommodationCost: editingTournament.accommodationCost,
        sharedExpenses: editingTournament.sharedExpenses,
      });

      setTournamentName(editingTournament.name || '');
      setLocation(editingTournament.location || '');
      setStartDate(
        editingTournament.dateStart
          ? new Date(editingTournament.dateStart)
          : null,
      );
      setEndDate(
        editingTournament.dateEnd ? new Date(editingTournament.dateEnd) : null,
      );
      setAccommodation(accommodationValue);
      setFood(foodValue);
      setOtherExpenses(otherExpensesValue);
    } else if (visible && !editingTournament) {
      console.log('🎲 AddTournamentContainer: Resetting form for create mode');
      // Reset form for create mode
      setTournamentName('');
      setLocation('');
      setStartDate(null);
      setEndDate(null);
      setAccommodation('');
      setFood('');
      setOtherExpenses('');
    }
  }, [editingTournament, visible]);

  // ==============================================
  // FORM HANDLERS (PURE UI DELEGATION)
  // ==============================================
  const handleTournamentNameChange = useCallback(value => {
    setTournamentName(value);
  }, []);

  const handleLocationChange = useCallback(value => {
    setLocation(value);
  }, []);

  const handleAccommodationChange = useCallback(value => {
    setAccommodation(value);
  }, []);

  const handleFoodChange = useCallback(value => {
    setFood(value);
  }, []);

  const handleOtherExpensesChange = useCallback(value => {
    setOtherExpenses(value);
  }, []);

  // ==============================================
  // CALENDAR HANDLERS (PURE UI DELEGATION)
  // ==============================================
  const handleShowCalendar = useCallback(mode => {
    setCalendarMode(mode);
    setShowCalendar(true);
  }, []);

  const handleHideCalendar = useCallback(() => {
    setShowCalendar(false);
  }, []);

  const handleDateChange = useCallback(
    date => {
      if (calendarMode === 'start') {
        setStartDate(date);
        // If start date is after end date, clear end date
        if (endDate && date > endDate) {
          setEndDate(null);
        }
      } else {
        setEndDate(date);
      }
      setShowCalendar(false);
    },
    [calendarMode, endDate],
  );

  // ==============================================
  // BUSINESS LOGIC - VALIDATION
  // ==============================================
  const validateForm = useCallback(() => {
    if (!tournamentName.trim()) {
      Alert.alert('Validation Error', 'Tournament name is required.');
      return false;
    }


    if (!startDate) {
      Alert.alert('Validation Error', 'Start date is required.');
      return false;
    }

    // Validate that end date is not before start date
    if (endDate && endDate < startDate) {
      Alert.alert('Validation Error', 'End date cannot be before start date.');
      return false;
    }

    return true;
  }, [tournamentName, startDate, endDate]);

  // ==============================================
  // BUSINESS LOGIC - SAVE TOURNAMENT
  // ==============================================
  const handleSave = useCallback(async () => {
    try {
      if (!validateForm()) {
        return;
      }

      if (!AuthService.isAuthenticated()) {
        Alert.alert(
          'Error',
          `You must be logged in to ${
            editingTournament ? 'update' : 'create'
          } a tournament.`,
        );
        return;
      }

      const isEditMode = !!editingTournament;
      console.log(
        `🎲 AddTournamentContainer: ${
          isEditMode ? 'Updating' : 'Creating'
        } tournament:`,
        {
          name: tournamentName,
          location,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          accommodation: parseFloat(accommodation) || 0,
          food: parseFloat(food) || 0,
          otherExpenses: parseFloat(otherExpenses) || 0,
        },
      );

      // Prepare tournament data for API (matching Prisma schema)
      const tournamentData = {
        name: tournamentName.trim(),
        location: location.trim(),
        dateStart: startDate.toISOString(),
        dateEnd: endDate ? endDate.toISOString() : null,
        accommodationCost: parseFloat(accommodation) || 0,
        foodBudget: parseFloat(food) || 0,
        otherExpenses: parseFloat(otherExpenses) || 0,
      };

      console.log(
        '🎲 AddTournamentContainer: Prepared tournament data for API:',
        {
          isEditMode,
          formValues: {accommodation, food, otherExpenses},
          tournamentData,
        },
      );

      // 🔄 CACHE-FIRST: Create/Update optimistic tournament for immediate UI update
      const optimisticTournament = isEditMode
        ? {
            ...editingTournament,
            ...tournamentData,
            updatedAt: new Date().toISOString(),
          }
        : {
            id: `temp_${Date.now()}`,
            ...tournamentData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

      console.log('🎲 AddTournamentContainer: Optimistic tournament:', {
        isEditMode,
        originalTournament: editingTournament,
        newData: tournamentData,
        optimisticResult: optimisticTournament,
      });

      // Update cache immediately for instant UI feedback
      await TournamentCache.upsertTournament(optimisticTournament);

      // Don't notify parent immediately - wait for server sync to avoid duplicates

      // Reset form and close modal immediately
      resetForm();
      onClose();

      // 🌐 BACKGROUND SYNC: Create/Update tournament on server
      try {
        const savedTournament = isEditMode
          ? await TrendAPIService.updateTournament(
              editingTournament.id,
              tournamentData,
            )
          : await TrendAPIService.createTournament(tournamentData);
        console.log(
          `🎲 AddTournamentContainer: Tournament ${
            isEditMode ? 'updated' : 'created'
          } on server:`,
          {
            savedTournament,
            serverData: {
              accommodationCost: savedTournament?.accommodationCost,
              foodBudget: savedTournament?.foodBudget,
              otherExpenses: savedTournament?.otherExpenses,
            },
          },
        );

        if (!isEditMode) {
          // For create mode: Remove optimistic tournament first to prevent duplicates
          await TournamentCache.removeTournament(optimisticTournament.id);
        }

        // Add/Update real server tournament
        await TournamentCache.upsertTournament(savedTournament);

        // Notify parent of real tournament data
        if (onSave) {
          onSave(savedTournament, true); // true indicates server sync complete
        }

        Alert.alert(
          'Success',
          `Tournament ${isEditMode ? 'updated' : 'created'} successfully!`,
        );
      } catch (syncError) {
        console.error(
          '🎲 AddTournamentContainer: Server sync failed:',
          syncError,
        );

        // Remove optimistic tournament on sync failure
        await TournamentCache.removeTournament(optimisticTournament.id);

        Alert.alert(
          'Sync Error',
          'Tournament was created locally but failed to sync to server. Please try again when online.',
          [{text: 'OK'}],
        );
      }
    } catch (error) {
      console.error(
        '🎲 AddTournamentContainer: Error creating tournament:',
        error,
      );
      Alert.alert('Error', 'Failed to create tournament. Please try again.', [
        {text: 'OK'},
      ]);
    }
  }, [
    tournamentName,
    location,
    startDate,
    endDate,
    accommodation,
    food,
    otherExpenses,
    editingTournament,
    onSave,
    onClose,
    validateForm,
  ]);

  // ==============================================
  // UI EVENT HANDLERS
  // ==============================================
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose]);

  // ==============================================
  // UTILITY FUNCTIONS
  // ==============================================
  const resetForm = () => {
    setTournamentName('');
    setLocation('');
    setStartDate(null);
    setEndDate(null);
    setAccommodation('');
    setFood('');
    setOtherExpenses('');
    setShowCalendar(false);
    setCalendarMode('start');
  };

  // ==============================================
  // RENDER (PURE UI COMPONENT)
  // ==============================================
  const isEditMode = !!editingTournament;

  return (
    <AddTournamentCardModal
      visible={visible}
      onClose={handleClose}
      onSave={handleSave}
      isEditMode={isEditMode}
      // Form data
      tournamentName={tournamentName}
      location={location}
      startDate={startDate}
      endDate={endDate}
      accommodation={accommodation}
      food={food}
      otherExpenses={otherExpenses}
      // Calendar state
      showCalendar={showCalendar}
      calendarMode={calendarMode}
      // Event handlers (delegated to pure UI)
      onTournamentNameChange={handleTournamentNameChange}
      onLocationChange={handleLocationChange}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onAccommodationChange={handleAccommodationChange}
      onFoodChange={handleFoodChange}
      onOtherExpensesChange={handleOtherExpensesChange}
      onShowCalendar={handleShowCalendar}
      onHideCalendar={handleHideCalendar}
      onDateChange={handleDateChange}
    />
  );
};

export default AddTournamentContainer;
