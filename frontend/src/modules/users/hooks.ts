import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '../../redux/store';
import { fetchUsers, fetchUserById, createUser, updateUser, deleteUser, clearError } from './slice';
import { CreateUserRequest, UpdateUserRequest } from './types';

export const useUsers = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { users, currentUser, isLoading, error, total, page, pageSize } = useSelector(
    (state: RootState) => state.users
  );

  const handleFetchUsers = useCallback(
    (pageNum: number = 1, size: number = 10) => dispatch(fetchUsers({ page: pageNum, pageSize: size })),
    [dispatch]
  );

  const handleFetchUserById = useCallback(
    (id: string) => dispatch(fetchUserById(id)),
    [dispatch]
  );

  const handleCreateUser = useCallback(
    (data: CreateUserRequest) => dispatch(createUser(data)),
    [dispatch]
  );

  const handleUpdateUser = useCallback(
    (id: string, data: UpdateUserRequest) => dispatch(updateUser({ id, data })),
    [dispatch]
  );

  const handleDeleteUser = useCallback(
    (id: string) => dispatch(deleteUser(id)),
    [dispatch]
  );

  const handleClearError = useCallback(
    () => dispatch(clearError()),
    [dispatch]
  );

  return {
    users,
    currentUser,
    isLoading,
    error,
    total,
    page,
    pageSize,
    fetchUsers: handleFetchUsers,
    fetchUserById: handleFetchUserById,
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
    clearError: handleClearError,
  };
};
