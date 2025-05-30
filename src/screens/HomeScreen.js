// screens/HomeScreen.js (Refactored)
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  AppState,
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
import useTransactions from '../hooks/useTransactions';

const HomeScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();

  // Core UI state
  const [incomeData, setIncomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Date detection state
  const [lastActiveDate, setLastActiveDate] = useState(
    new Date().toDateString(),
  );

  // Onboarding state
  const [showBalanceCardSpotlight, setShowBalanceCardSpotlight] =
    useState(false);
  const [balanceCardLayout, setBalanceCardLayout] = useState(null);
  const [showAddTransactionSpotlight, setShowAddTransactionSpotlight] =
    useState(false);
  const [floatingButtonLayout, setFloatingButtonLayout] = useState(null);
  const [showTransactionSwipeSpotlight, setShowTransactionSwipeSpotlight] =
    useState(false);
  const [transactionSwipeStep, setTransactionSwipeStep] = useState(0);
  const [transactionLayout, setTransactionLayout] = useState(null);

  // Refs
  const balanceCardRef = useRef(null);
  const floatingButtonRef = useRef(null);
  const transactionRef = useRef(null);

  // Custom hook for transaction management
  const {
    transactions,
    editingTransaction,
    loadTransactions,
    saveTransaction,
    deleteTransaction,
    prepareEditTransaction,
    clearEditingTransaction,
    calculateTotalExpenses,
  } = useTransactions();

  useEffect(() => {
    loadIncomeData();
    loadTransactions();
  }, [loadTransactions]);

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
  }, [lastActiveDate, selectedDate, loadTransactions]);

  // Check onboarding status
  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  // Reload income data when screen comes into focus (after editing)
  useFocusEffect(
    React.useCallback(() => {
      loadIncomeData();
    }, []),
  );

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

  const checkOnboardingStatus = useCallback(async () => {
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
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  }, [measureBalanceCard, measureFloatingButton]);

  const measureBalanceCard = useCallback(() => {
    if (balanceCardRef.current) {
      balanceCardRef.current.measure((x, y, width, height, pageX, pageY) => {
        setBalanceCardLayout({x: pageX, y: pageY, width, height});
        setShowBalanceCardSpotlight(true);
      });
    }
  }, []);

  const measureFloatingButton = useCallback(() => {
    if (floatingButtonRef.current) {
      floatingButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setFloatingButtonLayout({x: pageX, y: pageY, width, height});
        setShowAddTransactionSpotlight(true);
      });
    }
  }, []);

  const measureFirstTransaction = useCallback(() => {
    const checkAndShowTutorial = async () => {
      try {
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
              setTransactionLayout({x: pageX, y: pageY, width, height});
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

    checkAndShowTutorial();
  }, [transactions.length]);

  const handleAddTransaction = () => {
    clearEditingTransaction(); // Ensure we're in add mode, not edit mode
    setShowAddTransaction(true);
  };

  const handleEditIncome = () => {
    navigation.navigate('IncomeSetup', {editMode: true});
  };

  const handleSaveTransaction = async transaction => {
    try {
      const result = await saveTransaction(transaction);

      // Check tutorial status ONLY for new transactions
      if (result.isNewTransaction) {
        const hasSeenTransactionSwipeTour = await AsyncStorage.getItem(
          'hasSeenTransactionSwipeTour',
        );

        console.log('Transaction added - tutorial status:', {
          hasSeenTransactionSwipeTour,
          transactionCount: result.updatedTransactions.length,
        });

        // ONLY show tutorial if they haven't seen it AND this is their first transaction
        if (
          !hasSeenTransactionSwipeTour &&
          result.updatedTransactions.length === 1
        ) {
          console.log(
            'Triggering transaction swipe tutorial for FIRST transaction',
          );
          setTimeout(() => {
            measureFirstTransaction();
          }, 1000);
        }
      }
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleDeleteTransaction = async transactionId => {
    try {
      await deleteTransaction(transactionId);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleEditTransaction = async transaction => {
    try {
      const currentTransaction = await prepareEditTransaction(transaction);
      if (currentTransaction) {
        setShowAddTransaction(true);
      }
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleCloseAddTransaction = () => {
    setShowAddTransaction(false);
    clearEditingTransaction();
  };

  const handleSwipeStart = () => setScrollEnabled(false);
  const handleSwipeEnd = () => setScrollEnabled(true);

  // Onboarding handlers
  const handleBalanceCardSpotlightNext = async () => {
    try {
      await AsyncStorage.setItem('hasSeenBalanceCardTour', 'true');
      setShowBalanceCardSpotlight(false);
      setTimeout(() => measureFloatingButton(), 300);
    } catch (error) {
      console.error('Error saving balance card tour status:', error);
    }
  };

  const handleBalanceCardSpotlightSkip = async () => {
    try {
      await AsyncStorage.setItem('hasSeenBalanceCardTour', 'true');
      setShowBalanceCardSpotlight(false);
    } catch (error) {
      console.error('Error saving balance card tour status:', error);
    }
  };

  const handleAddTransactionSpotlightNext = async () => {
    try {
      await AsyncStorage.setItem('hasSeenAddTransactionTour', 'true');
      setShowAddTransactionSpotlight(false);
      handleAddTransaction();
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

  return (
    <View style={styles.container}>
      {/* Purple Gradient Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <BalanceCard
          incomeData={incomeData}
          loading={loading}
          totalExpenses={calculateTotalExpenses(selectedDate)}
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

      {/* Floating Add Button */}
      <TouchableOpacity
        ref={floatingButtonRef}
        style={[styles.floatingButton, {bottom: insets.bottom + 30}]}
        onPress={handleAddTransaction}
        activeOpacity={0.8}>
        <Text style={styles.floatingButtonIcon}>+</Text>
      </TouchableOpacity>

      {/* Modals */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <AddTransactionModal
        visible={showAddTransaction}
        onClose={handleCloseAddTransaction}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
      />

      {/* Onboarding Overlays */}
      <BalanceCardSpotlight
        visible={showBalanceCardSpotlight}
        onNext={handleBalanceCardSpotlightNext}
        onSkip={handleBalanceCardSpotlightSkip}
        balanceCardLayout={balanceCardLayout}
        incomeData={incomeData}
      />

      <AddTransactionSpotlight
        visible={showAddTransactionSpotlight}
        onNext={handleAddTransactionSpotlightNext}
        onSkip={handleAddTransactionSpotlightSkip}
        floatingButtonLayout={floatingButtonLayout}
      />

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
    borderRadius: 28,
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
