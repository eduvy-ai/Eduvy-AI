import axiosInstance from '../../services/axios';
import { Order, CreateOrderRequest, UpdateOrderRequest, OrdersListResponse } from './types';

export const ordersApi = {
  getAll: async (page = 1, pageSize = 10, status?: string): Promise<OrdersListResponse> => {
    const response = await axiosInstance.get<OrdersListResponse>('/orders', {
      params: { page, pageSize, status },
    });
    return response.data;
  },

  getById: async (id: string): Promise<Order> => {
    const response = await axiosInstance.get<Order>(`/orders/${id}`);
    return response.data;
  },

  create: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await axiosInstance.post<Order>('/orders', data);
    return response.data;
  },

  update: async (id: string, data: UpdateOrderRequest): Promise<Order> => {
    const response = await axiosInstance.put<Order>(`/orders/${id}`, data);
    return response.data;
  },

  cancel: async (id: string): Promise<Order> => {
    const response = await axiosInstance.post<Order>(`/orders/${id}/cancel`);
    return response.data;
  },

  getMyOrders: async (page = 1, pageSize = 10): Promise<OrdersListResponse> => {
    const response = await axiosInstance.get<OrdersListResponse>('/orders/my', {
      params: { page, pageSize },
    });
    return response.data;
  },
};
