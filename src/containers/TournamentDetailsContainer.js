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
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showCloseEvent, setShowCloseEvent] = useState(false);
  const [closingEvent, setClosingEvent] = useState(null);

  // ==============================================
  // LOAD TOURNAMENT EVENTS
  // ==============================================
  const loadTournamentEvents = useCallback(async () => {
    try {
      if (!AuthService.isAuthenticated() || !tournamentId) {
        setLoading(false);
        return [];
      }

      setLoading(true);

      const eventsResponse = await TrendAPIService.getTournamentEvents(
        tournamentId,
      );

      if (eventsResponse && Array.isArray(eventsResponse)) {
        // Sort events by date (most recent first)
        const sortedEvents = eventsResponse.sort(
          (a, b) => new Date(b.eventDate) - new Date(a.eventDate),
        );
        setEvents(sortedEvents);
        return sortedEvents;
      } else {
        setEvents([]);
        return [];
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
      Alert.alert(
        'Error',
        'Failed to load tournament events. Please try again.',
        [{text: 'OK'}],
      );
      return [];
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

      const tournamentResponse = await TrendAPIService.getTournamentById(
        tournamentId,
      );

      if (tournamentResponse) {
        setTournament(tournamentResponse);
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
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
    setShowEditTournament(true);
  }, []);

  const handleCloseEditTournament = useCallback(() => {
    setShowEditTournament(false);
  }, []);

  const handleSaveTournament = useCallback(updatedTournament => {
    // Update the local tournament state
    setTournament(updatedTournament);
    setShowEditTournament(false);
  }, []);

  const handleAddEvent = useCallback(() => {
    setShowAddEvent(true);
  }, []);

  const handleCloseAddEvent = useCallback(() => {
    setShowAddEvent(false);
  }, []);

  const handleCloseEditEvent = useCallback(() => {
    setShowEditEvent(false);
    setEditingEvent(null);
  }, []);

  const handleSaveEvent = useCallback(async (savedEvent, isSynced, error) => {
    if (error) {
      // Handle sync error - could implement retry logic here
      console.error('🎲 Event sync failed:', error);
      return;
    }

    if (!isSynced) {
      // 🎯 OPTIMISTIC UPDATE: Add event to local state immediately
      const optimisticEvent = savedEvent;
      setEvents(prev => {
        // Sort events by date (most recent first)
        const updated = [optimisticEvent, ...prev].sort(
          (a, b) => new Date(b.eventDate) - new Date(a.eventDate),
        );
        return updated;
      });
    } else {
      // 🔄 SERVER SYNC COMPLETE: Update with real server data
      setEvents(prev => {
        const updated = prev.map(event =>
          event.id === savedEvent.id || event.id?.startsWith('temp_')
            ? savedEvent
            : event,
        );
        return updated.sort(
          (a, b) => new Date(b.eventDate) - new Date(a.eventDate),
        );
      });
    }

    setShowAddEvent(false);
  }, []);

  const handleSaveEditEvent = useCallback(
    async (savedEvent, isSynced, error) => {
      if (error) {
        console.error('🎲 Event edit sync failed:', error);
        return;
      }

      if (!isSynced) {
        // 🎯 OPTIMISTIC UPDATE: Update event in local state immediately
        setEvents(prev => {
          const updated = prev.map(event =>
            event.id === savedEvent.id ? savedEvent : event,
          );
          return updated.sort(
            (a, b) => new Date(b.eventDate) - new Date(a.eventDate),
          );
        });
      } else {
        // 🔄 SERVER SYNC COMPLETE: Update with real server data
        setEvents(prev => {
          const updated = prev.map(event => {
            if (event.id === savedEvent.id) {
              return savedEvent;
            }
            return event;
          });
          return updated.sort(
            (a, b) => new Date(b.eventDate) - new Date(a.eventDate),
          );
        });
      }

      setShowEditEvent(false);
      setEditingEvent(null);
    },
    [],
  );

  const handleEventClose = useCallback(event => {
    setClosingEvent(event);
    setShowCloseEvent(true);
  }, []);

  const handleCloseCloseEvent = useCallback(() => {
    setShowCloseEvent(false);
    setClosingEvent(null);
  }, []);

  const handleSaveCloseEvent = useCallback(
    async (savedEvent, isSynced, error) => {
      if (error) {
        console.error('🎲 Event close sync failed:', error);
        return;
      }

      if (!isSynced) {
        // 🎯 OPTIMISTIC UPDATE: Update event in local state immediately
        setEvents(prev => {
          const updated = prev.map(event =>
            event.id === savedEvent.id ? savedEvent : event,
          );
          return updated.sort(
            (a, b) => new Date(b.eventDate) - new Date(a.eventDate),
          );
        });
      } else {
        // 🔄 SERVER SYNC COMPLETE: Update with real server data
        setEvents(prev => {
          const updated = prev.map(event =>
            event.id === savedEvent.id ? savedEvent : event,
          );
          return updated.sort(
            (a, b) => new Date(b.eventDate) - new Date(a.eventDate),
          );
        });
      }

      setShowCloseEvent(false);
      setClosingEvent(null);
    },
    [],
  );

  const handleEventPress = useCallback(() => {
    // TODO: Navigate to event details or show event modal
  }, []);

  const handleEventEdit = useCallback(
    async event => {
      // Reload events from server to ensure we have the most up-to-date data
      const freshEvents = await loadTournamentEvents();

      // Find the refreshed event data from the fresh server response
      const refreshedEvent = freshEvents.find(e => e.id === event.id) || event;

      setEditingEvent(refreshedEvent);
      setShowEditEvent(true);
    },
    [loadTournamentEvents],
  );

  const handleEventDelete = useCallback(
    async eventId => {
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
                  'Error deleting event:',
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
      Alert.alert('Add Re-Buy', `Add a re-buy to ${event.eventName}?`, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Add Re-Buy',
          onPress: async () => {
            try {
              // For now, we'll add a standard rebuy amount equal to the original buy-in
              const rebuyAmount = event.buyIn || 0;
              const currentReBuys = event.reBuys || 0;
              const currentReBuyAmount = event.reBuyAmount || 0;

              const updatedEventData = {
                ...event,
                reBuys: currentReBuys + 1,
                reBuyAmount: currentReBuyAmount + rebuyAmount,
              };

              await TrendAPIService.updateTournamentEvent(
                event.id,
                updatedEventData,
              );

              // Reload events after rebuy
              await loadTournamentEvents();
              Alert.alert('Success', 'Re-buy added successfully!');
            } catch (error) {
              console.error('Error adding rebuy:', error);
              Alert.alert('Error', 'Failed to add re-buy. Please try again.');
            }
          },
        },
      ]);
    },
    [loadTournamentEvents],
  );

  const handleEventSwipeStart = useCallback(() => {
    // TODO: Disable scroll if needed
  }, []);

  const handleEventSwipeEnd = useCallback(() => {
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
        onEventClose={handleEventClose}
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

      {/* Edit Event Modal */}
      <AddEventContainer
        visible={showEditEvent}
        onClose={handleCloseEditEvent}
        onSave={handleSaveEditEvent}
        tournamentId={tournamentId}
        editingEvent={editingEvent}
      />

      {/* Close Event Modal */}
      <AddEventContainer
        visible={showCloseEvent}
        onClose={handleCloseCloseEvent}
        onSave={handleSaveCloseEvent}
        tournamentId={tournamentId}
        editingEvent={closingEvent}
        isCloseOutMode={true}
      />
    </>
  );
};

export default TournamentDetailsContainer;
