import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '../../redux/store';
import { fetchOrders, fetchOrderById, createOrder, updateOrder, cancelOrder, clearError } from './slice';
import { CreateOrderRequest, UpdateOrderRequest } from './types';

export const useOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { orders, currentOrder, isLoading, error, total, page, pageSize } = useSelector(
    (state: RootState) => state.orders
  );

  const handleFetchOrders = useCallback(
    (pageNum: number = 1, size: number = 10, status?: string) =>
      dispatch(fetchOrders({ page: pageNum, pageSize: size, status })),
    [dispatch]
  );

  const handleFetchOrderById = useCallback(
    (id: string) => dispatch(fetchOrderById(id)),
    [dispatch]
  );

  const handleCreateOrder = useCallback(
    (data: CreateOrderRequest) => dispatch(createOrder(data)),
    [dispatch]
  );

  const handleUpdateOrder = useCallback(
    (id: string, data: UpdateOrderRequest) => dispatch(updateOrder({ id, data })),
    [dispatch]
  );

  const handleCancelOrder = useCallback(
    (id: string) => dispatch(cancelOrder(id)),
    [dispatch]
  );

  const handleClearError = useCallback(
    () => dispatch(clearError()),
    [dispatch]
  );

  return {
    orders,
    currentOrder,
    isLoading,
    error,
    total,
    page,
    pageSize,
    fetchOrders: handleFetchOrders,
    fetchOrderById: handleFetchOrderById,
    createOrder: handleCreateOrder,
    updateOrder: handleUpdateOrder,
    cancelOrder: handleCancelOrder,
    clearError: handleClearError,
  };
};
