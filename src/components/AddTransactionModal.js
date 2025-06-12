import React, {useState, useEffect, useRef, useCallback} from 'react';
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

const generateUniqueId = () => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${timestamp}_${randomPart}`;
};

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

const recurrenceOptions = [
  {id: 'none', name: 'Does not repeat'},
  {id: 'weekly', name: 'Weekly'},
  {id: 'fortnightly', name: 'Fortnightly'},
  {id: 'monthly', name: 'Monthly'},
  {id: 'sixmonths', name: 'Every six months'},
  {id: 'yearly', name: 'Yearly'},
];

const AddTransactionModal = ({
  visible,
  onClose,
  onSave,
  editingTransaction,
}) => {
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRecurrence, setSelectedRecurrence] = useState('none');
  const [attachedImage, setAttachedImage] = useState(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [showCalendar, setShowCalendar] = useState(false);

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentSubcategoryData, setCurrentSubcategoryData] = useState(null);

  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryIcon, setSubcategoryIcon] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState(null);

  const isEditMode = !!editingTransaction;

  useEffect(() => {
    if (visible) {
      loadCategories();

      slideAnim.setValue(0);
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);

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
      slideAnim.setValue(0);
      modalAnim.setValue(screenWidth);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, modalAnim, fadeAnim]);

  useEffect(() => {
    if (editingTransaction && visible) {
      setAmount(editingTransaction.amount.toString());
      setDescription(editingTransaction.description || '');
      setSelectedCategory(editingTransaction.category);
      setSelectedSubcategory(editingTransaction.subcategory || null);
      setSelectedDate(new Date(editingTransaction.date));
      setSelectedRecurrence(editingTransaction.recurrence || 'none');
      setAttachedImage(editingTransaction.attachedImage || null);
    } else if (!editingTransaction && visible) {
      setAmount('');
      setDescription('');
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSelectedDate(new Date());
      setSelectedRecurrence('none');
      setAttachedImage(null);
    }
  }, [editingTransaction, visible]);

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
  }, [
    selectedCategory,
    selectedSubcategory,
    visible,
    isEditMode,
    description,
    categories.length,
    editingTransaction,
    getCategoryDisplayName,
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
    setCategoryName('');
    setSelectedIcon('');
    setSelectedColor('');
    setIsSaving(false);
    setSubcategoryName('');
    setSubcategoryIcon('');
    setParentCategoryId(null);
    setCurrentSubcategoryData(null);
  };

  const saveImagePermanently = async (tempUri, transactionId) => {
    try {
      const receiptsDir = `${RNFS.DocumentDirectoryPath}/receipts`;
      const dirExists = await RNFS.exists(receiptsDir);
      if (!dirExists) {
        await RNFS.mkdir(receiptsDir);
      }

      const timestamp = Date.now();
      const fileName = `receipt_${transactionId}_${timestamp}.jpg`;
      const permanentPath = `${receiptsDir}/${fileName}`;

      await RNFS.copyFile(tempUri, permanentPath);

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
        const tempId = generateUniqueId();

        const permanentPath = await saveImagePermanently(tempUri, tempId);

        if (permanentPath) {
          const imageData = {
            uri: permanentPath,
            type: response.assets[0].type,
            fileName: `receipt_${tempId}_${Date.now()}.jpg`,
            fileSize: response.assets[0].fileSize,
            isLocal: true,
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
        const tempId = generateUniqueId();

        const permanentPath = await saveImagePermanently(tempUri, tempId);

        if (permanentPath) {
          const imageData = {
            uri: permanentPath,
            type: response.assets[0].type,
            fileName:
              response.assets[0].fileName ||
              `receipt_${tempId}_${Date.now()}.jpg`,
            fileSize: response.assets[0].fileSize,
            isLocal: true,
          };
          setAttachedImage(imageData);
        }
      }
    });
  };

  const removeImage = async () => {
    if (attachedImage && attachedImage.uri && attachedImage.isLocal) {
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

    const transactionId = isEditMode
      ? editingTransaction.id
      : generateUniqueId();

    let finalAttachedImage = attachedImage;

    if (attachedImage && !isEditMode) {
      const newPermanentPath = await saveImagePermanently(
        attachedImage.uri,
        transactionId,
      );

      if (newPermanentPath) {
        if (attachedImage.isLocal && attachedImage.uri !== newPermanentPath) {
          await deleteImageFile(attachedImage.uri);
        }

        finalAttachedImage = {
          ...attachedImage,
          uri: newPermanentPath,
          fileName: `receipt_${transactionId}_${Date.now()}.jpg`,
        };
      }
    }

    const transaction = {
      id: transactionId,
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

    const animateAndSave = () => {
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
    };

    animateAndSave();
  };

  const handleClose = () => {
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
          resetForm();
          onClose();
        });
      });
    }
  };

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
      showSubcategoryPicker(category);
    } else {
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
    setCategoryName('');
    setSelectedIcon('');
    setSelectedColor('');
    showAddCategoryForm();
  };

  const handleSaveCategory = async () => {
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
        setCategories(prevCategories => [...prevCategories, result.category]);
        setSelectedCategory(result.category.id);
        setSelectedSubcategory(null);

        setCategoryName('');
        setSelectedIcon('');
        setSelectedColor('');

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
        await loadCategories();

        setSelectedCategory(parentCategoryId);
        setSelectedSubcategory(result.subcategory.id);

        setSubcategoryName('');
        setSubcategoryIcon('');
        setParentCategoryId(null);

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

  const getCategoryIconStyle = color => {
    return {
      ...styles.categoryIconContainer,
      backgroundColor: `${color}26`,
    };
  };

  const getColorOptionStyle = (color, isSelected) => {
    return {
      ...styles.colorOption,
      backgroundColor: color,
      ...(isSelected && styles.selectedColorOption),
    };
  };

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

  const getCategoryById = useCallback(
    id => categories.find(cat => cat.id === id),
    [categories],
  );
  const getRecurrenceById = useCallback(
    id => recurrenceOptions.find(opt => opt.id === id),
    [],
  );

  const getCategoryDisplayName = useCallback(
    (categoryId, subcategoryId) => {
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
    },
    [getCategoryById],
  );

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
          <Animated.View
            style={[
              styles.viewContainer,
              {
                transform: [{translateX: slideAnim}],
              },
            ]}>
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

                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.textSecondary}
                />

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

                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={openAddCategoryForm}
                  activeOpacity={0.7}>
                  <Icon name="add" size={20} color={colors.primary} />
                  <Text style={styles.addCategoryText}>Add Category</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

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
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Category Name</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={categoryName}
                    onChangeText={setCategoryName}
                    placeholder="Enter category name"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={30}
                  />
                  <Text style={styles.characterCount}>
                    {categoryName.length}/30
                  </Text>
                </View>

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

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Subcategory Name</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={subcategoryName}
                    onChangeText={setSubcategoryName}
                    placeholder="Enter subcategory name"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={30}
                  />
                  <Text style={styles.characterCount}>
                    {subcategoryName.length}/30
                  </Text>
                </View>

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
    width: screenWidth * 6,
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
});

export default AddTransactionModal;
