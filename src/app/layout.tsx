import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "FinanSamape | Painel Financeiro Integrado",
  description: "Sistema Financeiro e Gestão de Receitas para Samape Manutenção de Máquinas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
