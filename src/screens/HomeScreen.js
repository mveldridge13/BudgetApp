// screens/HomeScreen.js
import React, {useState, useCallback} from 'react';
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
  // DATA PROPS
  // ==============================================
  incomeData = null,
  userProfile = null,
  transactions = [], // ✅ Now contains pre-resolved categoryData
  categories = [], // ✅ Still needed for AddTransactionContainer
  goals = [],
  editingTransaction = null,
  loading = false,
  selectedDate = new Date(),
  totalExpenses = 0,

  // ==============================================
  // EVENT HANDLER PROPS
  // ==============================================
  onDateChange = () => {},
  onSaveTransaction = () => {},
  onDeleteTransaction = () => {},
  onEditTransaction = () => {},
  onClearEditingTransaction = () => {},
  onEditIncome = () => {},
  onGoalsPress = () => {},
  onOnboardingComplete = () => {},
  onOnboardingSkip = () => {},
  navigation,

  // ==============================================
  // ONBOARDING PROPS
  // ==============================================
  onboarding,
}) => {
  const insets = useSafeAreaInsets();

  console.log('🏠 HomeScreen: Rendering with props:', {
    transactionsCount: transactions.length,
    categoriesCount: categories.length,
    hasOnboarding: !!onboarding,
    loading,
  });

  // ==============================================
  // UI STATE (PURE UI ONLY)
  // ==============================================
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // ==============================================
  // UI EVENT HANDLERS (PURE UI ONLY)
  // ==============================================
  const handleAddTransaction = useCallback(() => {
    console.log('🏠 HomeScreen: Add transaction button pressed');
    onClearEditingTransaction();
    setShowAddTransaction(true);
  }, [onClearEditingTransaction]);

  const handleCloseAddTransaction = useCallback(() => {
    console.log('🏠 HomeScreen: Closing add transaction modal');
    setShowAddTransaction(false);
    onClearEditingTransaction();
  }, [onClearEditingTransaction]);

  const handleSaveTransaction = useCallback(
    async transaction => {
      try {
        console.log(
          '🏠 HomeScreen: Saving transaction:',
          transaction.description,
        );
        const result = await onSaveTransaction(transaction);

        if (result?.success) {
          console.log(
            '🏠 HomeScreen: Transaction saved successfully, closing modal',
          );
          setShowAddTransaction(false);
        } else {
          console.log(
            '🏠 HomeScreen: Transaction save was not successful, keeping modal open',
          );
        }
      } catch (error) {
        console.log(
          '🏠 HomeScreen: Save failed, keeping modal open for retry:',
          error.message,
        );
      }
    },
    [onSaveTransaction],
  );

  const handleEditTransaction = useCallback(
    async transaction => {
      try {
        console.log(
          '🏠 HomeScreen: Edit transaction requested:',
          transaction.description,
        );
        const currentTransaction = await onEditTransaction(transaction.id);
        if (currentTransaction) {
          console.log(
            '🏠 HomeScreen: Transaction loaded for editing, opening modal',
          );
          setShowAddTransaction(true);
        } else {
          console.log('🏠 HomeScreen: Failed to load transaction for editing');
        }
      } catch (error) {
        console.error('🏠 HomeScreen: Error in edit transaction:', error);
        // Error handling is done in container
      }
    },
    [onEditTransaction],
  );

  const handleSwipeStart = useCallback(() => {
    console.log('🏠 HomeScreen: Transaction swipe started, disabling scroll');
    setScrollEnabled(false);
  }, []);

  const handleSwipeEnd = useCallback(() => {
    console.log('🏠 HomeScreen: Transaction swipe ended, enabling scroll');
    setScrollEnabled(true);
  }, []);

  // ==============================================
  // ONBOARDING HANDLERS (DELEGATED TO CONTAINER)
  // ==============================================
  const handleBalanceCardSpotlightNext = useCallback(async () => {
    console.log('🏠 HomeScreen: Balance card spotlight next');
    await onOnboardingComplete('BalanceCard');
  }, [onOnboardingComplete]);

  const handleBalanceCardSpotlightSkip = useCallback(async () => {
    console.log('🏠 HomeScreen: Balance card spotlight skip');
    await onOnboardingSkip('BalanceCard');
  }, [onOnboardingSkip]);

  const handleAddTransactionSpotlightNext = useCallback(async () => {
    console.log('🏠 HomeScreen: Add transaction spotlight next');
    await onOnboardingComplete('AddTransaction');
    handleAddTransaction();
  }, [onOnboardingComplete, handleAddTransaction]);

  const handleAddTransactionSpotlightSkip = useCallback(async () => {
    console.log('🏠 HomeScreen: Add transaction spotlight skip');
    await onOnboardingSkip('AddTransaction');
  }, [onOnboardingSkip]);

  const handleTransactionSwipeSpotlightNext = useCallback(async () => {
    console.log('🏠 HomeScreen: Transaction swipe spotlight next');
    await onOnboardingComplete('TransactionSwipe');
  }, [onOnboardingComplete]);

  const handleTransactionSwipeSpotlightSkip = useCallback(async () => {
    console.log('🏠 HomeScreen: Transaction swipe spotlight skip');
    await onOnboardingSkip('TransactionSwipe');
  }, [onOnboardingSkip]);

  // ==============================================
  // RENDER
  // ==============================================
  return (
    <View style={styles.container}>
      {/* ==============================================
          HEADER SECTION
          ============================================== */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <BalanceCard
          incomeData={incomeData}
          loading={loading}
          totalExpenses={totalExpenses}
          onCalendarPress={() => setShowCalendar(true)}
          onEditIncome={onEditIncome}
          selectedDate={selectedDate}
          balanceCardRef={onboarding?.balanceCardRef}
          goals={goals}
          onGoalsPress={onGoalsPress}
        />
      </View>

      {/* ==============================================
          CONTENT SECTION
          ============================================== */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}>
        <TransactionList
          transactions={transactions} // ✅ UPDATED: Pre-resolved transactions (no categories prop)
          selectedDate={selectedDate}
          onDeleteTransaction={onDeleteTransaction}
          onEditTransaction={handleEditTransaction}
          onSwipeStart={handleSwipeStart}
          onSwipeEnd={handleSwipeEnd}
          transactionRef={onboarding?.transactionRef}
          onTransactionLayout={() => {}} // Handled by onboarding hook
        />
      </ScrollView>

      {/* ==============================================
          FLOATING ACTION BUTTON
          ============================================== */}
      <TouchableOpacity
        ref={onboarding?.floatingButtonRef}
        style={[styles.floatingButton, {bottom: insets.bottom + 30}]}
        onPress={handleAddTransaction}
        activeOpacity={0.8}>
        <Text style={styles.floatingButtonIcon}>+</Text>
      </TouchableOpacity>

      {/* ==============================================
          MODALS
          ============================================== */}
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

      {/* ==============================================
          ONBOARDING OVERLAYS
          ============================================== */}
      <BalanceCardSpotlight
        visible={onboarding?.showBalanceCardSpotlight}
        onNext={handleBalanceCardSpotlightNext}
        onSkip={handleBalanceCardSpotlightSkip}
        balanceCardLayout={onboarding?.balanceCardLayout}
        incomeData={incomeData}
      />

      <AddTransactionSpotlight
        visible={onboarding?.showAddTransactionSpotlight}
        onNext={handleAddTransactionSpotlightNext}
        onSkip={handleAddTransactionSpotlightSkip}
        floatingButtonLayout={onboarding?.floatingButtonLayout}
      />

      <TransactionSwipeSpotlight
        visible={onboarding?.showTransactionSwipeSpotlight}
        onNext={handleTransactionSwipeSpotlightNext}
        onSkip={handleTransactionSwipeSpotlightSkip}
        transactionLayout={onboarding?.transactionLayout}
        currentStep={onboarding?.transactionSwipeStep}
      />
    </View>
  );
};

// ==============================================
// STYLES
// ==============================================
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
