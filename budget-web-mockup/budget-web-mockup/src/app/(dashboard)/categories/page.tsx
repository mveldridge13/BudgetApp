'use client';

import {useState, useMemo} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useCategories} from '@/hooks/useCategories';
import {Spinner, CategoryIcon, ConfirmDialog} from '@/components/ui';
import {CategoryModal} from '@/components/categories';
import {
  Category,
  CategoryWithSubcategories,
  CreateCategoryData,
  UpdateCategoryData,
} from '@/types';
import {IoPencil, IoTrash, IoAdd} from 'react-icons/io5';

export default function CategoriesPage() {
  const {
    categoriesWithSubcategories,
    isLoading,
    error,
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] =
    useState<CategoryWithSubcategories | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Track expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Filter by the global search query (?q=...).
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const filteredCategories = useMemo(() => {
    if (!query) return categoriesWithSubcategories;
    const q = query.toLowerCase();
    return categoriesWithSubcategories.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some(sub => sub.name.toLowerCase().includes(q)),
    );
  }, [categoriesWithSubcategories, query]);

  // Handlers
  const handleAddCategory = () => {
    setEditingCategory(null);
    setParentCategory(null);
    setShowModal(true);
  };

  const handleAddSubcategory = (parent: CategoryWithSubcategories) => {
    setEditingCategory(null);
    setParentCategory(parent);
    setShowModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setParentCategory(null);
    setShowModal(true);
  };

  const handleEditSubcategory = (
    subcategory: Category,
    parent: CategoryWithSubcategories,
  ) => {
    // Convert subcategory to Category format for editing
    const categoryToEdit: Category = {
      id: subcategory.id,
      name: subcategory.name,
      color: subcategory.color || parent.color,
      icon: subcategory.icon || 'albums-outline',
      type: parent.type,
      parentId: parent.id,
      isArchived: false,
    };
    setEditingCategory(categoryToEdit);
    setParentCategory(parent);
    setShowModal(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category);
    setShowDeleteConfirm(true);
  };

  const handleDeleteSubcategory = (
    subcategory: {id: string; name: string},
    parent: CategoryWithSubcategories,
  ) => {
    const categoryToDelete: Category = {
      id: subcategory.id,
      name: subcategory.name,
      color: parent.color,
      icon: 'albums-outline',
      type: parent.type,
      parentId: parent.id,
      isArchived: false,
    };
    setDeletingCategory(categoryToDelete);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    try {
      setIsDeleting(true);
      await deleteCategory(deletingCategory.id);
      await refresh();
      setShowDeleteConfirm(false);
      setDeletingCategory(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveCategory = async (
    data: CreateCategoryData | UpdateCategoryData,
  ) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data as UpdateCategoryData);
      } else {
        await createCategory(data as CreateCategoryData);
      }
      await refresh();
      setShowModal(false);
      setEditingCategory(null);
      setParentCategory(null);
    } catch (err) {
      console.error('Failed to save category:', err);
      throw err;
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setParentCategory(null);
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">
            Organize your transactions with categories.
          </p>
        </div>
        <button
          onClick={handleAddCategory}
          className="self-start sm:self-auto text-white px-4 py-2 text-sm sm:text-base rounded-lg font-medium flex items-center space-x-2 transition-colors"
          style={{backgroundColor: '#6366f1'}}
          onMouseEnter={e =>
            (e.currentTarget.style.backgroundColor = '#4f46e5')
          }
          onMouseLeave={e =>
            (e.currentTarget.style.backgroundColor = '#6366f1')
          }>
          <IoAdd size={20} />
          <span>Add Category</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
            Retry
          </button>
        </div>
      )}

      {isLoading && categoriesWithSubcategories.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : categoriesWithSubcategories.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <CategoryIcon iconName="albums-outline" size={32} color="#9CA3AF" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No categories yet
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first category.
          </p>
          <button
            onClick={handleAddCategory}
            className="inline-flex items-center space-x-2 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            style={{backgroundColor: '#6366f1'}}
            onMouseEnter={e =>
              (e.currentTarget.style.backgroundColor = '#4f46e5')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.backgroundColor = '#6366f1')
            }>
            <IoAdd size={20} />
            <span>Add Category</span>
          </button>
        </div>
      ) : (
        <>
          {query && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                Showing results for{' '}
                <span className="font-medium text-gray-900">
                  &ldquo;{query}&rdquo;
                </span>{' '}
                ({filteredCategories.length})
              </span>
              <Link
                href="/categories"
                className="font-medium text-indigo-600 hover:text-indigo-700">
                Clear
              </Link>
            </div>
          )}

          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No categories match &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map(category => (
                <div
                  key={category.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  {/* Category Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{backgroundColor: `${category.color}20`}}>
                        <CategoryIcon
                          iconName={category.icon}
                          size={20}
                          color={category.color}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {category.subcategories.length} subcategories
                        </p>
                      </div>
                    </div>

                    {/* Category Actions */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label="Edit category">
                        <IoPencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                        aria-label="Delete category">
                        <IoTrash size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories - fixed height for 5 items to align buttons */}
                  <div className="mb-4" style={{minHeight: '160px'}}>
                    {category.subcategories.length > 0 && (
                      <div className="space-y-2">
                        {(expandedCategories.has(category.id)
                          ? category.subcategories
                          : category.subcategories.slice(0, 5)
                        ).map(sub => (
                          <div
                            key={sub.id}
                            className="group flex items-center justify-between text-sm text-gray-600 pl-4 border-l-2 border-gray-200 hover:border-indigo-400 transition-colors">
                            <span>{sub.name}</span>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  handleEditSubcategory(
                                    sub as unknown as Category,
                                    category,
                                  )
                                }
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                aria-label="Edit subcategory">
                                <IoPencil size={12} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteSubcategory(sub, category)
                                }
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                aria-label="Delete subcategory">
                                <IoTrash size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {category.subcategories.length > 5 && (
                          <button
                            onClick={() => toggleExpanded(category.id)}
                            className="text-sm pl-4 font-medium transition-colors"
                            style={{color: '#6366f1'}}
                            onMouseEnter={e =>
                              (e.currentTarget.style.color = '#4f46e5')
                            }
                            onMouseLeave={e =>
                              (e.currentTarget.style.color = '#6366f1')
                            }>
                            {expandedCategories.has(category.id)
                              ? 'Show less'
                              : `+${category.subcategories.length - 5} more`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add Subcategory Button */}
                  <button
                    onClick={() => handleAddSubcategory(category)}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 transition-colors hover:border-indigo-400 hover:text-indigo-600">
                    <IoAdd size={16} />
                    <span className="text-sm font-medium">Add Subcategory</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Category Modal */}
      <CategoryModal
        visible={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
        parentCategory={parentCategory}
        existingCategories={categoriesWithSubcategories}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingCategory(null);
        }}
        onConfirm={handleConfirmDelete}
        title={
          deletingCategory?.parentId ? 'Delete Subcategory' : 'Delete Category'
        }
        message={
          deletingCategory?.parentId
            ? `Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`
            : `Are you sure you want to delete "${deletingCategory?.name}" and all its subcategories? Transactions using this category will be uncategorized.`
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}
