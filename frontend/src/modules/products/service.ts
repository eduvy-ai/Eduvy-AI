import { productsApi } from './api';
import { CreateProductRequest, UpdateProductRequest, ProductsListResponse, Product } from './types';

export const productsService = {
  getAll: async (page: number, pageSize: number, category?: string): Promise<ProductsListResponse> => {
    return await productsApi.getAll(page, pageSize, category);
  },

  getById: async (id: string): Promise<Product> => {
    return await productsApi.getById(id);
  },

  create: async (data: CreateProductRequest): Promise<Product> => {
    return await productsApi.create(data);
  },

  update: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    return await productsApi.update(id, data);
  },

  delete: async (id: string): Promise<void> => {
    return await productsApi.delete(id);
  },

  search: async (query: string): Promise<Product[]> => {
    return await productsApi.search(query);
  },
};
