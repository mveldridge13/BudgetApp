// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Common filter types
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
