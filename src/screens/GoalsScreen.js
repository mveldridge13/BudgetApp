import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../styles';

const GoalsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Goals</Text>
      <Text style={styles.subtitle}>Savings & Budget Goals</Text>
      <Text style={styles.description}>
        Set and track your financial goals like saving for vacation, emergency
        fund, or paying off debt
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GoalsScreen;
