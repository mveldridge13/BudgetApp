// screens/TournamentDetailsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles';

const TournamentDetailsScreen = ({
  // ==============================================
  // DATA PROPS
  // ==============================================
  tournament,
  events = [],
  loading = false,

  // ==============================================
  // EVENT HANDLER PROPS
  // ==============================================
  onBack = () => {},
  onEditTournament = () => {},
  onAddEvent = () => {},
  onEventPress = () => {},
  onEventEdit = () => {},
  onEventDelete = () => {},
  onEventSwipeStart = () => {},
  onEventSwipeEnd = () => {},
}) => {
  const insets = useSafeAreaInsets();

  if (!tournament) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, {paddingTop: insets.top + 16}]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tournament not found</Text>
          <View style={styles.editButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Tournament not found</Text>
        </View>
      </View>
    );
  }

  // ==============================================
  // TOURNAMENT INFO CALCULATIONS
  // ==============================================
  const formatDate = date => {
    if (!date) {
      return '';
    }
    const d = new Date(date);
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalBudget =
    (tournament.accommodationCost || 0) +
    (tournament.foodBudget || 0) +
    (tournament.otherExpenses || 0);

  const totalBuyIns = events.reduce(
    (sum, event) => sum + (event.buyIn || 0),
    0,
  );
  const totalWinnings = events.reduce(
    (sum, event) => sum + (event.winnings || 0),
    0,
  );
  const netResult = totalWinnings - totalBuyIns;

  // ==============================================
  // RENDER
  // ==============================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 16}]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tournament.name}
        </Text>
        <TouchableOpacity onPress={onEditTournament} style={styles.editButton}>
          <Icon name="create-outline" size={24} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tournament Info Card */}
        <View style={styles.tournamentCard}>
          <View style={styles.tournamentHeader}>
            <View style={styles.iconContainer}>
              <Icon name="trophy" size={24} color={colors.warning} />
            </View>
            <View style={styles.tournamentInfo}>
              <Text style={styles.tournamentName}>{tournament.name}</Text>
              <View style={styles.locationRow}>
                <Icon name="location" size={16} color={colors.textSecondary} />
                <Text style={styles.location}>{tournament.location}</Text>
              </View>
            </View>
          </View>

          {/* Tournament Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Icon name="calendar" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatDate(tournament.dateStart)}
                {tournament.dateEnd && ` - ${formatDate(tournament.dateEnd)}`}
              </Text>
            </View>

            {tournament.venue && (
              <View style={styles.detailRow}>
                <Icon name="business" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>{tournament.venue}</Text>
              </View>
            )}

            {totalBudget > 0 && (
              <View style={styles.detailRow}>
                <Icon name="wallet" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  Budget: ${totalBudget.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Performance Summary */}
        {events.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Performance Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Events</Text>
                <Text style={styles.summaryValue}>{events.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Buy-ins</Text>
                <Text style={styles.summaryValue}>
                  ${totalBuyIns.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Winnings</Text>
                <Text style={[styles.summaryValue, {color: colors.success}]}>
                  ${totalWinnings.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net Result</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {color: netResult >= 0 ? colors.success : colors.error},
                  ]}>
                  {netResult >= 0 ? '+' : ''}${netResult.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Events Section */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Events</Text>
            <TouchableOpacity onPress={onAddEvent} style={styles.addButton}>
              <Icon name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                name="trophy-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to add your first event
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {events.map((event, index) => (
                <View key={event.id || index} style={styles.eventCard}>
                  <TouchableOpacity
                    style={styles.eventContent}
                    onPress={() => onEventPress(event)}
                    activeOpacity={0.7}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventName}>{event.eventName}</Text>
                      {event.eventNumber && (
                        <Text style={styles.eventNumber}>
                          #{event.eventNumber}
                        </Text>
                      )}
                    </View>

                    <View style={styles.eventDetails}>
                      <View style={styles.eventDetailRow}>
                        <Text style={styles.eventLabel}>Buy-in:</Text>
                        <Text style={styles.eventValue}>
                          ${event.buyIn || 0}
                        </Text>
                      </View>
                      {event.winnings > 0 && (
                        <View style={styles.eventDetailRow}>
                          <Text style={styles.eventLabel}>Winnings:</Text>
                          <Text
                            style={[
                              styles.eventValue,
                              {color: colors.success},
                            ]}>
                            ${event.winnings}
                          </Text>
                        </View>
                      )}
                      {event.finishPosition && (
                        <View style={styles.eventDetailRow}>
                          <Text style={styles.eventLabel}>Finish:</Text>
                          <Text style={styles.eventValue}>
                            #{event.finishPosition}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.warning,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  editButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  tournamentCard: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  detailsSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  eventsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  eventsList: {
    // No specific styles needed
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  eventNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventDetails: {
    // No specific styles needed
  },
  eventDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  eventValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default TournamentDetailsScreen;
