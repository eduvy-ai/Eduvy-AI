import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '../../redux/store';
import { fetchProducts, fetchProductById, createProduct, updateProduct, deleteProduct, clearError } from './slice';
import { CreateProductRequest, UpdateProductRequest } from './types';

export const useProducts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { products, currentProduct, isLoading, error, total, page, pageSize } = useSelector(
    (state: RootState) => state.products
  );

  const handleFetchProducts = useCallback(
    (pageNum: number = 1, size: number = 10, category?: string) =>
      dispatch(fetchProducts({ page: pageNum, pageSize: size, category })),
    [dispatch]
  );

  const handleFetchProductById = useCallback(
    (id: string) => dispatch(fetchProductById(id)),
    [dispatch]
  );

  const handleCreateProduct = useCallback(
    (data: CreateProductRequest) => dispatch(createProduct(data)),
    [dispatch]
  );

  const handleUpdateProduct = useCallback(
    (id: string, data: UpdateProductRequest) => dispatch(updateProduct({ id, data })),
    [dispatch]
  );

  const handleDeleteProduct = useCallback(
    (id: string) => dispatch(deleteProduct(id)),
    [dispatch]
  );

  const handleClearError = useCallback(
    () => dispatch(clearError()),
    [dispatch]
  );

  return {
    products,
    currentProduct,
    isLoading,
    error,
    total,
    page,
    pageSize,
    fetchProducts: handleFetchProducts,
    fetchProductById: handleFetchProductById,
    createProduct: handleCreateProduct,
    updateProduct: handleUpdateProduct,
    deleteProduct: handleDeleteProduct,
    clearError: handleClearError,
  };
};
