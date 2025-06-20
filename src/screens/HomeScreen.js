/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
// screens/HomeScreen.js - PURE UI COMPONENT
import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles';
import CalendarModal from '../components/CalendarModal';
import AddTransactionContainer from '../containers/AddTransactionContainer';
import BalanceCard from '../components/BalanceCard';
import TransactionList from '../components/TransactionList';
import BalanceCardSpotlight from '../components/BalanceCardSpotlight';
import AddTransactionSpotlight from '../components/AddTransactionSpotlight';
import TransactionSwipeSpotlight from '../components/TransactionSwipeSpotlight';

const HomeScreen = ({
  // ==============================================
  // DATA PROPS (from HomeContainer)
  // ==============================================
  incomeData = null,
  userProfile = null,
  transactions = [],
  categories = [], // ✅ NEW: Receive categories prop
  goals = [],
  editingTransaction = null,
  loading = false,
  selectedDate = new Date(),
  onboardingStatus = null,
  totalExpenses = 0,

  // ==============================================
  // EVENT HANDLER PROPS (from HomeContainer)
  // ==============================================
  onDateChange = () => {},
  onSaveTransaction = () => {},
  onDeleteTransaction = () => {},
  onEditTransaction = () => {},
  onClearEditingTransaction = () => {},
  onEditIncome = () => {},
  onGoalsPress = () => {},
  onOnboardingComplete = () => {},
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  // ==============================================
  // UI-ONLY STATE (No Business Logic)
  // ==============================================

  // Modal visibility state
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  // Scroll behavior state
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Onboarding UI state
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

  // Component refs for measurements
  const balanceCardRef = useRef(null);
  const floatingButtonRef = useRef(null);
  const transactionRef = useRef(null);

  // ==============================================
  // UI EVENT HANDLERS (Pure UI Logic Only)
  // ==============================================

  /**
   * Handle opening add transaction modal
   * Ensures we're in add mode (not edit mode)
   */
  const handleAddTransaction = useCallback(() => {
    onClearEditingTransaction(); // Clear any editing state
    setShowAddTransaction(true);
  }, [onClearEditingTransaction]);

  /**
   * Handle closing add transaction modal
   */
  const handleCloseAddTransaction = useCallback(() => {
    setShowAddTransaction(false);
    onClearEditingTransaction();
  }, [onClearEditingTransaction]);

  /**
   * Handle transaction save with tutorial logic
   */
  const handleSaveTransaction = useCallback(
    async transaction => {
      try {
        // Call business logic handler from container
        const result = await onSaveTransaction(transaction);

        // Handle UI-specific logic for tutorials
        if (result?.shouldShowTransactionTutorial) {
          setTimeout(() => {
            measureFirstTransaction();
          }, 1000);
        }

        // Close modal on successful save
        setShowAddTransaction(false);
      } catch (error) {
        // Error handling is done in container
        // UI just stays open for user to retry
        console.log('HomeScreen: Transaction save failed, keeping modal open');
      }
    },
    [onSaveTransaction],
  );

  /**
   * Handle transaction editing
   */
  const handleEditTransaction = useCallback(
    async transaction => {
      try {
        const currentTransaction = await onEditTransaction(transaction);
        if (currentTransaction) {
          setShowAddTransaction(true);
        }
      } catch (error) {
        // Error handling is done in container
      }
    },
    [onEditTransaction],
  );

  /**
   * Handle swipe gesture states for smooth scrolling
   */
  const handleSwipeStart = useCallback(() => setScrollEnabled(false), []);
  const handleSwipeEnd = useCallback(() => setScrollEnabled(true), []);

  // ==============================================
  // ONBOARDING MEASUREMENT HELPERS
  // ==============================================

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
    if (transactionRef.current && transactions && transactions.length > 0) {
      transactionRef.current.measure((x, y, width, height, pageX, pageY) => {
        setTransactionLayout({x: pageX, y: pageY, width, height});
        setTransactionSwipeStep(0);
        setShowTransactionSwipeSpotlight(true);
      });
    }
  }, [transactions]);

  // ==============================================
  // ONBOARDING FLOW HANDLERS
  // ==============================================

  /**
   * Check and trigger onboarding tutorials based on status
   */
  const checkAndShowOnboarding = useCallback(() => {
    if (!onboardingStatus) {
      return;
    }

    const {
      hasSeenBalanceCardTour,
      hasSeenAddTransactionTour,
      hasSeenTransactionSwipeTour,
    } = onboardingStatus;

    // Show balance card tutorial first
    if (incomeData && !hasSeenBalanceCardTour) {
      setTimeout(() => {
        measureBalanceCard();
      }, 500);
    }
    // Show add transaction tutorial second
    else if (hasSeenBalanceCardTour && !hasSeenAddTransactionTour) {
      setTimeout(() => {
        measureFloatingButton();
      }, 500);
    }
  }, [onboardingStatus, incomeData, measureBalanceCard, measureFloatingButton]);

  // Trigger onboarding check when status changes
  React.useEffect(() => {
    checkAndShowOnboarding();
  }, [checkAndShowOnboarding]);

  // ==============================================
  // ONBOARDING COMPLETION HANDLERS
  // ==============================================

  const handleBalanceCardSpotlightNext = useCallback(async () => {
    await onOnboardingComplete('BalanceCard');
    setShowBalanceCardSpotlight(false);
    setTimeout(() => measureFloatingButton(), 300);
  }, [onOnboardingComplete, measureFloatingButton]);

  const handleBalanceCardSpotlightSkip = useCallback(async () => {
    await onOnboardingComplete('BalanceCard');
    setShowBalanceCardSpotlight(false);
  }, [onOnboardingComplete]);

  const handleAddTransactionSpotlightNext = useCallback(async () => {
    await onOnboardingComplete('AddTransaction');
    setShowAddTransactionSpotlight(false);
    handleAddTransaction();
  }, [onOnboardingComplete, handleAddTransaction]);

  const handleAddTransactionSpotlightSkip = useCallback(async () => {
    await onOnboardingComplete('AddTransaction');
    setShowAddTransactionSpotlight(false);
  }, [onOnboardingComplete]);

  const handleTransactionSwipeSpotlightNext = useCallback(async () => {
    await onOnboardingComplete('TransactionSwipe');
    setShowTransactionSwipeSpotlight(false);
    setTransactionSwipeStep(0);
  }, [onOnboardingComplete]);

  const handleTransactionSwipeSpotlightSkip = useCallback(async () => {
    await onOnboardingComplete('TransactionSwipe');
    setShowTransactionSwipeSpotlight(false);
    setTransactionSwipeStep(0);
  }, [onOnboardingComplete]);

  // ==============================================
  // RENDER UI
  // ==============================================

  // 🔍 TEMPORARY DEBUG - Remove after fixing
  console.log('🔍 HomeScreen - incomeData:', incomeData);
  console.log('🔍 HomeScreen - loading:', loading);
  console.log('🔍 HomeScreen - userProfile:', userProfile);
  console.log('🔍 HomeScreen - categories:', categories); // ✅ NEW: Debug categories

  return (
    <View style={styles.container}>
      {/* Purple Gradient Header - IDENTICAL */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <BalanceCard
          incomeData={incomeData}
          loading={loading}
          totalExpenses={totalExpenses}
          onCalendarPress={() => setShowCalendar(true)}
          onEditIncome={onEditIncome}
          selectedDate={selectedDate}
          balanceCardRef={balanceCardRef}
          goals={goals}
          onGoalsPress={onGoalsPress}
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
          categories={categories} // ✅ UPDATED: Pass categories to TransactionList
          selectedDate={selectedDate}
          onDeleteTransaction={onDeleteTransaction}
          onEditTransaction={handleEditTransaction}
          onSwipeStart={handleSwipeStart}
          onSwipeEnd={handleSwipeEnd}
          transactionRef={transactionRef}
          onTransactionLayout={measureFirstTransaction}
        />
      </ScrollView>

      {/* Floating Add Button - IDENTICAL */}
      <TouchableOpacity
        ref={floatingButtonRef}
        style={[styles.floatingButton, {bottom: insets.bottom + 30}]}
        onPress={handleAddTransaction}
        activeOpacity={0.8}>
        <Text style={styles.floatingButtonIcon}>+</Text>
      </TouchableOpacity>

      {/* Modals - UPDATED TO USE CONTAINER */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />

      <AddTransactionContainer
        visible={showAddTransaction}
        onClose={handleCloseAddTransaction}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        navigation={navigation}
      />

      {/* Onboarding Overlays - IDENTICAL */}
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

// IDENTICAL STYLING - NO CHANGES
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
