// containers/AddEventContainer.js
import React, {useState, useCallback, useEffect} from 'react';
import {Alert} from 'react-native';
import AddEventModal from '../components/AddEventModal';
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';

const AddEventContainer = ({
  visible,
  onClose,
  onSave, // Called when event is successfully created/updated
  tournamentId, // Required for creating events
  editingEvent = null, // Event to edit (null for create mode)
}) => {
  // ==============================================
  // FORM STATE
  // ==============================================
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [startingStack, setStartingStack] = useState('');
  const [blindStructure, setBlindStructure] = useState('');
  const [eventDate, setEventDate] = useState(null);
  const [start, setStart] = useState('');
  const [lateRego, setLateRego] = useState('');

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);

  // ==============================================
  // EDITING MODE INITIALIZATION
  // ==============================================
  useEffect(() => {
    if (editingEvent && visible) {
      console.log(
        '🎲 AddEventContainer: Initializing form with editing event:',
        editingEvent,
      );

      setEventName(editingEvent.eventName || '');
      setEventType(editingEvent.eventType || '');
      setBuyIn(editingEvent.buyIn?.toString() || '');
      setStartingStack(editingEvent.startingStack?.toString() || '');
      setBlindStructure(editingEvent.blindStructure || '');
      setEventDate(
        editingEvent.eventDate ? new Date(editingEvent.eventDate) : null,
      );
      setStart(editingEvent.start || '');
      setLateRego(editingEvent.lateRego || '');
    } else if (visible && !editingEvent) {
      console.log('🎲 AddEventContainer: Resetting form for create mode');
      // Reset form for create mode
      setEventName('');
      setEventType('');
      setBuyIn('');
      setStartingStack('');
      setBlindStructure('');
      setEventDate(null);
      setStart('');
      setLateRego('');
    }
  }, [editingEvent, visible]);

  // ==============================================
  // FORM HANDLERS
  // ==============================================
  const handleEventNameChange = useCallback(value => {
    setEventName(value);
  }, []);

  const handleEventTypeChange = useCallback(value => {
    setEventType(value);
  }, []);

  const handleBuyInChange = useCallback(value => {
    setBuyIn(value);
  }, []);

  const handleStartingStackChange = useCallback(value => {
    setStartingStack(value);
  }, []);

  const handleBlindStructureChange = useCallback(value => {
    setBlindStructure(value);
  }, []);

  const handleStartChange = useCallback(value => {
    setStart(value);
  }, []);

  const handleLateRegoChange = useCallback(value => {
    setLateRego(value);
  }, []);

  // ==============================================
  // CALENDAR HANDLERS
  // ==============================================
  const handleShowCalendar = useCallback(() => {
    setShowCalendar(true);
  }, []);

  const handleHideCalendar = useCallback(() => {
    setShowCalendar(false);
  }, []);

  const handleDateChange = useCallback(date => {
    setEventDate(date);
    setShowCalendar(false);
  }, []);

  // ==============================================
  // BUSINESS LOGIC - VALIDATION
  // ==============================================
  const validateForm = useCallback(() => {
    if (!eventName.trim()) {
      Alert.alert('Validation Error', 'Event name is required.');
      return false;
    }

    if (!tournamentId) {
      Alert.alert('Error', 'Tournament ID is required to create an event.');
      return false;
    }

    // Validate numeric fields
    if (buyIn && isNaN(parseFloat(buyIn))) {
      Alert.alert('Validation Error', 'Buy-in must be a valid number.');
      return false;
    }

    if (startingStack && isNaN(parseInt(startingStack, 10))) {
      Alert.alert('Validation Error', 'Starting stack must be a valid number.');
      return false;
    }

    return true;
  }, [eventName, tournamentId, buyIn, startingStack]);

  // ==============================================
  // BUSINESS LOGIC - SAVE EVENT
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
            editingEvent ? 'update' : 'create'
          } an event.`,
        );
        return;
      }

      const isEditMode = !!editingEvent;
      console.log(
        `🎲 AddEventContainer: ${isEditMode ? 'Updating' : 'Creating'} event:`,
        {
          eventName,
          buyIn: parseFloat(buyIn) || 0,
          startingStack: parseInt(startingStack, 10) || 0,
          blindStructure: blindStructure,
          eventDate: eventDate?.toISOString(),
        },
      );

      // Prepare event data for API
      const eventData = {
        eventName: eventName.trim(),
        eventType: eventType.trim(),
        buyIn: parseFloat(buyIn) || 0,
        startingStack: parseInt(startingStack, 10) || 0,
        blindStructure: blindStructure.trim(),
        eventDate: eventDate
          ? eventDate.toISOString()
          : new Date().toISOString(),
        start: start.trim(),
        lateRego: lateRego.trim(),
      };

      console.log(
        '🎲 AddEventContainer: Prepared event data for API:',
        eventData,
      );

      // Reset form and close modal immediately for better UX
      resetForm();
      onClose();

      // Create/Update event on server
      try {
        const savedEvent = isEditMode
          ? await TrendAPIService.updateTournamentEvent(
              editingEvent.id,
              eventData,
            )
          : await TrendAPIService.createTournamentEvent(
              tournamentId,
              eventData,
            );

        console.log(
          `🎲 AddEventContainer: Event ${
            isEditMode ? 'updated' : 'created'
          } successfully:`,
          savedEvent,
        );

        // Notify parent of successful save
        if (onSave) {
          onSave(savedEvent);
        }

        Alert.alert(
          'Success',
          `Event ${isEditMode ? 'updated' : 'created'} successfully!`,
        );
      } catch (syncError) {
        console.error('🎲 AddEventContainer: Server sync failed:', syncError);

        Alert.alert(
          'Error',
          `Failed to ${
            isEditMode ? 'update' : 'create'
          } event. Please try again.`,
          [{text: 'OK'}],
        );
      }
    } catch (error) {
      console.error('🎲 AddEventContainer: Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.', [
        {text: 'OK'},
      ]);
    }
  }, [
    eventName,
    eventType,
    buyIn,
    startingStack,
    blindStructure,
    eventDate,
    start,
    lateRego,
    tournamentId,
    editingEvent,
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
    setEventName('');
    setEventType('');
    setBuyIn('');
    setStartingStack('');
    setBlindStructure('');
    setEventDate(null);
    setStart('');
    setLateRego('');
    setShowCalendar(false);
  };

  // ==============================================
  // RENDER
  // ==============================================
  const isEditMode = !!editingEvent;

  return (
    <AddEventModal
      visible={visible}
      onClose={handleClose}
      onSave={handleSave}
      isEditMode={isEditMode}
      // Form data
      eventName={eventName}
      eventType={eventType}
      buyIn={buyIn}
      startingStack={startingStack}
      blindStructure={blindStructure}
      eventDate={eventDate}
      start={start}
      lateRego={lateRego}
      // Calendar state
      showCalendar={showCalendar}
      // Event handlers
      onEventNameChange={handleEventNameChange}
      onEventTypeChange={handleEventTypeChange}
      onBuyInChange={handleBuyInChange}
      onStartingStackChange={handleStartingStackChange}
      onBlindStructureChange={handleBlindStructureChange}
      onStartChange={handleStartChange}
      onLateRegoChange={handleLateRegoChange}
      onShowCalendar={handleShowCalendar}
      onHideCalendar={handleHideCalendar}
      onDateChange={handleDateChange}
    />
  );
};

export default AddEventContainer;
