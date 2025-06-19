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
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
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
  const [attachedImage, setAttachedImage] = useState(null);

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
      setAttachedImage(editingTransaction.attachedImage || null);
    } else if (!editingTransaction && visible) {
      // Reset form for new transaction
      setAmount('');
      setDescription('');
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSelectedDate(new Date());
      setSelectedRecurrence('none');
      setAttachedImage(null);
    }
  }, [editingTransaction, visible]);

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
      const originalCategoryDisplayName = getCategoryDisplayName(
        editingTransaction.category,
        editingTransaction.subcategory,
      );

      if (
        !description.trim() ||
        description.trim() === originalCategoryDisplayName
      ) {
        setDescription(newCategoryDisplayName);
      }
    } else {
      if (!description.trim()) {
        setDescription(newCategoryDisplayName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory,
    selectedSubcategory,
    visible,
    isEditMode,
    description,
    categories.length,
  ]);

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

  const resetForm = async () => {
    // If there's an attached image and we're canceling, clean it up
    if (attachedImage && attachedImage.isLocal && !isEditMode) {
      await deleteImageFile(attachedImage.uri);
    }

    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedDate(new Date());
    setSelectedRecurrence('none');
    setAttachedImage(null);
    slideAnim.setValue(0);
    modalAnim.setValue(screenWidth);
    fadeAnim.setValue(0);
    setCurrentSubcategoryData(null);
  };

  // Camera and Image functionality
  const saveImagePermanently = async (tempUri, transactionId) => {
    try {
      // Create receipts directory if it doesn't exist
      const receiptsDir = `${RNFS.DocumentDirectoryPath}/receipts`;
      const dirExists = await RNFS.exists(receiptsDir);
      if (!dirExists) {
        await RNFS.mkdir(receiptsDir);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `receipt_${transactionId}_${timestamp}.jpg`;
      const permanentPath = `${receiptsDir}/${fileName}`;

      // Copy from temp location to permanent storage
      await RNFS.copyFile(tempUri, permanentPath);

      console.log('Image saved permanently to:', permanentPath);
      return permanentPath;
    } catch (error) {
      console.error('Error saving image permanently:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
      return null;
    }
  };

  const deleteImageFile = async imagePath => {
    try {
      if (imagePath && (await RNFS.exists(imagePath))) {
        await RNFS.unlink(imagePath);
        console.log('Image file deleted:', imagePath);
      }
    } catch (error) {
      console.error('Error deleting image file:', error);
    }
  };

  const showImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            'Cancel',
            'Take Photo',
            'Choose from Library',
            'Remove Photo',
          ],
          cancelButtonIndex: 0,
          destructiveButtonIndex: attachedImage ? 3 : -1,
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openImageLibrary();
          } else if (buttonIndex === 3 && attachedImage) {
            removeImage();
          }
        },
      );
    } else {
      // For Android, you might want to use a custom modal or ActionSheet library
      Alert.alert('Select Image', 'Choose an option', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Take Photo', onPress: openCamera},
        {text: 'Choose from Library', onPress: openImageLibrary},
        ...(attachedImage
          ? [{text: 'Remove Photo', onPress: removeImage, style: 'destructive'}]
          : []),
      ]);
    }
  };

  const openCamera = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };

    launchCamera(options, async response => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const tempUri = response.assets[0].uri;
        const tempId = generateUniqueId(); // Generate temp ID for saving

        // Save image permanently
        const permanentPath = await saveImagePermanently(tempUri, tempId);

        if (permanentPath) {
          const imageData = {
            uri: permanentPath, // Use permanent path instead of temp
            type: response.assets[0].type,
            fileName: `receipt_${tempId}_${Date.now()}.jpg`,
            fileSize: response.assets[0].fileSize,
            isLocal: true, // Flag to indicate this is locally stored
          };
          setAttachedImage(imageData);
        }
      }
    });
  };

  const openImageLibrary = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
    };

    launchImageLibrary(options, async response => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const tempUri = response.assets[0].uri;
        const tempId = generateUniqueId(); // Generate temp ID for saving

        // Save image permanently
        const permanentPath = await saveImagePermanently(tempUri, tempId);

        if (permanentPath) {
          const imageData = {
            uri: permanentPath, // Use permanent path instead of temp
            type: response.assets[0].type,
            fileName:
              response.assets[0].fileName ||
              `receipt_${tempId}_${Date.now()}.jpg`,
            fileSize: response.assets[0].fileSize,
            isLocal: true, // Flag to indicate this is locally stored
          };
          setAttachedImage(imageData);
        }
      }
    });
  };

  const removeImage = async () => {
    if (attachedImage && attachedImage.uri && attachedImage.isLocal) {
      // Delete the physical file when removing
      await deleteImageFile(attachedImage.uri);
    }
    setAttachedImage(null);
  };

  const handleSave = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const finalDescription =
      description.trim() ||
      getCategoryDisplayName(selectedCategory, selectedSubcategory);

    let finalAttachedImage = attachedImage;

    // If we have an image and we're creating a new transaction,
    // update the filename with the actual transaction ID
    if (attachedImage && !isEditMode) {
      const actualTransactionId = generateUniqueId();
      const newPermanentPath = await saveImagePermanently(
        attachedImage.uri,
        actualTransactionId,
      );

      if (newPermanentPath) {
        // Delete the old temp file
        if (attachedImage.isLocal) {
          await deleteImageFile(attachedImage.uri);
        }

        // Update image data with new path
        finalAttachedImage = {
          ...attachedImage,
          uri: newPermanentPath,
          fileName: `receipt_${actualTransactionId}_${Date.now()}.jpg`,
        };
      }

      const transaction = {
        id: actualTransactionId,
        amount: parseFloat(amount),
        description: finalDescription,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        date: selectedDate,
        recurrence: selectedRecurrence,
        attachedImage: finalAttachedImage,
        createdAt: new Date(),
      };

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
          onSave(transaction);
          resetForm();
          onClose();
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
            onSave(transaction);
            resetForm();
            onClose();
          });
        });
      }
    } else {
      // Edit mode - keep existing transaction ID
      const transaction = {
        id: isEditMode ? editingTransaction.id : generateUniqueId(),
        amount: parseFloat(amount),
        description: finalDescription,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        date: selectedDate,
        recurrence: selectedRecurrence,
        attachedImage: finalAttachedImage,
        createdAt: isEditMode ? editingTransaction.createdAt : new Date(),
        updatedAt: isEditMode ? new Date() : undefined,
      };

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
          onSave(transaction);
          resetForm();
          onClose();
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
            onSave(transaction);
            resetForm();
            onClose();
          });
        });
      }
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

  const formatFileSize = bytes => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

                {/* Image Attachment Section */}
                <View style={styles.attachmentSection}>
                  <Text style={styles.attachmentTitle}>Receipt Photo</Text>

                  {attachedImage ? (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{uri: attachedImage.uri}}
                        style={styles.attachedImage}
                        resizeMode="cover"
                      />
                      <View style={styles.imageOverlay}>
                        <View style={styles.imageInfo}>
                          <Icon
                            name="document-outline"
                            size={16}
                            color={colors.textWhite}
                          />
                          <Text style={styles.imageFileName}>
                            {attachedImage.fileName}
                          </Text>
                          {attachedImage.fileSize && (
                            <Text style={styles.imageFileSize}>
                              {formatFileSize(attachedImage.fileSize)}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.imageActionButton}
                          onPress={showImagePicker}
                          activeOpacity={0.7}>
                          <Icon
                            name="pencil"
                            size={16}
                            color={colors.textWhite}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addImageButton}
                      onPress={showImagePicker}
                      activeOpacity={0.7}>
                      <Icon
                        name="camera-outline"
                        size={24}
                        color={colors.primary}
                      />
                      <Text style={styles.addImageText}>Add Receipt Photo</Text>
                      <Text style={styles.addImageSubtext}>
                        Take photo or choose from library
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
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
    width: screenWidth * 4, // Reduced from 6 to 4 views
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
  // Image attachment styles
  attachmentSection: {
    marginBottom: 20,
  },
  attachmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  addImageButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.primary,
    marginTop: 8,
  },
  addImageSubtext: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageFileName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    marginLeft: 8,
    flex: 1,
  },
  imageFileSize: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite + 'CC',
    marginLeft: 8,
    marginTop: 2,
  },
  imageActionButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
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
