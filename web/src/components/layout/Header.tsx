"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { AuthMe } from "@/lib/types";
import { pageSubtitle, pageTitle } from "./nav";

type Props = {
  className?: string;
  auth: AuthMe | null;
  onLogout: () => void;
  onOpenSidebar?: () => void;
};

export default function Header({
  className,
  auth,
  onLogout,
  onOpenSidebar,
}: Props) {
  const pathname = usePathname();

  return (
    <header
      className={`flex h-14 items-center justify-between gap-4 border-b border-line bg-paper-raised px-4 sm:px-6 ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-md p-1.5 text-ink-muted hover:bg-paper hover:text-ink lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{pageTitle(pathname)}</h1>
            <p className="hidden truncate text-xs text-ink-muted sm:block">
              {pageSubtitle(pathname)}
            </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm">
        {auth?.user ? (
          <>
            <span className="hidden max-w-48 truncate text-ink-muted md:inline">
              {auth.user.email}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-line px-2.5 py-1.5 text-xs hover:bg-paper"
            >
              Disconnect
            </button>
          </>
        ) : auth?.googleConfigured ? (
          <a
            href={apiUrl("/auth/google")}
            className="rounded-md bg-forest px-3 py-1.5 text-xs font-medium text-paper"
          >
            Connect Gmail
          </a>
        ) : (
          <span className="hidden max-w-52 text-right text-xs text-ink-muted sm:inline">
            Add Google OAuth keys in api/.env to send
          </span>
        )}
      </div>
    </header>
  );
}
