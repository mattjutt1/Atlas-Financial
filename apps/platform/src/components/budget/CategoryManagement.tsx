'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { GET_USER_CATEGORIES } from '../../lib/graphql/budget-queries';
import {
  CREATE_CUSTOM_CATEGORY,
  UPDATE_CUSTOM_CATEGORY,
  DELETE_CUSTOM_CATEGORY
} from '../../lib/graphql/budget-mutations';

interface CategoryManagementProps {
  userId: string;
  onCategoryUpdate?: () => void;
}

interface Category {
  id: string;
  name: string;
  parent_category_id?: string;
  color: string;
  icon: string;
  is_income: boolean;
  is_transfer: boolean;
  created_at: string;
  parent_category?: {
    id: string;
    name: string;
  };
}

const CATEGORY_ICONS = [
  '🏠', '🛒', '🚗', '⚡', '🛡️', '🏥', '🎓', '📱',
  '🎬', '🍽️', '🛍️', '🎨', '✈️', '💪', '📚', '🎵',
  '💰', '📈', '🏦', '💳', '🎯', '💍', '📊', '🔧',
  '👔', '👗', '🧴', '🏃', '🏖️', '🎂', '🎁', '📝'
];

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#84cc16', '#65a30d', '#16a34a', '#059669', '#0891b2',
  '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3'
];

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  userId,
  onCategoryUpdate
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    parent_category_id: '',
    color: '#3b82f6',
    icon: '📝',
    is_income: false,
    is_transfer: false
  });

  // GraphQL hooks
  const { data: categoriesData, loading, refetch } = useQuery(GET_USER_CATEGORIES, {
    variables: { userId }
  });

  const [createCategory, { loading: creating }] = useMutation(CREATE_CUSTOM_CATEGORY);
  const [updateCategory, { loading: updating }] = useMutation(UPDATE_CUSTOM_CATEGORY);
  const [deleteCategory, { loading: deleting }] = useMutation(DELETE_CUSTOM_CATEGORY);

  const categories: Category[] = categoriesData?.categories || [];

  // Organize categories into hierarchy
  const parentCategories = categories.filter(cat => !cat.parent_category_id);
  const childCategories = categories.filter(cat => cat.parent_category_id);

  const getChildCategories = (parentId: string) => {
    return childCategories.filter(cat => cat.parent_category_id === parentId);
  };

  // Filter categories
  const filteredCategories = parentCategories.filter(category => {
    if (searchTerm && !category.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    switch (filter) {
      case 'income':
        return category.is_income;
      case 'expense':
        return !category.is_income && !category.is_transfer;
      case 'transfer':
        return category.is_transfer;
      default:
        return true;
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      parent_category_id: '',
      color: '#3b82f6',
      icon: '📝',
      is_income: false,
      is_transfer: false
    });
    setShowCreateForm(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await updateCategory({
          variables: {
            id: editingCategory.id,
            input: {
              name: formData.name,
              color: formData.color,
              icon: formData.icon,
              is_income: formData.is_income,
              is_transfer: formData.is_transfer
            }
          }
        });
      } else {
        await createCategory({
          variables: {
            input: {
              user_id: userId,
              name: formData.name,
              parent_category_id: formData.parent_category_id || null,
              color: formData.color,
              icon: formData.icon,
              is_income: formData.is_income,
              is_transfer: formData.is_transfer
            }
          }
        });
      }

      resetForm();
      refetch();
      onCategoryUpdate?.();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      parent_category_id: category.parent_category_id || '',
      color: category.color,
      icon: category.icon,
      is_income: category.is_income,
      is_transfer: category.is_transfer
    });
    setEditingCategory(category);
    setShowCreateForm(true);
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (window.confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      try {
        await deleteCategory({
          variables: { id: categoryId }
        });
        refetch();
        onCategoryUpdate?.();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <TagIcon className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Category Management</h3>
              <p className="text-sm text-gray-600">{categories.length} categories</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
            <option value="transfer">Transfers</option>
          </select>
        </div>
      </div>

      {/* Category List */}
      <div className="p-6">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Categories Found</h4>
            <p className="text-gray-600 mb-4">
              {searchTerm || filter !== 'all'
                ? 'No categories match your current filters.'
                : 'Create your first category to start organizing your transactions.'
              }
            </p>
            {!searchTerm && filter === 'all' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Category
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCategories.map((category) => {
              const childCats = getChildCategories(category.id);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id} className="border border-gray-200 rounded-lg">
                  {/* Parent Category */}
                  <div className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {childCats.length > 0 && (
                          <button
                            onClick={() => toggleExpanded(category.id)}
                            className="p-1 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        )}

                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <span className="text-sm">{category.icon}</span>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{category.name}</h4>
                            <div className="flex items-center space-x-1">
                              {category.is_income && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                  Income
                                </span>
                              )}
                              {category.is_transfer && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  Transfer
                                </span>
                              )}
                            </div>
                          </div>
                          {childCats.length > 0 && (
                            <p className="text-sm text-gray-500">
                              {childCats.length} subcategory{childCats.length > 1 ? 'ies' : 'y'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          aria-label="Edit category"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id, category.name)}
                          className="p-2 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                          aria-label="Delete category"
                          disabled={deleting}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Child Categories */}
                  {isExpanded && childCats.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      {childCats.map((childCategory) => (
                        <div key={childCategory.id} className="p-4 pl-12 hover:bg-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center text-white"
                                style={{ backgroundColor: childCategory.color }}
                              >
                                <span className="text-xs">{childCategory.icon}</span>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium text-gray-900">{childCategory.name}</h5>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(childCategory)}
                                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                aria-label="Edit subcategory"
                              >
                                <PencilIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(childCategory.id, childCategory.name)}
                                className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                                aria-label="Delete subcategory"
                                disabled={deleting}
                              >
                                <TrashIcon className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h3>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Groceries"
                      required
                    />
                  </div>

                  {/* Parent Category */}
                  <div>
                    <label htmlFor="parent" className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Category
                    </label>
                    <select
                      id="parent"
                      value={formData.parent_category_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, parent_category_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No parent (top-level category)</option>
                      {parentCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {CATEGORY_ICONS.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon }))}
                          className={`p-2 text-lg hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            formData.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {CATEGORY_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color }))}
                          className={`w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Type Toggles */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_income}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          is_income: e.target.checked,
                          is_transfer: e.target.checked ? false : prev.is_transfer
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Income Category</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_transfer}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          is_transfer: e.target.checked,
                          is_income: e.target.checked ? false : prev.is_income
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Transfer Category</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {creating || updating ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
