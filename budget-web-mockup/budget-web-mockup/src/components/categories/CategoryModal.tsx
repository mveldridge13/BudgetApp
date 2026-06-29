'use client';

import { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { CategoryIcon } from '@/components/ui';
import ColorPicker from './ColorPicker';
import IconPicker from './IconPicker';
import { Category, CategoryWithSubcategories, CreateCategoryData, UpdateCategoryData, CategoryType } from '@/types';

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CreateCategoryData | UpdateCategoryData) => Promise<void>;
  editingCategory?: Category | null;
  parentCategory?: CategoryWithSubcategories | null;
  existingCategories?: CategoryWithSubcategories[];
}

const DEFAULT_COLOR = '#4ECDC4';
const DEFAULT_ICON = 'albums-outline';

export default function CategoryModal({
  visible,
  onClose,
  onSave,
  editingCategory,
  parentCategory,
  existingCategories = [],
}: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    color: DEFAULT_COLOR,
    icon: DEFAULT_ICON,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const isEditMode = !!editingCategory;
  const isSubcategoryMode = !!parentCategory;

  // Determine modal title
  const getTitle = () => {
    if (isEditMode) {
      return isSubcategoryMode ? 'Edit Subcategory' : 'Edit Category';
    }
    return isSubcategoryMode ? 'Add Subcategory' : 'Add Category';
  };

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible) {
      // Calculate scrollbar width before hiding it
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      // Add padding to prevent layout shift when scrollbar is hidden
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      setTimeout(() => setIsAnimating(true), 10);

      if (editingCategory) {
        setFormData({
          name: editingCategory.name,
          color: editingCategory.color || DEFAULT_COLOR,
          icon: editingCategory.icon || DEFAULT_ICON,
        });
      } else if (parentCategory) {
        // For new subcategory, inherit parent color
        setFormData({
          name: '',
          color: parentCategory.color || DEFAULT_COLOR,
          icon: DEFAULT_ICON,
        });
      } else {
        setFormData({
          name: '',
          color: DEFAULT_COLOR,
          icon: DEFAULT_ICON,
        });
      }
      setErrors({});
      setSaving(false);
    } else {
      setIsAnimating(false);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [visible, editingCategory, parentCategory]);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      newErrors.name = 'Name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    } else {
      // Check for duplicates
      const isDuplicate = checkDuplicateName(trimmedName);
      if (isDuplicate) {
        newErrors.name = isSubcategoryMode
          ? 'A subcategory with this name already exists'
          : 'A category with this name already exists';
      }
    }

    if (!formData.color) {
      newErrors.color = 'Please select a color';
    }

    if (!formData.icon) {
      newErrors.icon = 'Please select an icon';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicateName = (name: string): boolean => {
    const normalizedName = name.toLowerCase();

    if (isSubcategoryMode && parentCategory) {
      // Check against subcategories of the parent
      return parentCategory.subcategories.some(
        (sub) =>
          sub.name.toLowerCase() === normalizedName &&
          sub.id !== editingCategory?.id
      );
    } else {
      // Check against top-level categories
      return existingCategories.some(
        (cat) =>
          !cat.parentId &&
          cat.name.toLowerCase() === normalizedName &&
          cat.id !== editingCategory?.id
      );
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // For subcategories, inherit type from parent; otherwise default to EXPENSE
      const categoryType: CategoryType = (isSubcategoryMode && parentCategory)
        ? (parentCategory.type || 'EXPENSE')
        : (editingCategory?.type || 'EXPENSE');

      const data: CreateCategoryData = {
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
        type: categoryType,
      };

      // Add parentId for subcategories
      if (isSubcategoryMode && parentCategory) {
        data.parentId = parentCategory.id;
      }

      await onSave(data);
      handleClose();
    } catch (error) {
      console.error('Error saving category:', error);
      setErrors({ submit: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isAnimating ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ backgroundColor: '#6366f1' }}>
          <h2 className="text-xl font-semibold text-white">{getTitle()}</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <IoClose size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-160px)]">
          {/* Parent category indicator for subcategories */}
          {isSubcategoryMode && parentCategory && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Adding subcategory to:</p>
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${parentCategory.color}20` }}
                >
                  <CategoryIcon
                    iconName={parentCategory.icon}
                    size={16}
                    color={parentCategory.color}
                  />
                </div>
                <span className="font-medium text-gray-900">{parentCategory.name}</span>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                <CategoryIcon
                  iconName={formData.icon}
                  size={24}
                  color={formData.color}
                />
              </div>
              <span className="font-medium text-gray-900">
                {formData.name || (isSubcategoryMode ? 'Subcategory Name' : 'Category Name')}
              </span>
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder={isSubcategoryMode ? 'e.g., Groceries' : 'e.g., Food & Dining'}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-indigo-500'
              } focus:outline-none focus:ring-2`}
              maxLength={50}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.name.length}/50 characters
            </p>
          </div>

          {/* Color Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <ColorPicker
              selectedColor={formData.color}
              onColorSelect={(color) => updateFormData('color', color)}
            />
            {errors.color && (
              <p className="mt-1 text-sm text-red-600">{errors.color}</p>
            )}
          </div>

          {/* Icon Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <IconPicker
              selectedIcon={formData.icon}
              onIconSelect={(icon) => updateFormData('icon', icon)}
              color={formData.color}
            />
            {errors.icon && (
              <p className="mt-1 text-sm text-red-600">{errors.icon}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 space-y-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`w-full px-4 py-3 text-sm font-medium rounded-xl transition-all ${
              saving
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'text-white'
            }`}
            style={saving ? {} : { backgroundColor: '#6366f1' }}
            onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#4f46e5')}
            onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#6366f1')}
          >
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
