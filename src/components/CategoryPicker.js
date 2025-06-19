// CategoryPicker.js
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';
import AddCategoryModal from './AddCategoryModal';

const CategoryPicker = ({
  // ==============================================
  // DATA PROPS (from CategoryContainer)
  // ==============================================
  categories = [],
  isLoading = false,
  error = null,
  visible = false,
  selectedCategory = null,

  // ==============================================
  // EVENT HANDLER PROPS (from CategoryContainer)
  // ==============================================
  onCategorySelect = () => {},
  onAddCategory = () => {},
  onCategoryAdded = () => {},
  onClose = () => {},
  onRetry = () => {},
  onRefresh = () => {},
  navigation,
}) => {
  // ==============================================
  // UI-ONLY STATE (No Business Logic)
  // ==============================================

  const [showAddCategory, setShowAddCategory] = useState(false);
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

  // ==============================================
  // UI EVENT HANDLERS (Delegate to Container)
  // ==============================================

  const handleCategorySelect = categoryId => {
    // Slide right like hitting back button (iOS style)
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Delegate to container
      onCategorySelect(categoryId);
    });
  };

  const handleAddCategoryPress = () => {
    setShowAddCategory(true);
  };

  const handleCategoryAdded = newCategory => {
    // Close add category modal
    setShowAddCategory(false);
    // Delegate to container
    onCategoryAdded(newCategory);
  };

  const handleAddCategoryClose = () => {
    setShowAddCategory(false);
  };

  const handleClose = () => {
    // Slide right before closing
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // ==============================================
  // RENDER ADD CATEGORY MODAL (if active)
  // ==============================================

  if (showAddCategory) {
    return (
      <AddCategoryModal
        visible={visible}
        onClose={handleAddCategoryClose}
        onCategoryAdded={handleCategoryAdded}
        onAddCategory={onAddCategory}
      />
    );
  }

  // ==============================================
  // RENDER MAIN CATEGORY PICKER UI (IDENTICAL DESIGN)
  // ==============================================

  return (
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
          {/* Header with Back Button - IDENTICAL */}
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <Icon name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Category</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Category List Content - IDENTICAL */}
          <ScrollView
            style={styles.pickerContent}
            showsVerticalScrollIndicator={false}>
            {/* Loading State - IDENTICAL */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : (
              <>
                {/* Error State */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                      onPress={onRetry}
                      style={styles.retryButton}>
                      <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Category Options - IDENTICAL */}
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      selectedCategory === category.id && styles.selectedOption,
                    ]}
                    onPress={() => handleCategorySelect(category.id)}
                    activeOpacity={0.7}>
                    <View style={styles.categoryLeft}>
                      <View
                        style={[
                          styles.categoryIconContainer,
                          {backgroundColor: `${category.color}26`},
                        ]}>
                        <Icon
                          name={category.icon}
                          size={20}
                          color={category.color}
                        />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        {category.isCustom && (
                          <Text style={styles.customLabel}>Custom</Text>
                        )}
                      </View>
                    </View>

                    {selectedCategory === category.id && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>

          {/* Add Category Button - IDENTICAL */}
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={handleAddCategoryPress}
            activeOpacity={0.7}>
            <Icon name="add" size={20} color={colors.primary} />
            <Text style={styles.addCategoryText}>Add Category</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ==============================================
// IDENTICAL STYLES (100% Design Preservation)
// ==============================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: 50, // Status bar space
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.overlayLight,
  },
  backButton: {
    padding: 4,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  pickerContent: {
    padding: 20,
    flex: 1,
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
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: 'white',
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
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
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: colors.overlayLight,
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
