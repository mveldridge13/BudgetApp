/* eslint-disable react-native/no-inline-styles */
/* eslint-disable no-unused-vars */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';
import AddCategoryModal from './AddCategoryModal';
import SubcategoryModal from './SubcategoryModal';

const {width: screenWidth} = Dimensions.get('window');

const CategoryPicker = ({
  // ==============================================
  // DATA PROPS (from CategoryContainer)
  // ==============================================
  categories = [],
  isLoading = false,
  error = null,
  visible = false,
  selectedCategory = null,
  selectedSubcategory = null,

  // Subcategory navigation props
  currentView = 'categories', // 'categories' or 'subcategories'
  currentSubcategoryData = null,

  // ==============================================
  // EVENT HANDLER PROPS (from CategoryContainer)
  // ==============================================
  onCategorySelect = () => {},
  onSubcategorySelect = () => {},
  onNavigateToSubcategories = () => {},
  onBackToCategories = () => {},
  onAddCategory = () => {},
  onAddSubcategory = () => {},
  onCategoryAdded = () => {},
  onSubcategoryAdded = () => {},
  onClose = () => {},
  onRetry = () => {},
  navigation,
}) => {
  // ==============================================
  // UI-ONLY STATE (No Business Logic)
  // ==============================================

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [slideAnim] = useState(
    new Animated.Value(Dimensions.get('window').width),
  );

  // ==============================================
  // ANIMATION HANDLING (UI Logic Only)
  // ==============================================

  useEffect(() => {
    if (visible) {
      // Slide in from right when opening
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset position when closed
      slideAnim.setValue(Dimensions.get('window').width);
    }
  }, [visible, slideAnim]);

  // Animate between category and subcategory views
  useEffect(() => {
    if (visible) {
      const targetValue = currentView === 'subcategories' ? -screenWidth : 0;
      Animated.timing(slideAnim, {
        toValue: targetValue,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [currentView, visible, slideAnim]);

  // ==============================================
  // UI EVENT HANDLERS
  // ==============================================

  const handleCategoryPress = categoryId => {
    const category = categories.find(cat => cat.id === categoryId);

    if (
      category &&
      category.hasSubcategories &&
      category.subcategories?.length > 0
    ) {
      // Navigate to subcategories (delegate to container)
      onNavigateToSubcategories(category);
    } else {
      // Select category directly with slide-out animation
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onCategorySelect(categoryId);
      });
    }
  };

  const handleSubcategoryPress = subcategoryId => {
    // Select subcategory with slide-out animation
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onSubcategorySelect(subcategoryId);
    });
  };

  const handleClose = () => {
    // Slide right like hitting back button (iOS style)
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleBackToCategories = () => {
    // Delegate navigation back to container
    onBackToCategories();
  };

  const handleAddCategoryPress = () => {
    setShowAddCategory(true);
  };

  const handleAddSubcategoryPress = () => {
    setShowAddSubcategory(true);
  };

  const handleCategoryCreated = async categoryData => {
    const newCategory = await onAddCategory(categoryData);
    if (newCategory) {
      setShowAddCategory(false);
      onCategoryAdded(newCategory);

      // Auto-select the newly created category
      setTimeout(() => {
        handleCategoryPress(newCategory.id);
      }, 100);
    }
  };

  const handleSubcategoryCreated = async subcategoryData => {
    if (!currentSubcategoryData) {
      return;
    }

    const newSubcategory = await onAddSubcategory(
      currentSubcategoryData.id,
      subcategoryData,
    );
    if (newSubcategory) {
      setShowAddSubcategory(false);
      onSubcategoryAdded(newSubcategory);

      // Auto-select the newly created subcategory
      setTimeout(() => {
        handleSubcategoryPress(newSubcategory.id);
      }, 100);
    }
  };

  // ==============================================
  // HELPER FUNCTIONS (UI Only)
  // ==============================================

  const getCategoryIconStyle = color => {
    return {
      ...styles.categoryIconContainer,
      backgroundColor: `${color}26`,
    };
  };

  const renderCategoryOption = category => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryOption,
        selectedCategory === category.id &&
          !category.hasSubcategories &&
          styles.selectedOption,
      ]}
      onPress={() => handleCategoryPress(category.id)}
      activeOpacity={0.7}>
      <View style={styles.categoryLeft}>
        <View style={getCategoryIconStyle(category.color)}>
          <Icon name={category.icon} size={20} color={category.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.name}</Text>
          {category.isCustom && <Text style={styles.customLabel}>Custom</Text>}
        </View>
      </View>

      <View style={styles.categoryRight}>
        {selectedCategory === category.id && !category.hasSubcategories && (
          <Icon name="checkmark" size={20} color={colors.primary} />
        )}
        {category.hasSubcategories && (
          <View style={styles.subcategoryIndicator}>
            <Text style={styles.subcategoryCount}>
              {category.subcategories?.length || 0}
            </Text>
            <Icon
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSubcategoryOption = subcategory => (
    <TouchableOpacity
      key={subcategory.id}
      style={[
        styles.categoryOption,
        selectedSubcategory === subcategory.id && styles.selectedOption,
      ]}
      onPress={() => handleSubcategoryPress(subcategory.id)}
      activeOpacity={0.7}>
      <View style={styles.categoryLeft}>
        <View style={getCategoryIconStyle(subcategory.color)}>
          <Icon name={subcategory.icon} size={20} color={subcategory.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{subcategory.name}</Text>
          {subcategory.isCustom && (
            <Text style={styles.customLabel}>Custom</Text>
          )}
        </View>
      </View>

      {selectedSubcategory === subcategory.id && (
        <Icon name="checkmark" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  // ==============================================
  // RENDER UI (Pure UI Component)
  // ==============================================

  if (!visible) {
    return null;
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.pickerContainer,
              {
                transform: [{translateX: slideAnim}],
              },
            ]}>
            {/* Container for category and subcategory views */}
            <View style={styles.viewContainer}>
              {/* Main Categories View */}
              <View style={[styles.view, {left: 0}]}>
                {/* Header with Back Button - IDENTICAL */}
                <View style={styles.pickerHeader}>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.backButton}>
                    <Icon
                      name="chevron-back"
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Select Category</Text>
                  <View style={styles.placeholder} />
                </View>

                {/* Category List - Real Backend Data */}
                <ScrollView
                  style={styles.pickerContent}
                  showsVerticalScrollIndicator={false}>
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>
                        Loading categories...
                      </Text>
                    </View>
                  ) : error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>
                        Failed to load categories
                      </Text>
                      <TouchableOpacity
                        onPress={onRetry}
                        style={styles.retryButton}>
                        <Text style={styles.retryText}>Try Again</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {categories.map(category =>
                        renderCategoryOption(category),
                      )}
                    </>
                  )}

                  {/* Add Category Button */}
                  <TouchableOpacity
                    style={styles.addCategoryButton}
                    onPress={handleAddCategoryPress}
                    activeOpacity={0.7}>
                    <Icon name="add" size={20} color={colors.primary} />
                    <Text style={styles.addCategoryText}>Add Category</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Subcategories View */}
              <View style={[styles.view, {left: screenWidth}]}>
                {/* Subcategory Header */}
                <View style={styles.pickerHeader}>
                  <TouchableOpacity
                    onPress={handleBackToCategories}
                    style={styles.backButton}>
                    <Icon
                      name="chevron-back"
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle} numberOfLines={1}>
                    {currentSubcategoryData?.name || 'Subcategories'}
                  </Text>
                  <View style={styles.placeholder} />
                </View>

                {/* Subcategory List */}
                <ScrollView
                  style={styles.pickerContent}
                  showsVerticalScrollIndicator={false}>
                  {currentSubcategoryData?.subcategories?.map(subcategory =>
                    renderSubcategoryOption(subcategory),
                  )}

                  {/* Add Subcategory Button */}
                  <TouchableOpacity
                    style={styles.addCategoryButton}
                    onPress={handleAddSubcategoryPress}
                    activeOpacity={0.7}>
                    <Icon name="add" size={20} color={colors.primary} />
                    <Text style={styles.addCategoryText}>Add Subcategory</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSave={handleCategoryCreated}
      />

      {/* Add Subcategory Modal */}
      <SubcategoryModal
        visible={showAddSubcategory}
        onClose={() => setShowAddSubcategory(false)}
        onSave={handleSubcategoryCreated}
        parentCategory={currentSubcategoryData}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  viewContainer: {
    flexDirection: 'row',
    flex: 1,
    position: 'relative',
  },
  view: {
    position: 'absolute',
    top: 0,
    width: screenWidth,
    height: '100%',
    backgroundColor: colors.background,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 4,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 32,
  },
  pickerContent: {
    flex: 1,
    paddingHorizontal: 20,
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
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: colors.overlayLight,
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
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subcategoryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subcategoryCount: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginRight: 4,
    backgroundColor: colors.overlayLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 12,
    backgroundColor: colors.overlayLight,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  addCategoryText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.primary,
    marginLeft: 8,
  },
});

export default CategoryPicker;
