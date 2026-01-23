import { api } from './api';
import {
  Category,
  CategoryWithSubcategories,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryFilters,
  CategoryAnalytics,
} from '@/types';

class CategoryService {
  async getCategories(filters?: CategoryFilters): Promise<Category[]> {
    return api.get<Category[]>('/categories', filters);
  }

  async getCategoriesWithSubcategories(): Promise<CategoryWithSubcategories[]> {
    const categories = await this.getCategories();

    // Group by parent/child relationship
    const parentCategories = categories.filter(c => !c.parentId);
    const subcategories = categories.filter(c => c.parentId);

    return parentCategories.map(parent => ({
      ...parent,
      subcategories: subcategories
        .filter(sub => sub.parentId === parent.id)
        .map(sub => ({
          id: sub.id,
          name: sub.name,
          categoryId: parent.id,
          color: sub.color,
          icon: sub.icon,
        })),
    }));
  }

  async getCategory(id: string): Promise<Category> {
    return api.get<Category>(`/categories/${id}`);
  }

  async createCategory(data: CreateCategoryData): Promise<Category> {
    return api.post<Category>('/categories', data);
  }

  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    return api.patch<Category>(`/categories/${id}`, data);
  }

  async deleteCategory(id: string, options?: { reassignTo?: string }): Promise<void> {
    const queryParams = options?.reassignTo ? `?reassignTo=${options.reassignTo}` : '';
    await api.delete(`/categories/${id}${queryParams}`);
  }

  async getSystemCategories(): Promise<Category[]> {
    return api.get<Category[]>('/categories/system');
  }

  async getPopularCategories(limit: number = 10): Promise<Category[]> {
    return api.get<Category[]>('/categories/popular', { limit });
  }

  async getArchivedCategories(): Promise<Category[]> {
    return api.get<Category[]>('/categories/archived');
  }

  async restoreCategory(id: string): Promise<Category> {
    return api.post<Category>(`/categories/${id}/restore`);
  }

  async getCategoryAnalytics(id: string, filters?: CategoryFilters): Promise<CategoryAnalytics> {
    return api.get<CategoryAnalytics>(`/categories/${id}/analytics`, filters);
  }
}

export const categoryService = new CategoryService();
