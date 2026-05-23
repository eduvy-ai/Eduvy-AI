export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

export interface UsersListResponse {
  data: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UsersState {
  users: UserProfile[];
  currentUser: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}
