/** Standard API response wrapper */
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

/** Login response from the login_user() stored procedure */
export interface LoginUserResponse {
  success: boolean;
  error_code?: string;
  message: string;
  user_id?: string;
  store_id?: string;
  role?: string;
  store_status?: string;
  locked_until?: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
