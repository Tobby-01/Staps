import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../state/AuthContext.jsx";

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16">Loading your workspace...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

