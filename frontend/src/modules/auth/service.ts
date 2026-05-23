import { authApi } from './api';
import { LoginRequest, RegisterRequest, AuthResponse, User } from './types';
import { setToken, removeToken, getToken } from '../../shared/utils/localStorage';

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await authApi.login(credentials);
    setToken(response.token);
    return response;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await authApi.register(data);
    setToken(response.token);
    return response;
  },

  logout: async (): Promise<void> => {
    await authApi.logout();
    removeToken();
  },

  checkAuth: async (): Promise<User> => {
    const token = getToken();
    if (!token) {
      throw new Error('No token found');
    }
    return await authApi.getMe();
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await authApi.refreshToken(refreshToken);
    setToken(response.token);
    return response;
  },
};
