import {StorageCoordinator} from './storage/StorageCoordinator';

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
  constructor() {
    this.storageCoordinator = StorageCoordinator.getInstance();
  }

  getUserStorageManager() {
    const userStorageManager = this.storageCoordinator.getUserStorageManager();
    const isReady =
      this.storageCoordinator.isUserStorageInitialized() && userStorageManager;

    if (!isReady) {
      return null;
    }

    return userStorageManager;
  }

  isReady() {
    return this.getUserStorageManager() !== null;
  }

  async getCategories() {
    try {
      const userStorageManager = this.getUserStorageManager();

      if (!userStorageManager) {
        return defaultCategories;
      }

      const storedCategories = await userStorageManager.getUserData(
        'categories',
      );

      if (storedCategories && Array.isArray(storedCategories)) {
        const needsMigration = await this.needsCategoryMigration(
          storedCategories,
        );
        if (needsMigration) {
          const migratedCategories =
            await this.migrateCategoriesWithSubcategories(storedCategories);
          await this.saveCategories(migratedCategories);
          return migratedCategories;
        }
        return storedCategories;
      }

      await this.saveCategories(defaultCategories);
      return defaultCategories;
    } catch (error) {
      return defaultCategories;
    }
  }

  async needsCategoryMigration(categories) {
    for (const defaultCat of defaultCategories) {
      const existingCat = categories.find(cat => cat.id === defaultCat.id);
      if (existingCat) {
        if (defaultCat.hasSubcategories && !existingCat.hasSubcategories) {
          return true;
        }
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

  async migrateCategoriesWithSubcategories(existingCategories) {
    const migratedCategories = [...existingCategories];

    for (const defaultCat of defaultCategories) {
      const existingIndex = migratedCategories.findIndex(
        cat => cat.id === defaultCat.id,
      );

      if (existingIndex !== -1) {
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
        migratedCategories.push(defaultCat);
      }
    }

    return migratedCategories;
  }

  async resetCategoriesToDefaults() {
    try {
      await this.saveCategories(defaultCategories);
      return {success: true, categories: defaultCategories};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  async saveCategories(categories) {
    try {
      const userStorageManager = this.getUserStorageManager();

      if (!userStorageManager) {
        return false;
      }

      const success = await userStorageManager.setUserData(
        'categories',
        categories,
      );
      return success;
    } catch (error) {
      return false;
    }
  }

  async addCategory(categoryData) {
    try {
      const userStorageManager = this.getUserStorageManager();
      if (!userStorageManager) {
        return {success: false, error: 'User storage not ready'};
      }

      const categories = await this.getCategories();

      const newId =
        categoryData.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

      const newCategory = {
        id: newId,
        name: categoryData.name,
        icon: categoryData.icon,
        color: categoryData.color,
        hasSubcategories: categoryData.hasSubcategories || false,
        subcategories: categoryData.subcategories || [],
        isCustom: true,
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
      return {success: false, error: error.message};
    }
  }

  async addSubcategory(categoryId, subcategoryData) {
    try {
      const userStorageManager = this.getUserStorageManager();
      if (!userStorageManager) {
        return {success: false, error: 'User storage not ready'};
      }

      const categories = await this.getCategories();
      const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

      if (categoryIndex === -1) {
        return {success: false, error: 'Category not found'};
      }

      const category = categories[categoryIndex];

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
      return {success: false, error: error.message};
    }
  }

  async updateCategory(categoryId, updates) {
    try {
      const userStorageManager = this.getUserStorageManager();
      if (!userStorageManager) {
        return {success: false, error: 'User storage not ready'};
      }

      const categories = await this.getCategories();
      const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

      if (categoryIndex === -1) {
        return {success: false, error: 'Category not found'};
      }

      categories[categoryIndex] = {...categories[categoryIndex], ...updates};
      const saved = await this.saveCategories(categories);

      return {success: saved, category: categories[categoryIndex]};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  async deleteCategory(categoryId) {
    try {
      const userStorageManager = this.getUserStorageManager();
      if (!userStorageManager) {
        return {success: false, error: 'User storage not ready'};
      }

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
      return {success: false, error: error.message};
    }
  }

  async deleteSubcategory(categoryId, subcategoryId) {
    try {
      const userStorageManager = this.getUserStorageManager();
      if (!userStorageManager) {
        return {success: false, error: 'User storage not ready'};
      }

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

      if (category.subcategories.length === 0) {
        category.hasSubcategories = false;
      }

      const saved = await this.saveCategories(categories);

      return {success: saved};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  async getCategoryById(id) {
    const categories = await this.getCategories();
    return categories.find(cat => cat.id === id);
  }

  async getSubcategoryById(categoryId, subcategoryId) {
    const category = await this.getCategoryById(categoryId);
    if (!category || !category.subcategories) {
      return null;
    }
    return category.subcategories.find(sub => sub.id === subcategoryId);
  }

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
