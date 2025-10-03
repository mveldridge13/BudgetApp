import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';
import SubcategoryCreationModal from './SubcategoryCreationModal';

const {width: screenWidth} = Dimensions.get('window');

const SubcategorySelectionOverlay = ({
  visible,
  onClose,
  onBack,
  onSubcategorySelect,
  selectedCategory,
  selectedSubcategory,
  getCategoryById,
  isLoading,
  onAddSubcategory,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset animation values before starting
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      keyboardAnim.setValue(0);

      setTimeout(() => {
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
      }, 100);
    }
  }, [visible, slideAnim, fadeAnim, keyboardAnim]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        const keyboardHeight = event.endCoordinates.height;
        Animated.timing(keyboardAnim, {
          toValue: -keyboardHeight + 50,
          duration: Platform.OS === 'ios' ? event.duration : 300,
          useNativeDriver: true,
        }).start();
      },
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      event => {
        Animated.timing(keyboardAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? event.duration : 300,
          useNativeDriver: true,
        }).start();
      },
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardAnim]);

  if (!visible) {
    return null;
  }

  const categoryData = getCategoryById(selectedCategory);
  const rawSubcategories = categoryData?.subcategories || [];

  // Debug logging
  console.log('🔍 SubcategorySelectionOverlay Debug:', {
    selectedCategory,
    categoryData: categoryData ? {
      id: categoryData.id,
      name: categoryData.name,
      subcategoriesCount: categoryData.subcategories?.length || 0,
    } : null,
    rawSubcategories: rawSubcategories.map(sub => ({
      id: sub.id,
      name: sub.name,
      parentId: sub.parentId,
    })),
  });

  // Deduplicate subcategories by name (keep the first occurrence)
  const subcategories = rawSubcategories.filter((subcategory, index, array) =>
    array.findIndex(s => s.name.toLowerCase() === subcategory.name.toLowerCase()) === index
  );

  console.log('🔍 SubcategorySelectionOverlay After deduplication:', {
    originalCount: rawSubcategories.length,
    deduplicatedCount: subcategories.length,
    subcategories: subcategories.map(sub => ({
      id: sub.id,
      name: sub.name,
    })),
  });


  // Get fresh category data for the modal (used after refresh)
  const getFreshCategoryData = () => getCategoryById(selectedCategory);

  const handleSubcategoryPress = (subcategoryId) => {
    onSubcategorySelect(subcategoryId);
    // Don't call onClose() - let the container handle overlay transitions
  };

  const handleAddSubcategoryPress = async () => {
    if (onAddSubcategory) {
      // Open modal immediately for smooth UX - validation will work with current data
      // Only refresh if validation fails due to stale data
      setShowCreateModal(true);
    } else {
      // Fallback for components that don't support subcategory creation yet
      Alert.alert(
        'Feature Not Available',
        'Subcategory creation is not available in this context.',
        [{text: 'OK'}],
      );
    }
  };

  const handleSubcategoryCreated = async (parentCategoryId, subcategoryData) => {
    if (onAddSubcategory) {
      const result = await onAddSubcategory(parentCategoryId, subcategoryData);
      if (result) {
        // Auto-select the newly created subcategory
        setTimeout(() => {
          onSubcategorySelect(result.id);
        }, 300);
      }
      return result;
    }
    return null;
  };

  const getCategoryIconStyle = (color) => {
    return {
      ...styles.categoryIcon,
      backgroundColor: `${color}26`,
    };
  };

  const renderSubcategoryGrid = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading subcategories...</Text>
        </View>
      );
    }

    if (!subcategories || subcategories.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No subcategories available</Text>
        </View>
      );
    }

    return (
      <View style={styles.categoryGrid}>
        {subcategories.map((subcategory) => (
          <TouchableOpacity
            key={subcategory.id}
            style={[
              styles.categoryItem,
              selectedSubcategory === subcategory.id && styles.selectedCategoryItem,
            ]}
            onPress={() => handleSubcategoryPress(subcategory.id)}
            activeOpacity={0.7}>
            <View style={getCategoryIconStyle(categoryData.color)}>
              <Icon
                name={subcategory.icon || 'albums-outline'}
                size={24}
                color={categoryData.color || colors.textSecondary}
              />
            </View>
            <Text style={styles.categoryName} numberOfLines={2}>
              {subcategory.name || 'Unknown Subcategory'}
            </Text>
            {selectedSubcategory === subcategory.id && (
              <View style={styles.selectedIndicator}>
                <Icon name="checkmark" size={16} color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <>
      <Animated.View style={[styles.overlayContainer, {opacity: fadeAnim}]}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.overlayContent,
            {
              transform: [{translateY: slideAnim}, {translateY: keyboardAnim}],
            },
          ]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack || onClose}
              activeOpacity={0.7}>
              <Icon name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {categoryData?.name || 'Select Subcategory'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Subcategory Grid */}
          <View style={styles.scrollContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
              {renderSubcategoryGrid()}

              {/* Add Subcategory Button */}
              <TouchableOpacity
                style={styles.addSubcategoryButton}
                onPress={handleAddSubcategoryPress}
                activeOpacity={0.7}>
                <Icon name="add" size={20} color={colors.primary} />
                <Text style={styles.addSubcategoryText}>Add Subcategory</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Subcategory Creation Modal - Outside overlay for proper positioning */}
      <SubcategoryCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSubcategoryCreated}
        parentCategory={getFreshCategoryData()}
        isLoading={false}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  overlayContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 24,
    paddingBottom: 20,
    width: screenWidth,
    height: '70%', // Increased to accommodate more subcategories
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayLight,
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    position: 'relative',
  },
  selectedCategoryItem: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  addSubcategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.overlayLight,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  addSubcategoryText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.primary,
    marginLeft: 8,
  },
});

export default SubcategorySelectionOverlay;
