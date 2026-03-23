import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../state/AuthContext.jsx";

export const RoleRoute = ({ allow }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16">Checking access...</div>;
  }

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

