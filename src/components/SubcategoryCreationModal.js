import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';

const {width: screenWidth} = Dimensions.get('window');

const SubcategoryCreationModal = ({
  visible,
  onClose,
  onSave,
  parentCategory,
  isLoading = false,
}) => {
  const [subcategoryName, setSubcategoryName] = useState('');
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSubcategoryName('');
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
          toValue: -keyboardHeight + 90,
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

  const handleSave = async () => {
    const trimmedName = subcategoryName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a subcategory name.');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Error', 'Subcategory name must be at least 2 characters.');
      return;
    }

    if (trimmedName.length > 50) {
      Alert.alert('Error', 'Subcategory name must be less than 50 characters.');
      return;
    }

    // Check if subcategory already exists
    const existingSubcategory = parentCategory?.subcategories?.find(
      sub => sub.name && sub.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (existingSubcategory) {
      Alert.alert('Error', 'A subcategory with this name already exists.');
      return;
    }

    try {
      const subcategoryData = {
        name: trimmedName,
        icon: 'albums-outline', // Default icon for subcategories
        color: parentCategory?.color || '#4ECDC4', // Inherit parent color
      };

      const result = await onSave(parentCategory.id, subcategoryData);

      if (result) {
        // Close modal with animation
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 300,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Defer state updates to avoid useInsertionEffect warning
          setTimeout(() => {
            onClose();
            setSubcategoryName('');
          }, 0);
        });
      }
    } catch (error) {
      console.error('Error creating subcategory:', error);
      Alert.alert('Error', 'Failed to create subcategory. Please try again.');
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Defer state updates to avoid useInsertionEffect warning
      setTimeout(() => {
        onClose();
        setSubcategoryName('');
      }, 0);
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.overlayContainer, {opacity: fadeAnim}]}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={handleClose}
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
              onPress={handleClose}
              activeOpacity={0.7}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Subcategory</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.content}>
            <View style={styles.parentCategoryInfo}>
              <View
                style={[
                  styles.parentIcon,
                  {backgroundColor: `${parentCategory?.color || '#4ECDC4'}26`},
                ]}>
                <Icon
                  name={parentCategory?.icon || 'albums-outline'}
                  size={20}
                  color={parentCategory?.color || '#4ECDC4'}
                />
              </View>
              <Text style={styles.parentCategoryName}>
                {parentCategory?.name || 'Category'}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subcategory Name</Text>
              <TextInput
                style={styles.textInput}
                value={subcategoryName}
                onChangeText={setSubcategoryName}
                placeholder="e.g., Groceries, Restaurants"
                placeholderTextColor={colors.textSecondary}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                maxLength={50}
              />
              <Text style={styles.characterCount}>
                {subcategoryName.length}/50
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!subcategoryName.trim() || isLoading) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!subcategoryName.trim() || isLoading}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.saveButtonText,
                    (!subcategoryName.trim() || isLoading) &&
                      styles.saveButtonTextDisabled,
                  ]}>
                  {isLoading ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000, // Higher than other overlays
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 24,
    paddingBottom: 90,
    width: screenWidth,
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  parentCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
  },
  parentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  parentCategoryName: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'System',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.overlayLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.overlayLight,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  saveButtonTextDisabled: {
    color: colors.textSecondary,
  },
});

export default SubcategoryCreationModal;
