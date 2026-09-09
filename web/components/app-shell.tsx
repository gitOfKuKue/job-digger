"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { auth, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full min-h-screen bg-paper text-ink">
      <Sidebar className="hidden lg:flex" />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar
            className="relative z-50 shadow-xl"
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          auth={auth}
          onLogout={logout}
          onOpenSidebar={() => setMobileOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
