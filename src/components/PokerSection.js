import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';
import TournamentCard from './TournamentCard';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PokerSection = ({
  tournaments = [],
  isExpanded = false,
  onToggleExpanded = () => {},
  onTournamentPress = () => {},
  onTournamentEdit = () => {},
  onTournamentDelete = () => {},
  onAddTournament = () => {},
  onSwipeStart = () => {},
  onSwipeEnd = () => {},
}) => {
  console.log('🎲 PokerSection render:', {
    tournamentsCount: tournaments.length,
    tournaments: tournaments,
    isExpanded: isExpanded,
  });

  // Always render if poker module is enabled (component should only be shown when enabled)
  // This allows users to see the + button to create their first tournament

  const handleToggleExpanded = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });
    onToggleExpanded();
  };

  const activeTournaments = tournaments.filter(tournament => {
    const now = new Date();
    const start = new Date(tournament.dateStart);
    const end = tournament.dateEnd ? new Date(tournament.dateEnd) : start;
    return now >= start && now <= end;
  });

  const upcomingTournaments = tournaments.filter(tournament => {
    const now = new Date();
    const start = new Date(tournament.dateStart);
    return now < start;
  });

  const completedTournaments = tournaments.filter(tournament => {
    const now = new Date();
    const end = tournament.dateEnd
      ? new Date(tournament.dateEnd)
      : new Date(tournament.dateStart);
    return now > end;
  });

  // Sort tournaments: active first, then upcoming by date, then completed by date (recent first)
  const sortedTournaments = [
    ...activeTournaments.sort(
      (a, b) => new Date(a.dateStart) - new Date(b.dateStart),
    ),
    ...upcomingTournaments.sort(
      (a, b) => new Date(a.dateStart) - new Date(b.dateStart),
    ),
    ...completedTournaments.sort(
      (a, b) => new Date(b.dateStart) - new Date(a.dateStart),
    ),
  ];

  const displayTournaments = isExpanded
    ? sortedTournaments
    : sortedTournaments.slice(0, 2);

  console.log('🎲 PokerSection tournaments breakdown:', {
    activeTournaments: activeTournaments.length,
    upcomingTournaments: upcomingTournaments.length,
    completedTournaments: completedTournaments.length,
    sortedTournaments: sortedTournaments.length,
    displayTournaments: displayTournaments.length,
    isExpanded: isExpanded,
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggleExpanded}
        activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Icon name="trophy" size={20} color={colors.warning} />
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Poker</Text>
            <Text style={styles.subtitle}>
              {tournaments.length === 0
                ? 'No tournaments yet'
                : `${tournaments.length} tournament${
                    tournaments.length !== 1 ? 's' : ''
                  }`}
              {activeTournaments.length > 0 && (
                <Text style={styles.activeIndicator}>
                  {' '}
                  • {activeTournaments.length} active
                </Text>
              )}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddTournament}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="add" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandButton}
            onPress={handleToggleExpanded}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Tournament Cards - Only show when expanded */}
      {isExpanded && (
        <View style={styles.content}>
          {displayTournaments.map((tournament, index) => {
            console.log('🎲 Rendering TournamentCard:', {
              index,
              tournament: tournament.name,
              id: tournament.id,
            });
            return (
              <TournamentCard
                key={`${tournament.id}-${tournament.updatedAt}-${tournament.foodBudget}`}
                tournament={tournament}
                onPress={() => onTournamentPress(tournament)}
                onEdit={() => onTournamentEdit(tournament)}
                onDelete={() => onTournamentDelete(tournament.id)}
                onSwipeStart={onSwipeStart}
                onSwipeEnd={onSwipeEnd}
              />
            );
          })}

          {!isExpanded && sortedTournaments.length > 2 && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={handleToggleExpanded}
              activeOpacity={0.7}>
              <Text style={styles.showMoreText}>
                Show {sortedTournaments.length - 2} more tournament
                {sortedTournaments.length - 2 !== 1 ? 's' : ''}
              </Text>
              <Icon name="chevron-down" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeIndicator: {
    color: colors.success,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  expandButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  showMoreText: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 6,
    fontWeight: '500',
  },
});

export default PokerSection;
