"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { AuthMe } from "@/lib/types";

type AuthContextValue = {
  auth: AuthMe | null;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthMe | null>(null);

  const reload = useCallback(async () => {
    try {
      setAuth(await api<AuthMe>("/auth/me"));
    } catch {
      setAuth({ user: null, googleConfigured: false });
    }
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    await reload();
  }, [reload]);

  useEffect(() => {
    void reload();
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("connected") === "1") {
      url.searchParams.delete("connected");
      window.history.replaceState({}, "", url.pathname + url.search);
      void reload();
    }
  }, [reload]);

  const value = useMemo(
    () => ({ auth, reload, logout }),
    [auth, reload, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
