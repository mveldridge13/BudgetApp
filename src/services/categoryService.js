// categoryService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES_STORAGE_KEY = '@fintech_app_categories';

// Default categories with subcategories
const defaultCategories = [
  {
    id: 'food',
    name: 'Food',
    icon: 'restaurant-outline',
    color: '#FF6B6B',
    hasSubcategories: true,
    subcategories: [
      {id: 'food_grocery', name: 'Grocery', icon: 'basket-outline'},
      {id: 'food_takeout', name: 'Takeout', icon: 'fast-food-outline'},
      {id: 'food_coffee', name: 'Coffee', icon: 'cafe-outline'},
      {id: 'food_restaurant', name: 'Restaurant', icon: 'restaurant'},
      {id: 'food_snacks', name: 'Snacks', icon: 'nutrition-outline'},
    ],
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: 'car-outline',
    color: '#4ECDC4',
    hasSubcategories: true,
    subcategories: [
      {id: 'transport_fuel', name: 'Fuel', icon: 'car-sport-outline'},
      {id: 'transport_public', name: 'Public Transport', icon: 'train-outline'},
      {id: 'transport_taxi', name: 'Taxi/Rideshare', icon: 'car-outline'},
      {id: 'transport_parking', name: 'Parking', icon: 'stop-outline'},
      {
        id: 'transport_maintenance',
        name: 'Maintenance',
        icon: 'construct-outline',
      },
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'bag-outline',
    color: '#45B7D1',
    hasSubcategories: true,
    subcategories: [
      {id: 'shopping_clothing', name: 'Clothing', icon: 'shirt-outline'},
      {
        id: 'shopping_electronics',
        name: 'Electronics',
        icon: 'phone-portrait-outline',
      },
      {id: 'shopping_household', name: 'Household Items', icon: 'home-outline'},
      {id: 'shopping_books', name: 'Books', icon: 'book-outline'},
      {id: 'shopping_gifts', name: 'Gifts', icon: 'gift-outline'},
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film-outline',
    color: '#96CEB4',
    hasSubcategories: true,
    subcategories: [
      {id: 'entertainment_movies', name: 'Movies', icon: 'videocam-outline'},
      {
        id: 'entertainment_games',
        name: 'Games',
        icon: 'game-controller-outline',
      },
      {id: 'entertainment_music', name: 'Music', icon: 'musical-notes-outline'},
      {
        id: 'entertainment_sports',
        name: 'Sports Events',
        icon: 'football-outline',
      },
      {
        id: 'entertainment_subscriptions',
        name: 'Subscriptions',
        icon: 'tv-outline',
      },
    ],
  },
  {
    id: 'bills',
    name: 'Bills',
    icon: 'flash-outline',
    color: '#FECA57',
    hasSubcategories: true,
    subcategories: [
      {id: 'bills_electricity', name: 'Electricity', icon: 'flash'},
      {id: 'bills_water', name: 'Water', icon: 'water-outline'},
      {id: 'bills_internet', name: 'Internet', icon: 'wifi-outline'},
      {id: 'bills_phone', name: 'Phone', icon: 'call-outline'},
      {id: 'bills_insurance', name: 'Insurance', icon: 'shield-outline'},
      {id: 'bills_rent', name: 'Rent/Mortgage', icon: 'home'},
    ],
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'fitness-outline',
    color: '#FF9FF3',
    hasSubcategories: true,
    subcategories: [
      {id: 'health_medical', name: 'Medical', icon: 'medical-outline'},
      {id: 'health_pharmacy', name: 'Pharmacy', icon: 'bandage-outline'},
      {id: 'health_dental', name: 'Dental', icon: 'happy-outline'},
      {id: 'health_gym', name: 'Gym/Fitness', icon: 'barbell-outline'},
      {id: 'health_supplements', name: 'Supplements', icon: 'nutrition'},
    ],
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'document-text-outline',
    color: '#A8A8A8',
    hasSubcategories: false,
  },
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
        const categories = JSON.parse(storedCategories);
        // Check if we need to migrate existing categories to include subcategories
        const needsMigration = await this.needsCategoryMigration(categories);
        if (needsMigration) {
          console.log('Migrating categories to include subcategories...');
          const migratedCategories =
            await this.migrateCategoriesWithSubcategories(categories);
          await this.saveCategories(migratedCategories);
          return migratedCategories;
        }
        return categories;
      }
      // Return default categories if none stored
      await this.saveCategories(defaultCategories);
      return defaultCategories;
    } catch (error) {
      console.error('Error loading categories:', error);
      return defaultCategories;
    }
  }

  // Check if categories need migration to include subcategories
  async needsCategoryMigration(categories) {
    // Check if any default category is missing subcategories
    // eslint-disable-next-line no-unused-vars
    const defaultCategoryIds = defaultCategories.map(cat => cat.id);

    for (const defaultCat of defaultCategories) {
      const existingCat = categories.find(cat => cat.id === defaultCat.id);
      if (existingCat) {
        // If the category exists but doesn't have subcategories when it should
        if (defaultCat.hasSubcategories && !existingCat.hasSubcategories) {
          return true;
        }
        // If the category has subcategories but the structure is different
        if (defaultCat.hasSubcategories && existingCat.hasSubcategories) {
          if (
            !existingCat.subcategories ||
            existingCat.subcategories.length === 0
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Migrate existing categories to include subcategories
  async migrateCategoriesWithSubcategories(existingCategories) {
    const migratedCategories = [...existingCategories];

    for (const defaultCat of defaultCategories) {
      const existingIndex = migratedCategories.findIndex(
        cat => cat.id === defaultCat.id,
      );

      if (existingIndex !== -1) {
        // Update existing category with subcategories if needed
        const existingCat = migratedCategories[existingIndex];
        if (defaultCat.hasSubcategories && !existingCat.hasSubcategories) {
          migratedCategories[existingIndex] = {
            ...existingCat,
            hasSubcategories: defaultCat.hasSubcategories,
            subcategories: defaultCat.subcategories || [],
          };
        } else if (
          defaultCat.hasSubcategories &&
          existingCat.hasSubcategories
        ) {
          // Merge subcategories, keeping custom ones and adding missing default ones
          const existingSubcategoryIds =
            existingCat.subcategories?.map(sub => sub.id) || [];
          const newSubcategories = [...(existingCat.subcategories || [])];

          for (const defaultSub of defaultCat.subcategories || []) {
            if (!existingSubcategoryIds.includes(defaultSub.id)) {
              newSubcategories.push(defaultSub);
            }
          }

          migratedCategories[existingIndex] = {
            ...existingCat,
            hasSubcategories: true,
            subcategories: newSubcategories,
          };
        }
      } else {
        // Add missing default category
        migratedCategories.push(defaultCat);
      }
    }

    return migratedCategories;
  }

  // Force reset categories to defaults (useful for testing)
  async resetCategoriesToDefaults() {
    try {
      await this.saveCategories(defaultCategories);
      return {success: true, categories: defaultCategories};
    } catch (error) {
      console.error('Error resetting categories:', error);
      return {success: false, error: error.message};
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
        hasSubcategories: categoryData.hasSubcategories || false,
        subcategories: categoryData.subcategories || [],
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

  // Add subcategory to existing category
  async addSubcategory(categoryId, subcategoryData) {
    try {
      const categories = await this.getCategories();
      const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

      if (categoryIndex === -1) {
        return {success: false, error: 'Category not found'};
      }

      const category = categories[categoryIndex];

      // Generate unique subcategory ID
      const newSubcategoryId = `${categoryId}_${subcategoryData.name
        .toLowerCase()
        .replace(/\s+/g, '_')}_${Date.now()}`;

      const newSubcategory = {
        id: newSubcategoryId,
        name: subcategoryData.name,
        icon: subcategoryData.icon,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      // Ensure category has subcategories array
      if (!category.subcategories) {
        category.subcategories = [];
      }

      category.subcategories.push(newSubcategory);
      category.hasSubcategories = true;

      const saved = await this.saveCategories(categories);

      if (saved) {
        return {success: true, subcategory: newSubcategory};
      } else {
        return {success: false, error: 'Failed to save subcategory'};
      }
    } catch (error) {
      console.error('Error adding subcategory:', error);
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

  // Delete subcategory (only custom subcategories)
  async deleteSubcategory(categoryId, subcategoryId) {
    try {
      const categories = await this.getCategories();
      const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

      if (categoryIndex === -1) {
        return {success: false, error: 'Category not found'};
      }

      const category = categories[categoryIndex];
      const subcategoryIndex = category.subcategories?.findIndex(
        sub => sub.id === subcategoryId,
      );

      if (subcategoryIndex === -1) {
        return {success: false, error: 'Subcategory not found'};
      }

      const subcategory = category.subcategories[subcategoryIndex];

      if (!subcategory.isCustom) {
        return {success: false, error: 'Cannot delete default subcategories'};
      }

      category.subcategories.splice(subcategoryIndex, 1);

      // If no subcategories left, set hasSubcategories to false
      if (category.subcategories.length === 0) {
        category.hasSubcategories = false;
      }

      const saved = await this.saveCategories(categories);

      return {success: saved};
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      return {success: false, error: error.message};
    }
  }

  // Get category by ID
  async getCategoryById(id) {
    const categories = await this.getCategories();
    return categories.find(cat => cat.id === id);
  }

  // Get subcategory by ID
  async getSubcategoryById(categoryId, subcategoryId) {
    const category = await this.getCategoryById(categoryId);
    if (!category || !category.subcategories) {
      return null;
    }
    return category.subcategories.find(sub => sub.id === subcategoryId);
  }

  // Get full category and subcategory info for a transaction
  async getCategoryInfo(categoryId, subcategoryId = null) {
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      return null;
    }

    const result = {
      category,
      subcategory: null,
    };

    if (subcategoryId && category.subcategories) {
      result.subcategory = category.subcategories.find(
        sub => sub.id === subcategoryId,
      );
    }

    return result;
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

  // Validate subcategory data
  validateSubcategory(subcategoryData) {
    const errors = [];

    if (!subcategoryData.name || subcategoryData.name.trim().length === 0) {
      errors.push('Subcategory name is required');
    }

    if (subcategoryData.name && subcategoryData.name.trim().length > 30) {
      errors.push('Subcategory name must be 30 characters or less');
    }

    if (!subcategoryData.icon) {
      errors.push('Subcategory icon is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default new CategoryService();
