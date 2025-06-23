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

  console.log('🏷️ CategoryContainer: Initialized with props:', {
    visible,
    selectedCategory,
    selectedSubcategory,
    hasOnCategorySelect: !!onCategorySelectProp,
    hasOnClose: !!onCloseProp,
  });

  // ==============================================
  // HELPER FUNCTIONS
  // ==============================================

  const transformCategoriesForUI = useCallback(backendCategories => {
    if (!Array.isArray(backendCategories)) {
      console.log(
        '🔍 CategoryContainer: Invalid categories data, returning empty array',
      );
      return [];
    }

    console.log(
      '🔍 CategoryContainer: Transforming categories - Raw backend count:',
      backendCategories.length,
    );
    console.log(
      '🔍 CategoryContainer: Sample category structure:',
      backendCategories[0],
    );

    // Separate main categories and subcategories
    const mainCategories = backendCategories.filter(cat => !cat.parentId);
    const subcategories = backendCategories.filter(cat => cat.parentId);

    console.log('🔍 CategoryContainer: Separation results:', {
      mainCategoriesCount: mainCategories.length,
      subcategoriesCount: subcategories.length,
    });
    console.log(
      '🔍 CategoryContainer: Main categories:',
      mainCategories.map(c => c.name),
    );
    console.log(
      '🔍 CategoryContainer: Subcategories:',
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

    console.log(
      '🔍 CategoryContainer: Subcategories mapping:',
      Object.keys(subcategoriesMap).map(parentId => ({
        parentId,
        subcategoryCount: subcategoriesMap[parentId].length,
      })),
    );

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

    console.log('🔍 CategoryContainer: Final transformation results:', {
      finalCategoriesCount: result.length,
      categoriesWithSubcategories: result.filter(c => c.hasSubcategories)
        .length,
    });
    console.log(
      '🔍 CategoryContainer: Categories with subcategories:',
      result
        .filter(c => c.hasSubcategories)
        .map(c => `${c.name} (${c.subcategories.length} subs)`),
    );

    // Sort main categories alphabetically by name
    const sortedResult = result.sort((a, b) => a.name.localeCompare(b.name));
    console.log(
      '🔍 CategoryContainer: Final sorted categories:',
      sortedResult.map(c => c.name),
    );

    return sortedResult;
  }, []);

  const getCategoryById = useCallback(
    id => {
      const category = categories.find(cat => cat.id === id);
      console.log(
        '🔍 CategoryContainer: Looking up category ID:',
        id,
        'Found:',
        !!category,
      );
      return category;
    },
    [categories],
  );

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

  const loadCategories = useCallback(async () => {
    try {
      console.log('📂 CategoryContainer: Starting category load...');

      if (!TrendAPIService.isAuthenticated()) {
        console.log(
          '📂 CategoryContainer: User not authenticated, redirecting',
        );
        navigation.navigate('Auth');
        return;
      }

      setIsLoading(true);
      setErrorState(null);

      console.log(
        '📂 CategoryContainer: Calling TrendAPIService.getCategories()...',
      );
      const response = await TrendAPIService.getCategories();
      console.log('📂 CategoryContainer: API response received:', {
        hasCategories: !!response?.categories,
        categoriesCount: response?.categories?.length || 0,
      });

      const backendCategories = response?.categories || []; // Extract categories array from response
      console.log(
        '📂 CategoryContainer: Backend categories extracted:',
        backendCategories.length,
      );

      const transformedCategories = transformCategoriesForUI(backendCategories);
      console.log(
        '📂 CategoryContainer: Categories transformed, setting state with:',
        transformedCategories.length,
        'categories',
      );

      setCategories(transformedCategories);
      console.log('📂 CategoryContainer: Categories loaded successfully!');
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
      console.log('📂 CategoryContainer: Category loading finished');
    }
  }, [navigation, transformCategoriesForUI]);

  const handleAddCategory = useCallback(
    async newCategoryData => {
      try {
        console.log(
          '➕ CategoryContainer: Adding new category:',
          newCategoryData,
        );

        if (!TrendAPIService.isAuthenticated()) {
          console.log('➕ CategoryContainer: Not authenticated, redirecting');
          navigation.navigate('Auth');
          return null;
        }

        console.log('➕ CategoryContainer: Calling API to create category...');
        const createdCategory = await TrendAPIService.createCategory(
          newCategoryData,
        );
        console.log(
          '➕ CategoryContainer: Category created successfully:',
          createdCategory,
        );

        const transformedCategory = transformCategoriesForUI([
          createdCategory,
        ])[0];
        console.log(
          '➕ CategoryContainer: Category transformed:',
          transformedCategory,
        );

        setCategories(prevCategories => {
          const newCategories = [...prevCategories, transformedCategory];
          console.log(
            '➕ CategoryContainer: Updated categories count:',
            newCategories.length,
          );
          return newCategories;
        });

        console.log('➕ CategoryContainer: Category addition complete');
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
      console.warn(
        '⚠️ CategoryContainer: Subcategory creation not yet implemented',
      );
      console.log('⚠️ CategoryContainer: Attempted subcategory creation:', {
        parentCategoryId,
        subcategoryData,
      });
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
    console.log('❌ CategoryContainer: Closing category picker');
    setCurrentSubcategoryData(null);
    setViewStack(['categories']);

    if (onCloseProp) {
      console.log('❌ CategoryContainer: Calling onClose prop');
      onCloseProp();
    } else {
      console.log('❌ CategoryContainer: Using navigation.goBack()');
      navigation.goBack();
    }
  }, [navigation, onCloseProp]);

  const handleCategorySelect = useCallback(
    categoryId => {
      console.log('🏷️ CategoryContainer: Category selected:', categoryId);
      const category = getCategoryById(categoryId);

      if (
        category &&
        category.hasSubcategories &&
        category.subcategories?.length > 0
      ) {
        console.log(
          '🏷️ CategoryContainer: Category has subcategories, navigating to subcategory view',
        );
        console.log(
          '🏷️ CategoryContainer: Subcategories count:',
          category.subcategories.length,
        );
        setCurrentSubcategoryData(category);
        setViewStack(['categories', 'subcategories']);
      } else {
        console.log(
          '🏷️ CategoryContainer: Category has no subcategories, selecting directly',
        );
        if (onCategorySelectProp) {
          console.log(
            '🏷️ CategoryContainer: Calling onCategorySelect with:',
            categoryId,
            null,
          );
          onCategorySelectProp(categoryId, null);
        }
        handleClose();
      }
    },
    [getCategoryById, onCategorySelectProp, handleClose],
  );

  const handleSubcategorySelect = useCallback(
    subcategoryId => {
      console.log('🏷️ CategoryContainer: Subcategory selected:', subcategoryId);
      console.log(
        '🏷️ CategoryContainer: Current subcategory data:',
        currentSubcategoryData?.name,
      );

      if (currentSubcategoryData && onCategorySelectProp) {
        console.log(
          '🏷️ CategoryContainer: Calling onCategorySelect with:',
          currentSubcategoryData.id,
          subcategoryId,
        );
        onCategorySelectProp(currentSubcategoryData.id, subcategoryId);
      }
      handleClose();
    },
    [currentSubcategoryData, onCategorySelectProp, handleClose],
  );

  const handleNavigateToSubcategories = useCallback(category => {
    console.log(
      '🏷️ CategoryContainer: Navigating to subcategories for:',
      category.name,
    );
    setCurrentSubcategoryData(category);
    setViewStack(['categories', 'subcategories']);
  }, []);

  const handleBackToCategories = useCallback(() => {
    console.log('🏷️ CategoryContainer: Navigating back to main categories');
    setCurrentSubcategoryData(null);
    setViewStack(['categories']);
  }, []);

  // ==============================================
  // LIFECYCLE
  // ==============================================

  useEffect(() => {
    if (visible) {
      console.log('👁️ CategoryContainer: Became visible, loading categories');
      loadCategories();
    } else {
      console.log('👁️ CategoryContainer: Not visible, skipping category load');
    }
  }, [visible, loadCategories]);

  // ==============================================
  // RENDER
  // ==============================================

  console.log('🎨 CategoryContainer: Rendering with state:', {
    categoriesCount: categories.length,
    isLoading,
    hasError: !!errorState,
    currentView: viewStack[viewStack.length - 1],
    hasCurrentSubcategoryData: !!currentSubcategoryData,
    visible,
  });

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
      onCategoryAdded={newCategory => {
        console.log(
          '✅ CategoryContainer: Category added successfully:',
          newCategory,
        );
      }}
      // ENABLED - Subcategory selection callbacks
      onSubcategoryAdded={newSubcategory => {
        console.log(
          '✅ CategoryContainer: Subcategory added (creation disabled):',
          newSubcategory,
        );
      }}
      onClose={handleClose}
      onRetry={loadCategories}
      navigation={navigation}
    />
  );
};

export default CategoryContainer;
