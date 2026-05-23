import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/hooks';

export const PublicRoute = () => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};
