import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles';
import CalendarModal from './CalendarModal';
import PaymentStatusModal from './PaymentStatusModal';
import RecurrenceModal from './RecurrenceModal';
import AddTournamentContainer from '../containers/AddTournamentContainer';
import TransactionTypeOverlay from './TransactionTypeOverlay';
import RecurrenceOverlay from './RecurrenceOverlay';
import QuickAddOverlay from './QuickAddOverlay';
import CategorySelectionOverlay from './CategorySelectionOverlay';
import SubcategorySelectionOverlay from './SubcategorySelectionOverlay';
import AmountEntryOverlay from './AmountEntryOverlay';
import DebtPaymentOverlay from './DebtPaymentOverlay';

const {width: screenWidth} = Dimensions.get('window');

const AddTransactionModal = ({
  // Data props
  visible,
  onClose,
  onSave,
  isEditMode,

  // Form data
  amount,
  description,
  selectedCategory,
  selectedSubcategory,
  selectedDate,
  selectedRecurrence,
  selectedDueDate,
  selectedTransactionType,
  selectedPaymentStatus,

  // Categories data
  categories,
  isLoading,
  errorState,
  currentSubcategoryData,

  // Calendar state
  showCalendar,
  calendarMode,

  // Event handler props
  onAmountChange,
  onDescriptionChange,
  onCategorySelect,
  onSubcategorySelect,
  onRecurrenceSelect,
  onDueDateChange,
  onDateChange,
  onShowCalendar,
  onHideCalendar,
  onTransactionTypeChange,
  onPaymentStatusChange,

  // Helper functions
  getCategoryById,
  getRecurrenceById,
  getCategoryDisplayName,
  recurrenceOptions,
  paymentStatusOptions,

  // Module settings
  pokerTrackerEnabled,

  // Overlay props
  overlayMode,
  onQuickAddClose,
  onQuickAddUseFullForm,
  onQuickAddCategoryPress,
  onQuickAddDatePress,
  onQuickAddTransactionTypeChange,
  onCategoryOverlayClose,
  onCategoryOverlayBack,
  onCategoryOverlaySelect,
  onSubcategoryOverlayClose,
  onSubcategoryOverlayBack,
  onSubcategoryOverlaySelect,
  onAddSubcategory,
  onAmountOverlayClose,
  onAmountOverlayBack,
  onAmountOverlaySave,
  allCategories,
  transformCategoriesForUI,

  // Transaction type overlay props
  isRecurringTransaction,
  onTransactionTypeSelect,
  onTransactionTypeClose,

  // Recurrence overlay props
  onRecurrenceOverlayClose,
  onRecurrenceOverlayContinue,
  onRecurrenceOverlayRecurrenceSelect,
  onRecurrenceOverlayDueDatePress,

  // Debt payment overlay props
  onDebtPaymentSave,
  onDebtPaymentClose,
  onDebtPaymentDueDatePress,
  onDebtPaymentFirstPaymentDatePress,
  selectedFirstPaymentDate,

  // Tournament props (simplified for container)
  showTournamentModal,
  onCreateTournamentPress,
  onTournamentModalClose,
  onTournamentSave,
}) => {
  const insets = useSafeAreaInsets();

  // Animation values - slide up from bottom
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modal states
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Compact mode view state: 'form', 'category', 'subcategory'
  const [compactView, setCompactView] = useState('form');

  // ==============================================
  // ANIMATION HANDLING
  // ==============================================

  useEffect(() => {
    if (visible) {
      // Reset compact view to form when opening
      setCompactView('form');
      // Animate modal in from bottom with fade
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset positions when modal is closed
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      setCompactView('form');
    }
  }, [visible, slideAnim, fadeAnim]);

  // ==============================================
  // UI EVENT HANDLERS
  // ==============================================

  const handleSave = () => {
    // Animate out before saving
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onSave();
    });
  };

  const handleClose = () => {
    // Start animating out
    setIsAnimating(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAnimating(false);
      onClose();
    });
  };

  // Check if we're in compact mode (one-off transactions OR editing recurring)
  const isCompactMode = true; // Always use windowed/compact mode for modern UI

  // Navigation functions
  const showCategoryPicker = () => {
    if (isCompactMode) {
      setCompactView('category');
    } else {
      Animated.timing(slideAnim, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const showSubcategoryPicker = () => {
    if (isCompactMode) {
      setCompactView('subcategory');
    } else {
      Animated.timing(slideAnim, {
        toValue: -screenWidth * 2,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const showRecurrencePicker = () => {
    if (isCompactMode) {
      setCompactView('recurrence');
    } else {
      setShowRecurrenceModal(true);
    }
  };

  const hideRecurrencePicker = () => {
    setCompactView('form');
  };

  const showPaymentStatusPicker = () => {
    if (isCompactMode) {
      setCompactView('paymentStatus');
    } else {
      setShowPaymentStatusModal(true);
    }
  };

  const hidePaymentStatusPicker = () => {
    setCompactView('form');
  };

  const hideCategoryPicker = () => {
    if (isCompactMode) {
      setCompactView('form');
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const hideSubcategoryPicker = () => {
    if (isCompactMode) {
      setCompactView('category');
    } else {
      Animated.timing(slideAnim, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleCategorySelect = categoryId => {
    const category = getCategoryById(categoryId);

    if (
      category &&
      category.hasSubcategories &&
      category.subcategories?.length > 0
    ) {
      onCategorySelect(categoryId);
      showSubcategoryPicker(category);
    } else {
      onCategorySelect(categoryId);
      hideCategoryPicker();
    }
  };

  const handleSubcategorySelect = subcategoryId => {
    onSubcategorySelect(subcategoryId);
    // Go back to transaction view
    if (isCompactMode) {
      setCompactView('form');
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleRecurrenceSelect = recurrenceId => {
    // Don't update state immediately - let the modal handle the animation
    onRecurrenceSelect(recurrenceId);
    // Don't call setShowRecurrenceModal(false) here - let the modal's onClose handle it
  };

  const handlePaymentStatusSelect = status => {
    // Don't update state immediately - let the modal handle the animation
    onPaymentStatusChange(status);
    // Don't call setShowPaymentStatusModal(false) here - let the modal's onClose handle it
  };

  const handleTransactionTypeSelect = type => {
    onTransactionTypeChange(type);
  };

  // ==============================================
  // HELPER FUNCTIONS
  // ==============================================

  const getCategoryIconStyle = color => {
    return {
      ...styles.categoryIconContainer,
      backgroundColor: `${color}26`,
    };
  };

  const formatDate = date => {
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getRecurrenceIcon = () => {
    return selectedRecurrence !== 'none' ? 'repeat' : 'repeat-outline';
  };

  const getRecurrenceColor = () => {
    return selectedRecurrence !== 'none'
      ? colors.primary
      : colors.textSecondary;
  };

  const getTransactionTypeDisplayName = () => {
    switch (selectedTransactionType) {
      case 'INCOME':
        return 'Income';
      default:
        return 'Expense';
    }
  };

  const getCategoryFieldDisplayName = () => {
    if (!selectedCategory) {
      return null;
    }

    const mainCategory = getCategoryById(selectedCategory);
    if (!mainCategory) {
      return null;
    }

    // Always show the main category name in the category field
    return mainCategory.name;
  };

  const getCategoryFieldIcon = () => {
    if (!selectedCategory) {
      return null;
    }

    const mainCategory = getCategoryById(selectedCategory);
    if (!mainCategory) {
      return null;
    }

    // If subcategory is selected, show subcategory icon, otherwise show main category icon
    if (selectedSubcategory) {
      const subcategory = mainCategory.subcategories?.find(
        sub => sub.id === selectedSubcategory,
      );
      return subcategory?.icon || mainCategory.icon;
    }

    return mainCategory.icon;
  };

  const getPaymentStatusDisplayName = () => {
    if (!selectedPaymentStatus) {
      return 'Payment Status (Optional)';
    }

    switch (selectedPaymentStatus) {
      case 'UPCOMING':
        return 'Upcoming';
      case 'PAID':
        return 'Paid';
      case 'OVERDUE':
        return 'Overdue';
      default:
        return 'Payment Status (Optional)';
    }
  };

  const getPaymentStatusIcon = (status = selectedPaymentStatus) => {
    if (!status) {
      return 'time-outline';
    }

    switch (status) {
      case 'UPCOMING':
        return 'time-outline';
      case 'PAID':
        return 'checkmark-circle-outline';
      case 'OVERDUE':
        return 'warning-outline';
      default:
        return 'time-outline';
    }
  };

  const getPaymentStatusColor = (status = selectedPaymentStatus) => {
    if (!status) {
      return colors.textSecondary;
    }

    switch (status) {
      case 'UPCOMING':
        return '#007AFF';
      case 'PAID':
        return '#4CAF50';
      case 'OVERDUE':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  // ==============================================
  // RENDER
  // ==============================================

  // Don't unmount when not visible if we're animating
  // This allows the exit animation to complete before unmounting
  if (!visible && !isAnimating) {
    return null;
  }

  // When showing overlays, render them directly over HomeScreen
  // without the form behind it (like V2 behavior)
  if (overlayMode === 'transactionType') {
    return (
      <TransactionTypeOverlay
        visible={true}
        onClose={onTransactionTypeClose}
        onTypeSelect={onTransactionTypeSelect}
      />
    );
  }

  if (overlayMode === 'recurrence') {
    return (
      <>
        <RecurrenceOverlay
          visible={true}
          onClose={onRecurrenceOverlayClose}
          onContinue={onRecurrenceOverlayContinue}
          selectedRecurrence={selectedRecurrence}
          selectedDueDate={selectedDueDate}
          onRecurrenceSelect={onRecurrenceOverlayRecurrenceSelect}
          onDueDatePress={onRecurrenceOverlayDueDatePress}
          recurrenceOptions={recurrenceOptions}
        />
        <CalendarModal
          visible={showCalendar}
          onClose={onHideCalendar}
          selectedDate={selectedDueDate || selectedDate}
          onDateChange={onDateChange}
        />
      </>
    );
  }

  if (overlayMode === 'debt') {
    return (
      <>
        <DebtPaymentOverlay
          visible={true}
          onClose={onDebtPaymentClose}
          onSave={onDebtPaymentSave}
          onDueDatePress={onDebtPaymentDueDatePress}
          selectedDueDate={selectedDueDate}
          onFirstPaymentDatePress={onDebtPaymentFirstPaymentDatePress}
          selectedFirstPaymentDate={selectedFirstPaymentDate}
        />
        <CalendarModal
          visible={showCalendar}
          onClose={onHideCalendar}
          selectedDate={calendarMode === 'firstPaymentDate' ? (selectedFirstPaymentDate || new Date()) : (selectedDueDate || selectedDate)}
          onDateChange={onDateChange}
        />
      </>
    );
  }

  if (overlayMode === 'quick') {
    return (
      <>
        <QuickAddOverlay
          visible={true}
          onClose={onQuickAddClose}
          onUseFullForm={onQuickAddUseFullForm}
          onCategoryPress={onQuickAddCategoryPress}
          onDatePress={onQuickAddDatePress}
          selectedDate={selectedDate}
          description={description}
          onDescriptionChange={onDescriptionChange}
          selectedCategory={selectedCategory}
          getCategoryById={getCategoryById}
          selectedTransactionType={selectedTransactionType}
          onTransactionTypeChange={onQuickAddTransactionTypeChange}
        />
        <CalendarModal
          visible={showCalendar}
          onClose={onHideCalendar}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />
      </>
    );
  }

  if (overlayMode === 'category') {
    return (
      <CategorySelectionOverlay
        visible={true}
        onClose={onCategoryOverlayClose}
        onBack={onCategoryOverlayBack}
        onCategorySelect={onCategoryOverlaySelect}
        allCategories={allCategories}
        transformCategoriesForUI={transformCategoriesForUI}
        selectedTransactionType={selectedTransactionType}
        onTransactionTypeChange={onTransactionTypeChange}
        selectedCategory={selectedCategory}
        isLoading={isLoading}
        skipEntryAnimation={true}
      />
    );
  }

  if (overlayMode === 'subcategory') {
    return (
      <SubcategorySelectionOverlay
        visible={true}
        onClose={onSubcategoryOverlayClose}
        onBack={onSubcategoryOverlayBack}
        onSubcategorySelect={onSubcategoryOverlaySelect}
        selectedCategory={currentSubcategoryData?.id}
        selectedSubcategory={selectedSubcategory}
        getCategoryById={getCategoryById}
        isLoading={isLoading}
        onAddSubcategory={onAddSubcategory}
        skipEntryAnimation={true}
      />
    );
  }

  if (overlayMode === 'amount') {
    return (
      <AmountEntryOverlay
        visible={true}
        onClose={onAmountOverlayClose}
        onBack={onAmountOverlayBack}
        onSave={onAmountOverlaySave}
        amount={amount}
        onAmountChange={onAmountChange}
        description={description}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        getCategoryById={getCategoryById}
        selectedDate={selectedDate}
        selectedTransactionType={selectedTransactionType}
        isRecurringTransaction={isRecurringTransaction}
        selectedRecurrence={selectedRecurrence}
        selectedDueDate={selectedDueDate}
        recurrenceOptions={recurrenceOptions}
        skipEntryAnimation={true}
      />
    );
  }

  // Render compact mode (one-off transactions) - single view at a time, no slide animation
  if (isCompactMode) {
    return (
      <View style={styles.compactModalOverlay} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.compactModalContent,
            {
              transform: [{translateY: slideAnim}],
              opacity: fadeAnim,
            },
            isRecurringTransaction && {height: 620},
          ]}>

          {/* Form View */}
          {compactView === 'form' && (
            <>
              <View style={styles.compactModalHeader}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.cancelButton}>
                  <Text style={styles.compactCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.compactModalTitle}>
                  {isEditMode
                    ? `Edit ${getTransactionTypeDisplayName()}`
                    : 'Add Transaction'}
                </Text>
                <TouchableOpacity
                  onPress={handleSave}
                  style={[
                    styles.compactSaveButton,
                    (!amount || !selectedCategory) && styles.saveButtonDisabled,
                  ]}
                  disabled={!amount || !selectedCategory}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.compactSaveText,
                      (!amount || !selectedCategory) && styles.saveTextDisabled,
                    ]}>
                    {isEditMode ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.compactFormContainer}>
                {/* Date Field */}
                <TouchableOpacity
                  style={styles.compactDateField}
                  onPress={onShowCalendar}
                  activeOpacity={0.7}>
                  <Icon
                    name="calendar-outline"
                    size={16}
                    color="#007AFF"
                    style={styles.dateIcon}
                  />
                  <Text style={styles.compactDateText}>{formatDate(selectedDate)}</Text>
                </TouchableOpacity>

                {/* Amount Field */}
                <View style={styles.compactInputContainer}>
                  <Text style={styles.compactCurrencySymbol}>$</Text>
                  <TextInput
                    style={styles.compactAmountInput}
                    value={amount}
                    onChangeText={onAmountChange}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                {/* Description Field */}
                <View style={styles.compactFieldWrapper}>
                  <Text style={styles.compactFieldLabel}>Description</Text>
                  <View style={styles.compactFieldBox}>
                    <TextInput
                      style={styles.compactFieldInput}
                      value={description}
                      onChangeText={onDescriptionChange}
                      placeholder="Enter description (optional)"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                {/* Category Field */}
                <View style={styles.compactFieldWrapper}>
                  <Text style={styles.compactFieldLabel}>Category</Text>
                  <TouchableOpacity
                    style={styles.compactCategoryFieldBox}
                    onPress={showCategoryPicker}
                    activeOpacity={0.7}>
                    <View style={styles.categoryLeft}>
                      {selectedCategory ? (
                        <>
                          <View
                            style={getCategoryIconStyle(
                              getCategoryById(selectedCategory)?.color,
                            )}>
                            <Icon
                              name={getCategoryFieldIcon()}
                              size={16}
                              color={getCategoryById(selectedCategory)?.color}
                            />
                          </View>
                          <Text style={styles.compactCategoryText}>
                            {getCategoryFieldDisplayName()}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.compactCategoryPlaceholder}>Select a category</Text>
                      )}
                    </View>
                    <Icon
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Recurrence Field */}
                {isRecurringTransaction && (
                  <View style={styles.compactFieldWrapper}>
                    <Text style={styles.compactFieldLabel}>Recurrence</Text>
                    <TouchableOpacity
                      style={styles.compactCategoryFieldBox}
                      onPress={showRecurrencePicker}
                      activeOpacity={0.7}>
                      <View style={styles.categoryLeft}>
                        <Icon
                          name={getRecurrenceIcon()}
                          size={16}
                          color={getRecurrenceColor()}
                          style={styles.compactFieldIcon}
                        />
                        <Text
                          style={[
                            styles.compactCategoryText,
                            selectedRecurrence === 'none' && styles.compactCategoryPlaceholder,
                          ]}>
                          {getRecurrenceById(selectedRecurrence)?.name}
                        </Text>
                      </View>
                      <Icon
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Due Date Field - Only show for recurring transactions */}
                {isRecurringTransaction && (
                  <View style={styles.compactFieldWrapper}>
                    <Text style={styles.compactFieldLabel}>Due Date</Text>
                    <TouchableOpacity
                      style={styles.compactFieldBox}
                      onPress={() => onShowCalendar('dueDate')}
                      activeOpacity={0.7}>
                      <View style={styles.categoryLeft}>
                        <Icon
                          name="calendar-outline"
                          size={16}
                          color={selectedDueDate ? colors.primary : colors.textSecondary}
                          style={styles.compactFieldIcon}
                        />
                        <Text
                          style={[
                            styles.compactCategoryText,
                            !selectedDueDate && styles.compactCategoryPlaceholder,
                          ]}>
                          {selectedDueDate
                            ? selectedDueDate.toLocaleDateString('en-AU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : 'Select due date'}
                        </Text>
                      </View>
                      <Icon
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Payment Status Field - Only show for recurring transactions */}
                {isRecurringTransaction && (
                  <View style={styles.compactFieldWrapper}>
                    <Text style={styles.compactFieldLabel}>Payment Status</Text>
                    <TouchableOpacity
                      style={styles.compactFieldBox}
                      onPress={showPaymentStatusPicker}
                      activeOpacity={0.7}>
                      <View style={styles.categoryLeft}>
                        <Icon
                          name={getPaymentStatusIcon()}
                          size={16}
                          color={getPaymentStatusColor()}
                          style={styles.compactFieldIcon}
                        />
                        <Text
                          style={[
                            styles.compactCategoryText,
                            !selectedPaymentStatus && styles.compactCategoryPlaceholder,
                          ]}>
                          {getPaymentStatusDisplayName()}
                        </Text>
                      </View>
                      <Icon
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </>
          )}

          {/* Category Picker View */}
          {compactView === 'category' && (
            <>
              <View style={styles.compactCategoryPickerHeader}>
                <TouchableOpacity
                  onPress={hideCategoryPicker}
                  style={styles.cancelButton}>
                  <Icon name="chevron-back" size={20} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.compactModalTitle}>Select Category</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.compactFormContainer}
                showsVerticalScrollIndicator={false}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading categories...</Text>
                  </View>
                ) : (
                  <>
                    {categories.map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.compactCategoryOption,
                          selectedCategory === category.id &&
                            styles.selectedOption,
                        ]}
                        onPress={() => handleCategorySelect(category.id)}
                        activeOpacity={0.7}>
                        <View style={styles.categoryLeft}>
                          <View style={getCategoryIconStyle(category.color)}>
                            <Icon
                              name={category.icon}
                              size={18}
                              color={category.color}
                            />
                          </View>
                          <View style={styles.categoryInfo}>
                            <Text style={styles.compactCategoryName}>
                              {category.name}
                            </Text>
                            {category.isCustom && (
                              <Text style={styles.customLabel}>Custom</Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.categoryRight}>
                          {selectedCategory === category.id &&
                            !category.hasSubcategories && (
                              <Icon
                                name="checkmark"
                                size={18}
                                color={colors.primary}
                              />
                            )}
                          {category.hasSubcategories && (
                            <Icon
                              name="chevron-forward"
                              size={18}
                              color={colors.textSecondary}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </>
          )}

          {/* Subcategory Picker View */}
          {compactView === 'subcategory' && (
            <>
              <View style={styles.compactCategoryPickerHeader}>
                <TouchableOpacity
                  onPress={hideSubcategoryPicker}
                  style={styles.cancelButton}>
                  <Icon name="chevron-back" size={20} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.compactModalTitle}>
                  {currentSubcategoryData?.name || 'Select Subcategory'}
                </Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.compactFormContainer}
                showsVerticalScrollIndicator={false}>
                {currentSubcategoryData?.subcategories?.map(subcategory => (
                  <TouchableOpacity
                    key={subcategory.id}
                    style={[
                      styles.compactCategoryOption,
                      selectedSubcategory === subcategory.id &&
                        styles.selectedOption,
                    ]}
                    onPress={() => handleSubcategorySelect(subcategory.id)}
                    activeOpacity={0.7}>
                    <View style={styles.categoryLeft}>
                      <View
                        style={getCategoryIconStyle(
                          currentSubcategoryData.color,
                        )}>
                        <Icon
                          name={subcategory.icon}
                          size={18}
                          color={currentSubcategoryData.color}
                        />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.compactCategoryName}>
                          {subcategory.name}
                        </Text>
                        {subcategory.isCustom && (
                          <Text style={styles.customLabel}>Custom</Text>
                        )}
                      </View>
                    </View>
                    {selectedSubcategory === subcategory.id && (
                      <Icon name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Recurrence Picker View */}
          {compactView === 'recurrence' && (
            <>
              <View style={styles.compactCategoryPickerHeader}>
                <TouchableOpacity
                  onPress={hideRecurrencePicker}
                  style={styles.cancelButton}>
                  <Icon name="chevron-back" size={20} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.compactModalTitle}>Select Recurrence</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.compactFormContainer}
                showsVerticalScrollIndicator={false}>
                {recurrenceOptions
                  .filter(option => option.id !== 'none')
                  .map(option => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.compactCategoryOption,
                        selectedRecurrence === option.id && styles.selectedOption,
                      ]}
                      onPress={() => {
                        onRecurrenceSelect(option.id);
                        hideRecurrencePicker();
                      }}
                      activeOpacity={0.7}>
                      <View style={styles.categoryLeft}>
                        <View style={styles.recurrenceOptionIcon}>
                          <Icon
                            name="repeat-outline"
                            size={18}
                            color={selectedRecurrence === option.id ? colors.primary : colors.textSecondary}
                          />
                        </View>
                        <Text style={styles.compactCategoryName}>
                          {option.name}
                        </Text>
                      </View>
                      {selectedRecurrence === option.id && (
                        <Icon name="checkmark" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </>
          )}

          {/* Payment Status Picker View */}
          {compactView === 'paymentStatus' && (
            <>
              <View style={styles.compactCategoryPickerHeader}>
                <TouchableOpacity
                  onPress={hidePaymentStatusPicker}
                  style={styles.cancelButton}>
                  <Icon name="chevron-back" size={20} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.compactModalTitle}>Payment Status</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.compactFormContainer}
                showsVerticalScrollIndicator={false}>
                {paymentStatusOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.compactCategoryOption,
                      selectedPaymentStatus === option.id && styles.selectedOption,
                    ]}
                    onPress={() => {
                      onPaymentStatusChange(option.id);
                      hidePaymentStatusPicker();
                    }}
                    activeOpacity={0.7}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.paymentStatusOptionIcon, {backgroundColor: `${getPaymentStatusColor(option.id)}20`}]}>
                        <Icon
                          name={getPaymentStatusIcon(option.id)}
                          size={18}
                          color={getPaymentStatusColor(option.id)}
                        />
                      </View>
                      <Text style={styles.compactCategoryName}>
                        {option.name}
                      </Text>
                    </View>
                    {selectedPaymentStatus === option.id && (
                      <Icon name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Calendar Modal */}
          <CalendarModal
            visible={showCalendar}
            onClose={onHideCalendar}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
          />
        </Animated.View>
      </View>
    );
  }

  // Render full mode (recurring transactions - create only) - uses slide animation between views
  return (
    <View style={styles.modalOverlay} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.modalContent,
          {
            transform: [{translateY: slideAnim}],
            opacity: fadeAnim,
          },
        ]}>
        {/* Container for all views */}
        <View style={styles.viewContainer}>
          {/* Transaction View */}
          <View style={styles.view}>
            <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {isEditMode
                  ? `Edit ${getTransactionTypeDisplayName()}`
                  : 'Add Transaction'}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  (!amount || !selectedCategory) && styles.saveButtonDisabled,
                ]}
                disabled={!amount || !selectedCategory}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.saveText,
                    (!amount || !selectedCategory) && styles.saveTextDisabled,
                  ]}>
                  {isEditMode ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Transaction Type Selector - Only show for recurring transactions */}
              {isRecurringTransaction && (
                <View style={styles.transactionTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.transactionTypeButton,
                      styles.transactionTypeButtonExpense,
                      selectedTransactionType === 'EXPENSE' &&
                        styles.transactionTypeButtonActiveExpense,
                    ]}
                    onPress={() => handleTransactionTypeSelect('EXPENSE')}
                    activeOpacity={0.7}>
                    <Icon
                      name="trending-down"
                      size={18}
                      color={
                        selectedTransactionType === 'EXPENSE'
                          ? colors.textWhite || '#FFFFFF'
                          : colors.textSecondary
                      }
                      style={styles.transactionTypeIcon}
                    />
                    <Text
                      style={[
                        styles.transactionTypeText,
                        selectedTransactionType === 'EXPENSE' &&
                          styles.transactionTypeTextActive,
                      ]}>
                      Expense
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.transactionTypeButton,
                      styles.transactionTypeButtonIncome,
                      selectedTransactionType === 'INCOME' &&
                        styles.transactionTypeButtonActiveIncome,
                    ]}
                    onPress={() => handleTransactionTypeSelect('INCOME')}
                    activeOpacity={0.7}>
                    <Icon
                      name="trending-up"
                      size={18}
                      color={
                        selectedTransactionType === 'INCOME'
                          ? colors.textWhite || '#FFFFFF'
                          : colors.textSecondary
                      }
                      style={styles.transactionTypeIcon}
                    />
                    <Text
                      style={[
                        styles.transactionTypeText,
                        selectedTransactionType === 'INCOME' &&
                          styles.transactionTypeTextActive,
                      ]}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Date Field */}
              <TouchableOpacity
                style={styles.dateField}
                onPress={onShowCalendar}
                activeOpacity={0.7}>
                <Icon
                  name="calendar-outline"
                  size={18}
                  color="#007AFF"
                  style={styles.dateIcon}
                />
                <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>

              {/* Amount Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={onAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              {/* Description Field */}
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={onDescriptionChange}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Category Field */}
              <TouchableOpacity
                style={styles.categoryField}
                onPress={showCategoryPicker}
                activeOpacity={0.7}>
                <View style={styles.categoryLeft}>
                  {selectedCategory ? (
                    <>
                      <View
                        style={getCategoryIconStyle(
                          getCategoryById(selectedCategory)?.color,
                        )}>
                        <Icon
                          name={getCategoryFieldIcon()}
                          size={18}
                          color={getCategoryById(selectedCategory)?.color}
                        />
                      </View>
                      <Text style={styles.categoryText}>
                          {getCategoryFieldDisplayName()}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.categoryIconPlaceholder}>
                          <Icon
                            name="albums-outline"
                            size={18}
                            color={colors.textSecondary}
                          />
                        </View>
                        <Text style={styles.categoryPlaceholder}>Category</Text>
                      </>
                    )}
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

              {/* Recurrence Field - Only show for recurring transactions */}
              {isRecurringTransaction && (
                <TouchableOpacity
                  style={styles.recurrenceField}
                  onPress={showRecurrencePicker}
                  activeOpacity={0.7}>
                  <View style={styles.recurrenceLeft}>
                    <Icon
                      name={getRecurrenceIcon()}
                      size={18}
                      color={getRecurrenceColor()}
                      style={styles.recurrenceIcon}
                    />
                    <Text
                      style={[
                        styles.recurrenceText,
                        selectedRecurrence !== 'none' &&
                          styles.recurrenceActiveText,
                      ]}>
                      {getRecurrenceById(selectedRecurrence)?.name}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}

              {/* Due Date Field - Only show for recurring transactions */}
              {isRecurringTransaction && (
                <TouchableOpacity
                  style={styles.dueDateField}
                  onPress={() => onShowCalendar('dueDate')}
                  activeOpacity={0.7}>
                  <View style={styles.dueDateLeft}>
                    <Icon
                      name="calendar-outline"
                      size={18}
                      color={
                        selectedDueDate ? colors.primary : colors.textSecondary
                      }
                      style={styles.dueDateIcon}
                    />
                    <Text
                      style={[
                        styles.dueDateText,
                        selectedDueDate && styles.dueDateActiveText,
                      ]}>
                      {selectedDueDate
                        ? selectedDueDate.toLocaleDateString('en-AU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'Due Date (Optional)'}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}

              {/* Payment Status Field - Only show for recurring transactions */}
              {isRecurringTransaction && (
                <TouchableOpacity
                  style={styles.paymentStatusField}
                  onPress={showPaymentStatusPicker}
                  activeOpacity={0.7}>
                  <View style={styles.paymentStatusLeft}>
                    <Icon
                      name={getPaymentStatusIcon()}
                      size={18}
                      color={getPaymentStatusColor()}
                      style={styles.paymentStatusIcon}
                    />
                    <Text
                      style={[
                        styles.paymentStatusText,
                        selectedPaymentStatus && styles.paymentStatusActiveText,
                      ]}>
                      {getPaymentStatusDisplayName()}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Category Picker View */}
          <View style={isCompactMode ? styles.compactView : styles.view}>
            <View style={[
              isCompactMode ? styles.compactCategoryPickerHeader : styles.modalHeader,
              !isCompactMode && {paddingTop: insets.top + 20},
            ]}>
              <TouchableOpacity
                onPress={hideCategoryPicker}
                style={styles.cancelButton}>
                <Icon name="chevron-back" size={isCompactMode ? 20 : 24} color={colors.textWhite} />
              </TouchableOpacity>
              <Text style={isCompactMode ? styles.compactModalTitle : styles.modalTitle}>Select Category</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView
              style={isCompactMode ? styles.compactFormContainer : styles.formContainer}
              showsVerticalScrollIndicator={false}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading categories...</Text>
                </View>
              ) : (
                <>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        isCompactMode ? styles.compactCategoryOption : styles.categoryOption,
                        selectedCategory === category.id &&
                          styles.selectedOption,
                      ]}
                      onPress={() => handleCategorySelect(category.id)}
                      activeOpacity={0.7}>
                      <View style={styles.categoryLeft}>
                        <View style={getCategoryIconStyle(category.color)}>
                          <Icon
                            name={category.icon}
                            size={isCompactMode ? 18 : 20}
                            color={category.color}
                          />
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={isCompactMode ? styles.compactCategoryName : styles.categoryName}>
                            {category.name}
                          </Text>
                          {category.isCustom && (
                            <Text style={styles.customLabel}>Custom</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.categoryRight}>
                        {selectedCategory === category.id &&
                          !category.hasSubcategories && (
                            <Icon
                              name="checkmark"
                              size={18}
                              color={colors.primary}
                            />
                          )}
                        {category.hasSubcategories && (
                          <Icon
                            name="chevron-forward"
                            size={18}
                            color={colors.textSecondary}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>

          {/* Subcategory Picker View */}
          <View style={isCompactMode ? styles.compactView : styles.view}>
            <View style={[
              isCompactMode ? styles.compactCategoryPickerHeader : styles.modalHeader,
              !isCompactMode && {paddingTop: insets.top + 20},
            ]}>
              <TouchableOpacity
                onPress={hideSubcategoryPicker}
                style={styles.cancelButton}>
                <Icon name="chevron-back" size={isCompactMode ? 20 : 24} color={colors.textWhite} />
              </TouchableOpacity>
              <Text style={isCompactMode ? styles.compactModalTitle : styles.modalTitle}>
                {currentSubcategoryData?.name || 'Select Subcategory'}
              </Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView
              style={isCompactMode ? styles.compactFormContainer : styles.formContainer}
              showsVerticalScrollIndicator={false}>
              {/* Subcategories */}
              {currentSubcategoryData?.subcategories?.map(subcategory => (
                <TouchableOpacity
                  key={subcategory.id}
                  style={[
                    isCompactMode ? styles.compactCategoryOption : styles.categoryOption,
                    selectedSubcategory === subcategory.id &&
                      styles.selectedOption,
                  ]}
                  onPress={() => handleSubcategorySelect(subcategory.id)}
                  activeOpacity={0.7}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={getCategoryIconStyle(
                        currentSubcategoryData.color,
                      )}>
                      <Icon
                        name={subcategory.icon}
                        size={isCompactMode ? 18 : 20}
                        color={currentSubcategoryData.color}
                      />
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={isCompactMode ? styles.compactCategoryName : styles.categoryName}>
                        {subcategory.name}
                      </Text>
                      {subcategory.isCustom && (
                        <Text style={styles.customLabel}>Custom</Text>
                      )}
                    </View>
                  </View>
                  {selectedSubcategory === subcategory.id && (
                    <Icon name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Calendar Modal */}
        <CalendarModal
          visible={showCalendar}
          onClose={onHideCalendar}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />

        {/* Payment Status Modal */}
        <PaymentStatusModal
          visible={showPaymentStatusModal}
          onClose={() => setShowPaymentStatusModal(false)}
          selectedPaymentStatus={selectedPaymentStatus}
          onPaymentStatusSelect={handlePaymentStatusSelect}
          paymentStatusOptions={paymentStatusOptions}
        />

        {/* Recurrence Modal */}
        <RecurrenceModal
          visible={showRecurrenceModal}
          onClose={() => setShowRecurrenceModal(false)}
          selectedRecurrence={selectedRecurrence}
          onRecurrenceSelect={handleRecurrenceSelect}
          recurrenceOptions={recurrenceOptions}
        />

        {/* Tournament Modal */}
        <AddTournamentContainer
          visible={showTournamentModal}
          onClose={onTournamentModalClose}
          onSave={onTournamentSave}
        />

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  compactModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  viewContainer: {
    flexDirection: 'row',
    width: screenWidth * 3, // 3 views: Transaction, Category, Subcategory
    height: '100%',
  },
  view: {
    width: screenWidth,
    height: '100%',
  },
  // Compact mode styles for one-off transactions (window style)
  compactModalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: screenWidth - 40,
    height: 480,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  compactViewContainer: {
    flexDirection: 'row',
    width: screenWidth - 40,
    height: '100%',
  },
  compactView: {
    width: screenWidth - 40,
    height: 480,
  },
  compactModalHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  compactCancelText: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  compactModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textWhite,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  compactSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.overlayLight,
    borderRadius: 6,
  },
  compactSaveText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  compactFormContainer: {
    padding: 16,
  },
  compactDateField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.overlayLight,
    borderRadius: 10,
    marginBottom: 12,
  },
  compactDateText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  compactInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  compactCurrencySymbol: {
    fontSize: 36,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginRight: 4,
  },
  compactAmountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
    padding: 0,
    textAlign: 'left',
  },
  compactDescriptionInput: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.overlayLight,
    borderRadius: 10,
    marginBottom: 12,
  },
  compactFieldWrapper: {
    marginBottom: 16,
  },
  compactFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  compactFieldBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border || '#E5E7EB',
  },
  compactCategoryFieldBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border || '#E5E7EB',
  },
  compactFieldInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    padding: 0,
  },
  compactFieldIcon: {
    marginRight: 10,
  },
  recurrenceOptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.overlayLight,
  },
  paymentStatusOptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactCategoryField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.overlayLight,
    borderRadius: 10,
    marginBottom: 8,
  },
  compactCategoryText: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
  },
  compactCategoryPlaceholder: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  compactCategoryPickerHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  compactCategoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  compactCategoryName: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  modalHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 0,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  placeholder: {
    width: 32,
  },
  formContainer: {
    padding: 20,
    flex: 1,
  },
  // Transaction Type Selector Styles
  transactionTypeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background || '#F8FAFC',
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 2,
    marginBottom: 12,
  },
  transactionTypeButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  transactionTypeButtonExpense: {
    borderBottomColor: colors.primary || '#6366F1',
  },
  transactionTypeButtonIncome: {
    borderBottomColor: colors.primary || '#6366F1',
  },
  transactionTypeButtonActiveExpense: {
    backgroundColor: colors.primary || '#6366F1',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary || '#6366F1',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  transactionTypeButtonActiveIncome: {
    backgroundColor: colors.primary || '#6366F1',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary || '#6366F1',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  transactionTypeIcon: {
    marginRight: 8,
  },
  transactionTypeText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary || '#6B7280',
  },
  transactionTypeTextActive: {
    color: colors.textWhite || '#FFFFFF',
    fontWeight: '600',
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textPrimary,
    padding: 0,
  },
  descriptionInput: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  categoryField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.overlayLight,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
  },
  categoryPlaceholder: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  recurrenceField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 32,
  },
  recurrenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurrenceIcon: {
    marginRight: 12,
  },
  recurrenceText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  recurrenceActiveText: {
    color: colors.textPrimary,
  },
  dueDateField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 32,
  },
  dueDateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateIcon: {
    marginRight: 12,
  },
  dueDateText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  dueDateActiveText: {
    color: colors.textPrimary,
  },
  paymentStatusField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 32,
  },
  paymentStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatusIcon: {
    marginRight: 12,
  },
  paymentStatusText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  paymentStatusActiveText: {
    color: colors.textPrimary,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: colors.overlayLight,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  customLabel: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Recurrence Picklist Styles
  recurrencePicklistContainer: {
    marginBottom: 20,
  },
  picklistLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 2,
  },
  picklistScroll: {
    flexGrow: 0,
  },
  picklistOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  picklistOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  picklistOptionText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  picklistOptionTextActive: {
    color: colors.textWhite,
    fontWeight: '500',
  },
});

export default AddTransactionModal;
