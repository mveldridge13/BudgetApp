// containers/TournamentDetailsContainer.js
import React, {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import TournamentDetailsScreen from '../screens/TournamentDetailsScreen';
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';

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
    // Navigate back to home with edit tournament action
    // We'll pass the tournament data back to trigger edit modal
    navigation.navigate('Home', {
      action: 'editTournament',
      tournament: tournament,
    });
  }, [navigation, tournament]);

  const handleAddEvent = useCallback(() => {
    console.log('🎲 TournamentDetails: Add event pressed');
    // TODO: Navigate to AddEventScreen or show AddEventModal
    Alert.alert(
      'Coming Soon',
      'Add event functionality will be implemented next.',
    );
  }, []);

  const handleEventPress = useCallback(event => {
    console.log('🎲 TournamentDetails: Event pressed:', event.eventName);
    // TODO: Navigate to event details or show event modal
    Alert.alert(
      'Event Details',
      `${event.eventName}\nBuy-in: $${event.buyIn}\nWinnings: $${
        event.winnings || 0
      }`,
    );
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
      onEventSwipeStart={handleEventSwipeStart}
      onEventSwipeEnd={handleEventSwipeEnd}
    />
  );
};

export default TournamentDetailsContainer;
