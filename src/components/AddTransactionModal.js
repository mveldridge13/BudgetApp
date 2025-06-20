/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles';
import CalendarModal from './CalendarModal';

const {width: screenWidth} = Dimensions.get('window');

const AddTransactionModal = ({
  // ==============================================
  // DATA PROPS (from AddTransactionContainer)
  // ==============================================
  visible,
  onClose,
  onSave,
  isEditMode,

  // Form data
  amount,
  description,
  selectedCategory,
  selectedSubcategory,
  selectedDate,
  selectedRecurrence,
  selectedTransactionType, // ✅ NEW: Transaction type (INCOME/EXPENSE)

  // Categories data
  categories,
  isLoading,
  errorState,
  currentSubcategoryData,

  // Calendar state
  showCalendar,

  // ==============================================
  // EVENT HANDLER PROPS (from AddTransactionContainer)
  // ==============================================
  onAmountChange,
  onDescriptionChange,
  onCategorySelect,
  onSubcategorySelect,
  onRecurrenceSelect,
  onDateChange,
  onShowCalendar,
  onHideCalendar,
  onTransactionTypeChange, // ✅ NEW: Transaction type change handler

  // Helper functions
  getCategoryById,
  getRecurrenceById,
  getCategoryDisplayName,
  recurrenceOptions,
}) => {
  // Safe area insets
  const insets = useSafeAreaInsets();

  // Use useRef for animation values to prevent recreation on renders
  const slideAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ==============================================
  // ANIMATION HANDLING (UI Only) - UNCHANGED
  // ==============================================

  useEffect(() => {
    if (visible) {
      // Reset animations to starting positions
      slideAnim.setValue(0);
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);

      // Animate modal in from right with fade
      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset positions when modal is closed
      slideAnim.setValue(0);
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, modalAnim, fadeAnim]);

  // ==============================================
  // UI EVENT HANDLERS (Delegates to Container) - UNCHANGED
  // ==============================================

  const handleSave = () => {
    const currentValue = slideAnim._value;

    if (currentValue === 0) {
      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: screenWidth,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onSave();
      });
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        Animated.parallel([
          Animated.timing(modalAnim, {
            toValue: screenWidth,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onSave();
        });
      });
    }
  };

  const handleClose = () => {
    // Get current slide position to determine which view we're in
    const currentValue = slideAnim._value;

    if (currentValue === 0) {
      // Already in transaction view, animate modal out then close
      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: screenWidth, // Slide out to right
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose();
      });
    } else {
      // Animate back to transaction view first, then animate modal out
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        Animated.parallel([
          Animated.timing(modalAnim, {
            toValue: screenWidth,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
        });
      });
    }
  };

  // Navigation functions - UNCHANGED
  const showCategoryPicker = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showSubcategoryPicker = category => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth * 2,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showRecurrencePicker = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth * 3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideCategoryPicker = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideSubcategoryPicker = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideRecurrencePicker = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCategorySelect = categoryId => {
    const category = getCategoryById(categoryId);

    if (
      category &&
      category.hasSubcategories &&
      category.subcategories?.length > 0
    ) {
      // Delegate to container to set data, then show subcategory picker
      onCategorySelect(categoryId);
      showSubcategoryPicker(category);
    } else {
      // Select category directly and delegate to container
      onCategorySelect(categoryId);
      hideCategoryPicker();
    }
  };

  const handleSubcategorySelect = subcategoryId => {
    // Delegate to container
    onSubcategorySelect(subcategoryId);
    // Go back to transaction view
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleRecurrenceSelect = recurrenceId => {
    onRecurrenceSelect(recurrenceId);
    hideRecurrencePicker();
  };

  // ==============================================
  // ✅ NEW: Transaction Type Handlers
  // ==============================================

  const handleTransactionTypeSelect = type => {
    onTransactionTypeChange(type);
  };

  // ==============================================
  // HELPER FUNCTIONS (UI Only)
  // ==============================================

  // Helper function to create dynamic category icon style
  const getCategoryIconStyle = color => {
    return {
      ...styles.categoryIconContainer,
      backgroundColor: `${color}26`,
    };
  };

  // Helper functions
  const formatDate = date => {
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getRecurrenceIcon = () => {
    return selectedRecurrence !== 'none' ? 'repeat' : 'repeat-outline';
  };

  const getRecurrenceColor = () => {
    return selectedRecurrence !== 'none'
      ? colors.primary
      : colors.textSecondary;
  };

  // ✅ NEW: Helper functions for transaction type
  const getTransactionTypeDisplayName = () => {
    return selectedTransactionType === 'INCOME' ? 'Income' : 'Expense';
  };

  // ✅ FIXED: Helper function to get the correct category display for the category field
  const getCategoryFieldDisplayName = () => {
    if (!selectedCategory) {
      return null;
    }

    const mainCategory = getCategoryById(selectedCategory);
    if (!mainCategory) {
      return null;
    }

    // Always show the main category name in the category field
    return mainCategory.name;
  };

  // ✅ FIXED: Helper function to get the correct icon for the category field
  const getCategoryFieldIcon = () => {
    if (!selectedCategory) {
      return null;
    }

    const mainCategory = getCategoryById(selectedCategory);
    if (!mainCategory) {
      return null;
    }

    // If subcategory is selected, show subcategory icon, otherwise show main category icon
    if (selectedSubcategory) {
      const subcategory = mainCategory.subcategories?.find(
        sub => sub.id === selectedSubcategory,
      );
      return subcategory?.icon || mainCategory.icon;
    }

    return mainCategory.icon;
  };

  // ==============================================
  // RENDER UI (Pure UI Component)
  // ==============================================

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}>
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{translateX: modalAnim}],
            },
          ]}>
          {/* Container for all views */}
          <Animated.View
            style={[
              styles.viewContainer,
              {
                transform: [{translateX: slideAnim}],
              },
            ]}>
            {/* Transaction View */}
            <View style={styles.view}>
              <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {/* ✅ UPDATED: Dynamic title based on transaction type */}
                  {isEditMode
                    ? `Edit ${getTransactionTypeDisplayName()}`
                    : 'Add Transaction'}
                </Text>
                <TouchableOpacity
                  onPress={handleSave}
                  style={[
                    styles.saveButton,
                    (!amount || !selectedCategory) && styles.saveButtonDisabled,
                  ]}
                  disabled={!amount || !selectedCategory}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.saveText,
                      (!amount || !selectedCategory) && styles.saveTextDisabled,
                    ]}>
                    {isEditMode ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                {/* ✅ NEW: Transaction Type Selector */}
                <View style={styles.transactionTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.transactionTypeButton,
                      selectedTransactionType === 'EXPENSE' &&
                        styles.transactionTypeButtonActive,
                      selectedTransactionType === 'EXPENSE' && {
                        backgroundColor: '#F443361A',
                      },
                    ]}
                    onPress={() => handleTransactionTypeSelect('EXPENSE')}
                    activeOpacity={0.7}>
                    <Icon
                      name="trending-down"
                      size={18}
                      color={
                        selectedTransactionType === 'EXPENSE'
                          ? '#F44336'
                          : colors.textSecondary
                      }
                      style={styles.transactionTypeIcon}
                    />
                    <Text
                      style={[
                        styles.transactionTypeText,
                        selectedTransactionType === 'EXPENSE' && {
                          color: '#F44336',
                        },
                      ]}>
                      Expense
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.transactionTypeButton,
                      selectedTransactionType === 'INCOME' &&
                        styles.transactionTypeButtonActive,
                      selectedTransactionType === 'INCOME' && {
                        backgroundColor: '#4CAF501A',
                      },
                    ]}
                    onPress={() => handleTransactionTypeSelect('INCOME')}
                    activeOpacity={0.7}>
                    <Icon
                      name="trending-up"
                      size={18}
                      color={
                        selectedTransactionType === 'INCOME'
                          ? '#4CAF50'
                          : colors.textSecondary
                      }
                      style={styles.transactionTypeIcon}
                    />
                    <Text
                      style={[
                        styles.transactionTypeText,
                        selectedTransactionType === 'INCOME' && {
                          color: '#4CAF50',
                        },
                      ]}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Date Field - UNCHANGED */}
                <TouchableOpacity
                  style={styles.dateField}
                  onPress={onShowCalendar}
                  activeOpacity={0.7}>
                  <Icon
                    name="calendar-outline"
                    size={18}
                    color="#007AFF"
                    style={styles.dateIcon}
                  />
                  <Text style={styles.dateText}>
                    {formatDate(selectedDate)}
                  </Text>
                </TouchableOpacity>

                {/* Amount Field - UNCHANGED */}
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={onAmountChange}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                {/* Description Field - UNCHANGED */}
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={onDescriptionChange}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.textSecondary}
                />

                {/* ✅ FIXED: Category Field - Now shows main category name */}
                <TouchableOpacity
                  style={styles.categoryField}
                  onPress={showCategoryPicker}
                  activeOpacity={0.7}>
                  <View style={styles.categoryLeft}>
                    {selectedCategory ? (
                      <>
                        <View
                          style={getCategoryIconStyle(
                            getCategoryById(selectedCategory)?.color,
                          )}>
                          <Icon
                            name={getCategoryFieldIcon()}
                            size={18}
                            color={getCategoryById(selectedCategory)?.color}
                          />
                        </View>
                        <Text style={styles.categoryText}>
                          {getCategoryFieldDisplayName()}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.categoryIconPlaceholder}>
                          <Icon
                            name="albums-outline"
                            size={18}
                            color={colors.textSecondary}
                          />
                        </View>
                        <Text style={styles.categoryPlaceholder}>Category</Text>
                      </>
                    )}
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Recurrence Field - UNCHANGED */}
                <TouchableOpacity
                  style={styles.recurrenceField}
                  onPress={showRecurrencePicker}
                  activeOpacity={0.7}>
                  <View style={styles.recurrenceLeft}>
                    <Icon
                      name={getRecurrenceIcon()}
                      size={18}
                      color={getRecurrenceColor()}
                      style={styles.recurrenceIcon}
                    />
                    <Text
                      style={[
                        styles.recurrenceText,
                        selectedRecurrence !== 'none' &&
                          styles.recurrenceActiveText,
                      ]}>
                      {getRecurrenceById(selectedRecurrence)?.name}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Category Picker View - UNCHANGED */}
            <View style={styles.view}>
              <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
                <TouchableOpacity
                  onPress={hideCategoryPicker}
                  style={styles.cancelButton}>
                  <Icon
                    name="chevron-back"
                    size={24}
                    color={colors.textWhite}
                  />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Category</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.formContainer}
                showsVerticalScrollIndicator={false}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                      Loading categories...
                    </Text>
                  </View>
                ) : (
                  <>
                    {categories.map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryOption,
                          selectedCategory === category.id &&
                            styles.selectedOption,
                        ]}
                        onPress={() => handleCategorySelect(category.id)}
                        activeOpacity={0.7}>
                        <View style={styles.categoryLeft}>
                          <View style={getCategoryIconStyle(category.color)}>
                            <Icon
                              name={category.icon}
                              size={20}
                              color={category.color}
                            />
                          </View>
                          <View style={styles.categoryInfo}>
                            <Text style={styles.categoryName}>
                              {category.name}
                            </Text>
                            {category.isCustom && (
                              <Text style={styles.customLabel}>Custom</Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.categoryRight}>
                          {selectedCategory === category.id &&
                            !category.hasSubcategories && (
                              <Icon
                                name="checkmark"
                                size={20}
                                color={colors.primary}
                              />
                            )}
                          {category.hasSubcategories && (
                            <Icon
                              name="chevron-forward"
                              size={20}
                              color={colors.textSecondary}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>

            {/* Subcategory Picker View - UNCHANGED */}
            <View style={styles.view}>
              <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
                <TouchableOpacity
                  onPress={hideSubcategoryPicker}
                  style={styles.cancelButton}>
                  <Icon
                    name="chevron-back"
                    size={24}
                    color={colors.textWhite}
                  />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {currentSubcategoryData?.name || 'Select Subcategory'}
                </Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.formContainer}
                showsVerticalScrollIndicator={false}>
                {/* Subcategories */}
                {currentSubcategoryData?.subcategories?.map(subcategory => (
                  <TouchableOpacity
                    key={subcategory.id}
                    style={[
                      styles.categoryOption,
                      selectedSubcategory === subcategory.id &&
                        styles.selectedOption,
                    ]}
                    onPress={() => handleSubcategorySelect(subcategory.id)}
                    activeOpacity={0.7}>
                    <View style={styles.categoryLeft}>
                      <View
                        style={getCategoryIconStyle(
                          currentSubcategoryData.color,
                        )}>
                        <Icon
                          name={subcategory.icon}
                          size={20}
                          color={currentSubcategoryData.color}
                        />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>
                          {subcategory.name}
                        </Text>
                        {subcategory.isCustom && (
                          <Text style={styles.customLabel}>Custom</Text>
                        )}
                      </View>
                    </View>
                    {selectedSubcategory === subcategory.id && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Recurrence Picker View - UNCHANGED */}
            <View style={styles.view}>
              <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
                <TouchableOpacity
                  onPress={hideRecurrencePicker}
                  style={styles.cancelButton}>
                  <Icon
                    name="chevron-back"
                    size={24}
                    color={colors.textWhite}
                  />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Repeat</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.formContainer}
                showsVerticalScrollIndicator={false}>
                {recurrenceOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.categoryOption,
                      selectedRecurrence === option.id && styles.selectedOption,
                    ]}
                    onPress={() => handleRecurrenceSelect(option.id)}
                    activeOpacity={0.7}>
                    <View style={styles.categoryLeft}>
                      <Text style={styles.categoryName}>{option.name}</Text>
                    </View>
                    {selectedRecurrence === option.id && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Calendar Modal - UNCHANGED */}
      <CalendarModal
        visible={showCalendar}
        onClose={onHideCalendar}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  viewContainer: {
    flexDirection: 'row',
    width: screenWidth * 4, // 4 views: Transaction, Category, Subcategory, Recurrence
    height: '100%',
  },
  view: {
    width: screenWidth,
    height: '100%',
  },
  modalHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 0,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  placeholder: {
    width: 32,
  },
  formContainer: {
    padding: 20,
    flex: 1,
  },
  // ✅ NEW: Transaction Type Selector Styles
  transactionTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 4,
  },
  transactionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  transactionTypeButtonActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionTypeIcon: {
    marginRight: 8,
  },
  transactionTypeText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  // END NEW STYLES
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textPrimary,
    padding: 0,
  },
  descriptionInput: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  categoryField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 12,
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
  categoryIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.overlayLight,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
  },
  categoryPlaceholder: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  recurrenceField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 32,
  },
  recurrenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurrenceIcon: {
    marginRight: 12,
  },
  recurrenceText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  recurrenceActiveText: {
    color: colors.textPrimary,
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
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
});

export default AddTransactionModal;
