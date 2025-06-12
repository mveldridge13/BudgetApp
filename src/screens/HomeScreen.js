/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
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
import {colors} from '../styles';
import CalendarModal from '../components/CalendarModal';
import AddTransactionModal from '../components/AddTransactionModal';
import BalanceCard from '../components/BalanceCard';
import TransactionList from '../components/TransactionList';
import BalanceCardSpotlight from '../components/BalanceCardSpotlight';
import AddTransactionSpotlight from '../components/AddTransactionSpotlight';
import TransactionSwipeSpotlight from '../components/TransactionSwipeSpotlight';
import useTransactions from '../hooks/useTransactions';
import useGoals from '../hooks/useGoals';
import {StorageCoordinator} from '../services/storage/StorageCoordinator';

const HomeScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();

  const [incomeData, setIncomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const storageCoordinator = StorageCoordinator.getInstance();
  const userStorageManager = storageCoordinator.getUserStorageManager();

  useEffect(() => {
    const checkStorageReady = () => {
      const isReady =
        storageCoordinator.isUserStorageInitialized() && userStorageManager;
      setIsStorageReady(isReady);
    };

    checkStorageReady();
    const interval = setInterval(checkStorageReady, 1000);

    return () => clearInterval(interval);
  }, [storageCoordinator, userStorageManager]);

  const [lastActiveDate, setLastActiveDate] = useState(
    new Date().toDateString(),
  );

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

  const balanceCardRef = useRef(null);
  const floatingButtonRef = useRef(null);
  const transactionRef = useRef(null);

  const {
    transactions,
    editingTransaction,
    loadTransactions,
    saveTransaction,
    deleteTransaction,
    prepareEditTransaction,
    clearEditingTransaction,
    calculateTotalExpenses,
    isStorageReady: transactionsStorageReady,
  } = useTransactions();

  const {
    goals,
    loadGoals,
    updateSpendingGoals,
    getBalanceCardGoals,
    calculateTotalGoalContributions,
    isStorageReady: goalsStorageReady,
  } = useGoals();

  useEffect(() => {
    if (isStorageReady) {
      loadIncomeData();
    }
  }, [isStorageReady]);

  useEffect(() => {
    setLastActiveDate(new Date().toDateString());
  }, []);

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        const now = new Date();
        const currentDateString = now.toDateString();

        if (lastActiveDate !== currentDateString) {
          setLastActiveDate(currentDateString);

          const selectedDateString = selectedDate.toDateString();
          if (selectedDateString === lastActiveDate) {
            setSelectedDate(new Date());
          }

          if (isStorageReady) {
            loadIncomeData();
          }
        } else {
          if (isStorageReady) {
            loadIncomeData();
          }
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [lastActiveDate, selectedDate, isStorageReady]);

  useEffect(() => {
    if (isStorageReady) {
      checkOnboardingStatus();
    }
  }, [isStorageReady, checkOnboardingStatus]);

  useFocusEffect(
    React.useCallback(() => {
      if (isStorageReady) {
        loadIncomeData();
      }
    }, [isStorageReady]),
  );

  const loadIncomeData = async () => {
    try {
      if (!isStorageReady || !userStorageManager) {
        return;
      }

      const storedData = await userStorageManager.getUserData('user_setup');
      if (storedData) {
        setIncomeData(storedData);
      }
    } catch (error) {
      console.error('❌ Error loading income data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkOnboardingStatus = useCallback(async () => {
    try {
      if (!isStorageReady || !userStorageManager) {
        return;
      }

      const hasSeenBalanceCardTour = await userStorageManager.getUserData(
        'tours.balanceCard',
      );
      const hasSeenAddTransactionTour = await userStorageManager.getUserData(
        'tours.addTransaction',
      );
      const hasCompletedSetup = await userStorageManager.getUserData(
        'user_setup',
      );

      if (hasCompletedSetup && !hasSeenBalanceCardTour) {
        setTimeout(() => {
          measureBalanceCard();
        }, 500);
      } else if (hasSeenBalanceCardTour && !hasSeenAddTransactionTour) {
        setTimeout(() => {
          measureFloatingButton();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
    }
  }, [isStorageReady, userStorageManager]);

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
        if (!isStorageReady || !userStorageManager) {
          return;
        }

        const hasSeenTransactionSwipeTour =
          await userStorageManager.getUserData('tours.transactionSwipe');

        if (hasSeenTransactionSwipeTour) {
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
        }
      } catch (error) {
        console.error('❌ Error checking tutorial status:', error);
      }
    };

    checkAndShowTutorial();
  }, [transactions.length, isStorageReady, userStorageManager]);

  const handleAddTransaction = () => {
    clearEditingTransaction();
    setShowAddTransaction(true);
  };

  const handleEditIncome = () => {
    navigation.navigate('IncomeSetup', {editMode: true});
  };

  const handleGoalsPress = () => {
    navigation.navigate('Goals');
  };

  const getCurrentTransactionData = async transactionId => {
    try {
      if (!isStorageReady || !userStorageManager) {
        return null;
      }

      const storedTransactions = await userStorageManager.getUserData(
        'transactions',
      );
      if (storedTransactions && Array.isArray(storedTransactions)) {
        return storedTransactions.find(t => t.id === transactionId);
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting current transaction data:', error);
      return null;
    }
  };

  const handleSaveTransaction = async transaction => {
    try {
      const originalTransaction = editingTransaction
        ? {...editingTransaction}
        : null;

      const result = await saveTransaction(transaction);

      if (originalTransaction) {
        await updateSpendingGoals(transaction, originalTransaction);
      } else {
        await updateSpendingGoals(transaction);
      }

      if (result.isNewTransaction && isStorageReady && userStorageManager) {
        const hasSeenTransactionSwipeTour =
          await userStorageManager.getUserData('tours.transactionSwipe');

        if (
          !hasSeenTransactionSwipeTour &&
          result.updatedTransactions.length === 1
        ) {
          setTimeout(() => {
            measureFirstTransaction();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error in handleSaveTransaction:', error);
    }
  };

  const handleDeleteTransaction = async transactionId => {
    try {
      if (!isStorageReady || !userStorageManager) {
        console.error(
          '❌ HomeScreen: Storage not ready, cannot delete transaction',
        );
        return;
      }

      const storedTransactions = await userStorageManager.getUserData(
        'transactions',
      );
      let currentTransactionList = [];

      if (storedTransactions && Array.isArray(storedTransactions)) {
        currentTransactionList = storedTransactions;
      } else {
        console.error('No transactions found in storage');
        return;
      }

      const transactionToDelete = currentTransactionList.find(
        t => t.id === transactionId,
      );

      if (!transactionToDelete) {
        console.error('Transaction not found for deletion:', transactionId);
        return;
      }

      await deleteTransaction(transactionId);

      await updateSpendingGoals(null, transactionToDelete);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleEditTransaction = async transaction => {
    try {
      const currentTransaction = await prepareEditTransaction(transaction);
      if (currentTransaction) {
        setShowAddTransaction(true);
      }
    } catch (error) {}
  };

  const handleCloseAddTransaction = () => {
    setShowAddTransaction(false);
    clearEditingTransaction();
  };

  const handleSwipeStart = () => setScrollEnabled(false);
  const handleSwipeEnd = () => setScrollEnabled(true);

  const handleBalanceCardSpotlightNext = async () => {
    try {
      if (isStorageReady && userStorageManager) {
        await userStorageManager.setUserData('tours.balanceCard', true);
      }
      setShowBalanceCardSpotlight(false);
      setTimeout(() => measureFloatingButton(), 300);
    } catch (error) {
      console.error('❌ Error saving balance card tour status:', error);
    }
  };

  const handleBalanceCardSpotlightSkip = async () => {
    try {
      if (isStorageReady && userStorageManager) {
        await userStorageManager.setUserData('tours.balanceCard', true);
      }
      setShowBalanceCardSpotlight(false);
    } catch (error) {
      console.error('❌ Error saving balance card tour status:', error);
    }
  };

  const handleAddTransactionSpotlightNext = async () => {
    try {
      if (isStorageReady && userStorageManager) {
        await userStorageManager.setUserData('tours.addTransaction', true);
      }
      setShowAddTransactionSpotlight(false);
      handleAddTransaction();
    } catch (error) {
      console.error('❌ Error saving add transaction tour status:', error);
    }
  };

  const handleAddTransactionSpotlightSkip = async () => {
    try {
      if (isStorageReady && userStorageManager) {
        await userStorageManager.setUserData('tours.addTransaction', true);
      }
      setShowAddTransactionSpotlight(false);
    } catch (error) {
      console.error('❌ Error saving add transaction tour status:', error);
    }
  };

  const handleTransactionSwipeSpotlightNext = async () => {
    try {
      if (isStorageReady && userStorageManager) {
        await userStorageManager.setUserData('tours.transactionSwipe', true);
      }
      setShowTransactionSwipeSpotlight(false);
      setTransactionSwipeStep(0);
    } catch (error) {
      console.error('❌ Error saving transaction swipe tour status:', error);
    }
  };

  const handleTransactionSwipeSpotlightSkip = async () => {
    try {
      if (isStorageReady && userStorageManager) {
        await userStorageManager.setUserData('tours.transactionSwipe', true);
      }
      setShowTransactionSwipeSpotlight(false);
      setTransactionSwipeStep(0);
    } catch (error) {
      console.error('❌ Error saving transaction swipe tour status:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <BalanceCard
          incomeData={incomeData}
          loading={loading}
          totalExpenses={calculateTotalExpenses(selectedDate, incomeData)}
          onCalendarPress={() => setShowCalendar(true)}
          onEditIncome={handleEditIncome}
          selectedDate={selectedDate}
          balanceCardRef={balanceCardRef}
          goals={goals}
          onGoalsPress={handleGoalsPress}
        />
      </View>

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

      <TouchableOpacity
        ref={floatingButtonRef}
        style={[styles.floatingButton, {bottom: insets.bottom + 30}]}
        onPress={handleAddTransaction}
        activeOpacity={0.8}>
        <Text style={styles.floatingButtonIcon}>+</Text>
      </TouchableOpacity>

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
