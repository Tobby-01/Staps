import { createContext, useContext, useEffect, useState } from "react";

import { apiRequest, setStoredAuthToken } from "../lib/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await apiRequest("/api/auth/me");
      setUser(response.user);
    } catch (_error) {
      setStoredAuthToken("");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials) => {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setStoredAuthToken(response.token || "");
    setUser(response.user);
    return response;
  };

  const signup = async (payload) => {
    const response = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    });
    setStoredAuthToken(response.token || "");
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setStoredAuthToken("");
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
