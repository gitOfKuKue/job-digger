import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/lib/auth-context";
import { DirectoryFiltersProvider } from "@/lib/directory-filters-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Digger",
  description:
    "Filter a company contact dataset by job position and send email from Gmail.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full">
        <AuthProvider>
          <DirectoryFiltersProvider>
            <AppShell>{children}</AppShell>
          </DirectoryFiltersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
