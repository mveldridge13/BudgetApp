// eslint-disable-next-line no-unused-vars
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';
import {colors} from '../styles';
import TransactionCard from './TransactionCard';

const TransactionList = ({
  transactions,
  selectedDate,
  onDeleteTransaction,
  onEditTransaction,
  onSwipeStart,
  onSwipeEnd,
  transactionRef,
  onTransactionLayout,
}) => {
  // Measure first transaction when transactions load
  useEffect(() => {
    if (transactions.length > 0 && transactionRef && onTransactionLayout) {
      setTimeout(() => {
        onTransactionLayout();
      }, 100);
    }
  }, [transactions.length, transactionRef, onTransactionLayout]);

  // Filter transactions for the selected date
  const dailyTransactions = transactions.filter(transaction => {
    if (transaction.recurrence && transaction.recurrence !== 'none') {
      return false;
    }
    const transactionDate = new Date(transaction.date);
    const isSameDay = (date1, date2) => {
      return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
      );
    };
    return isSameDay(transactionDate, selectedDate);
  });

  // Filter and group recurring transactions by frequency
  const getRecurringTransactionsByFrequency = () => {
    const recurringTransactions = transactions.filter(transaction => {
      return (
        transaction.recurrence &&
        transaction.recurrence !== 'none' &&
        ['weekly', 'fortnightly', 'monthly', 'sixmonths', 'yearly'].includes(
          transaction.recurrence,
        )
      );
    });

    // Group by recurrence type
    const grouped = {
      weekly: [],
      fortnightly: [],
      monthly: [],
      sixmonths: [],
      yearly: [],
    };

    recurringTransactions.forEach(transaction => {
      if (grouped[transaction.recurrence]) {
        grouped[transaction.recurrence].push(transaction);
      }
    });

    return grouped;
  };

  const recurringGroups = getRecurringTransactionsByFrequency();

  // Helper function to get section title
  const getSectionTitle = frequency => {
    const titles = {
      weekly: 'Weekly',
      fortnightly: 'Fortnightly',
      monthly: 'Monthly',
      sixmonths: 'Every Six Months',
      yearly: 'Yearly',
    };
    return titles[frequency] || 'Recurring';
  };

  const renderTransactionItem = ({item: transaction, index}) => {
    const isFirst = index === 0;

    return (
      <View
        ref={isFirst ? transactionRef : null}
        style={styles.transactionItemContainer}>
        <TransactionCard
          transaction={transaction}
          onDelete={onDeleteTransaction}
          onEdit={onEditTransaction}
          onSwipeStart={onSwipeStart}
          onSwipeEnd={onSwipeEnd}
        />
      </View>
    );
  };

  const renderRecurringItem = ({item: transaction}) => (
    <View style={styles.transactionItemContainer}>
      <TransactionCard
        transaction={transaction}
        onDelete={onDeleteTransaction}
        onEdit={onEditTransaction}
        onSwipeStart={onSwipeStart}
        onSwipeEnd={onSwipeEnd}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Daily Transactions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Transactions</Text>
        {dailyTransactions.length > 0 ? (
          <FlatList
            data={dailyTransactions}
            renderItem={renderTransactionItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyMessageContainer}>
            <Text style={styles.emptyMessage}>No transactions yet</Text>
          </View>
        )}
      </View>

      {/* Recurring Transactions Sections - Grouped by Frequency */}
      {['weekly', 'fortnightly', 'monthly', 'sixmonths', 'yearly'].map(
        frequency => {
          const transactionsForFrequency = recurringGroups[frequency];

          if (transactionsForFrequency.length === 0) {
            return null;
          }

          return (
            <View key={frequency} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {getSectionTitle(frequency)}
              </Text>
              <FlatList
                data={transactionsForFrequency}
                renderItem={renderRecurringItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          );
        },
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  transactionItemContainer: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  emptyMessageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default TransactionList;
