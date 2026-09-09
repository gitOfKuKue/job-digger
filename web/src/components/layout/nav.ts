import {
  FileText,
  FolderUp,
  Inbox,
  Mail,
  type LucideIcon,
} from "lucide-react";

export const NAV = [
  { href: "/", label: "Directory", icon: Inbox },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/upload", label: "Upload", icon: FolderUp },
  { href: "/sent", label: "Sent", icon: Mail },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
}>;

export function pageTitle(pathname: string) {
  if (pathname.startsWith("/templates")) return "Templates";
  if (pathname.startsWith("/upload")) return "Upload";
  if (pathname.startsWith("/sent")) return "Sent";
  return "Directory";
}

export function pageSubtitle(pathname: string) {
  if (pathname.startsWith("/templates"))
    return "Write templates and send bulk email to matching contacts";
  if (pathname.startsWith("/upload")) return "Import contacts and save them to Google Sheets";
  if (pathname.startsWith("/sent")) return "Mail sent from this workspace";
  return "Filter contacts and send from Gmail";
}

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
