import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { PublicRoute } from './PublicRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../modules/auth/pages/Login';
import Register from '../modules/auth/pages/Register';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PrivateRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <div>Dashboard Home</div> },
          { path: 'users', element: <div>Users Page</div> },
          { path: 'products', element: <div>Products Page</div> },
          { path: 'orders', element: <div>Orders Page</div> },
        ],
      },
    ],
  },
  {
    path: '/auth',
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <Login /> },
          { path: 'register', element: <Register /> },
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
