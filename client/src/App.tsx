import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import AdminLogin from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Customers from './pages/admin/Customers';
import Segments from './pages/admin/Segments';
import Campaigns from './pages/admin/Campaigns';
import CustomerRegister from './pages/customer/Register';
import VerifyOtp from './pages/customer/VerifyOtp';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin/login" replace /> },
  { path: '/admin/login', element: <AdminLogin /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'customers', element: <Customers /> },
      { path: 'segments', element: <Segments /> },
      { path: 'campaigns', element: <Campaigns /> },
    ],
  },
  { path: '/customer/register', element: <CustomerRegister /> },
  { path: '/customer/verify-otp', element: <VerifyOtp /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
