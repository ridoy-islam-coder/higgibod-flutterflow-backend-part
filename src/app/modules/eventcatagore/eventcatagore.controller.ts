import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { categoryServices } from './eventcatagore.service';
i

// ─── Create Category ───────────────────────────────────────────────────────────
const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryServices.createCategory(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Category created successfully',
    data: result,
  });
});

// ─── Get All Categories ────────────────────────────────────────────────────────
const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    searchTerm: req.query.searchTerm as string,
    isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
  };

  const result = await categoryServices.getAllCategories(filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Categories fetched successfully',
    data: result,
  });
});

// ─── Get Single Category ───────────────────────────────────────────────────────
const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryServices.getCategoryById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category fetched successfully',
    data: result,
  });
});

// ─── Update Category ───────────────────────────────────────────────────────────
const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryServices.updateCategory(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category updated successfully',
    data: result,
  });
});

// ─── Delete Category ───────────────────────────────────────────────────────────
const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryServices.deleteCategory(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category deleted successfully',
    data: result,
  });
});

export const categoryController = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
