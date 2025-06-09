import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles';
import CalendarModal from './CalendarModal';
import categoryService from '../services/categoryService';

const {width: screenWidth} = Dimensions.get('window');

// Generate truly unique IDs to prevent deletion issues
const generateUniqueId = () => {
  // Combine timestamp with random string to ensure uniqueness
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${timestamp}_${randomPart}`;
};

// Category creation constants
const categoryColors = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FECA57',
  '#FF9FF3',
  '#A8A8A8',
  '#FF8C42',
  '#6C5CE7',
  '#FD79A8',
  '#FDCB6E',
  '#E17055',
  '#74B9FF',
  '#00B894',
  '#E84393',
  '#0984E3',
];

const categoryIcons = [
  'restaurant-outline',
  'car-outline',
  'bag-outline',
  'film-outline',
  'flash-outline',
  'fitness-outline',
  'document-text-outline',
  'home-outline',
  'airplane-outline',
  'medkit-outline',
  'school-outline',
  'cafe-outline',
  'gift-outline',
  'game-controller-outline',
  'musical-notes-outline',
  'book-outline',
  'bicycle-outline',
  'camera-outline',
  'card-outline',
  'desktop-outline',
  'hardware-chip-outline',
  'heart-outline',
  'library-outline',
  'map-outline',
];

const AddTransactionModal = ({
  visible,
  onClose,
  onSave,
  editingTransaction,
}) => {
  // Safe area insets
  const insets = useSafeAreaInsets();

  // Transaction data
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRecurrence, setSelectedRecurrence] = useState('none');

  // Use useRef for animation values to prevent recreation on renders
  const slideAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Other modals
  const [showCalendar, setShowCalendar] = useState(false);

  // Data
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Current subcategory view data
  const [currentSubcategoryData, setCurrentSubcategoryData] = useState(null);

  // Add Category form data
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Add Subcategory form data
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryIcon, setSubcategoryIcon] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState(null);

  const recurrenceOptions = [
    {id: 'none', name: 'Does not repeat'},
    {id: 'weekly', name: 'Weekly'},
    {id: 'fortnightly', name: 'Fortnightly'},
    {id: 'monthly', name: 'Monthly'},
    {id: 'sixmonths', name: 'Every six months'},
    {id: 'yearly', name: 'Yearly'},
  ];

  // Check if we're in edit mode
  const isEditMode = !!editingTransaction;

  useEffect(() => {
    if (visible) {
      loadCategories();

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

  // Effect to populate form when editing
  useEffect(() => {
    if (editingTransaction && visible) {
      // Pre-populate all fields with existing transaction data
      setAmount(editingTransaction.amount.toString());
      setDescription(editingTransaction.description || '');
      setSelectedCategory(editingTransaction.category);
      setSelectedSubcategory(editingTransaction.subcategory || null);
      setSelectedDate(new Date(editingTransaction.date));
      setSelectedRecurrence(editingTransaction.recurrence || 'none');
    } else if (!editingTransaction && visible) {
      // Reset form for new transaction
      setAmount('');
      setDescription('');
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSelectedDate(new Date());
      setSelectedRecurrence('none');
    }
  }, [editingTransaction, visible]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const loadedCategories = await categoryService.getCategories();
      setCategories(loadedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedDate(new Date());
    setSelectedRecurrence('none');
    slideAnim.setValue(0);
    modalAnim.setValue(screenWidth);
    fadeAnim.setValue(0);
    // Reset add category form
    setCategoryName('');
    setSelectedIcon('');
    setSelectedColor('');
    setIsSaving(false);
    // Reset subcategory form
    setSubcategoryName('');
    setSubcategoryIcon('');
    setParentCategoryId(null);
    setCurrentSubcategoryData(null);
  };

  const handleSave = () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const transaction = {
      id: isEditMode ? editingTransaction.id : generateUniqueId(), // Preserve ID when editing
      amount: parseFloat(amount),
      description:
        description ||
        getCategoryDisplayName(selectedCategory, selectedSubcategory),
      category: selectedCategory,
      subcategory: selectedSubcategory,
      date: selectedDate,
      recurrence: selectedRecurrence,
      createdAt: isEditMode ? editingTransaction.createdAt : new Date(), // Preserve original creation time
      updatedAt: isEditMode ? new Date() : undefined, // Add update timestamp when editing
    };

    console.log(
      isEditMode ? 'Updating transaction:' : 'Creating transaction:',
      transaction.id,
    );

    // Get current slide position to determine which view we're in
    const currentValue = slideAnim._value;

    if (currentValue === 0) {
      // Already in transaction view, animate modal out then save and close
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
        onSave(transaction);
        resetForm();
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
          onSave(transaction);
          resetForm();
          onClose();
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
        resetForm();
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
          resetForm();
          onClose();
        });
      });
    }
  };

  // Navigation functions
  const showCategoryPicker = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showSubcategoryPicker = category => {
    setCurrentSubcategoryData(category);
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

  const showAddCategoryForm = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth * 4,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showAddSubcategoryForm = categoryId => {
    setParentCategoryId(categoryId);
    setSubcategoryName('');
    setSubcategoryIcon('');
    Animated.timing(slideAnim, {
      toValue: -screenWidth * 5,
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

  const hideAddCategoryForm = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideAddSubcategoryForm = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth * 2,
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
      // Show subcategory picker
      showSubcategoryPicker(category);
    } else {
      // Select category directly
      setSelectedCategory(categoryId);
      setSelectedSubcategory(null);
      loadCategories();
      hideCategoryPicker();
    }
  };

  const handleSubcategorySelect = subcategoryId => {
    setSelectedCategory(currentSubcategoryData.id);
    setSelectedSubcategory(subcategoryId);
    loadCategories();
    // Go back to transaction view
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleRecurrenceSelect = recurrenceId => {
    setSelectedRecurrence(recurrenceId);
    hideRecurrencePicker();
  };

  const openAddCategoryForm = () => {
    // Reset form
    setCategoryName('');
    setSelectedIcon('');
    setSelectedColor('');
    showAddCategoryForm();
  };

  const handleSaveCategory = async () => {
    // Validate form
    const categoryData = {
      name: categoryName.trim(),
      icon: selectedIcon,
      color: selectedColor,
    };

    const validation = categoryService.validateCategory(categoryData);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setIsSaving(true);

    try {
      const result = await categoryService.addCategory(categoryData);

      if (result.success) {
        // Add to categories list and select it
        setCategories(prevCategories => [...prevCategories, result.category]);
        setSelectedCategory(result.category.id);
        setSelectedSubcategory(null);

        // Reset form
        setCategoryName('');
        setSelectedIcon('');
        setSelectedColor('');

        // Go back to transaction view
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        Alert.alert('Success', 'Category created successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create category');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error creating category:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSubcategory = async () => {
    // Validate form
    const subcategoryData = {
      name: subcategoryName.trim(),
      icon: subcategoryIcon,
    };

    const validation = categoryService.validateSubcategory(subcategoryData);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setIsSaving(true);

    try {
      const result = await categoryService.addSubcategory(
        parentCategoryId,
        subcategoryData,
      );

      if (result.success) {
        // Reload categories to get updated data
        await loadCategories();

        // Select the new subcategory
        setSelectedCategory(parentCategoryId);
        setSelectedSubcategory(result.subcategory.id);

        // Reset form
        setSubcategoryName('');
        setSubcategoryIcon('');
        setParentCategoryId(null);

        // Go back to transaction view
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        Alert.alert('Success', 'Subcategory created successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create subcategory');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error creating subcategory:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to create dynamic category icon style
  const getCategoryIconStyle = color => {
    return {
      ...styles.categoryIconContainer,
      backgroundColor: `${color}26`,
    };
  };

  // Helper function to create dynamic color option style
  const getColorOptionStyle = (color, isSelected) => {
    return {
      ...styles.colorOption,
      backgroundColor: color,
      ...(isSelected && styles.selectedColorOption),
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

  const getCategoryById = id => categories.find(cat => cat.id === id);
  const getRecurrenceById = id => recurrenceOptions.find(opt => opt.id === id);

  const getCategoryDisplayName = (categoryId, subcategoryId) => {
    const category = getCategoryById(categoryId);
    if (!category) {
      return '';
    }

    if (subcategoryId && category.subcategories) {
      const subcategory = category.subcategories.find(
        sub => sub.id === subcategoryId,
      );
      if (subcategory) {
        // Return just the subcategory name for cleaner display
        return subcategory.name;
      }
    }

    return category.name;
  };

  const getRecurrenceIcon = () => {
    return selectedRecurrence !== 'none' ? 'repeat' : 'repeat-outline';
  };

  const getRecurrenceColor = () => {
    return selectedRecurrence !== 'none'
      ? colors.primary
      : colors.textSecondary;
  };

  // Don't render if not visible to avoid layout issues
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
                  {isEditMode ? 'Edit Expense' : 'Add Expense'}
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
                {/* Date Field */}
                <TouchableOpacity
                  style={styles.dateField}
                  onPress={() => setShowCalendar(true)}
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

                {/* Amount Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    autoFocus={!isEditMode} // Only auto-focus for new transactions
                  />
                </View>

                {/* Description Field */}
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.textSecondary}
                />

                {/* Category Field */}
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
                            name={
                              selectedSubcategory
                                ? getCategoryById(
                                    selectedCategory,
                                  )?.subcategories?.find(
                                    sub => sub.id === selectedSubcategory,
                                  )?.icon ||
                                  getCategoryById(selectedCategory)?.icon
                                : getCategoryById(selectedCategory)?.icon
                            }
                            size={18}
                            color={getCategoryById(selectedCategory)?.color}
                          />
                        </View>
                        <Text style={styles.categoryText}>
                          {getCategoryDisplayName(
                            selectedCategory,
                            selectedSubcategory,
                          )}
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

                {/* Recurrence Field */}
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

            {/* Category Picker View */}
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

                {/* Add Category Button */}
                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={openAddCategoryForm}
                  activeOpacity={0.7}>
                  <Icon name="add" size={20} color={colors.primary} />
                  <Text style={styles.addCategoryText}>Add Category</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Subcategory Picker View */}
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

                {/* Add Subcategory Button */}
                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={() =>
                    showAddSubcategoryForm(currentSubcategoryData?.id)
                  }
                  activeOpacity={0.7}>
                  <Icon name="add" size={20} color={colors.primary} />
                  <Text style={styles.addCategoryText}>Add Subcategory</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Recurrence Picker View */}
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

            {/* Add Category Form View */}
            <View style={styles.view}>
              <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
                <TouchableOpacity
                  onPress={hideAddCategoryForm}
                  style={styles.cancelButton}>
                  <Icon
                    name="chevron-back"
                    size={24}
                    color={colors.textWhite}
                  />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add Category</Text>
                <TouchableOpacity
                  onPress={handleSaveCategory}
                  style={[
                    styles.saveButton,
                    (!categoryName.trim() || !selectedIcon || !selectedColor) &&
                      styles.saveButtonDisabled,
                  ]}
                  disabled={
                    !categoryName.trim() ||
                    !selectedIcon ||
                    !selectedColor ||
                    isSaving
                  }>
                  {isSaving ? (
                    <Text style={styles.saveText}>Saving...</Text>
                  ) : (
                    <Text
                      style={[
                        styles.saveText,
                        (!categoryName.trim() ||
                          !selectedIcon ||
                          !selectedColor) &&
                          styles.saveTextDisabled,
                      ]}>
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formContainer}
                showsVerticalScrollIndicator={false}>
                {/* Category Name Input */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Category Name</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={categoryName}
                    onChangeText={setCategoryName}
                    placeholder="Enter category name"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={30}
                    autoFocus={true}
                  />
                  <Text style={styles.characterCount}>
                    {categoryName.length}/30
                  </Text>
                </View>

                {/* Icon Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Choose Icon</Text>
                  <View style={styles.iconGrid}>
                    {categoryIcons.map((icon, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.iconOption,
                          selectedIcon === icon && styles.selectedIconOption,
                        ]}
                        onPress={() => setSelectedIcon(icon)}
                        activeOpacity={0.7}>
                        <Icon
                          name={icon}
                          size={24}
                          color={
                            selectedIcon === icon
                              ? colors.primary
                              : colors.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Color Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Choose Color</Text>
                  <View style={styles.colorGrid}>
                    {categoryColors.map((color, index) => (
                      <TouchableOpacity
                        key={index}
                        style={getColorOptionStyle(
                          color,
                          selectedColor === color,
                        )}
                        onPress={() => setSelectedColor(color)}
                        activeOpacity={0.8}>
                        {selectedColor === color && (
                          <Icon name="checkmark" size={16} color="white" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Preview */}
                {selectedIcon && selectedColor && categoryName.trim() && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preview</Text>
                    <View style={styles.previewContainer}>
                      <View style={getCategoryIconStyle(selectedColor)}>
                        <Icon
                          name={selectedIcon}
                          size={20}
                          color={selectedColor}
                        />
                      </View>
                      <Text style={styles.categoryName}>
                        {categoryName.trim()}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Add Subcategory Form View */}
            <View style={styles.view}>
              <View style={[styles.modalHeader, {paddingTop: insets.top + 20}]}>
                <TouchableOpacity
                  onPress={hideAddSubcategoryForm}
                  style={styles.cancelButton}>
                  <Icon
                    name="chevron-back"
                    size={24}
                    color={colors.textWhite}
                  />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add Subcategory</Text>
                <TouchableOpacity
                  onPress={handleSaveSubcategory}
                  style={[
                    styles.saveButton,
                    (!subcategoryName.trim() || !subcategoryIcon) &&
                      styles.saveButtonDisabled,
                  ]}
                  disabled={
                    !subcategoryName.trim() || !subcategoryIcon || isSaving
                  }>
                  {isSaving ? (
                    <Text style={styles.saveText}>Saving...</Text>
                  ) : (
                    <Text
                      style={[
                        styles.saveText,
                        (!subcategoryName.trim() || !subcategoryIcon) &&
                          styles.saveTextDisabled,
                      ]}>
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formContainer}
                showsVerticalScrollIndicator={false}>
                {/* Parent Category Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Parent Category</Text>
                  <View style={styles.parentCategoryInfo}>
                    <View
                      style={getCategoryIconStyle(
                        getCategoryById(parentCategoryId)?.color,
                      )}>
                      <Icon
                        name={getCategoryById(parentCategoryId)?.icon}
                        size={20}
                        color={getCategoryById(parentCategoryId)?.color}
                      />
                    </View>
                    <Text style={styles.categoryName}>
                      {getCategoryById(parentCategoryId)?.name}
                    </Text>
                  </View>
                </View>

                {/* Subcategory Name Input */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Subcategory Name</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={subcategoryName}
                    onChangeText={setSubcategoryName}
                    placeholder="Enter subcategory name"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={30}
                    autoFocus={true}
                  />
                  <Text style={styles.characterCount}>
                    {subcategoryName.length}/30
                  </Text>
                </View>

                {/* Icon Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Choose Icon</Text>
                  <View style={styles.iconGrid}>
                    {categoryIcons.map((icon, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.iconOption,
                          subcategoryIcon === icon && styles.selectedIconOption,
                        ]}
                        onPress={() => setSubcategoryIcon(icon)}
                        activeOpacity={0.7}>
                        <Icon
                          name={icon}
                          size={24}
                          color={
                            subcategoryIcon === icon
                              ? colors.primary
                              : colors.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Preview */}
                {subcategoryIcon && subcategoryName.trim() && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preview</Text>
                    <View style={styles.previewContainer}>
                      <View
                        style={getCategoryIconStyle(
                          getCategoryById(parentCategoryId)?.color,
                        )}>
                        <Icon
                          name={subcategoryIcon}
                          size={20}
                          color={getCategoryById(parentCategoryId)?.color}
                        />
                      </View>
                      <Text style={styles.categoryName}>
                        {subcategoryName.trim()}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
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
    width: screenWidth * 6, // Six screens: Transaction, Category, Subcategory, Recurrence, Add Category, Add Subcategory
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
  // Category picker styles
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
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
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
  // Add Category Form styles
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  nameInput: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconOption: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedIconOption: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: colors.textPrimary,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  parentCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  resetCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#FF6B6B26',
  },
  resetCategoryText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: '#FF6B6B',
    marginLeft: 8,
  },
});

export default AddTransactionModal;
