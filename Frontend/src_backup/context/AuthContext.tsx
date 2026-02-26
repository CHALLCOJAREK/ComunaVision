// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authservice";

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => authService.getToken());

  const isAuthenticated = !!token;

  const logout = () => {
    authService.logout();
    setToken(null);
  };

  const login = async (username: string, password: string) => {
    const t = await authService.login(username, password);
    setToken(t);
  };

  useEffect(() => {
    // Si api.ts dispara "auth:logout" (401), cerramos sesión acá
    const onForceLogout = () => logout();
    window.addEventListener("auth:logout", onForceLogout as EventListener);
    return () => window.removeEventListener("auth:logout", onForceLogout as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, isAuthenticated, login, logout }),
    [token, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}