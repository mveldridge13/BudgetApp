'use client';

import { useCategories } from '@/hooks/useCategories';
import { Spinner } from '@/components/ui';

export default function CategoriesPage() {
  const { categoriesWithSubcategories, isLoading, error, refresh } = useCategories();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">
            Organize your transactions with categories.
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>Add Category</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && categoriesWithSubcategories.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoriesWithSubcategories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <span style={{ color: category.color }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500">
                    {category.subcategories.length} subcategories
                  </p>
                </div>
              </div>

              {category.subcategories.length > 0 && (
                <div className="space-y-2">
                  {category.subcategories.slice(0, 3).map((sub) => (
                    <div
                      key={sub.id}
                      className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200"
                    >
                      {sub.name}
                    </div>
                  ))}
                  {category.subcategories.length > 3 && (
                    <div className="text-sm text-gray-400 pl-4">
                      +{category.subcategories.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
