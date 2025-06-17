import TrendAPI from './TrendAPIService';

/**
 * Category Service - Connected to Trend Backend
 * Replaces the old AsyncStorage-based category service
 */
class CategoryService {
  // Get all categories from backend
  async getCategories() {
    try {
      const categories = await TrendAPI.getCategories();
      console.log(
        '📂 Categories loaded from backend:',
        categories?.length || 0,
      );

      // Transform backend categories to match your UI format if needed
      return this.transformCategories(categories || []);
    } catch (error) {
      console.error('❌ Error loading categories:', error);

      // If not authenticated, return empty array
      if (error.message.includes('Authentication')) {
        console.log('⚠️ User not authenticated - returning empty categories');
        return [];
      }

      // For other errors, return fallback categories
      console.log('🔄 Using fallback categories due to error');
      return this.getFallbackCategories();
    }
  }

  // Transform backend categories to match your existing UI format
  transformCategories(backendCategories) {
    return backendCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon || 'document-text-outline',
      color: category.color || '#A8A8A8',
      hasSubcategories: category.hasSubcategories || false,
      subcategories: category.subcategories || [],
      isCustom: category.isCustom || false,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  // Add new category via backend
  async addCategory(categoryData) {
    try {
      const response = await TrendAPI.createCategory({
        name: categoryData.name,
        icon: categoryData.icon,
        color: categoryData.color,
        description: categoryData.description || '',
        hasSubcategories: categoryData.hasSubcategories || false,
        subcategories: categoryData.subcategories || [],
      });

      console.log('✅ Category created successfully:', response);

      return {
        success: true,
        category: this.transformCategories([response])[0],
      };
    } catch (error) {
      console.error('❌ Error creating category:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update category via backend
  async updateCategory(categoryId, updates) {
    try {
      const response = await TrendAPI.updateCategory(categoryId, updates);

      console.log('✅ Category updated successfully:', response);

      return {
        success: true,
        category: this.transformCategories([response])[0],
      };
    } catch (error) {
      console.error('❌ Error updating category:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete category via backend
  async deleteCategory(categoryId) {
    try {
      await TrendAPI.deleteCategory(categoryId);

      console.log('✅ Category deleted successfully');

      return {success: true};
    } catch (error) {
      console.error('❌ Error deleting category:', error);

      // Handle specific backend error messages
      if (error.message.includes('cannot be deleted')) {
        return {
          success: false,
          error:
            'This category cannot be deleted because it has associated transactions',
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get category by ID from backend
  async getCategoryById(id) {
    try {
      const categories = await this.getCategories();
      return categories.find(cat => cat.id === id) || null;
    } catch (error) {
      console.error('❌ Error getting category by ID:', error);
      return null;
    }
  }

  // Get subcategory by ID
  async getSubcategoryById(categoryId, subcategoryId) {
    try {
      const category = await this.getCategoryById(categoryId);
      if (!category || !category.subcategories) {
        return null;
      }
      return (
        category.subcategories.find(sub => sub.id === subcategoryId) || null
      );
    } catch (error) {
      console.error('❌ Error getting subcategory by ID:', error);
      return null;
    }
  }

  // Get full category and subcategory info for a transaction
  async getCategoryInfo(categoryId, subcategoryId = null) {
    try {
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
    } catch (error) {
      console.error('❌ Error getting category info:', error);
      return null;
    }
  }

  // Validation methods (keeping your existing validation logic)
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

  // Fallback categories for when backend is unavailable
  getFallbackCategories() {
    return [
      {
        id: 'food',
        name: 'Food',
        icon: 'restaurant-outline',
        color: '#FF6B6B',
        hasSubcategories: false,
        subcategories: [],
      },
      {
        id: 'transport',
        name: 'Transport',
        icon: 'car-outline',
        color: '#4ECDC4',
        hasSubcategories: false,
        subcategories: [],
      },
      {
        id: 'shopping',
        name: 'Shopping',
        icon: 'bag-outline',
        color: '#45B7D1',
        hasSubcategories: false,
        subcategories: [],
      },
      {
        id: 'other',
        name: 'Other',
        icon: 'document-text-outline',
        color: '#A8A8A8',
        hasSubcategories: false,
        subcategories: [],
      },
    ];
  }

  // Legacy compatibility methods
  async saveCategories(categories) {
    console.warn(
      '⚠️ saveCategories called - this method is deprecated with backend integration',
    );
    return true;
  }

  async resetCategoriesToDefaults() {
    console.warn(
      '⚠️ resetCategoriesToDefaults called - use backend seeded categories instead',
    );
    return {success: true, categories: await this.getCategories()};
  }

  async addSubcategory(categoryId, subcategoryData) {
    console.warn('⚠️ addSubcategory not yet implemented for backend');
    return {
      success: false,
      error: 'Subcategory management not yet implemented',
    };
  }

  async deleteSubcategory(categoryId, subcategoryId) {
    console.warn('⚠️ deleteSubcategory not yet implemented for backend');
    return {
      success: false,
      error: 'Subcategory management not yet implemented',
    };
  }
}

// Export new instance
export default new CategoryService();
