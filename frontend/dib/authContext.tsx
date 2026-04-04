"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { authApi, notifApi } from "@/dib/api";

export type Role =
  | "msme"
  | "loan_officer"
  | "credit_analyst"
  | "risk_manager"
  | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  gstin?: string;
  bank_id?: string;
  status: string;
}

interface LoginResult {
  ok: boolean;
  user?: User;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  notifications: any[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const pathname = usePathname();

  const fetchNotifications = async (_u: User) => {
    try {
      const data = await notifApi.list(false);
      setNotifications(data as any[]);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("msme_user");
    if (stored) {
      const u = JSON.parse(stored) as User;
      setUser(u);
      fetchNotifications(u);
    }
  }, [pathname]);

  const login = async (
    email: string,
    password: string,
  ): Promise<LoginResult> => {
    try {
      const { token, user: raw } = await authApi.login(email, password);
      sessionStorage.setItem("msme_token", token);
      const u = raw as unknown as User;
      setUser(u);
      sessionStorage.setItem("msme_user", JSON.stringify(u));
      fetchNotifications(u);
      return { ok: true, user: u };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      return { ok: false, error: msg };
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    setUser(null);
    sessionStorage.removeItem("msme_user");
    sessionStorage.removeItem("msme_token");
    setNotifications([]);
    window.location.href = "/login";
  };

  const markRead = (id: string) => {
    notifApi.markRead(id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllRead = () => {
    notifApi.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        notifications,
        markRead,
        markAllRead,
        unreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
