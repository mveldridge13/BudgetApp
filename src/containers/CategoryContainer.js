import React, {useState, useCallback, useEffect} from 'react';
import {Alert} from 'react-native';
import TrendAPIService from '../services/TrendAPIService';
import CategoryCache from '../services/CategoryCache';
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

  const flattenNestedCategories = useCallback(backendCategories => {
    if (!Array.isArray(backendCategories)) {
      return [];
    }

    let flattenedCategories = [];

    backendCategories.forEach(cat => {
      // Add the main category (without nested subcategories to avoid duplication)
      const mainCategory = {
        ...cat,
        subcategories: undefined, // Remove nested subcategories from the main category
      };
      flattenedCategories.push(mainCategory);

      // Check if this category has nested subcategories
      if (cat.subcategories && Array.isArray(cat.subcategories)) {
        // Flatten nested subcategories and add parentId
        cat.subcategories.forEach(subcat => {
          const flatSubcat = {
            ...subcat,
            parentId: cat.id, // Ensure parentId is set correctly
          };
          flattenedCategories.push(flatSubcat);
        });
      }
    });

    // Deduplicate by ID to avoid duplicate keys in React
    const uniqueCategories = flattenedCategories.filter((category, index, array) =>
      array.findIndex(c => c.id === category.id) === index
    );

    return uniqueCategories;
  }, []);

  const transformCategoriesForUI = useCallback(backendCategories => {

    // First flatten any nested subcategories
    const flattenedCategories = flattenNestedCategories(backendCategories);

    // Separate main categories and subcategories from flattened data
    const mainCategories = flattenedCategories.filter(cat => !cat.parentId);

    const subcategories = flattenedCategories.filter(cat => cat.parentId);

    const subcategoriesMap = subcategories.reduce((map, subcat) => {
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
    const result = mainCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon || 'albums-outline',
      color: category.color || '#4ECDC4',
      isCustom: !category.isSystem,
      parentId: category.parentId, // This should be null for main categories
      hasSubcategories:
        subcategoriesMap[String(category.id)] &&
        subcategoriesMap[String(category.id)].length > 0,
      subcategories: subcategoriesMap[String(category.id)] || [],
    }));

    // Sort main categories alphabetically by name
    const sortedResult = result.sort((a, b) => a.name.localeCompare(b.name));



    return sortedResult;
  }, [flattenNestedCategories]);

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

      // Get current user ID for cache operations
      const currentUserId = TrendAPIService.getCurrentUserId();

      // 🔄 CACHE-FIRST: Load from cache immediately
      const cached = currentUserId ? await CategoryCache.get(currentUserId) : null;
      if (cached && cached.data) {
        const transformedCategories = transformCategoriesForUI(cached.data);
        setCategories(transformedCategories);
        setIsLoading(false);

        // If cache is fresh, we're done
        if (!cached.isStale) {
          return;
        }
      }

      // 🌐 BACKGROUND SYNC: Fetch from API (always for fresh data, or if no cache)
      try {
        const response = await TrendAPIService.getCategories();
        // DEBUG: Log raw API response to check subcategory presence
        console.log('DEBUG API Response:', JSON.stringify(response, null, 2));
        const backendCategories = response?.categories || [];

        if (backendCategories && Array.isArray(backendCategories)) {
          // Flatten nested categories before storing in cache
          const flattenedCategories = flattenNestedCategories(backendCategories);
          if (currentUserId) {
            CategoryCache.set(flattenedCategories, currentUserId);
          }

          // Update state
          const transformedCategories = transformCategoriesForUI(backendCategories);
          setCategories(transformedCategories);
        } else {
          // If API fails but we have cached data, keep using cached data
          if (!cached) {
            setCategories([]);
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
          setCategories([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigation, transformCategoriesForUI, flattenNestedCategories]);

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
        Alert.alert('Error', 'Failed to create category. Please try again.');
        return null;
      }
    },
    [navigation, transformCategoriesForUI],
  );

  // ==============================================
  // SUBCATEGORY MANAGEMENT - ENABLED FOR VIEWING/SELECTING/CREATING
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
        type: 'EXPENSE', // Default to EXPENSE for category screen
      };

      // Create optimistic subcategory for immediate UI update
      const optimisticSubcategory = {
        id: `temp_${Date.now()}`,
        name: subcategoryPayload.name,
        icon: subcategoryPayload.icon || 'albums-outline',
        color: subcategoryPayload.color,
        isCustom: true,
        parentId: subcategoryPayload.parentId,
      };

      // Get current user ID
      const currentUserId = TrendAPIService.getCurrentUserId();

      try {

        // Update cache optimistically
        if (currentUserId) {
          await CategoryCache.upsertCategory(optimisticSubcategory, currentUserId);
        }

        // Update UI state immediately (cache-first)

        setCategories(prevCategories => {
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
        });

        // Update current subcategory data if we're viewing it
        if (currentSubcategoryData?.id === parentCategoryId) {
          setCurrentSubcategoryData(prev => ({
            ...prev,
            hasSubcategories: true,
            subcategories: [...(prev.subcategories || []), optimisticSubcategory],
          }));
        }

        // Background sync: Send to API and update with real data
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
        };

        // Update cache with real data
        if (currentUserId) {
          await CategoryCache.upsertCategory(realSubcategory, currentUserId);
          // Invalidate cache to force fresh reload in other components
          await CategoryCache.invalidate(currentUserId);
        }

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

        return realSubcategory;
      } catch (creationError) {
        // Rollback optimistic update on failure
        if (currentUserId) {
          await CategoryCache.removeCategory(optimisticSubcategory.id, currentUserId);
        }

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

        Alert.alert('Error', 'Failed to create subcategory. Please try again.');
        return null;
      }
    },
    [navigation, currentSubcategoryData],
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
      onAddSubcategory={handleAddSubcategory}
      onCategoryAdded={() => {}}
      onSubcategoryAdded={() => {}}
      onClose={handleClose}
      onRetry={loadCategories}
      navigation={navigation}
    />
  );
};

export default CategoryContainer;
