import axiosInstance from '../../services/axios';
import { Product, CreateProductRequest, UpdateProductRequest, ProductsListResponse } from './types';

export const productsApi = {
  getAll: async (page = 1, pageSize = 10, category?: string): Promise<ProductsListResponse> => {
    const response = await axiosInstance.get<ProductsListResponse>('/products', {
      params: { page, pageSize, category },
    });
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await axiosInstance.get<Product>(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductRequest): Promise<Product> => {
    const response = await axiosInstance.post<Product>('/products', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    const response = await axiosInstance.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/products/${id}`);
  },

  search: async (query: string): Promise<Product[]> => {
    const response = await axiosInstance.get<Product[]>('/products/search', {
      params: { q: query },
    });
    return response.data;
  },
};
