import React, {useState, useCallback, useEffect} from 'react';
import {Alert} from 'react-native';
import TrendAPIService from '../services/TrendAPIService';
import AddTransactionModal from '../components/AddTransactionModal';

// ID generation is now handled by the backend

// Recurrence options - static data moved outside component
const recurrenceOptions = [
  {id: 'none', name: 'Does not repeat'},
  {id: 'weekly', name: 'Weekly'},
  {id: 'fortnightly', name: 'Fortnightly'},
  {id: 'monthly', name: 'Monthly'},
  {id: 'sixmonths', name: 'Every six months'},
  {id: 'yearly', name: 'Yearly'},
];

const AddTransactionContainer = ({
  visible,
  onClose,
  onSave,
  editingTransaction,
  navigation, // Add navigation prop for consistency
}) => {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  // Transaction form data
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRecurrence, setSelectedRecurrence] = useState('none');
  const [selectedTransactionType, setSelectedTransactionType] =
    useState('EXPENSE'); // ✅ NEW: Transaction type state

  // Categories data
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [currentSubcategoryData, setCurrentSubcategoryData] = useState(null);

  // Other modals state
  const [showCalendar, setShowCalendar] = useState(false);

  // Check if we're in edit mode
  const isEditMode = !!editingTransaction;

  // ==============================================
  // DATA TRANSFORMATION (from CategoryContainer pattern)
  // ==============================================

  const transformCategoriesForUI = useCallback(backendCategories => {
    if (!Array.isArray(backendCategories)) {
      console.log(
        '🔍 DEBUG: backendCategories is not an array:',
        backendCategories,
      );
      return [];
    }

    console.log('🔍 DEBUG: Raw backend categories:', backendCategories.length);
    console.log('🔍 Sample category:', backendCategories[0]); // Added from File 1
    console.log('🔍 DEBUG: All backend categories:', backendCategories);

    // Separate main categories and subcategories
    const mainCategories = backendCategories.filter(cat => !cat.parentId);
    const subcategories = backendCategories.filter(cat => cat.parentId);

    console.log('🔍 DEBUG: Main categories found:', mainCategories.length);
    console.log('🔍 DEBUG: Subcategories found:', subcategories.length);
    console.log(
      '🔍 DEBUG: Main category names:',
      mainCategories.map(c => c.name),
    );
    console.log(
      '🔍 DEBUG: Subcategory names:',
      subcategories.map(c => `${c.name} (parent: ${c.parentId})`),
    );

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

    console.log('🔍 DEBUG: Subcategories map:', subcategoriesMap);

    // Transform main categories and attach their subcategories
    const result = mainCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon || 'albums-outline',
      color: category.color || '#4ECDC4',
      isCustom: !category.isSystem,
      parentId: category.parentId, // This should be null for main categories
      hasSubcategories:
        subcategoriesMap[category.id] &&
        subcategoriesMap[category.id].length > 0,
      subcategories: subcategoriesMap[category.id] || [],
    }));

    console.log('🔍 Final transformed categories:', result.length); // Cleaner version from File 1
    console.log(
      '🔍 DEBUG: Categories with subcategories:',
      result
        .filter(c => c.hasSubcategories)
        .map(c => `${c.name} (${c.subcategories.length} subs)`),
    );

    // Sort main categories alphabetically by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // ==============================================
  // HELPER FUNCTIONS
  // ==============================================

  const getCategoryById = useCallback(
    id => categories.find(cat => cat.id === id),
    [categories],
  );

  const getRecurrenceById = useCallback(
    id => recurrenceOptions.find(opt => opt.id === id),
    [], // No dependencies needed since recurrenceOptions is static
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
  // BACKEND INTEGRATION METHODS (Following CategoryContainer pattern)
  // ==============================================

  const loadCategories = useCallback(async () => {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        console.log('AddTransactionContainer: User not authenticated');
        if (navigation) {
          navigation.navigate('Auth');
        }
        return;
      }

      setIsLoading(true);
      setErrorState(null);

      const response = await TrendAPIService.getCategories();
      const backendCategories = response?.categories || []; // Extract categories array from response
      const transformedCategories = transformCategoriesForUI(backendCategories);
      setCategories(transformedCategories);
    } catch (apiError) {
      console.error(
        'AddTransactionContainer: Error loading categories:',
        apiError,
      );
      setErrorState(apiError.message);

      Alert.alert(
        'Connection Issue',
        'Unable to load categories. Please check your connection and try again.',
        [
          {text: 'Retry', onPress: () => loadCategories()},
          {text: 'Cancel', style: 'cancel'},
        ],
      );

      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigation, transformCategoriesForUI]);

  // ==============================================
  // FORM MANAGEMENT
  // ==============================================

  const resetForm = useCallback(() => {
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedDate(new Date());
    setSelectedRecurrence('none');
    setSelectedTransactionType('EXPENSE'); // ✅ UPDATED: Reset transaction type
    setCurrentSubcategoryData(null);
  }, []);

  const populateFormForEdit = useCallback(() => {
    if (editingTransaction && visible) {
      console.log('🔍 DEBUG populateFormForEdit:');
      console.log('🔍 editingTransaction:', editingTransaction);
      console.log('🔍 categoryId:', editingTransaction.categoryId);
      console.log('🔍 subcategoryId:', editingTransaction.subcategoryId);

      // Pre-populate all fields with existing transaction data
      setAmount(editingTransaction.amount.toString());
      setDescription(editingTransaction.description || '');
      setSelectedCategory(editingTransaction.categoryId);
      setSelectedSubcategory(editingTransaction.subcategoryId || null);
      setSelectedDate(new Date(editingTransaction.date));
      setSelectedRecurrence(editingTransaction.recurrence || 'none');
      setSelectedTransactionType(editingTransaction.type || 'EXPENSE');

      // ✅ FIXED: Set currentSubcategoryData for edit mode
      if (editingTransaction.categoryId) {
        const category = getCategoryById(editingTransaction.categoryId);
        if (category && category.hasSubcategories) {
          setCurrentSubcategoryData(category);
          console.log(
            '🔍 DEBUG: Set currentSubcategoryData for edit mode:',
            category,
          );
        }
      }

      // Debug what getCategoryDisplayName returns
      setTimeout(() => {
        const displayName = getCategoryDisplayName(
          editingTransaction.categoryId,
          editingTransaction.subcategoryId,
        );
        console.log('🔍 getCategoryDisplayName result:', displayName);
        console.log('🔍 categories at this time:', categories);
      }, 100);
    } else if (!editingTransaction && visible) {
      // Reset form for new transaction
      resetForm();
    }
  }, [
    editingTransaction,
    visible,
    resetForm,
    getCategoryDisplayName,
    categories,
    getCategoryById, // ✅ ADDED: Add missing dependency
  ]);

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

    console.log('🔍 DEBUG handleSave:');
    console.log('🔍 DEBUG selectedCategory:', selectedCategory);
    console.log('🔍 DEBUG selectedSubcategory:', selectedSubcategory);
    console.log('🔍 DEBUG selectedTransactionType:', selectedTransactionType);

    const transaction = {
      // ✅ FIXED: Only include ID if we're editing an existing transaction
      ...(isEditMode && editingTransaction.id && {id: editingTransaction.id}),
      amount: parseFloat(amount),
      description: finalDescription,
      categoryId: selectedCategory,
      subcategory: selectedSubcategory, // ✅ Frontend uses subcategory, backend expects subcategoryId
      date: selectedDate,
      recurrence: selectedRecurrence,
      type: selectedTransactionType,
      createdAt: isEditMode ? editingTransaction.createdAt : new Date(),
      updatedAt: isEditMode ? new Date() : undefined,
    };

    console.log('🔍 DEBUG Final transaction object:', transaction);

    onSave(transaction);
    resetForm();
    onClose();
  }, [
    amount,
    selectedCategory,
    description,
    getCategoryDisplayName,
    selectedSubcategory,
    selectedDate,
    selectedRecurrence,
    selectedTransactionType,
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

      console.log('🔍 DEBUG: Selected category:', category);
      console.log('🔍 DEBUG: Has subcategories?', category?.hasSubcategories);
      console.log('🔍 DEBUG: Subcategories array:', category?.subcategories);
      console.log(
        '🔍 DEBUG: Subcategories length:',
        category?.subcategories?.length,
      );

      if (
        category &&
        category.hasSubcategories &&
        category.subcategories?.length > 0
      ) {
        // Set subcategory data for UI to use
        setCurrentSubcategoryData(category);
        console.log('🔍 DEBUG: Set currentSubcategoryData to:', category);
        // Don't select the category yet - wait for subcategory selection
      } else {
        // Select category directly
        setSelectedCategory(categoryId);
        setSelectedSubcategory(null);
        // Don't reload categories - not needed here
      }
    },
    [getCategoryById],
  );

  const handleSubcategorySelect = useCallback(
    subcategoryId => {
      console.log('🔍 DEBUG handleSubcategorySelect:', subcategoryId);
      console.log('🔍 DEBUG currentSubcategoryData:', currentSubcategoryData);

      // ✅ FIXED: Handle both edit mode and new transaction mode
      if (currentSubcategoryData) {
        // New transaction or category change - use currentSubcategoryData
        setSelectedCategory(currentSubcategoryData.id);
        setSelectedSubcategory(subcategoryId);
      } else {
        // Edit mode - keep existing category, just update subcategory
        setSelectedSubcategory(subcategoryId);
        console.log(
          '🔍 DEBUG: Edit mode - keeping existing category, setting subcategory to:',
          subcategoryId,
        );
      }
    },
    [currentSubcategoryData],
  );

  const handleRecurrenceSelect = useCallback(recurrenceId => {
    setSelectedRecurrence(recurrenceId);
  }, []);

  const handleAmountChange = useCallback(text => {
    setAmount(text);
  }, []);

  const handleDescriptionChange = useCallback(text => {
    setDescription(text);
  }, []);

  const handleDateChange = useCallback(date => {
    setSelectedDate(date);
    setShowCalendar(false);
  }, []);

  const handleShowCalendar = useCallback(() => {
    setShowCalendar(true);
  }, []);

  const handleHideCalendar = useCallback(() => {
    setShowCalendar(false);
  }, []);

  // ✅ NEW: Transaction type change handler
  const handleTransactionTypeChange = useCallback(type => {
    setSelectedTransactionType(type);
  }, []);

  // ==============================================
  // ✅ FIXED: AUTO-DESCRIPTION LOGIC
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
      // ✅ FIXED: Get the original category display name properly
      const originalCategoryDisplayName = getCategoryDisplayName(
        editingTransaction.categoryId,
        editingTransaction.subcategoryId, // ✅ FIXED: Use subcategoryId
      );

      // ✅ FIXED: Check multiple conditions for when to auto-update description
      const shouldAutoUpdate =
        !description.trim() || // Empty description
        description.trim() === originalCategoryDisplayName || // Matches original category
        description.trim() === editingTransaction.description || // Matches original description
        // Also check if current description matches any category name (user might have changed category before)
        categories.some(
          cat =>
            cat.name === description.trim() ||
            (cat.subcategories &&
              cat.subcategories.some(sub => sub.name === description.trim())),
        );

      if (shouldAutoUpdate) {
        console.log(
          `🔍 Auto-updating description from "${description}" to "${newCategoryDisplayName}"`,
        );
        setDescription(newCategoryDisplayName);
      } else {
        console.log(`🔍 Keeping custom description: "${description}"`);
      }
    } else {
      // For new transactions, always auto-update if description is empty
      if (!description.trim()) {
        console.log(
          `🔍 Setting description for new transaction: "${newCategoryDisplayName}"`,
        );
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
      selectedRecurrence={selectedRecurrence}
      selectedTransactionType={selectedTransactionType} // ✅ NEW: Pass transaction type
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
      onShowCalendar={handleShowCalendar}
      onHideCalendar={handleHideCalendar}
      onTransactionTypeChange={handleTransactionTypeChange} // ✅ NEW: Pass transaction type handler
      // Helper functions
      getCategoryById={getCategoryById}
      getRecurrenceById={getRecurrenceById}
      getCategoryDisplayName={getCategoryDisplayName}
      recurrenceOptions={recurrenceOptions}
    />
  );
};

export default AddTransactionContainer;
