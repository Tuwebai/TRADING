/**
 * PrivateRoute Component
 * Protects routes that require authentication
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const location = useLocation();

  // Check auth state on mount and route changes
  useEffect(() => {
    checkAuth();
  }, [checkAuth, location.pathname]);

  if (!isAuthenticated) {
    // Redirect to landing page
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

