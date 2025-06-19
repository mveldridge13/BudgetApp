// CategoryContainer.js
import React, {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import TrendAPIService from '../services/TrendAPIService';
import CategoryScreen from '../screens/CategoryScreen';

const CategoryContainer = ({navigation, route}) => {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  // Props from navigation (CategoryPicker usage)
  const visible = route?.params?.visible || true;
  const selectedCategory = route?.params?.selectedCategory || null;
  const onCategorySelectProp = route?.params?.onCategorySelect;
  const onCloseProp = route?.params?.onClose;

  // ==============================================
  // DATA TRANSFORMATION METHODS
  // ==============================================

  const transformCategoriesForUI = backendCategories => {
    return backendCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon || 'wallet-outline', // Default icon
      color: category.color || '#6B73FF', // Default color
      isCustom: category.isCustom || false,
      type: category.type || 'expense',
      // Add any other properties CategoryScreen expects
      userId: category.userId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  };

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

  const loadCategories = useCallback(async () => {
    try {
      // Check authentication first
      if (!TrendAPIService.isAuthenticated()) {
        console.log(
          'CategoryContainer: User not authenticated, redirecting to auth',
        );
        navigation.navigate('Auth');
        return;
      }

      setIsLoading(true);
      setErrorState(null);

      // Load categories from backend
      console.log('CategoryContainer: Loading categories from backend...');
      const backendCategories = await TrendAPIService.getCategories();

      console.log(
        'CategoryContainer: Categories loaded:',
        backendCategories?.length || 0,
      );

      // Transform backend data for UI consumption
      const transformedCategories = transformCategoriesForUI(
        backendCategories || [],
      );
      setCategories(transformedCategories);
    } catch (apiError) {
      console.error('CategoryContainer: Error loading categories:', apiError);
      setErrorState(apiError.message);

      // Graceful fallback with user feedback
      Alert.alert(
        'Connection Issue',
        'Unable to load categories. Please check your connection and try again.',
        [
          {text: 'Retry', onPress: () => loadCategories()},
          {text: 'Cancel', style: 'cancel'},
        ],
      );

      // Fallback to empty state
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  // ==============================================
  // ERROR RECOVERY METHODS
  // ==============================================

  const handleRetry = useCallback(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRefresh = useCallback(async () => {
    await loadCategories();
  }, [loadCategories]);

  // ==============================================
  // CATEGORY MANAGEMENT METHODS
  // ==============================================

  const handleClose = useCallback(() => {
    console.log('CategoryContainer: Closing category picker');

    // Call the provided close callback or navigate back
    if (onCloseProp) {
      onCloseProp();
    } else {
      navigation.goBack();
    }
  }, [onCloseProp, navigation]);

  const handleCategorySelect = useCallback(
    categoryId => {
      console.log('CategoryContainer: Category selected:', categoryId);

      // Call the provided callback
      if (onCategorySelectProp) {
        onCategorySelectProp(categoryId);
      }

      // Close the picker
      handleClose();
    },
    [onCategorySelectProp, handleClose],
  );

  const handleAddCategory = useCallback(
    async newCategoryData => {
      try {
        // Check authentication
        if (!TrendAPIService.isAuthenticated()) {
          navigation.navigate('Auth');
          return null;
        }

        console.log(
          'CategoryContainer: Creating new category:',
          newCategoryData,
        );

        // Create category via backend
        const createdCategory = await TrendAPIService.createCategory(
          newCategoryData,
        );

        console.log(
          'CategoryContainer: Category created successfully:',
          createdCategory,
        );

        // Transform for UI
        const transformedCategory = transformCategoriesForUI([
          createdCategory,
        ])[0];

        // Add to current list
        setCategories(prevCategories => [
          ...prevCategories,
          transformedCategory,
        ]);

        return transformedCategory;
      } catch (creationError) {
        console.error(
          'CategoryContainer: Error creating category:',
          creationError,
        );

        Alert.alert('Error', 'Failed to create category. Please try again.', [
          {text: 'OK'},
        ]);

        return null;
      }
    },
    [navigation],
  );

  const handleCategoryAdded = useCallback(
    newCategory => {
      if (newCategory) {
        // Automatically select the newly created category
        handleCategorySelect(newCategory.id);
      }
    },
    [handleCategorySelect],
  );

  // ==============================================
  // LIFECYCLE MANAGEMENT
  // ==============================================

  useEffect(() => {
    // Initialize TrendAPIService if needed
    const initializeAPI = async () => {
      const initialized = await TrendAPIService.initialize();
      if (initialized) {
        loadCategories();
      } else {
        console.error('CategoryContainer: Failed to initialize API service');
        navigation.navigate('Auth');
      }
    };

    initializeAPI();
  }, [loadCategories, navigation]);

  // ==============================================
  // RENDER CONTAINER WITH CLEAN PROPS
  // ==============================================

  return (
    <CategoryScreen
      // Data props (what the UI needs)
      categories={categories}
      isLoading={isLoading}
      error={errorState}
      visible={visible}
      selectedCategory={selectedCategory}
      // Event handlers (what the UI can trigger)
      onCategorySelect={handleCategorySelect}
      onAddCategory={handleAddCategory}
      onCategoryAdded={handleCategoryAdded}
      onClose={handleClose}
      onRetry={handleRetry}
      onRefresh={handleRefresh}
      // Navigation prop
      navigation={navigation}
    />
  );
};

export default CategoryContainer;
