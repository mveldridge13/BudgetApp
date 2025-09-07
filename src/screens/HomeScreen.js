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
import PokerSection from '../components/PokerSection';

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
  totalIncomePayments = 0,
  totalAdditionalIncome = 0,
  currency = 'AUD',
  isNewPayPeriodForUI = false,

  // Rollover props
  rolloverAmount = 0,
  isRolloverAvailable = false,
  onRolloverPress = () => {},

  // Tournament/Poker props
  tournaments = [],
  pokerSectionExpanded = false,
  pokerTrackerEnabled = false,

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

  // Tournament event handlers
  onTogglePokerSection = () => {},
  onTournamentPress = () => {},
  onTournamentEdit = () => {},
  onTournamentDelete = () => {},
  onTournamentSwipeStart = () => {},
  onTournamentSwipeEnd = () => {},
  onAddTournament = () => {},

  navigation,

  // ==============================================
  // ONBOARDING PROPS
  // ==============================================
  onboarding,
}) => {
  const insets = useSafeAreaInsets();

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
    onClearEditingTransaction();
    setShowAddTransaction(true);
  }, [onClearEditingTransaction]);

  const handleCloseAddTransaction = useCallback(() => {
    setShowAddTransaction(false);
    onClearEditingTransaction();
  }, [onClearEditingTransaction]);

  const handleSaveTransaction = useCallback(
    async transaction => {
      try {
        const result = await onSaveTransaction(transaction);

        if (result?.success) {
          // Small delay to allow transaction state to propagate before closing modal
          setTimeout(() => {
            setShowAddTransaction(false);
          }, 50);
        } else {
        }
      } catch (error) {}
    },
    [onSaveTransaction],
  );

  const handleEditTransaction = useCallback(
    async transaction => {
      try {
        const currentTransaction = await onEditTransaction(transaction.id);
        if (currentTransaction) {
          setShowAddTransaction(true);
        } else {
        }
      } catch (error) {
        console.error('🏠 HomeScreen: Error in edit transaction:', error);
        // Error handling is done in container
      }
    },
    [onEditTransaction],
  );

  const handleSwipeStart = useCallback(() => {
    setScrollEnabled(false);
  }, []);

  const handleSwipeEnd = useCallback(() => {
    setScrollEnabled(true);
  }, []);

  const handleTournamentSwipeStart = useCallback(() => {
    setScrollEnabled(false);
    onTournamentSwipeStart();
  }, [onTournamentSwipeStart]);

  const handleTournamentSwipeEnd = useCallback(() => {
    setScrollEnabled(true);
    onTournamentSwipeEnd();
  }, [onTournamentSwipeEnd]);

  // ==============================================
  // ONBOARDING HANDLERS (DELEGATED TO CONTAINER)
  // ==============================================
  const handleBalanceCardSpotlightNext = useCallback(async () => {
    await onOnboardingComplete('BalanceCard');
  }, [onOnboardingComplete]);

  const handleBalanceCardSpotlightSkip = useCallback(async () => {
    await onOnboardingSkip('BalanceCard');
  }, [onOnboardingSkip]);

  const handleAddTransactionSpotlightNext = useCallback(async () => {
    await onOnboardingComplete('AddTransaction');
    handleAddTransaction();
  }, [onOnboardingComplete, handleAddTransaction]);

  const handleAddTransactionSpotlightSkip = useCallback(async () => {
    await onOnboardingSkip('AddTransaction');
  }, [onOnboardingSkip]);

  const handleTransactionSwipeSpotlightNext = useCallback(async () => {
    await onOnboardingComplete('TransactionSwipe');
  }, [onOnboardingComplete]);

  const handleTransactionSwipeSpotlightSkip = useCallback(async () => {
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
          totalIncomePayments={totalIncomePayments}
          totalAdditionalIncome={totalAdditionalIncome}
          onCalendarPress={() => setShowCalendar(true)}
          onEditIncome={onEditIncome}
          selectedDate={selectedDate}
          balanceCardRef={onboarding?.balanceCardRef}
          goals={goals}
          onGoalsPress={onGoalsPress}
          currency={currency}
          transactions={transactions}
          rolloverAmount={rolloverAmount}
          isRolloverAvailable={isRolloverAvailable}
          onRolloverPress={onRolloverPress}
          isNewPayPeriodForUI={isNewPayPeriodForUI}
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
        {/* Poker/Tournament Section - Show if poker module is enabled */}
        {pokerTrackerEnabled && (
          <PokerSection
            tournaments={tournaments}
            isExpanded={pokerSectionExpanded}
            onToggleExpanded={onTogglePokerSection}
            onTournamentPress={onTournamentPress}
            onTournamentEdit={onTournamentEdit}
            onTournamentDelete={onTournamentDelete}
            onSwipeStart={handleTournamentSwipeStart}
            onSwipeEnd={handleTournamentSwipeEnd}
            onAddTournament={onAddTournament}
          />
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : (
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
        )}
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
      {onboarding?.showBalanceCardSpotlight && (
        <BalanceCardSpotlight
          visible={onboarding.showBalanceCardSpotlight}
          onNext={handleBalanceCardSpotlightNext}
          onSkip={handleBalanceCardSpotlightSkip}
          balanceCardLayout={onboarding.balanceCardLayout}
          incomeData={incomeData}
        />
      )}

      {onboarding?.showAddTransactionSpotlight && (
        <AddTransactionSpotlight
          visible={onboarding.showAddTransactionSpotlight}
          onNext={handleAddTransactionSpotlightNext}
          onSkip={handleAddTransactionSpotlightSkip}
          floatingButtonLayout={onboarding.floatingButtonLayout}
        />
      )}

      {onboarding?.showTransactionSwipeSpotlight && (
        <TransactionSwipeSpotlight
          visible={onboarding.showTransactionSwipeSpotlight}
          onNext={handleTransactionSwipeSpotlightNext}
          onSkip={handleTransactionSwipeSpotlightSkip}
          transactionLayout={onboarding.transactionLayout}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default HomeScreen;
