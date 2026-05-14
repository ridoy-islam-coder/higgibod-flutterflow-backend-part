import { Document, Types } from "mongoose";

// ========================================
// Contact Status Type
// ========================================
export type ContactStatus = "pending" | "read" | "replied";

// ========================================
// Core Contact Interface
// ========================================
export interface IContact {
  phoneNumber: string;
  alternatePhone?: string | null;
  message: string;
  status: ContactStatus;
  ipAddress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// ========================================
// Mongoose Document Interface
// ========================================
export interface IContactDocument extends IContact, Document {
  _id: Types.ObjectId;
}

// ========================================
// DTO - Create Contact (Request Body)
// ========================================
export interface CreateContactDto {
  phoneNumber: string;
  alternatePhone?: string;
  message: string;
}

// ========================================
// DTO - Update Contact Status
// ========================================
export interface UpdateContactStatusDto {
  status: ContactStatus;
}

// ========================================
// Query Params for Get All
// ========================================
export interface ContactQueryParams {
  page?: number;
  limit?: number;
  status?: ContactStatus;
}

// ========================================
// Pagination Meta
// ========================================
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ========================================
// Generic API Response
// ========================================
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: PaginationMeta;
}

// ========================================
// Contact Stats
// ========================================
export interface ContactStats {
  total: number;
  pending: number;
  read: number;
  replied: number;
}