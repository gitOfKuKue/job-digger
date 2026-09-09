"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Shovel } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDirectoryFilters } from "@/lib/directory-filters-context";
import { isActivePath, NAV } from "./nav";
import { DirectoryFilterForm } from "./DirectoryFilterForm";

type Props = {
  className?: string;
  onNavigate?: () => void;
};

export default function Sidebar({ className, onNavigate }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { open, setOpen, activeCount } = useDirectoryFilters();

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-line bg-paper-raised",
        className,
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-forest text-paper">
          <Shovel className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">Job Digger</div>
          <div className="truncate text-[11px] text-ink-muted">Contacts</div>
        </div>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          if (item.href === "/") {
            return (
              <div key={item.href} className="space-y-0.5">
                <div
                  className={cn(
                    "flex items-center rounded-md",
                    active ? "bg-forest text-paper" : "text-ink-muted",
                  )}
                >
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-sm",
                      !active && "hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {activeCount > 0 && (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                          active
                            ? "bg-paper/20 text-paper"
                            : "bg-forest text-paper",
                        )}
                      >
                        {activeCount}
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={open ? "Hide filters" : "Show filters"}
                    onClick={() => setOpen((current) => !current)}
                    className={cn(
                      "mr-1 rounded-md p-1.5",
                      active
                        ? "hover:bg-paper/10"
                        : "hover:bg-paper hover:text-ink",
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                </div>
                {open && (
                  <DirectoryFilterForm
                    onApplied={() => {
                      if (pathname !== "/") router.push("/");
                    }}
                  />
                )}
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-forest text-paper"
                  : "text-ink-muted hover:bg-paper hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
