// categoryService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES_STORAGE_KEY = '@fintech_app_categories';

// Default categories
const defaultCategories = [
  {id: 'food', name: 'Food', icon: 'restaurant-outline', color: '#FF6B6B'},
  {id: 'transport', name: 'Transport', icon: 'car-outline', color: '#4ECDC4'},
  {id: 'shopping', name: 'Shopping', icon: 'bag-outline', color: '#45B7D1'},
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film-outline',
    color: '#96CEB4',
  },
  {id: 'bills', name: 'Bills', icon: 'flash-outline', color: '#FECA57'},
  {id: 'health', name: 'Health', icon: 'fitness-outline', color: '#FF9FF3'},
  {id: 'other', name: 'Other', icon: 'document-text-outline', color: '#A8A8A8'},
];

// Predefined colors for new categories
export const categoryColors = [
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

// Predefined icons for categories
export const categoryIcons = [
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

class CategoryService {
  // Get all categories
  async getCategories() {
    try {
      const storedCategories = await AsyncStorage.getItem(
        CATEGORIES_STORAGE_KEY,
      );
      if (storedCategories) {
        return JSON.parse(storedCategories);
      }
      // Return default categories if none stored
      await this.saveCategories(defaultCategories);
      return defaultCategories;
    } catch (error) {
      console.error('Error loading categories:', error);
      return defaultCategories;
    }
  }

  // Save categories to storage
  async saveCategories(categories) {
    try {
      await AsyncStorage.setItem(
        CATEGORIES_STORAGE_KEY,
        JSON.stringify(categories),
      );
      return true;
    } catch (error) {
      console.error('Error saving categories:', error);
      return false;
    }
  }

  // Add new category
  async addCategory(categoryData) {
    try {
      const categories = await this.getCategories();

      // Generate unique ID
      const newId =
        categoryData.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

      const newCategory = {
        id: newId,
        name: categoryData.name,
        icon: categoryData.icon,
        color: categoryData.color,
        isCustom: true, // Mark as user-created
        createdAt: new Date().toISOString(),
      };

      const updatedCategories = [...categories, newCategory];
      const saved = await this.saveCategories(updatedCategories);

      if (saved) {
        return {success: true, category: newCategory};
      } else {
        return {success: false, error: 'Failed to save category'};
      }
    } catch (error) {
      console.error('Error adding category:', error);
      return {success: false, error: error.message};
    }
  }

  // Update category
  async updateCategory(categoryId, updates) {
    try {
      const categories = await this.getCategories();
      const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

      if (categoryIndex === -1) {
        return {success: false, error: 'Category not found'};
      }

      categories[categoryIndex] = {...categories[categoryIndex], ...updates};
      const saved = await this.saveCategories(categories);

      return {success: saved, category: categories[categoryIndex]};
    } catch (error) {
      console.error('Error updating category:', error);
      return {success: false, error: error.message};
    }
  }

  // Delete category (only custom categories)
  async deleteCategory(categoryId) {
    try {
      const categories = await this.getCategories();
      const category = categories.find(cat => cat.id === categoryId);

      if (!category) {
        return {success: false, error: 'Category not found'};
      }

      if (!category.isCustom) {
        return {success: false, error: 'Cannot delete default categories'};
      }

      const updatedCategories = categories.filter(cat => cat.id !== categoryId);
      const saved = await this.saveCategories(updatedCategories);

      return {success: saved};
    } catch (error) {
      console.error('Error deleting category:', error);
      return {success: false, error: error.message};
    }
  }

  // Get category by ID
  async getCategoryById(id) {
    const categories = await this.getCategories();
    return categories.find(cat => cat.id === id);
  }

  // Validate category data
  validateCategory(categoryData) {
    const errors = [];

    if (!categoryData.name || categoryData.name.trim().length === 0) {
      errors.push('Category name is required');
    }

    if (categoryData.name && categoryData.name.trim().length > 30) {
      errors.push('Category name must be 30 characters or less');
    }

    if (!categoryData.icon) {
      errors.push('Category icon is required');
    }

    if (!categoryData.color) {
      errors.push('Category color is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default new CategoryService();
