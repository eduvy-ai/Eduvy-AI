import { usersApi } from './api';
import { CreateUserRequest, UpdateUserRequest, UsersListResponse, UserProfile } from './types';

export const usersService = {
  getAll: async (page: number, pageSize: number): Promise<UsersListResponse> => {
    return await usersApi.getAll(page, pageSize);
  },

  getById: async (id: string): Promise<UserProfile> => {
    return await usersApi.getById(id);
  },

  create: async (data: CreateUserRequest): Promise<UserProfile> => {
    return await usersApi.create(data);
  },

  update: async (id: string, data: UpdateUserRequest): Promise<UserProfile> => {
    return await usersApi.update(id, data);
  },

  delete: async (id: string): Promise<void> => {
    return await usersApi.delete(id);
  },
};
