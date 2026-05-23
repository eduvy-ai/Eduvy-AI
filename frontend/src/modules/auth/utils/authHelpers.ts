import { getToken, removeToken } from '../../../shared/utils/localStorage';

export const isTokenValid = (): boolean => {
  const token = getToken();
  if (!token) return false;

  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() < exp;
  } catch {
    return false;
  }
};

export const getTokenPayload = <T>(): T | null => {
  const token = getToken();
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export const clearAuthData = (): void => {
  removeToken();
  // Clear any other auth-related data
  localStorage.removeItem('eduvyai_user');
};
