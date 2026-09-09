import { escapeHtml, looksLikeHtml } from "./html";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function interpolate(
  template: string,
  values: Record<string, string | null | undefined>,
) {
  const html = looksLikeHtml(template);
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = values[key] ?? "";
    return html ? escapeHtml(value) : value;
  });
}

export function displayName(contact: {
  name?: string | null;
  company?: string | null;
  email?: string | null;
}) {
  return contact.name || contact.company || contact.email || "Untitled contact";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
