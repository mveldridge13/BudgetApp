import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors} from '../styles';
import TransactionCard from './TransactionCard';

const STORAGE_KEY = '@transaction_filter_due_today';

const TransactionList = ({
  transactions, // ✅ Now contains pre-resolved categoryData
  selectedDate,
  payPeriod, // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } for filtering recurring transactions
  onDeleteTransaction,
  onEditTransaction,
  onSwipeStart,
  onSwipeEnd,
  transactionRef,
  onTransactionLayout,
}) => {
  const [showDueToday, setShowDueToday] = useState(false);

  // Load filter preference from AsyncStorage on component mount
  useEffect(() => {
    const loadFilterPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          setShowDueToday(JSON.parse(saved));
        }
      } catch (error) {
        console.warn('Failed to load filter preference:', error);
      }
    };

    loadFilterPreference();
  }, []);

  // Save filter preference to AsyncStorage when it changes
  const handleToggleFilter = async () => {
    const newValue = !showDueToday;
    setShowDueToday(newValue);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
    } catch (error) {
      console.warn('Failed to save filter preference:', error);
    }
  };

  // Measure first transaction when transactions load
  useEffect(() => {
    if (transactions.length > 0 && transactionRef && onTransactionLayout) {
      setTimeout(() => {
        onTransactionLayout();
      }, 100);
    }
  }, [transactions.length, transactionRef, onTransactionLayout]);

  // Filter transactions for the selected date (excluding TRANSFER and ROLLOVER types)
  const dailyTransactions = transactions.filter(transaction => {
    if (transaction.recurrence && transaction.recurrence !== 'none') {
      return false;
    }
    // Exclude TRANSFER transactions - they have their own section
    if (transaction.type === 'TRANSFER') {
      return false;
    }
    // Exclude ROLLOVER transactions - they're for analytics only
    if (transaction.type === 'ROLLOVER') {
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

  // Filter TRANSFER transactions for the selected date (goal payments)
  const transferTransactions = transactions.filter(transaction => {
    if (transaction.recurrence && transaction.recurrence !== 'none') {
      return false;
    }
    // Only include TRANSFER type transactions
    if (transaction.type !== 'TRANSFER') {
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

  // Helper to check if a date is within pay period
  const isWithinPayPeriod = (dateStr) => {
    if (!payPeriod?.start || !payPeriod?.end ||!dateStr) {
      return true; // If no pay period info, show all
    }
    const date = new Date(dateStr);
    const start = new Date(payPeriod.start);
    const end = new Date(payPeriod.end);
    // Set times to start/end of day for proper comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    date.setHours(12, 0, 0, 0); // Noon to avoid timezone edge cases
    return date >= start && date <= end;
  };

  // Filter and group recurring transactions by frequency
  // Only show recurring transactions with dueDate within current pay period
  const getRecurringTransactionsByFrequency = () => {
    const recurringTransactions = transactions.filter(transaction => {
      // Must be a recurring transaction
      if (!transaction.recurrence || transaction.recurrence === 'none') {
        return false;
      }
      if (!['weekly', 'fortnightly', 'monthly', 'quarterly', 'sixmonths', 'yearly'].includes(
        transaction.recurrence,
      )) {
        return false;
      }
      // Filter by pay period using dueDate (or date if no dueDate)
      const relevantDate = transaction.dueDate || transaction.date;
      return isWithinPayPeriod(relevantDate);
    });

    // Group by recurrence type
    const grouped = {
      weekly: [],
      fortnightly: [],
      monthly: [],
      quarterly: [],
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

  // Helper function to check if a transaction is due on the selected date
  const isTransactionDueOnSelectedDate = transaction => {
    if (!transaction.dueDate) {
      return false;
    }
    const dueDate = new Date(transaction.dueDate);
    return dueDate.toDateString() === selectedDate.toDateString();
  };

  // Get recurring transactions that are due on the selected date
  const getDueOnSelectedDateRecurringTransactions = () => {
    const allRecurring = transactions.filter(transaction => {
      return (
        transaction.recurrence &&
        transaction.recurrence !== 'none' &&
        ['weekly', 'fortnightly', 'monthly', 'quarterly', 'sixmonths', 'yearly'].includes(
          transaction.recurrence,
        )
      );
    });

    return allRecurring.filter(isTransactionDueOnSelectedDate);
  };

  const dueOnSelectedDateRecurringTransactions =
    getDueOnSelectedDateRecurringTransactions();

  // Get dynamic section title based on selected date
  const getDueSectionTitle = () => {
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();

    if (isToday) {
      return 'Due Today';
    }

    return `Due ${selectedDate.toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
    })}`;
  };

  const getSectionTitle = frequency => {
    const titles = {
      weekly: 'Weekly',
      fortnightly: 'Fortnightly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
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
          categoryData={transaction.categoryData} // ✅ UPDATED: Pass pre-resolved categoryData
          onDelete={onDeleteTransaction}
          onEdit={onEditTransaction}
          onSwipeStart={onSwipeStart}
          onSwipeEnd={onSwipeEnd}
        />
      </View>
    );
  };

  const renderRecurringItem = ({item: transaction}) => {
    return (
      <View style={styles.transactionItemContainer}>
        <TransactionCard
          transaction={transaction}
          categoryData={transaction.categoryData} // ✅ UPDATED: Pass pre-resolved categoryData
          onDelete={onDeleteTransaction}
          onEdit={onEditTransaction}
          onSwipeStart={onSwipeStart}
          onSwipeEnd={onSwipeEnd}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Daily Transactions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Transactions</Text>
          <TouchableOpacity
            onPress={handleToggleFilter}
            style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {showDueToday ? 'View All' : 'Due Today'}
            </Text>
          </TouchableOpacity>
        </View>
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

      {/* Transfer Transactions Section - Only show if there are transfers */}
      {transferTransactions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>
            Goal Payments
          </Text>
          <FlatList
            data={transferTransactions}
            renderItem={renderTransactionItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Recurring Transactions Sections - Grouped by Frequency */}
      {showDueToday ? (
        // Show only recurring transactions due on selected date
        dueOnSelectedDateRecurringTransactions.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>
              {getDueSectionTitle()}
            </Text>
            <FlatList
              data={dueOnSelectedDateRecurringTransactions}
              renderItem={renderRecurringItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>
              {getDueSectionTitle()}
            </Text>
            <View style={styles.emptyMessageContainer}>
              <Text style={styles.emptyMessage}>
                No recurring transactions due on selected date
              </Text>
            </View>
          </View>
        )
      ) : (
        // Show all recurring transactions grouped by frequency
        ['weekly', 'fortnightly', 'monthly', 'quarterly', 'sixmonths', 'yearly'].map(
          frequency => {
            const transactionsForFrequency = recurringGroups[frequency];

            if (transactionsForFrequency.length === 0) {
              return null;
            }

            return (
              <View key={frequency} style={styles.section}>
                <Text
                  style={[styles.sectionTitle, styles.sectionTitleStandalone]}>
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
        )
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionTitleStandalone: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.overlayLight,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
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
