"use client";

import { usePathname } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { AuthProvider } from "@/context/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <AuthProvider>
      {isLoginPage ? (
        <div className="w-full h-full min-h-screen overflow-y-auto">{children}</div>
      ) : (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0B1329]">
          <Topbar />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {children}
          </main>
        </div>
      )}
    </AuthProvider>
  );
}
