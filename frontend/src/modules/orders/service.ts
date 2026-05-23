import { ordersApi } from './api';
import { CreateOrderRequest, UpdateOrderRequest, OrdersListResponse, Order } from './types';

export const ordersService = {
  getAll: async (page: number, pageSize: number, status?: string): Promise<OrdersListResponse> => {
    return await ordersApi.getAll(page, pageSize, status);
  },

  getById: async (id: string): Promise<Order> => {
    return await ordersApi.getById(id);
  },

  create: async (data: CreateOrderRequest): Promise<Order> => {
    return await ordersApi.create(data);
  },

  update: async (id: string, data: UpdateOrderRequest): Promise<Order> => {
    return await ordersApi.update(id, data);
  },

  cancel: async (id: string): Promise<Order> => {
    return await ordersApi.cancel(id);
  },

  getMyOrders: async (page: number, pageSize: number): Promise<OrdersListResponse> => {
    return await ordersApi.getMyOrders(page, pageSize);
  },
};
