import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "FinanSamape | Samape Índio Gestão Financeira",
  description: "Sistema Financeiro Integrado para Samape Índio Manutenção de Máquinas",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex flex-col h-screen overflow-hidden bg-[#0B1329] text-slate-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
