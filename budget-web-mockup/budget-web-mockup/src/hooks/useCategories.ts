'use client';

import { useState, useCallback, useEffect } from 'react';
import { categoryService } from '@/services/category.service';
import {
  Category,
  CategoryWithSubcategories,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryFilters,
} from '@/types';

interface UseCategoriesReturn {
  categories: Category[];
  categoriesWithSubcategories: CategoryWithSubcategories[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: (filters?: CategoryFilters) => Promise<void>;
  createCategory: (data: CreateCategoryData) => Promise<Category>;
  updateCategory: (id: string, data: UpdateCategoryData) => Promise<Category>;
  deleteCategory: (id: string, reassignTo?: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryColor: (id: string) => string;
  getCategoryIcon: (id: string) => string;
  refresh: () => Promise<void>;
}

export function useCategories(initialFilters?: CategoryFilters): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesWithSubcategories, setCategoriesWithSubcategories] = useState<CategoryWithSubcategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<CategoryFilters | undefined>(initialFilters);

  const fetchCategories = useCallback(async (filters?: CategoryFilters) => {
    setIsLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      const [categoriesData, categoriesWithSubs] = await Promise.all([
        categoryService.getCategories(filters),
        categoryService.getCategoriesWithSubcategories(),
      ]);

      setCategories(categoriesData);
      setCategoriesWithSubcategories(categoriesWithSubs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (data: CreateCategoryData): Promise<Category> => {
    setError(null);

    try {
      const newCategory = await categoryService.createCategory(data);

      // Optimistic update
      setCategories((prev) => [...prev, newCategory]);

      return newCategory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      setError(message);
      throw err;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryData): Promise<Category> => {
    setError(null);

    try {
      const updatedCategory = await categoryService.updateCategory(id, data);

      // Optimistic update
      setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)));

      return updatedCategory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update category';
      setError(message);
      throw err;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string, reassignTo?: string): Promise<void> => {
    setError(null);

    // Store for rollback
    const previousCategories = categories;

    // Optimistic update
    setCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      await categoryService.deleteCategory(id, { reassignTo });
    } catch (err) {
      // Rollback on error
      setCategories(previousCategories);
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      setError(message);
      throw err;
    }
  }, [categories]);

  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find((c) => c.id === id);
  }, [categories]);

  const getCategoryColor = useCallback((id: string): string => {
    const category = categories.find((c) => c.id === id);
    return category?.color || '#6B7280';
  }, [categories]);

  const getCategoryIcon = useCallback((id: string): string => {
    const category = categories.find((c) => c.id === id);
    return category?.icon || 'folder-outline';
  }, [categories]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchCategories(currentFilters);
  }, [fetchCategories, currentFilters]);

  // Initial fetch
  useEffect(() => {
    fetchCategories(initialFilters);
  }, []);

  return {
    categories,
    categoriesWithSubcategories,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryColor,
    getCategoryIcon,
    refresh,
  };
}
