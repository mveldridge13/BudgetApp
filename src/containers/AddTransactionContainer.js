import React, {useState, useCallback, useEffect} from 'react';
import {Alert} from 'react-native';
import TrendAPIService from '../services/TrendAPIService';
import AddTransactionModal from '../components/AddTransactionModal';

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRecurrence, setSelectedRecurrence] = useState('none');
  const [selectedTransactionType, setSelectedTransactionType] =
    useState('EXPENSE');

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
  // DATA TRANSFORMATION
  // ==============================================

  const transformCategoriesForUI = useCallback(backendCategories => {
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
    const result = mainCategories.map(category => ({
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

      const response = await TrendAPIService.getCategories();
      const backendCategories = response?.categories || [];
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
    setSelectedTransactionType('EXPENSE');
    setCurrentSubcategoryData(null);
  }, []);

  const populateFormForEdit = useCallback(() => {
    if (editingTransaction && visible) {
      // Pre-populate all fields with existing transaction data
      setAmount(editingTransaction.amount.toString());
      setDescription(editingTransaction.description || '');
      setSelectedCategory(editingTransaction.categoryId);
      setSelectedSubcategory(editingTransaction.subcategoryId || null);
      setSelectedDate(new Date(editingTransaction.date));
      setSelectedRecurrence(editingTransaction.recurrence || 'none');
      setSelectedTransactionType(editingTransaction.type || 'EXPENSE');

      // Set currentSubcategoryData for edit mode
      if (editingTransaction.categoryId) {
        const category = getCategoryById(editingTransaction.categoryId);
        if (category && category.hasSubcategories) {
          setCurrentSubcategoryData(category);
        }
      }
    } else if (!editingTransaction && visible) {
      // Reset form for new transaction
      resetForm();
    }
  }, [editingTransaction, visible, resetForm, getCategoryById]);

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
      categoryId: selectedCategory,
      subcategory: selectedSubcategory,
      date: selectedDate,
      recurrence: selectedRecurrence,
      type: selectedTransactionType,
      createdAt: isEditMode ? editingTransaction.createdAt : new Date(),
      updatedAt: isEditMode ? new Date() : undefined,
    };

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

  const handleTransactionTypeChange = useCallback(type => {
    setSelectedTransactionType(type);
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
      // Get the original category display name properly
      const originalCategoryDisplayName = getCategoryDisplayName(
        editingTransaction.categoryId,
        editingTransaction.subcategoryId,
      );

      // Check multiple conditions for when to auto-update description
      const shouldAutoUpdate =
        !description.trim() || // Empty description
        description.trim() === originalCategoryDisplayName || // Matches original category
        description.trim() === editingTransaction.description || // Matches original description
        // Also check if current description matches any category name
        categories.some(
          cat =>
            cat.name === description.trim() ||
            (cat.subcategories &&
              cat.subcategories.some(sub => sub.name === description.trim())),
        );

      if (shouldAutoUpdate) {
        setDescription(newCategoryDisplayName);
      }
    } else {
      // For new transactions, always auto-update if description is empty
      if (!description.trim()) {
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
      selectedTransactionType={selectedTransactionType}
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
      onTransactionTypeChange={handleTransactionTypeChange}
      // Helper functions
      getCategoryById={getCategoryById}
      getRecurrenceById={getRecurrenceById}
      getCategoryDisplayName={getCategoryDisplayName}
      recurrenceOptions={recurrenceOptions}
    />
  );
};

export default AddTransactionContainer;
