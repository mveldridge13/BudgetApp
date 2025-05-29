// AddCategoryModal.js
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../styles';
import categoryService, {
  categoryColors,
  categoryIcons,
} from '../services/categoryService';

const AddCategoryModal = ({visible, onClose, onCategoryAdded}) => {
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setCategoryName('');
    setSelectedIcon('');
    setSelectedColor('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
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

    setIsLoading(true);

    try {
      const result = await categoryService.addCategory(categoryData);

      if (result.success) {
        // Notify parent component about the new category
        onCategoryAdded(result.category);
        handleClose();
        Alert.alert('Success', 'Category created successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create category');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error creating category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      categoryName.trim().length > 0 &&
      selectedIcon.length > 0 &&
      selectedColor.length > 0
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Category</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveButton,
                !isFormValid() && styles.saveButtonDisabled,
              ]}
              disabled={!isFormValid() || isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.saveText,
                    !isFormValid() && styles.saveTextDisabled,
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
                    style={[
                      styles.colorOption,
                      {backgroundColor: color},
                      selectedColor === color && styles.selectedColorOption,
                    ]}
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
                  <View
                    style={[
                      styles.previewIconContainer,
                      {backgroundColor: `${selectedColor}26`},
                    ]}>
                    <Icon name={selectedIcon} size={20} color={selectedColor} />
                  </View>
                  <Text style={styles.previewText}>{categoryName.trim()}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.overlayLight,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.primary,
  },
  saveTextDisabled: {
    color: colors.textSecondary,
  },
  formContainer: {
    padding: 20,
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
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
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
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  previewIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textPrimary,
  },
});

export default AddCategoryModal;
