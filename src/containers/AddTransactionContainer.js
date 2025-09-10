import React, {useState, useCallback, useEffect} from 'react';
import {Alert} from 'react-native';
import TrendAPIService from '../services/TrendAPIService';
import CategoryCache from '../services/CategoryCache';
import AddTransactionModal from '../components/AddTransactionModal';
import {useAppSettings} from '../contexts/AppSettingsContext';
import DateService from '../services/DateService';

const recurrenceOptions = [
  {id: 'none', name: 'Does not repeat'},
  {id: 'weekly', name: 'Weekly'},
  {id: 'fortnightly', name: 'Fortnightly'},
  {id: 'monthly', name: 'Monthly'},
  {id: 'sixmonths', name: 'Every six months'},
  {id: 'yearly', name: 'Yearly'},
];

const paymentStatusOptions = [
  {id: 'UPCOMING', name: 'Upcoming', icon: 'time-outline', color: '#007AFF'},
  {
    id: 'PAID',
    name: 'Paid',
    icon: 'checkmark-circle-outline',
    color: '#4CAF50',
  },
  {id: 'OVERDUE', name: 'Overdue', icon: 'warning-outline', color: '#F44336'},
];

const AddTransactionContainer = ({
  visible,
  onClose,
  onSave,
  editingTransaction,
  navigation,
}) => {
  // ==============================================
  // STATE MANAGEMENT
  // ==============================================

  // Transaction form data
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => DateService.createTodayInTimezone());
  const [selectedDueDate, setSelectedDueDate] = useState(null);
  const [selectedRecurrence, setSelectedRecurrence] = useState('none');
  const [selectedTransactionType, setSelectedTransactionType] =
    useState('EXPENSE');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(null);

  // Categories data
  const [allCategories, setAllCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [currentSubcategoryData, setCurrentSubcategoryData] = useState(null);

  // Track if user manually entered description
  const [hasManualDescription, setHasManualDescription] = useState(false);

  // Overlay state
  const [overlayMode, setOverlayMode] = useState('transactionType'); // 'transactionType', 'quick', 'category', 'subcategory', 'amount', 'recurrence', null
  const [isRecurringTransaction, setIsRecurringTransaction] = useState(false);

  // Other modals state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState('transaction'); // 'transaction' or 'dueDate'

  // Tournament modal state
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentLocation, setTournamentLocation] = useState('');
  const [tournamentStartDate, setTournamentStartDate] = useState(null);
  const [tournamentEndDate, setTournamentEndDate] = useState(null);
  const [tournamentAccommodation, setTournamentAccommodation] = useState('');
  const [tournamentFood, setTournamentFood] = useState('');
  const [tournamentOtherExpenses, setTournamentOtherExpenses] = useState('');
  const [tournamentCalendarMode, setTournamentCalendarMode] = useState(null);
  const [showTournamentCalendar, setShowTournamentCalendar] = useState(false);

  // Get module settings from context
  const {moduleSettings} = useAppSettings();
  const pokerTrackerEnabled = moduleSettings?.pokerTracker || false;

  // Check if we're in edit mode
  const isEditMode = !!editingTransaction;

  // ==============================================
  // DATA TRANSFORMATION
  // ==============================================

  const transformCategoriesForUI = useCallback(
    (backendCategories, transactionType) => {
      if (!Array.isArray(backendCategories)) {
        return [];
      }

      // Separate main categories and subcategories
      const mainCategories = backendCategories.filter(cat => !cat.parentId);
      const subcategories = backendCategories.filter(cat => cat.parentId);

      const subcategoriesMap = subcategories.reduce((map, subcat) => {
        if (!map[subcat.parentId]) {
          map[subcat.parentId] = [];
        }
        map[subcat.parentId].push({
          id: subcat.id,
          name: subcat.name,
          icon: subcat.icon || 'albums-outline',
          color: subcat.color || '#4ECDC4',
          isCustom: !subcat.isSystem,
          parentId: subcat.parentId,
        });
        return map;
      }, {});

      // Transform main categories and attach their subcategories
      let result = mainCategories.map(category => ({
        id: category.id,
        name: category.name,
        icon: category.icon || 'albums-outline',
        color: category.color || '#4ECDC4',
        isCustom: !category.isSystem,
        parentId: category.parentId,
        hasSubcategories:
          subcategoriesMap[category.id] &&
          subcategoriesMap[category.id].length > 0,
        subcategories: subcategoriesMap[category.id] || [],
      }));

      // Filter categories based on transaction type
      if (transactionType === 'EXPENSE') {
        result = result.filter(
          category => category.name.toLowerCase() !== 'income',
        );
      } else if (transactionType === 'INCOME') {
        result = result.filter(
          category => category.name.toLowerCase() === 'income',
        );
      }

      // Sort main categories with custom order: Other comes after Transport
      return result.sort((a, b) => {
        const customOrder = [
          'Bills',
          'Entertainment',
          'Food',
          'Health',
          'Shopping',
          'Transport',
          'Other', // Other moved after Transport
        ];

        const aIndex = customOrder.indexOf(a.name);
        const bIndex = customOrder.indexOf(b.name);

        // If both categories are in custom order, use that order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }

        // If only one is in custom order, prioritize it
        if (aIndex !== -1) {
          return -1;
        }
        if (bIndex !== -1) {
          return 1;
        }

        // If neither is in custom order, sort alphabetically
        return a.name.localeCompare(b.name);
      });
    },
    [],
  );

  // ==============================================
  // HELPER FUNCTIONS
  // ========================================
  // ======

  const getCategoryById = useCallback(
    id => {
      // First try to find in the transformed categories (includes subcategories)
      const category = categories.find(cat => cat.id === id);
      if (category) {
        return category;
      }
      // Fallback to allCategories if not found in filtered categories
      return allCategories.find(cat => cat.id === id);
    },
    [categories, allCategories],
  );

  const getRecurrenceById = useCallback(
    id => recurrenceOptions.find(opt => opt.id === id),
    [],
  );

  const getCategoryDisplayName = useCallback(
    (categoryId, subcategoryId) => {
      const category = getCategoryById(categoryId);
      if (!category) {
        return '';
      }

      if (subcategoryId && category.subcategories) {
        const subcategory = category.subcategories.find(
          sub => sub.id === subcategoryId,
        );
        if (subcategory) {
          return subcategory.name;
        }
      }

      return category.name;
    },
    [getCategoryById],
  );

  // ==============================================
  // BACKEND INTEGRATION
  // ==============================================

  const loadCategories = useCallback(async () => {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        if (navigation) {
          navigation.navigate('Auth');
        }
        return;
      }

      setIsLoading(true);
      setErrorState(null);

      // 🔄 CACHE-FIRST: Load from cache immediately
      const cached = await CategoryCache.get();
      if (cached && cached.data) {
        setAllCategories(cached.data);
        setIsLoading(false);

        // If cache is fresh, we're done
        if (!cached.isStale) {
          return;
        }
      }

      // 🌐 BACKGROUND SYNC: Fetch from API (always for fresh data, or if no cache)
      try {
        const response = await TrendAPIService.getCategories();
        const backendCategories = response?.categories || [];

        if (backendCategories && Array.isArray(backendCategories)) {
          // Update cache in background
          CategoryCache.set(backendCategories);

          // Update state
          setAllCategories(backendCategories);
        } else {
          // If API fails but we have cached data, keep using cached data
          if (!cached) {
            setAllCategories([]);
          }
        }
      } catch (apiError) {
        // If API fails and we don't have cached data, show error
        if (!cached) {
          setErrorState(apiError.message);
          Alert.alert(
            'Connection Issue',
            'Unable to load categories. Please check your connection and try again.',
            [
              {text: 'Retry', onPress: () => loadCategories()},
              {text: 'Cancel', style: 'cancel'},
            ],
          );
          setAllCategories([]);
        }
      }
    } catch (error) {
      setErrorState(error.message);
      setAllCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  // ==============================================
  // FORM MANAGEMENT
  // ==============================================

  const resetForm = useCallback(() => {
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedDate(DateService.createTodayInTimezone());
    setSelectedDueDate(null);
    setSelectedRecurrence('none');
    setSelectedTransactionType('EXPENSE');
    setSelectedPaymentStatus(null);
    setCurrentSubcategoryData(null);
    setHasManualDescription(false);

    // Reset overlay mode
    setOverlayMode('transactionType');
    setIsRecurringTransaction(false);

    // Reset tournament form
    setTournamentName('');
    setTournamentLocation('');
    setTournamentStartDate(null);
    setTournamentEndDate(null);
    setTournamentAccommodation('');
    setTournamentFood('');
    setTournamentOtherExpenses('');
    setShowTournamentModal(false);
    setShowTournamentCalendar(false);
    setTournamentCalendarMode(null);
  }, []);

  const populateFormForEdit = useCallback(() => {
    if (editingTransaction && visible) {
      // Pre-populate all fields with existing transaction data
      setAmount(editingTransaction.amount.toString());
      setDescription(editingTransaction.description || '');
      setSelectedCategory(editingTransaction.categoryId);
      setSelectedSubcategory(editingTransaction.subcategoryId || null);
      setSelectedDate(DateService.parseInTimezone(editingTransaction.date) || DateService.createTodayInTimezone());
      setSelectedDueDate(
        editingTransaction.dueDate
          ? DateService.parseInTimezone(editingTransaction.dueDate)
          : null,
      );
      setSelectedRecurrence(editingTransaction.recurrence || 'none');
      setSelectedTransactionType(editingTransaction.type || 'EXPENSE');
      setSelectedPaymentStatus(editingTransaction.status || null);

      // Set currentSubcategoryData for edit mode
      if (editingTransaction.categoryId) {
        const category = getCategoryById(editingTransaction.categoryId);
        if (category && category.hasSubcategories) {
          setCurrentSubcategoryData(category);
        }
      }

      // Check if the existing description was manually entered
      const categoryDisplayName = getCategoryDisplayName(
        editingTransaction.categoryId,
        editingTransaction.subcategoryId,
      );
      const hasCustomDescription =
        editingTransaction.description &&
        editingTransaction.description.trim() !== categoryDisplayName;
      setHasManualDescription(hasCustomDescription);

      // Set isRecurringTransaction based on existing transaction
      setIsRecurringTransaction(
        editingTransaction.recurrence &&
          editingTransaction.recurrence !== 'none',
      );

      // For edit mode, skip overlay flow and go straight to full form
      setOverlayMode(null);
    }
    // Remove the resetForm() call for new transactions - let user set their own transaction type
  }, [editingTransaction, visible, getCategoryById, getCategoryDisplayName]);

  // ==============================================
  // EVENT HANDLERS
  // ==============================================

  const handleSave = useCallback(async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const finalDescription =
      description.trim() ||
      getCategoryDisplayName(selectedCategory, selectedSubcategory);

    const transaction = {
      // Only include ID if we're editing an existing transaction
      ...(isEditMode && editingTransaction.id && {id: editingTransaction.id}),
      amount: parseFloat(amount),
      description: finalDescription,
      categoryId: selectedCategory, // ✅ CORRECT field name
      subcategoryId: selectedSubcategory, // ✅ FIXED - was 'subcategory'
      date: DateService.prepareForBackend(selectedDate),
      dueDate: DateService.prepareForBackend(selectedDueDate),
      recurrence: selectedRecurrence,
      type: selectedTransactionType,
      status: selectedPaymentStatus,
      createdAt: isEditMode ? editingTransaction.createdAt : DateService.prepareForBackend(new Date()),
      updatedAt: isEditMode ? DateService.prepareForBackend(new Date()) : undefined,
    };

    try {
      await onSave(transaction);
      // Only reset form and close modal if save was successful
      resetForm();
      onClose();
    } catch (error) {
      // Error handling is done by parent container
      // Keep modal open for user to retry
    }
  }, [
    amount,
    selectedCategory,
    description,
    getCategoryDisplayName,
    selectedSubcategory,
    selectedDate,
    selectedDueDate,
    selectedRecurrence,
    selectedTransactionType,
    selectedPaymentStatus,
    isEditMode,
    editingTransaction,
    onSave,
    resetForm,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleCategorySelect = useCallback(
    categoryId => {
      const category = getCategoryById(categoryId);

      if (
        category &&
        category.hasSubcategories &&
        category.subcategories?.length > 0
      ) {
        // Set subcategory data for UI to use
        setCurrentSubcategoryData(category);
        // Don't select the category yet - wait for subcategory selection
      } else {
        // Select category directly
        setSelectedCategory(categoryId);
        setSelectedSubcategory(null);
      }
    },
    [getCategoryById],
  );

  const handleSubcategorySelect = useCallback(
    subcategoryId => {
      // Handle both edit mode and new transaction mode
      if (currentSubcategoryData) {
        // New transaction or category change - use currentSubcategoryData
        setSelectedCategory(currentSubcategoryData.id);
        setSelectedSubcategory(subcategoryId);
      } else {
        // Edit mode - keep existing category, just update subcategory
        setSelectedSubcategory(subcategoryId);
      }
    },
    [currentSubcategoryData],
  );

  const handleRecurrenceSelect = useCallback(recurrenceId => {
    setSelectedRecurrence(recurrenceId);
  }, []);

  const handlePaymentStatusChange = useCallback(statusId => {
    setSelectedPaymentStatus(statusId);
  }, []);

  const handleAmountChange = useCallback(text => {
    setAmount(text);
  }, []);

  const handleDescriptionChange = useCallback(
    text => {
      setDescription(text);
      // Mark as manually entered if user types anything different from category names
      if (
        text.trim() &&
        !categories.some(
          cat =>
            cat.name === text.trim() ||
            (cat.subcategories &&
              cat.subcategories.some(sub => sub.name === text.trim())),
        )
      ) {
        setHasManualDescription(true);
      }
    },
    [categories],
  );

  const handleDateChange = useCallback(
    date => {
      if (calendarMode === 'dueDate') {
        setSelectedDueDate(date);
      } else {
        setSelectedDate(date);
      }
      setShowCalendar(false);
    },
    [calendarMode],
  );

  const handleDueDateChange = useCallback(date => {
    setSelectedDueDate(date);
  }, []);

  const handleShowCalendar = useCallback((mode = 'transaction') => {
    setCalendarMode(mode);
    setShowCalendar(true);
  }, []);

  const handleHideCalendar = useCallback(() => {
    setShowCalendar(false);
  }, []);

  const handleTransactionTypeChange = useCallback(
    type => {
      // Check if current description matches a category name (auto-generated)
      const descriptionMatchesCategory = categories.some(
        cat =>
          cat.name === description.trim() ||
          (cat.subcategories &&
            cat.subcategories.some(sub => sub.name === description.trim())),
      );

      setSelectedTransactionType(type);
      // Clear category selection when transaction type changes
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setCurrentSubcategoryData(null);

      // Clear description if it was auto-generated (matches a category name)
      if (descriptionMatchesCategory) {
        setDescription('');
      }
    },
    [categories, description],
  );

  // ==============================================
  // OVERLAY EVENT HANDLERS
  // ==============================================

  const handleQuickAddClose = useCallback(() => {
    setOverlayMode(null);
  }, []);

  const handleQuickAddCategoryPress = useCallback(() => {
    setOverlayMode('category');
  }, []);

  const handleCategoryOverlayClose = useCallback(() => {
    setOverlayMode('quick');
  }, []);

  const handleCategoryOverlaySelect = useCallback(
    categoryId => {
      const category = getCategoryById(categoryId);
      if (
        category &&
        category.hasSubcategories &&
        category.subcategories?.length > 0
      ) {
        // Category has subcategories, show subcategory overlay
        setCurrentSubcategoryData(category);
        setOverlayMode('subcategory');
      } else {
        // No subcategories, select category directly and go to amount overlay
        setSelectedCategory(categoryId);
        setSelectedSubcategory(null);
        setOverlayMode('amount');
      }
    },
    [getCategoryById],
  );

  const handleQuickAddDatePress = useCallback(() => {
    setShowCalendar(true);
    setCalendarMode('transaction');
  }, []);

  const handleSubcategoryOverlayClose = useCallback(() => {
    setOverlayMode('category');
  }, []);

  const handleSubcategoryOverlaySelect = useCallback(
    subcategoryId => {
      if (currentSubcategoryData) {
        setSelectedCategory(currentSubcategoryData.id);
        setSelectedSubcategory(subcategoryId);
        setCurrentSubcategoryData(null);
        setOverlayMode('amount');
      }
    },
    [currentSubcategoryData],
  );

  const handleAmountOverlayClose = useCallback(() => {
    // If we have a subcategory selected, go back to subcategory overlay
    // Otherwise, go back to category overlay
    if (selectedSubcategory) {
      setOverlayMode('subcategory');
    } else {
      setOverlayMode('category');
    }
  }, [selectedSubcategory]);

  const handleAmountOverlaySave = useCallback(() => {
    // Save the transaction with current form data
    handleSave();
  }, [handleSave]);

  const handleTransactionTypeSelect = useCallback(type => {
    setIsRecurringTransaction(type === 'recurring');
    if (type === 'recurring') {
      setOverlayMode('recurrence');
    } else {
      setOverlayMode('quick');
    }
  }, []);

  const handleTransactionTypeClose = useCallback(() => {
    setOverlayMode(null);
  }, []);

  const handleRecurrenceOverlayClose = useCallback(() => {
    setOverlayMode('transactionType');
  }, []);

  const handleRecurrenceOverlayContinue = useCallback(() => {
    setOverlayMode('quick');
  }, []);

  const handleRecurrenceOverlayRecurrenceSelect = useCallback(recurrenceId => {
    setSelectedRecurrence(recurrenceId);
  }, []);

  const handleRecurrenceOverlayDueDatePress = useCallback(() => {
    setShowCalendar(true);
    setCalendarMode('dueDate');
  }, []);

  // ==============================================
  // TOURNAMENT EVENT HANDLERS
  // ==============================================

  const handleCreateTournamentPress = useCallback(() => {
    setShowTournamentModal(true);
  }, []);

  const handleTournamentModalClose = useCallback(() => {
    setShowTournamentModal(false);
  }, []);

  const handleTournamentSave = useCallback(async () => {
    try {
      // Validate required fields
      if (!tournamentName || !tournamentLocation || !tournamentStartDate) {
        Alert.alert(
          'Error',
          'Please fill in tournament name, location, and start date',
        );
        return;
      }

      const tournamentData = {
        name: tournamentName,
        location: tournamentLocation,
        dateStart: DateService.prepareForBackend(tournamentStartDate),
        dateEnd: DateService.prepareForBackend(tournamentEndDate),
        accommodation: tournamentAccommodation,
        food: tournamentFood,
        otherExpenses: tournamentOtherExpenses,
      };

      console.log('Creating tournament:', tournamentData);

      // Call the API to create tournament
      const createdTournament = await TrendAPIService.createTournament(
        tournamentData,
      );

      console.log('Tournament created successfully:', createdTournament);

      // Reset tournament form and close modal
      setTournamentName('');
      setTournamentLocation('');
      setTournamentStartDate(null);
      setTournamentEndDate(null);
      setTournamentAccommodation('');
      setTournamentFood('');
      setTournamentOtherExpenses('');
      setShowTournamentModal(false);

      // Show success feedback
      Alert.alert('Success', 'Tournament created successfully!');
    } catch (error) {
      console.error('Error creating tournament:', error);

      // Show specific error message if available
      const errorMessage =
        error.message || 'Failed to create tournament. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  }, [
    tournamentName,
    tournamentLocation,
    tournamentStartDate,
    tournamentEndDate,
    tournamentAccommodation,
    tournamentFood,
    tournamentOtherExpenses,
  ]);

  const handleTournamentCalendarShow = useCallback(mode => {
    setTournamentCalendarMode(mode);
    setShowTournamentCalendar(true);
  }, []);

  const handleTournamentCalendarHide = useCallback(() => {
    setShowTournamentCalendar(false);
    setTournamentCalendarMode(null);
  }, []);

  const handleTournamentDateChange = useCallback(
    date => {
      if (tournamentCalendarMode === 'start') {
        setTournamentStartDate(date);
      } else if (tournamentCalendarMode === 'end') {
        setTournamentEndDate(date);
      }
      handleTournamentCalendarHide();
    },
    [tournamentCalendarMode, handleTournamentCalendarHide],
  );

  // Tournament form field handlers
  const handleTournamentNameChange = useCallback(text => {
    setTournamentName(text);
  }, []);

  const handleTournamentLocationChange = useCallback(text => {
    setTournamentLocation(text);
  }, []);

  const handleTournamentAccommodationChange = useCallback(text => {
    setTournamentAccommodation(text);
  }, []);

  const handleTournamentFoodChange = useCallback(text => {
    setTournamentFood(text);
  }, []);

  const handleTournamentOtherExpensesChange = useCallback(text => {
    setTournamentOtherExpenses(text);
  }, []);

  const handleTournamentStartDateChange = useCallback(date => {
    setTournamentStartDate(date);
  }, []);

  const handleTournamentEndDateChange = useCallback(date => {
    setTournamentEndDate(date);
  }, []);

  // ==============================================
  // AUTO-DESCRIPTION LOGIC
  // ==============================================

  // Effect to auto-update description when category changes
  useEffect(() => {
    if (!visible || !selectedCategory || categories.length === 0) {
      return;
    }

    const newCategoryDisplayName = getCategoryDisplayName(
      selectedCategory,
      selectedSubcategory,
    );

    if (isEditMode && editingTransaction) {
      // Don't auto-update if user has manually entered a description
      if (hasManualDescription) {
        return;
      }

      // Get the original category display name properly
      const originalCategoryDisplayName = getCategoryDisplayName(
        editingTransaction.categoryId,
        editingTransaction.subcategoryId,
      );

      // Only auto-update if description is empty OR matches the original category name
      const shouldAutoUpdate =
        !description.trim() || // Empty description
        description.trim() === originalCategoryDisplayName; // Matches original category

      if (shouldAutoUpdate) {
        setDescription(newCategoryDisplayName);
      }
    } else {
      // For new transactions, don't auto-update if user has manually entered a description
      if (hasManualDescription) {
        return;
      }

      // For new transactions, auto-update if description is empty OR matches a category name
      const descriptionMatchesCategory = categories.some(
        cat =>
          cat.name === description.trim() ||
          (cat.subcategories &&
            cat.subcategories.some(sub => sub.name === description.trim())),
      );

      const shouldAutoUpdate =
        !description.trim() || descriptionMatchesCategory;

      if (shouldAutoUpdate) {
        setDescription(newCategoryDisplayName);
      }
    }
  }, [
    selectedCategory,
    selectedSubcategory,
    visible,
    isEditMode,
    description,
    categories,
    getCategoryDisplayName,
    editingTransaction,
    hasManualDescription,
  ]);

  // ==============================================
  // LIFECYCLE
  // ==============================================

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible, loadCategories]);

  // Effect to populate form when editing
  useEffect(() => {
    populateFormForEdit();
  }, [populateFormForEdit]);

  // Effect to update categories when transaction type changes
  useEffect(() => {
    if (allCategories.length > 0) {
      const filteredCategories = transformCategoriesForUI(
        allCategories,
        selectedTransactionType,
      );
      setCategories(filteredCategories);
    }
  }, [selectedTransactionType, allCategories, transformCategoriesForUI]);

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <AddTransactionModal
      // Modal state
      visible={visible}
      onClose={handleClose}
      onSave={handleSave}
      isEditMode={isEditMode}
      // Form data
      amount={amount}
      description={description}
      selectedCategory={selectedCategory}
      selectedSubcategory={selectedSubcategory}
      selectedDate={selectedDate}
      selectedDueDate={selectedDueDate}
      selectedRecurrence={selectedRecurrence}
      selectedTransactionType={selectedTransactionType}
      selectedPaymentStatus={selectedPaymentStatus}
      // Categories data
      categories={categories}
      isLoading={isLoading}
      errorState={errorState}
      currentSubcategoryData={currentSubcategoryData}
      // Calendar state
      showCalendar={showCalendar}
      // Event handlers
      onAmountChange={handleAmountChange}
      onDescriptionChange={handleDescriptionChange}
      onCategorySelect={handleCategorySelect}
      onSubcategorySelect={handleSubcategorySelect}
      onRecurrenceSelect={handleRecurrenceSelect}
      onDateChange={handleDateChange}
      onDueDateChange={handleDueDateChange}
      onShowCalendar={handleShowCalendar}
      onHideCalendar={handleHideCalendar}
      onTransactionTypeChange={handleTransactionTypeChange}
      onPaymentStatusChange={handlePaymentStatusChange}
      // Helper functions
      getCategoryById={getCategoryById}
      getRecurrenceById={getRecurrenceById}
      getCategoryDisplayName={getCategoryDisplayName}
      recurrenceOptions={recurrenceOptions}
      paymentStatusOptions={paymentStatusOptions}
      // Module settings
      pokerTrackerEnabled={pokerTrackerEnabled}
      // Overlay props
      overlayMode={overlayMode}
      onQuickAddClose={handleQuickAddClose}
      onQuickAddCategoryPress={handleQuickAddCategoryPress}
      onQuickAddDatePress={handleQuickAddDatePress}
      onCategoryOverlayClose={handleCategoryOverlayClose}
      onCategoryOverlaySelect={handleCategoryOverlaySelect}
      onSubcategoryOverlayClose={handleSubcategoryOverlayClose}
      onSubcategoryOverlaySelect={handleSubcategoryOverlaySelect}
      onAmountOverlayClose={handleAmountOverlayClose}
      onAmountOverlaySave={handleAmountOverlaySave}
      allCategories={allCategories}
      transformCategoriesForUI={transformCategoriesForUI}
      // Transaction type overlay props
      isRecurringTransaction={isRecurringTransaction}
      onTransactionTypeSelect={handleTransactionTypeSelect}
      onTransactionTypeClose={handleTransactionTypeClose}
      // Recurrence overlay props
      onRecurrenceOverlayClose={handleRecurrenceOverlayClose}
      onRecurrenceOverlayContinue={handleRecurrenceOverlayContinue}
      onRecurrenceOverlayRecurrenceSelect={
        handleRecurrenceOverlayRecurrenceSelect
      }
      onRecurrenceOverlayDueDatePress={handleRecurrenceOverlayDueDatePress}
      // Tournament props
      showTournamentModal={showTournamentModal}
      tournamentName={tournamentName}
      tournamentLocation={tournamentLocation}
      tournamentStartDate={tournamentStartDate}
      tournamentEndDate={tournamentEndDate}
      tournamentAccommodation={tournamentAccommodation}
      tournamentFood={tournamentFood}
      tournamentOtherExpenses={tournamentOtherExpenses}
      showTournamentCalendar={showTournamentCalendar}
      tournamentCalendarMode={tournamentCalendarMode}
      // Tournament handlers
      onCreateTournamentPress={handleCreateTournamentPress}
      onTournamentModalClose={handleTournamentModalClose}
      onTournamentSave={handleTournamentSave}
      onTournamentCalendarShow={handleTournamentCalendarShow}
      onTournamentCalendarHide={handleTournamentCalendarHide}
      onTournamentDateChange={handleTournamentDateChange}
      onTournamentNameChange={handleTournamentNameChange}
      onTournamentLocationChange={handleTournamentLocationChange}
      onTournamentStartDateChange={handleTournamentStartDateChange}
      onTournamentEndDateChange={handleTournamentEndDateChange}
      onTournamentAccommodationChange={handleTournamentAccommodationChange}
      onTournamentFoodChange={handleTournamentFoodChange}
      onTournamentOtherExpensesChange={handleTournamentOtherExpensesChange}
    />
  );
};

export default AddTransactionContainer;
