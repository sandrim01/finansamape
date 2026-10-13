"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <AuthProvider>
      {isLoginPage ? (
        <div className="w-full h-full min-h-screen overflow-y-auto">{children}</div>
      ) : (
        <>
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {children}
          </main>
        </>
      )}
    </AuthProvider>
  );
}
