import httpStatus from 'http-status';
import { ICategory, ICategoryFilter } from './eventcatagore.interface';
import AppError from '../../error/AppError';
import { Category } from './eventcatagore.model';


// ─── Create Category ───────────────────────────────────────────────────────────
const createCategory = async (payload: Partial<ICategory>) => {
  const isExist = await Category.findOne({ name: payload.name });
  if (isExist) throw new AppError(httpStatus.CONFLICT, 'Category already exists');

  const result = await Category.create(payload);
  return result;
};

// ─── Get All Categories (with event count) ─────────────────────────────────────
const getAllCategories = async (filters: ICategoryFilter) => {
  const query: Record<string, unknown> = {};

  if (filters.searchTerm) {
    query.name = { $regex: filters.searchTerm, $options: 'i' };
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  const result = await Category.find(query)
    .populate('eventCount') // virtual count
    .sort({ createdAt: -1 });

  return result;
};

// ─── Get Single Category ───────────────────────────────────────────────────────
const getCategoryById = async (id: string) => {
  const result = await Category.findById(id).populate('eventCount');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  return result;
};

// ─── Update Category ───────────────────────────────────────────────────────────
const updateCategory = async (id: string, payload: Partial<ICategory>) => {
  const isExist = await Category.findById(id);
  if (!isExist) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');

  const result = await Category.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

// ─── Delete Category ───────────────────────────────────────────────────────────
const deleteCategory = async (id: string) => {
  const isExist = await Category.findById(id);
  if (!isExist) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');

  // Soft delete
  const result = await Category.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true },
  );

  return result;
};

export const categoryServices = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
