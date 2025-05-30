import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  AppState, // Added AppState import
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors} from '../styles';
import CalendarModal from '../components/CalendarModal';
import AddTransactionModal from '../components/AddTransactionModal';
import BalanceCard from '../components/BalanceCard';
import TransactionList from '../components/TransactionList';
import BalanceCardSpotlight from '../components/BalanceCardSpotlight';
import AddTransactionSpotlight from '../components/AddTransactionSpotlight';
import TransactionSwipeSpotlight from '../components/TransactionSwipeSpotlight';

const HomeScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [incomeData, setIncomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [deletingIds, setDeletingIds] = useState([]);

  // New state for editing
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingIds, setEditingIds] = useState([]);

  // Date detection state
  const [lastActiveDate, setLastActiveDate] = useState(
    new Date().toDateString(),
  );

  // Balance card onboarding state
  const [showBalanceCardSpotlight, setShowBalanceCardSpotlight] =
    useState(false);
  const [balanceCardLayout, setBalanceCardLayout] = useState(null);
  const balanceCardRef = useRef(null);

  // Add transaction onboarding state
  const [showAddTransactionSpotlight, setShowAddTransactionSpotlight] =
    useState(false);
  const [floatingButtonLayout, setFloatingButtonLayout] = useState(null);
  const floatingButtonRef = useRef(null);

  // Transaction swipe onboarding state
  const [showTransactionSwipeSpotlight, setShowTransactionSwipeSpotlight] =
    useState(false);
  const [transactionSwipeStep, setTransactionSwipeStep] = useState(0);
  const [transactionLayout, setTransactionLayout] = useState(null);
  const transactionRef = useRef(null);

  useEffect(() => {
    loadIncomeData();
    loadTransactions();
  }, []);

  // Initialize last active date on component mount
  useEffect(() => {
    setLastActiveDate(new Date().toDateString());
  }, []);

  // Monitor app state changes for date detection
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        const now = new Date();
        const currentDateString = now.toDateString();

        // Check if the date has changed since last time app was active
        if (lastActiveDate !== currentDateString) {
          console.log(
            'Date changed from',
            lastActiveDate,
            'to',
            currentDateString,
          );

          // Update the last active date
          setLastActiveDate(currentDateString);

          // If user was viewing "today" (previous day), update to new today
          const selectedDateString = selectedDate.toDateString();
          if (selectedDateString === lastActiveDate) {
            console.log('Updating selected date to new today');
            setSelectedDate(new Date());
          }

          // Reload all data
          loadIncomeData();
          loadTransactions();
        } else {
          // Same date, but still reload data in case of changes
          loadIncomeData();
          loadTransactions();
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [lastActiveDate, selectedDate]);

  // FIXED: Simplified useEffect for checking onboarding status
  useEffect(() => {
    checkOnboardingStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload income data when screen comes into focus (after editing)
  useFocusEffect(
    React.useCallback(() => {
      loadIncomeData();
    }, []),
  );

  // FIXED: Removed useCallback wrapper to prevent React hooks errors
  const checkOnboardingStatus = async () => {
    try {
      const hasSeenBalanceCardTour = await AsyncStorage.getItem(
        'hasSeenBalanceCardTour',
      );
      const hasSeenAddTransactionTour = await AsyncStorage.getItem(
        'hasSeenAddTransactionTour',
      );
      const hasCompletedSetup = await AsyncStorage.getItem('userSetup');

      // Show balance card spotlight if they've completed setup but haven't seen it
      if (hasCompletedSetup && !hasSeenBalanceCardTour) {
        setTimeout(() => {
          measureBalanceCard();
        }, 500);
      }
      // Show add transaction spotlight if they've seen balance card but not add transaction
      else if (hasSeenBalanceCardTour && !hasSeenAddTransactionTour) {
        setTimeout(() => {
          measureFloatingButton();
        }, 500);
      }

      // REMOVED: Don't trigger transaction tutorial from here anymore
      // Let handleSaveTransaction handle it when transactions are actually added
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const measureBalanceCard = useCallback(() => {
    if (balanceCardRef.current) {
      balanceCardRef.current.measure((x, y, width, height, pageX, pageY) => {
        setBalanceCardLayout({
          x: pageX,
          y: pageY,
          width,
          height,
        });
        setShowBalanceCardSpotlight(true);
      });
    }
  }, []);

  const measureFloatingButton = useCallback(() => {
    if (floatingButtonRef.current) {
      floatingButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setFloatingButtonLayout({
          x: pageX,
          y: pageY,
          width,
          height,
        });
        setShowAddTransactionSpotlight(true);
      });
    }
  }, []);

  const measureFirstTransaction = useCallback(() => {
    // Function to check tutorial status and show tutorial
    const checkAndShowTutorial = async () => {
      try {
        // Double-check tutorial status before showing
        const hasSeenTransactionSwipeTour = await AsyncStorage.getItem(
          'hasSeenTransactionSwipeTour',
        );

        if (hasSeenTransactionSwipeTour) {
          console.log('Tutorial already seen, not showing again');
          return;
        }

        if (transactionRef.current && transactions.length > 0) {
          transactionRef.current.measure(
            (x, y, width, height, pageX, pageY) => {
              setTransactionLayout({
                x: pageX,
                y: pageY,
                width,
                height,
              });
              setTransactionSwipeStep(0);
              setShowTransactionSwipeSpotlight(true);
            },
          );
        } else {
          console.log(
            'Cannot measure transaction - no ref or no transactions:',
            {
              hasRef: !!transactionRef.current,
              transactionCount: transactions.length,
            },
          );
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };

    // Call the async function
    checkAndShowTutorial();
  }, [transactions.length]);

  const handleBalanceCardSpotlightNext = async () => {
    try {
      await AsyncStorage.setItem('hasSeenBalanceCardTour', 'true');
      setShowBalanceCardSpotlight(false);

      // Start the next onboarding step - highlight the + button
      setTimeout(() => {
        measureFloatingButton();
      }, 300);
    } catch (error) {
      console.error('Error saving balance card tour status:', error);
    }
  };

  const handleBalanceCardSpotlightSkip = async () => {
    try {
      await AsyncStorage.setItem('hasSeenBalanceCardTour', 'true');
      setShowBalanceCardSpotlight(false);
      // You might want to skip all remaining onboarding steps here
    } catch (error) {
      console.error('Error saving balance card tour status:', error);
    }
  };

  const handleAddTransactionSpotlightNext = async () => {
    try {
      await AsyncStorage.setItem('hasSeenAddTransactionTour', 'true');
      setShowAddTransactionSpotlight(false);

      // Open the add transaction modal automatically
      handleAddTransaction();

      // After they add their first transaction, the swipe tutorial will trigger automatically
      // via the handleSaveTransaction function when transactions are added
    } catch (error) {
      console.error('Error saving add transaction tour status:', error);
    }
  };

  const handleAddTransactionSpotlightSkip = async () => {
    try {
      await AsyncStorage.setItem('hasSeenAddTransactionTour', 'true');
      setShowAddTransactionSpotlight(false);
    } catch (error) {
      console.error('Error saving add transaction tour status:', error);
    }
  };

  const handleTransactionSwipeSpotlightNext = async () => {
    try {
      console.log('Setting hasSeenTransactionSwipeTour to true (Next)');
      await AsyncStorage.setItem('hasSeenTransactionSwipeTour', 'true');
      setShowTransactionSwipeSpotlight(false);
      setTransactionSwipeStep(0);
    } catch (error) {
      console.error('Error saving transaction swipe tour status:', error);
    }
  };

  const handleTransactionSwipeSpotlightSkip = async () => {
    try {
      console.log('Setting hasSeenTransactionSwipeTour to true (Skip)');
      await AsyncStorage.setItem('hasSeenTransactionSwipeTour', 'true');
      setShowTransactionSwipeSpotlight(false);
      setTransactionSwipeStep(0);
    } catch (error) {
      console.error('Error saving transaction swipe tour status:', error);
    }
  };

  const loadIncomeData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('userSetup');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setIncomeData(parsedData);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null); // Ensure we're in add mode, not edit mode
    setShowAddTransaction(true);
  };

  // Handler for editing income setup
  const handleEditIncome = () => {
    navigation.navigate('IncomeSetup', {editMode: true});
  };

  const loadTransactions = async () => {
    try {
      const storedTransactions = await AsyncStorage.getItem('transactions');
      if (storedTransactions) {
        const parsedTransactions = JSON.parse(storedTransactions);
        setTransactions(parsedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const saveTransactions = async updatedTransactions => {
    try {
      await AsyncStorage.setItem(
        'transactions',
        JSON.stringify(updatedTransactions),
      );
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  };

  // FIXED: Simplified transaction tutorial logic
  const handleSaveTransaction = async transaction => {
    try {
      let updatedTransactions;

      if (editingTransaction) {
        // We're editing an existing transaction - NO TUTORIAL
        updatedTransactions = transactions.map(t =>
          t.id === editingTransaction.id ? transaction : t,
        );

        await saveTransactions(updatedTransactions);
        setTransactions(updatedTransactions);
        setEditingTransaction(null);
        return; // Exit early, no tutorial for edits
      }

      // Check tutorial status BEFORE adding transaction
      const hasSeenTransactionSwipeTour = await AsyncStorage.getItem(
        'hasSeenTransactionSwipeTour',
      );

      // We're adding a new transaction
      updatedTransactions = [...transactions, transaction];
      await saveTransactions(updatedTransactions);
      setTransactions(updatedTransactions);

      console.log('Transaction added - tutorial status:', {
        hasSeenTransactionSwipeTour,
        transactionCount: updatedTransactions.length,
      });

      // ONLY show tutorial if:
      // 1. They haven't seen it yet AND
      // 2. This is their very first transaction (count = 1)
      if (!hasSeenTransactionSwipeTour && updatedTransactions.length === 1) {
        console.log(
          'Triggering transaction swipe tutorial for FIRST transaction',
        );
        setTimeout(() => {
          measureFirstTransaction();
        }, 1000);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction.');
    }
  };

  const handleSwipeStart = () => {
    setScrollEnabled(false);
  };

  const handleSwipeEnd = () => {
    setScrollEnabled(true);
  };

  const handleDeleteTransaction = async transactionId => {
    try {
      // Prevent multiple deletes of the same transaction
      if (deletingIds.includes(transactionId)) {
        return;
      }

      setDeletingIds(prev => [...prev, transactionId]);

      // Get fresh transaction data from AsyncStorage before deleting
      const storedTransactions = await AsyncStorage.getItem('transactions');
      let currentTransactions = [];

      if (storedTransactions) {
        currentTransactions = JSON.parse(storedTransactions);
      } else {
        setDeletingIds(prev => prev.filter(id => id !== transactionId));
        Alert.alert('Error', 'No transactions found.');
        return;
      }

      // Find the transaction to delete
      const transactionToDelete = currentTransactions.find(
        t => t.id === transactionId,
      );
      if (!transactionToDelete) {
        setDeletingIds(prev => prev.filter(id => id !== transactionId));
        Alert.alert('Error', 'Transaction not found.');
        return;
      }

      // Get index and create updated array
      const indexToDelete = currentTransactions.findIndex(
        t => t.id === transactionId,
      );
      if (indexToDelete === -1) {
        setDeletingIds(prev => prev.filter(id => id !== transactionId));
        Alert.alert('Error', 'Transaction not found.');
        return;
      }

      const updatedTransactions = [
        ...currentTransactions.slice(0, indexToDelete),
        ...currentTransactions.slice(indexToDelete + 1),
      ];

      // Verify deletion worked correctly
      if (updatedTransactions.length !== currentTransactions.length - 1) {
        console.error('Delete operation failed - incorrect result');
        setDeletingIds(prev => prev.filter(id => id !== transactionId));
        Alert.alert('Error', 'Delete operation failed. Please try again.');
        return;
      }

      // Save and update state
      await saveTransactions(updatedTransactions);
      setTransactions(updatedTransactions);

      setDeletingIds(prev => prev.filter(id => id !== transactionId));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setDeletingIds(prev => prev.filter(id => id !== transactionId));
      Alert.alert('Error', 'Failed to delete transaction. Please try again.');
    }
  };

  const handleEditTransaction = async transaction => {
    try {
      // Prevent multiple edits of the same transaction
      if (editingIds.includes(transaction.id)) {
        return;
      }

      setEditingIds(prev => [...prev, transaction.id]);

      // Get fresh transaction data from AsyncStorage
      const storedTransactions = await AsyncStorage.getItem('transactions');
      let currentTransactions = [];

      if (storedTransactions) {
        currentTransactions = JSON.parse(storedTransactions);
      } else {
        setEditingIds(prev => prev.filter(id => id !== transaction.id));
        Alert.alert('Error', 'No transactions found.');
        return;
      }

      // Find the most current version of the transaction
      const currentTransaction = currentTransactions.find(
        t => t.id === transaction.id,
      );

      if (!currentTransaction) {
        setEditingIds(prev => prev.filter(id => id !== transaction.id));
        Alert.alert('Error', 'Transaction not found.');
        return;
      }

      // Set the transaction for editing and open the modal
      setEditingTransaction(currentTransaction);
      setShowAddTransaction(true);

      setEditingIds(prev => prev.filter(id => id !== transaction.id));
    } catch (error) {
      console.error('Error preparing edit transaction:', error);
      setEditingIds(prev => prev.filter(id => id !== transaction.id));
      Alert.alert('Error', 'Failed to prepare transaction for editing.');
    }
  };

  const handleCloseAddTransaction = () => {
    setShowAddTransaction(false);
    setEditingTransaction(null); // Clear editing state when modal closes
  };

  // Calculate total expenses for BalanceCard
  const calculateTotalExpenses = () => {
    // Filter daily transactions
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

    // Filter recurring transactions - UPDATED to include all recurrence types
    const recurringTransactions = transactions.filter(transaction => {
      return (
        transaction.recurrence &&
        transaction.recurrence !== 'none' &&
        ['monthly', 'fortnightly', 'sixmonths', 'yearly', 'weekly'].includes(
          transaction.recurrence,
        )
      );
    });

    const dailyExpenses = dailyTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const monthlyExpenses = recurringTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    return dailyExpenses + monthlyExpenses;
  };

  return (
    <View style={styles.container}>
      {/* Purple Gradient Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <BalanceCard
          incomeData={incomeData}
          loading={loading}
          totalExpenses={calculateTotalExpenses()}
          onCalendarPress={() => setShowCalendar(true)}
          onEditIncome={handleEditIncome}
          selectedDate={selectedDate}
          balanceCardRef={balanceCardRef}
        />
      </View>

      {/* Content Area - Transaction Lists */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}>
        <TransactionList
          transactions={transactions}
          selectedDate={selectedDate}
          onDeleteTransaction={handleDeleteTransaction}
          onEditTransaction={handleEditTransaction}
          onSwipeStart={handleSwipeStart}
          onSwipeEnd={handleSwipeEnd}
          transactionRef={transactionRef}
          onTransactionLayout={measureFirstTransaction}
        />
      </ScrollView>

      {/* Floating Add Button - NOW SQUARE */}
      <TouchableOpacity
        ref={floatingButtonRef}
        style={[styles.floatingButton, {bottom: insets.bottom + 30}]}
        onPress={handleAddTransaction}
        activeOpacity={0.8}>
        <Text style={styles.floatingButtonIcon}>+</Text>
      </TouchableOpacity>

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        visible={showAddTransaction}
        onClose={handleCloseAddTransaction}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
      />

      {/* Balance Card Spotlight Overlay */}
      <BalanceCardSpotlight
        visible={showBalanceCardSpotlight}
        onNext={handleBalanceCardSpotlightNext}
        onSkip={handleBalanceCardSpotlightSkip}
        balanceCardLayout={balanceCardLayout}
        incomeData={incomeData}
      />

      {/* Add Transaction Spotlight Overlay */}
      <AddTransactionSpotlight
        visible={showAddTransactionSpotlight}
        onNext={handleAddTransactionSpotlightNext}
        onSkip={handleAddTransactionSpotlightSkip}
        floatingButtonLayout={floatingButtonLayout}
      />

      {/* Transaction Swipe Spotlight Overlay */}
      <TransactionSwipeSpotlight
        visible={showTransactionSwipeSpotlight}
        onNext={handleTransactionSwipeSpotlightNext}
        onSkip={handleTransactionSwipeSpotlightSkip}
        transactionLayout={transactionLayout}
        currentStep={transactionSwipeStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28, // Changed from 28 to 8 to make it square with slightly rounded corners
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonIcon: {
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    lineHeight: 24,
  },
});

export default HomeScreen;
