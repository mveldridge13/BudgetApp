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


      // 🔧 HANDLE NESTED SUBCATEGORIES: Flatten if subcategories are nested inside parent categories
      let flattenedCategories = [];
      let mainCategories = [];
      let subcategories = [];

      backendCategories.forEach(cat => {
        if (!cat.parentId) {
          // This is a main category (remove nested subcategories to avoid duplication)
          const mainCategory = {
            ...cat,
            subcategories: undefined, // Remove nested subcategories from the main category
          };
          mainCategories.push(mainCategory);
          flattenedCategories.push(mainCategory);

          // Check if this category has nested subcategories
          if (cat.subcategories && Array.isArray(cat.subcategories)) {

            // Flatten nested subcategories and add parentId
            cat.subcategories.forEach(subcat => {
              const flatSubcat = {
                ...subcat,
                parentId: cat.id, // Ensure parentId is set correctly
              };
              subcategories.push(flatSubcat);
              flattenedCategories.push(flatSubcat);
            });
          }
        } else {
          // This is already a flat subcategory
          subcategories.push(cat);
          flattenedCategories.push(cat);
        }
      });

      // Deduplicate by ID to avoid duplicate keys in React
      const uniqueMainCategories = mainCategories.filter((category, index, array) =>
        array.findIndex(c => c.id === category.id) === index
      );
      const uniqueSubcategories = subcategories.filter((category, index, array) =>
        array.findIndex(c => c.id === category.id) === index
      );


      // Update the arrays with deduplicated versions
      mainCategories = uniqueMainCategories;
      subcategories = uniqueSubcategories;

      // Filter subcategories by transaction type BEFORE building the map
      const filteredSubcategories = subcategories.filter(subcat => {
        if (transactionType === 'EXPENSE') {
          // For EXPENSE, exclude INCOME and TRANSFER type subcategories
          return subcat.type !== 'INCOME' && subcat.type !== 'TRANSFER';
        } else if (transactionType === 'INCOME') {
          // For INCOME, only include INCOME type subcategories
          return subcat.type === 'INCOME';
        } else if (transactionType === 'TRANSFER') {
          // For TRANSFER, only include TRANSFER type subcategories
          return subcat.type === 'TRANSFER';
        }
        // Default: include all subcategories
        return true;
      });

      const subcategoriesMap = filteredSubcategories.reduce((map, subcat) => {
        // Handle potential type mismatch between parentId and category id
        const parentKey = String(subcat.parentId);
        if (!map[parentKey]) {
          map[parentKey] = [];
        }

        map[parentKey].push({
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
      let result = mainCategories.map(category => {
        const transformed = {
          id: category.id,
          name: category.name,
          icon: category.icon || 'albums-outline',
          color: category.color || '#4ECDC4',
          isCustom: !category.isSystem,
          parentId: category.parentId,
          hasSubcategories:
            subcategoriesMap[String(category.id)] &&
            subcategoriesMap[String(category.id)].length > 0,
          subcategories: subcategoriesMap[String(category.id)] || [],
        };

        return transformed;
      });

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

  const cleanupTemporarySubcategories = useCallback(() => {
    setCategories(prevCategories => {
      const cleanedCategories = prevCategories.map(category => ({
        ...category,
        subcategories: category.subcategories.filter(sub =>
          !sub.id.toString().startsWith('temp_')
        ),
      }));

      return cleanedCategories;
    });
  }, []);

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

      // 🌐 BACKGROUND SYNC: Check cache first, then fetch from API if needed
      try {
        let cachedCategories = await CategoryCache.get();

        if (!cachedCategories) {
          // Fetch from API
          const response = await TrendAPIService.getCategories();
          const backendCategories = response?.categories || [];

          if (backendCategories && Array.isArray(backendCategories)) {
            // Update cache in background
            CategoryCache.set(backendCategories);
            // Update state
            setAllCategories(backendCategories);
          } else {
            setAllCategories([]);
          }
        } else {
          // Use cached data
          setAllCategories(cachedCategories);
        }
      } catch (apiError) {
        // If API fails, show error
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
  // SUBCATEGORY CREATION
  // ==============================================

  const handleAddSubcategory = useCallback(
    async (parentCategoryId, subcategoryData) => {
      if (!TrendAPIService.isAuthenticated()) {
        navigation.navigate('Auth');
        return null;
      }

      const subcategoryPayload = {
        ...subcategoryData,
        parentId: parentCategoryId,
        type: selectedTransactionType || 'EXPENSE', // Default to EXPENSE if no type selected
      };

      // Optimistic update: Add to cache immediately
      const optimisticSubcategory = {
          id: `temp_${Date.now()}`, // Temporary ID
          name: subcategoryPayload.name,
          icon: subcategoryPayload.icon,
          color: subcategoryPayload.color,
          isCustom: true,
          parentId: subcategoryPayload.parentId,
          type: subcategoryPayload.type,
        };

      try {
        // Update cache optimistically
        await CategoryCache.upsertCategory(optimisticSubcategory);

        // Update UI state immediately (cache-first)
        const updateCategories = (prevCategories) => {
          return prevCategories.map(category => {
            if (category.id === parentCategoryId) {
              return {
                ...category,
                hasSubcategories: true,
                subcategories: [...(category.subcategories || []), optimisticSubcategory],
              };
            }
            return category;
          });
        };

        setCategories(updateCategories);

        // Update current subcategory data if we're viewing it
        if (currentSubcategoryData?.id === parentCategoryId) {
          setCurrentSubcategoryData(prev => ({
            ...prev,
            hasSubcategories: true,
            subcategories: [...(prev.subcategories || []), optimisticSubcategory],
          }));
        }

        // Background sync: Send to API and update with real data
        try {
          const createdSubcategory = await TrendAPIService.createCategory(
            subcategoryPayload,
          );

          // Replace optimistic update with real data
          const realSubcategory = {
            id: createdSubcategory.id,
            name: createdSubcategory.name,
            icon: createdSubcategory.icon || 'albums-outline',
            color: createdSubcategory.color || optimisticSubcategory.color,
            isCustom: !createdSubcategory.isSystem,
            parentId: createdSubcategory.parentId,
            type: createdSubcategory.type,
          };

          // Update cache with real data
          await CategoryCache.upsertCategory(realSubcategory);

          // Update state with real data
          setCategories(prevCategories => {
            return prevCategories.map(category => {
              if (category.id === parentCategoryId) {
                return {
                  ...category,
                  subcategories: category.subcategories.map(sub =>
                    sub.id === optimisticSubcategory.id ? realSubcategory : sub
                  ),
                };
              }
              return category;
            });
          });

          // Update current subcategory data if we're viewing it
          if (currentSubcategoryData?.id === parentCategoryId) {
            setCurrentSubcategoryData(prev => ({
              ...prev,
              subcategories: prev.subcategories.map(sub =>
                sub.id === optimisticSubcategory.id ? realSubcategory : sub
              ),
            }));
          }

          console.log(
            '➕ AddTransactionContainer: Subcategory synced successfully:',
            realSubcategory.name,
          );

          // Return the real subcategory data
          return realSubcategory;

        } catch (syncError) {
          console.error(
            '➕ AddTransactionContainer: Background sync failed:',
            syncError,
          );

          // Keep optimistic update, show subtle warning
          console.warn('Subcategory created locally, will sync when online');

          // Return optimistic data
          return optimisticSubcategory;
        }

      } catch (creationError) {
        console.error(
          '➕ AddTransactionContainer: Error creating subcategory:',
          creationError,
        );

        // Remove optimistic update on failure
        await CategoryCache.removeCategory(optimisticSubcategory.id);

        // Revert UI state
        setCategories(prevCategories => {
          return prevCategories.map(category => {
            if (category.id === parentCategoryId) {
              return {
                ...category,
                subcategories: category.subcategories.filter(
                  sub => sub.id !== optimisticSubcategory.id
                ),
              };
            }
            return category;
          });
        });

        // Show specific error message based on error type
        const errorMessage = creationError.message?.includes('already exists') || creationError.message?.includes('duplicate')
          ? 'A subcategory with this name already exists.'
          : 'Failed to create subcategory. Please try again.';

        Alert.alert('Error', errorMessage);
        return null;
      }
    },
    [navigation, currentSubcategoryData, selectedTransactionType],
  );

  // ==============================================
  // EVENT HANDLERS
  // ==============================================

  const handleSave = useCallback(async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check if subcategory is still being created (has temporary ID)
    if (selectedSubcategory && typeof selectedSubcategory === 'string' && selectedSubcategory.startsWith('temp_')) {
      console.log('🚫 AddTransactionContainer: Preventing save with temporary subcategory ID:', selectedSubcategory);
      Alert.alert('Please wait', 'Subcategory is being created. Please wait a moment and try again.');
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
    setOverlayMode(null);
    setCurrentSubcategoryData(null);
  }, []);

  const handleCategoryOverlayBack = useCallback(() => {
    // Go back from category overlay to transaction type overlay
    setOverlayMode('transactionType');
    setCurrentSubcategoryData(null);
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
    setOverlayMode(null);
    setCurrentSubcategoryData(null);
  }, []);

  const handleSubcategoryOverlayBack = useCallback(() => {
    // Go back from subcategory overlay to category overlay
    setOverlayMode('category');
    // Keep currentSubcategoryData so user returns to the same category context
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
    setOverlayMode(null);
    setCurrentSubcategoryData(null);
  }, []);

  const handleAmountOverlayBack = useCallback(() => {
    // Go back from amount overlay to the previous selection step
    if (selectedSubcategory) {
      // If we have a subcategory selected, go back to subcategory overlay
      const category = getCategoryById(selectedCategory);
      setCurrentSubcategoryData(category);
      setOverlayMode('subcategory');
    } else {
      // If no subcategory, go back to category overlay
      setOverlayMode('category');
    }
  }, [selectedSubcategory, selectedCategory, getCategoryById]);

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
    setOverlayMode(null);
    setCurrentSubcategoryData(null);
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

  // One-time cleanup on mount to remove any stale temporary IDs
  useEffect(() => {
    cleanupTemporarySubcategories();
  }, [cleanupTemporarySubcategories]);

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

      // Clean up any stale temporary subcategory IDs
      setTimeout(() => {
        cleanupTemporarySubcategories();
      }, 100);
    }
  }, [selectedTransactionType, allCategories, transformCategoriesForUI, cleanupTemporarySubcategories]);

  // Effect to update selected subcategory ID when temporary ID gets replaced with real ID
  useEffect(() => {
    if (selectedSubcategory && typeof selectedSubcategory === 'string' && selectedSubcategory.startsWith('temp_') && categories.length > 0) {
      console.log('🔍 AddTransactionContainer: Checking for temp ID replacement. Temp ID:', selectedSubcategory);

      // Find the category containing our temporary subcategory
      const parentCategory = categories.find(cat =>
        cat.subcategories && cat.subcategories.some(sub => sub.id === selectedSubcategory)
      );

      console.log('🔍 Parent category found:', parentCategory?.name, 'Subcategories:', parentCategory?.subcategories?.map(s => `${s.name}(${s.id})`));

      if (parentCategory) {
        const tempSubcategory = parentCategory.subcategories.find(sub => sub.id === selectedSubcategory);

        // Look for a real subcategory with the same name that was just created
        const realSubcategory = parentCategory.subcategories.find(sub =>
          sub.name === tempSubcategory?.name && !sub.id.startsWith('temp_')
        );

        if (realSubcategory) {
          console.log('🔄 AddTransactionContainer: Updating selected subcategory from temp ID to real ID:', realSubcategory.id);
          setSelectedSubcategory(realSubcategory.id);
        } else {
          console.log('⚠️ AddTransactionContainer: No real subcategory found with name:', tempSubcategory?.name);
          // Clear the temp ID if no real subcategory is found (creation likely failed)
          console.log('🧹 AddTransactionContainer: Clearing temporary subcategory ID and invalidating cache');
          setSelectedSubcategory(null);
          // Clear cache to force refresh from backend
          CategoryCache.clear();
          loadCategories();
        }
      } else {
        console.log('⚠️ AddTransactionContainer: No parent category found for temp ID, clearing selection');
        setSelectedSubcategory(null);
        // Clear cache to force refresh from backend
        CategoryCache.clear();
        loadCategories();
      }
    }
  }, [categories, selectedSubcategory, loadCategories]);

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
      onCategoryOverlayBack={handleCategoryOverlayBack}
      onCategoryOverlaySelect={handleCategoryOverlaySelect}
      onSubcategoryOverlayClose={handleSubcategoryOverlayClose}
      onSubcategoryOverlayBack={handleSubcategoryOverlayBack}
      onSubcategoryOverlaySelect={handleSubcategoryOverlaySelect}
      onAddSubcategory={handleAddSubcategory}
      onAmountOverlayClose={handleAmountOverlayClose}
      onAmountOverlayBack={handleAmountOverlayBack}
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
