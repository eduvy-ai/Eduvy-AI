import axiosInstance from '../../services/axios';
import { UserProfile, CreateUserRequest, UpdateUserRequest, UsersListResponse } from './types';

export const usersApi = {
  getAll: async (page = 1, pageSize = 10): Promise<UsersListResponse> => {
    const response = await axiosInstance.get<UsersListResponse>('/users', {
      params: { page, pageSize },
    });
    return response.data;
  },

  getById: async (id: string): Promise<UserProfile> => {
    const response = await axiosInstance.get<UserProfile>(`/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserRequest): Promise<UserProfile> => {
    const response = await axiosInstance.post<UserProfile>('/users', data);
    return response.data;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<UserProfile> => {
    const response = await axiosInstance.put<UserProfile>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/users/${id}`);
  },
};
