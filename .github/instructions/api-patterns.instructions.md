---
applyTo: "**/modules/**/api.ts,**/modules/**/slice.ts,**/modules/**/service.ts"
---

# API & Redux Patterns

## Module Data Flow

```
Page → useHook() → dispatch(asyncThunk) → service → api → Backend
                        ↓
                  Redux Store (slice)
                        ↓
              useSelector() → Component re-render
```

## API Layer (`api.ts`)

Raw axios calls only - no business logic:

```typescript
import { axiosInstance } from '@/services/axios';
import { LoginCredentials, AuthResponse, UserResponse } from './types';

export const authApi = {
  login: (data: LoginCredentials) => 
    axiosInstance.post<AuthResponse>('/auth/login', data),
  
  register: (data: RegisterData) => 
    axiosInstance.post<AuthResponse>('/auth/register', data),
  
  me: () => 
    axiosInstance.get<UserResponse>('/auth/me'),
  
  logout: () => 
    axiosInstance.post('/auth/logout'),
};
```

## Service Layer (`service.ts`)

Business logic, token management, data transforms:

```typescript
import { authApi } from './api';
import { setToken, removeToken } from '@/shared/utils/localStorage';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await authApi.login(credentials);
    const { token, refreshToken, user } = response.data;
    
    setToken(token);
    localStorage.setItem('refreshToken', refreshToken);
    
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      removeToken();
      localStorage.removeItem('refreshToken');
    }
  },
};
```

## Redux Slice (`slice.ts`)

State management with async thunks:

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from './service';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
```

## Custom Hooks (`hooks.ts`)

Component interface to Redux:

```typescript
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { login, logout, clearError } from './slice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  const handleLogin = useCallback(
    (credentials: LoginCredentials) => dispatch(login(credentials)),
    [dispatch]
  );

  const handleLogout = useCallback(
    () => dispatch(logout()),
    [dispatch]
  );

  const handleClearError = useCallback(
    () => dispatch(clearError()),
    [dispatch]
  );

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    clearError: handleClearError,
  };
};
```

## Error Handling

Always use `rejectWithValue` in thunks:

```typescript
export const fetchData = createAsyncThunk(
  'data/fetch',
  async (id: string, { rejectWithValue }) => {
    try {
      return await dataService.fetch(id);
    } catch (error: any) {
      // Extract error message from response
      const message = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.message 
        || 'An error occurred';
      return rejectWithValue(message);
    }
  }
);
```

## Type Definitions (`types.ts`)

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}
```
