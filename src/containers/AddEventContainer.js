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
  isCloseOutMode = false, // True when closing out an event (only results editable)
}) => {
  // ==============================================
  // FORM STATE
  // ==============================================
  const [eventName, setEventName] = useState('');
  const [eventNumber, setEventNumber] = useState('');
  const [gameType, setGameType] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [startingStack, setStartingStack] = useState('');
  const [blindStructure, setBlindStructure] = useState('');
  const [eventDate, setEventDate] = useState(null);
  const [start, setStart] = useState('');
  const [lateRego, setLateRego] = useState('');

  // Event Results fields (only for close-out mode)
  const [finishPosition, setFinishPosition] = useState('');
  const [prize, setPrize] = useState('');

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);

  // ==============================================
  // EDITING MODE INITIALIZATION
  // ==============================================
  useEffect(() => {
    if (editingEvent && visible) {

      setEventName(editingEvent.eventName || '');
      setEventNumber(editingEvent.eventNumber || '');
      setGameType(editingEvent.gameType || '');
      setBuyIn(editingEvent.buyIn?.toString() || '');
      setStartingStack(editingEvent.startingStack?.toString() || '');
      setBlindStructure(editingEvent.blindStructure || '');
      setEventDate(
        editingEvent.eventDate ? new Date(editingEvent.eventDate) : null,
      );
      setStart(editingEvent.start || '');
      setLateRego(editingEvent.lateRego || '');

      // Results fields
      setFinishPosition(editingEvent.finishPosition?.toString() || '');
      setPrize(editingEvent.winnings?.toString() || ''); // Using winnings as prize

    } else if (visible && !editingEvent) {
      // Reset form for create mode
      setEventName('');
      setEventNumber('');
      setGameType('');
      setBuyIn('');
      setStartingStack('');
      setBlindStructure('');
      setEventDate(null);
      setStart('');
      setLateRego('');
      setFinishPosition('');
      setPrize('');
    }
  }, [editingEvent, visible]);

  // ==============================================
  // FORM HANDLERS
  // ==============================================
  const handleEventNameChange = useCallback(value => {
    setEventName(value);
  }, []);

  const handleEventNumberChange = useCallback(value => {
    setEventNumber(value);
  }, []);

  const handleGameTypeChange = useCallback(value => {
    setGameType(value);
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

  const handleFinishPositionChange = useCallback(value => {
    setFinishPosition(value);
  }, []);

  const handlePrizeChange = useCallback(value => {
    setPrize(value);
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

    // Results field validation (only when provided)
    if (finishPosition && isNaN(parseInt(finishPosition, 10))) {
      Alert.alert(
        'Validation Error',
        'Finish position must be a valid number.',
      );
      return false;
    }

    if (prize && isNaN(parseFloat(prize))) {
      Alert.alert('Validation Error', 'Prize must be a valid number.');
      return false;
    }

    return true;
  }, [eventName, tournamentId, buyIn, startingStack, finishPosition, prize]);

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

      // Prepare event data for optimistic update
      const eventData = {
        eventName: eventName.trim(),
        eventNumber: eventNumber.trim() || null,
        gameType: gameType.trim(),
        buyIn: parseFloat(buyIn) || 0,
        startingStack: parseInt(startingStack, 10) || 0,
        blindStructure: blindStructure.trim(),
        eventDate: eventDate
          ? eventDate.toISOString()
          : new Date().toISOString(),
        start: start.trim(),
        lateRego: lateRego.trim(),
        // Results fields (mapped to backend schema)
        finishPosition: finishPosition ? parseInt(finishPosition, 10) : null,
        winnings: parseFloat(prize) || 0, // Prize maps to winnings field
        // Mark event as closed when closing out (regardless of results entered)
        isClosed: isCloseOutMode,
      };


      // 🎯 CACHE-FIRST: Immediate optimistic update
      let optimisticEvent = null;
      if (isEditMode) {
        // Update existing event optimistically
        optimisticEvent = {
          ...editingEvent,
          ...eventData,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Create new event optimistically
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        optimisticEvent = {
          ...eventData,
          id: tempId,
          tournamentId: tournamentId,
          userId: 'current_user', // Will be set properly by backend
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reBuys: 0,
          reBuyAmount: 0,
        };
      }

      // Reset form and close modal immediately for better UX
      resetForm();
      onClose();

      // Notify parent with optimistic data first
      if (onSave) {
        onSave(optimisticEvent, false); // false indicates optimistic update
      }

      // 🔄 BACKGROUND SYNC: Update server in background
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


        // Notify parent with real server data
        if (onSave) {
          onSave(savedEvent, true); // true indicates server sync complete
        }

        // Show success message
        Alert.alert(
          'Success',
          `Event ${isEditMode ? 'updated' : 'created'} successfully!`,
        );
      } catch (syncError) {
        console.error('Server sync failed:', syncError);

        // Notify parent about sync failure so they can handle rollback
        if (onSave) {
          onSave(null, 'error', syncError); // Pass error info
        }

        Alert.alert(
          'Sync Error',
          'Event saved locally but failed to sync to server. It will be retried automatically.',
          [{text: 'OK'}],
        );
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.', [
        {text: 'OK'},
      ]);
    }
  }, [
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
    isCloseOutMode,
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
    setEventNumber('');
    setGameType('');
    setBuyIn('');
    setStartingStack('');
    setBlindStructure('');
    setEventDate(null);
    setStart('');
    setLateRego('');
    setFinishPosition('');
    setPrize('');
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
      eventNumber={eventNumber}
      gameType={gameType}
      buyIn={buyIn}
      startingStack={startingStack}
      blindStructure={blindStructure}
      eventDate={eventDate}
      start={start}
      lateRego={lateRego}
      finishPosition={finishPosition}
      prize={prize}
      isCloseOutMode={isCloseOutMode}
      // Calendar state
      showCalendar={showCalendar}
      // Event handlers
      onEventNameChange={handleEventNameChange}
      onEventNumberChange={handleEventNumberChange}
      onGameTypeChange={handleGameTypeChange}
      onBuyInChange={handleBuyInChange}
      onStartingStackChange={handleStartingStackChange}
      onBlindStructureChange={handleBlindStructureChange}
      onStartChange={handleStartChange}
      onLateRegoChange={handleLateRegoChange}
      onFinishPositionChange={handleFinishPositionChange}
      onPrizeChange={handlePrizeChange}
      onShowCalendar={handleShowCalendar}
      onHideCalendar={handleHideCalendar}
      onDateChange={handleDateChange}
    />
  );
};

export default AddEventContainer;
