import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/hooks';

export const PrivateRoute = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <Outlet />;
};
