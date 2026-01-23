export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId?: string;
  isArchived: boolean;
  isSystem?: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  color?: string;
  icon?: string;
}

export interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

export interface CreateCategoryData {
  name: string;
  color: string;
  icon: string;
  parentId?: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
  icon?: string;
  isArchived?: boolean;
}

export interface CategoryFilters {
  includeArchived?: boolean;
  parentId?: string;
}

export interface CategoryAnalytics {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  percentageOfTotal: number;
}
