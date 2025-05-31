// components/GoalSuggestionsCard.js
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';

const GoalSuggestionsCard = ({suggestions, onCreateGoal, formatCurrency}) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleCreateSuggestion = suggestion => {
    // Pre-populate the add goal modal with suggestion data
    onCreateGoal(suggestion);
  };

  const getSuggestionIcon = type => {
    switch (type) {
      case 'savings':
        return 'piggy-bank';
      case 'spending':
        return 'credit-card';
      case 'debt':
        return 'trending-down';
      default:
        return 'target';
    }
  };

  const getSuggestionColor = type => {
    switch (type) {
      case 'savings':
        return colors.primary;
      case 'spending':
        return colors.warning;
      case 'debt':
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="lightbulb" size={18} color={colors.primary} />
          <Text style={styles.title}>Smart Suggestions</Text>
        </View>
        <Text style={styles.subtitle}>Based on your spending patterns</Text>
      </View>

      <View style={styles.suggestionsList}>
        {suggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionCard}>
            <View style={styles.suggestionContent}>
              <View style={styles.suggestionHeader}>
                <View style={styles.suggestionInfo}>
                  <View
                    style={[
                      styles.suggestionIcon,
                      {
                        backgroundColor: `${getSuggestionColor(
                          suggestion.type,
                        )}20`,
                      },
                    ]}>
                    <Icon
                      name={getSuggestionIcon(suggestion.type)}
                      size={16}
                      color={getSuggestionColor(suggestion.type)}
                    />
                  </View>
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionTitle}>
                      {suggestion.title}
                    </Text>
                    <Text style={styles.suggestionReason}>
                      {suggestion.reason}
                    </Text>
                  </View>
                </View>
                <View style={styles.suggestionAmount}>
                  <Text style={styles.amountText}>
                    {formatCurrency(suggestion.amount)}
                  </Text>
                  {suggestion.suggestedContribution && (
                    <Text style={styles.contributionText}>
                      {formatCurrency(suggestion.suggestedContribution)}/month
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.createButton,
                {backgroundColor: getSuggestionColor(suggestion.type)},
              ]}
              onPress={() => handleCreateSuggestion(suggestion)}
              activeOpacity={0.8}>
              <Icon name="plus" size={14} color={colors.textWhite} />
              <Text style={styles.createButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Info footer */}
      <View style={styles.infoFooter}>
        <Icon name="info" size={12} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          Suggestions are calculated based on your recent spending and income
          patterns
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  suggestionsList: {
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestionContent: {
    padding: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  suggestionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionReason: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  suggestionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
    letterSpacing: -0.2,
  },
  contributionText: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.success,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textSecondary,
    lineHeight: 14,
  },
});

export default GoalSuggestionsCard;
