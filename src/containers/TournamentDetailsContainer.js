// containers/TournamentDetailsContainer.js
import React, {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import TournamentDetailsScreen from '../screens/TournamentDetailsScreen';
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';
import AddTournamentContainer from './AddTournamentContainer';
import AddEventContainer from './AddEventContainer';

const TournamentDetailsContainer = ({navigation, route}) => {
  // ==============================================
  // ROUTE PARAMS
  // ==============================================
  const {tournament: initialTournament, tournamentId} = route.params || {};

  // ==============================================
  // STATE
  // ==============================================
  const [tournament, setTournament] = useState(initialTournament);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditTournament, setShowEditTournament] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);

  // ==============================================
  // LOAD TOURNAMENT EVENTS
  // ==============================================
  const loadTournamentEvents = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated() || !tournamentId) {
        console.log(
          '🎲 TournamentDetails: Not authenticated or missing tournament ID',
        );
        setLoading(false);
        return;
      }

      console.log(
        '🎲 TournamentDetails: Loading events for tournament:',
        tournamentId,
      );
      setLoading(true);

      const eventsResponse = await TrendAPIService.getTournamentEvents(
        tournamentId,
      );
      console.log(
        '🎲 TournamentDetails: Events loaded:',
        eventsResponse?.length || 0,
      );

      if (eventsResponse && Array.isArray(eventsResponse)) {
        // Sort events by date (most recent first)
        const sortedEvents = eventsResponse.sort(
          (a, b) => new Date(b.eventDate) - new Date(a.eventDate),
        );
        setEvents(sortedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('🎲 TournamentDetails: Error loading events:', error);
      setEvents([]);
      Alert.alert(
        'Error',
        'Failed to load tournament events. Please try again.',
        [{text: 'OK'}],
      );
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  // ==============================================
  // LOAD TOURNAMENT DETAILS (IF NEEDED)
  // ==============================================
  const loadTournamentDetails = useCallback(async () => {
    try {
      if (tournament || !tournamentId || !AuthService.isAuthenticated()) {
        return;
      }

      console.log(
        '🎲 TournamentDetails: Loading tournament details:',
        tournamentId,
      );
      const tournamentResponse = await TrendAPIService.getTournamentById(
        tournamentId,
      );

      if (tournamentResponse) {
        setTournament(tournamentResponse);
      }
    } catch (error) {
      console.error('🎲 TournamentDetails: Error loading tournament:', error);
      Alert.alert('Error', 'Failed to load tournament details.', [
        {text: 'OK'},
      ]);
    }
  }, [tournament, tournamentId]);

  // ==============================================
  // EFFECTS
  // ==============================================
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadTournamentDetails(), loadTournamentEvents()]);
    };

    loadData();
  }, [loadTournamentDetails, loadTournamentEvents]);

  // ==============================================
  // EVENT HANDLERS
  // ==============================================
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEditTournament = useCallback(() => {
    console.log('🎲 TournamentDetails: Edit tournament pressed');
    setShowEditTournament(true);
  }, []);

  const handleCloseEditTournament = useCallback(() => {
    console.log('🎲 Closing edit tournament modal');
    setShowEditTournament(false);
  }, []);

  const handleSaveTournament = useCallback(updatedTournament => {
    console.log('🎲 Tournament updated:', updatedTournament);
    // Update the local tournament state
    setTournament(updatedTournament);
    setShowEditTournament(false);
  }, []);

  const handleAddEvent = useCallback(() => {
    console.log('🎲 TournamentDetails: Add event pressed');
    setShowAddEvent(true);
  }, []);

  const handleCloseAddEvent = useCallback(() => {
    console.log('🎲 Closing add event modal');
    setShowAddEvent(false);
  }, []);

  const handleSaveEvent = useCallback(
    async savedEvent => {
      console.log('🎲 Event saved:', savedEvent);
      // Reload events to show the new event
      await loadTournamentEvents();
      setShowAddEvent(false);
    },
    [loadTournamentEvents],
  );

  const handleEventPress = useCallback(event => {
    console.log('🎲 TournamentDetails: Event pressed:', event.eventName);
    // TODO: Navigate to event details or show event modal
  }, []);

  const handleEventEdit = useCallback(event => {
    console.log('🎲 TournamentDetails: Edit event:', event.eventName);
    // TODO: Show edit event modal
    Alert.alert(
      'Coming Soon',
      'Edit event functionality will be implemented next.',
    );
  }, []);

  const handleEventDelete = useCallback(
    async eventId => {
      console.log('🎲 TournamentDetails: Delete event:', eventId);

      Alert.alert(
        'Delete Event',
        'Are you sure you want to delete this event?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await TrendAPIService.deleteTournamentEvent(eventId);
                // Reload events after deletion
                await loadTournamentEvents();
                Alert.alert('Success', 'Event deleted successfully.');
              } catch (error) {
                console.error(
                  '🎲 TournamentDetails: Error deleting event:',
                  error,
                );
                Alert.alert(
                  'Error',
                  'Failed to delete event. Please try again.',
                );
              }
            },
          },
        ],
      );
    },
    [loadTournamentEvents],
  );

  const handleEventRebuy = useCallback(
    async event => {
      console.log('🎲 TournamentDetails: Rebuy event:', event.eventName);

      Alert.alert('Add Re-Buy', `Add a re-buy to ${event.eventName}?`, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Add Re-Buy',
          onPress: async () => {
            try {
              // For now, we'll add a standard rebuy amount equal to the original buy-in
              const rebuyAmount = event.buyIn || 0;
              const currentRebuyCount = event.rebuyCount || 0;
              const currentRebuyAmount = event.rebuyAmount || 0;

              const updatedEventData = {
                ...event,
                rebuyCount: currentRebuyCount + 1,
                rebuyAmount: currentRebuyAmount + rebuyAmount,
              };

              await TrendAPIService.updateTournamentEvent(
                event.id,
                updatedEventData,
              );

              // Reload events after rebuy
              await loadTournamentEvents();
              Alert.alert('Success', 'Re-buy added successfully!');
            } catch (error) {
              console.error('🎲 TournamentDetails: Error adding rebuy:', error);
              Alert.alert('Error', 'Failed to add re-buy. Please try again.');
            }
          },
        },
      ]);
    },
    [loadTournamentEvents],
  );

  const handleEventSwipeStart = useCallback(() => {
    console.log('🎲 TournamentDetails: Event swipe started');
    // TODO: Disable scroll if needed
  }, []);

  const handleEventSwipeEnd = useCallback(() => {
    console.log('🎲 TournamentDetails: Event swipe ended');
    // TODO: Re-enable scroll if needed
  }, []);

  // ==============================================
  // RENDER
  // ==============================================
  return (
    <>
      <TournamentDetailsScreen
        tournament={tournament}
        events={events}
        loading={loading}
        onBack={handleBack}
        onEditTournament={handleEditTournament}
        onAddEvent={handleAddEvent}
        onEventPress={handleEventPress}
        onEventEdit={handleEventEdit}
        onEventDelete={handleEventDelete}
        onEventRebuy={handleEventRebuy}
        onEventSwipeStart={handleEventSwipeStart}
        onEventSwipeEnd={handleEventSwipeEnd}
      />

      {/* Tournament Edit Modal */}
      <AddTournamentContainer
        visible={showEditTournament}
        onClose={handleCloseEditTournament}
        onSave={handleSaveTournament}
        editingTournament={tournament}
      />

      {/* Add Event Modal */}
      <AddEventContainer
        visible={showAddEvent}
        onClose={handleCloseAddEvent}
        onSave={handleSaveEvent}
        tournamentId={tournamentId}
      />
    </>
  );
};

export default TournamentDetailsContainer;
