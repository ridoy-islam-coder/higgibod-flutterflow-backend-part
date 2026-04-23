import httpStatus from 'http-status';
import { ICategory, ICategoryFilter } from './eventcatagore.interface';
import AppError from '../../error/AppError';
import { Category } from './eventcatagore.model';
import { uploadToS3 } from '../../utils/fileHelper';
import { Event } from '../event/event.model';



// ─── Create Category ───────────────────────────────────────────────────────────
const createCategory = async (
  payload: { name: string; description?: string },
  file: Express.Multer.File,
) => {
  // Duplicate name check
  const isExist = await Category.findOne({ name: payload.name });
  if (isExist) throw new AppError(httpStatus.CONFLICT, 'Category already exists');

  // Image S3 te upload koro
  const uploadedImage = await uploadToS3(file, 'category');

  const result = await Category.create({
    ...payload,
    image: uploadedImage.url,
    imageId: uploadedImage.id,
  });

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
















// Get Single
const getCategoryByIdnew = async (id: string) => {
  return await Category.findById(id);
};


// src/utils/pagination.ts
export const getPaginationOptions = (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const paginationResult = (
  total: number,
  page: number,
  limit: number
) => {
  return {
    total,
    page,
    limit,
    totalPage: Math.ceil(total / limit), // ✅ totalPages → totalPage
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
};


// eventcatagore.service.ts

const getAllCategories = async (filters: ICategoryFilter, query: any) => {
  const { page, limit, skip } = getPaginationOptions(query);

  const dbQuery: any = {};

  if (filters.searchTerm) {
    dbQuery.name = { $regex: filters.searchTerm, $options: "i" };
  }
  if (filters.isActive !== undefined) {
    dbQuery.isActive = filters.isActive;
  }
  // ✅ isPopular filter
  if (query.isPopular !== undefined) {
    dbQuery.isPopular = query.isPopular === "true";
  }

  const pipeline: any[] = [
    { $match: dbQuery },
    {
      $lookup: {
        from: "events",
        let: { catId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$category", "$$catId"] },
              isDeleted: false,
            },
          },
        ],
        as: "events",
      },
    },
    {
      $addFields: {
        eventCount: { $size: "$events" },
      },
    },
    { $project: { events: 0 } },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ];

  const result = await Category.aggregate(pipeline);
  const data = result[0]?.data || [];
  const total = result[0]?.total[0]?.count || 0;

  return {
    data,
    meta: paginationResult(total, page, limit),
  };
};

// eventcatagore.service.ts এ add করো

// const getEventsByCategoryId = async (categoryId: string, query: any) => {
//   const { page, limit, skip } = getPaginationOptions(query);


//   const category = await Category.findById(categoryId);
//   if (!category) throw new Error("Category not found");

//   const filter: any = {
//     category: categoryId,
//     isDeleted: false,
//   };

//   // search filter
//   if (query.search) {
//     filter.title = { $regex: query.search, $options: "i" };
//   }

//   const [events, total] = await Promise.all([
//     Event.find(filter)
//       .populate("host", "name profileImage")
//       .populate("attendees", "name profileImage")
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 }),
//     Event.countDocuments(filter),
//   ]);

//   return {

//     category: {
//       _id: category._id,
//       name: category.name,
//       image: category.image,
//     },
//     data: events,
//     meta: paginationResult(total, page, limit),
//   };
// };


const getEventsByCategoryId = async (categoryId: string, query: any) => {
  const { page, limit, skip } = getPaginationOptions(query);

  // ✅ Multiple categoryId support
  // ?categories=id1,id2,id3 অথবা single id
  const categoryIds = query.categories
    ? query.categories.split(",")
    : [categoryId];

  // ✅ সব category exist করে কিনা চেক করো
  const categories = await Category.find({ _id: { $in: categoryIds } });
  if (!categories.length) throw new Error("Category not found");

  const filter: any = {
    category: { $in: categoryIds }, // ✅ multiple id filter
    isDeleted: false,
  };

  if (query.search) {
    filter.title = { $regex: query.search, $options: "i" };
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate("host", "name profileImage")
      .populate("attendees", "name profileImage")
      .populate("category", "name image")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Event.countDocuments(filter),
  ]);

  return {
    // ✅ selected categories info
    categories: categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      image: cat.image,
    })),
    data: events,
    meta: paginationResult(total, page, limit),
  };
};

export const categoryServices = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
//  getAllCategoriesapi,
  getCategoryByIdnew,
  getEventsByCategoryId,
   
};
