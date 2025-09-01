import React, {useState, useCallback, useEffect} from 'react';
import {Alert} from 'react-native';
import TrendAPIService from '../services/TrendAPIService';
import CategoryPicker from '../components/CategoryPicker';

const CategoryContainer = ({navigation, route}) => {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  // Subcategory navigation state
  const [currentSubcategoryData, setCurrentSubcategoryData] = useState(null);
  const [viewStack, setViewStack] = useState(['categories']);

  // Props from navigation
  const visible = route?.params?.visible || true;
  const selectedCategory = route?.params?.selectedCategory || null;
  const selectedSubcategory = route?.params?.selectedSubcategory || null;
  const onCategorySelectProp = route?.params?.onCategorySelect;
  const onCloseProp = route?.params?.onClose;

  // ==============================================
  // HELPER FUNCTIONS
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
      parentId: category.parentId, // This should be null for main categories
      hasSubcategories:
        subcategoriesMap[category.id] &&
        subcategoriesMap[category.id].length > 0,
      subcategories: subcategoriesMap[category.id] || [],
    }));

    // Sort main categories alphabetically by name
    const sortedResult = result.sort((a, b) => a.name.localeCompare(b.name));

    return sortedResult;
  }, []);

  const getCategoryById = useCallback(
    id => {
      const category = categories.find(cat => cat.id === id);
      return category;
    },
    [categories],
  );

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

  const loadCategories = useCallback(async () => {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        navigation.navigate('Auth');
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
        '📂 CategoryContainer: Error loading categories:',
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

  const handleAddCategory = useCallback(
    async newCategoryData => {
      try {
        if (!TrendAPIService.isAuthenticated()) {
          navigation.navigate('Auth');
          return null;
        }

        const createdCategory = await TrendAPIService.createCategory(
          newCategoryData,
        );

        const transformedCategory = transformCategoriesForUI([
          createdCategory,
        ])[0];

        setCategories(prevCategories => {
          const newCategories = [...prevCategories, transformedCategory];
          return newCategories;
        });

        return transformedCategory;
      } catch (creationError) {
        console.error(
          '➕ CategoryContainer: Error creating category:',
          creationError,
        );

        Alert.alert('Error', 'Failed to create category. Please try again.');
        return null;
      }
    },
    [navigation, transformCategoriesForUI],
  );

  // ==============================================
  // SUBCATEGORY SELECTION - ENABLED FOR VIEWING/SELECTING EXISTING
  // Creation functionality remains commented out
  // ==============================================

  const handleAddSubcategory = useCallback(
    async (parentCategoryId, subcategoryData) => {
      return {
        success: false,
        error: 'Subcategory creation not yet implemented',
      };
    },
    [],
  );

  // ==============================================
  // EVENT HANDLERS
  // ==============================================

  const handleClose = useCallback(() => {
    setCurrentSubcategoryData(null);
    setViewStack(['categories']);

    if (onCloseProp) {
      onCloseProp();
    } else {
      navigation.goBack();
    }
  }, [navigation, onCloseProp]);

  const handleCategorySelect = useCallback(
    categoryId => {
      const category = getCategoryById(categoryId);

      if (
        category &&
        category.hasSubcategories &&
        category.subcategories?.length > 0
      ) {
        setCurrentSubcategoryData(category);
        setViewStack(['categories', 'subcategories']);
      } else {
        if (onCategorySelectProp) {
          onCategorySelectProp(categoryId, null);
        }
        handleClose();
      }
    },
    [getCategoryById, onCategorySelectProp, handleClose],
  );

  const handleSubcategorySelect = useCallback(
    subcategoryId => {
      if (currentSubcategoryData && onCategorySelectProp) {
        onCategorySelectProp(currentSubcategoryData.id, subcategoryId);
      }
      handleClose();
    },
    [currentSubcategoryData, onCategorySelectProp, handleClose],
  );

  const handleNavigateToSubcategories = useCallback(category => {
    setCurrentSubcategoryData(category);
    setViewStack(['categories', 'subcategories']);
  }, []);

  const handleBackToCategories = useCallback(() => {
    setCurrentSubcategoryData(null);
    setViewStack(['categories']);
  }, []);

  // ==============================================
  // LIFECYCLE
  // ==============================================

  useEffect(() => {
    if (visible) {
      loadCategories();
    } else {
    }
  }, [visible, loadCategories]);

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <CategoryPicker
      categories={categories}
      isLoading={isLoading}
      error={errorState}
      visible={visible}
      selectedCategory={selectedCategory}
      selectedSubcategory={selectedSubcategory}
      currentView={viewStack[viewStack.length - 1]}
      currentSubcategoryData={currentSubcategoryData}
      onCategorySelect={handleCategorySelect}
      onSubcategorySelect={handleSubcategorySelect}
      onNavigateToSubcategories={handleNavigateToSubcategories}
      onBackToCategories={handleBackToCategories}
      onAddCategory={handleAddCategory}
      // ENABLED - Subcategory selection (for existing subcategories)
      onAddSubcategory={handleAddSubcategory}
      onCategoryAdded={newCategory => {}}
      // ENABLED - Subcategory selection callbacks
      onSubcategoryAdded={newSubcategory => {}}
      onClose={handleClose}
      onRetry={loadCategories}
      navigation={navigation}
    />
  );
};

export default CategoryContainer;
