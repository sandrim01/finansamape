"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Users,
  Package,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  {
    name: "Dashboard Geral",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Faturamento de OS",
    href: "/faturamento-os",
    icon: Receipt,
    badge: "OS",
  },
  {
    name: "Contas a Receber",
    href: "/contas-receber",
    icon: ArrowDownLeft,
  },
  {
    name: "Contas a Pagar",
    href: "/contas-pagar",
    icon: ArrowUpRight,
  },
  {
    name: "Fluxo de Caixa & DRE",
    href: "/fluxo-caixa",
    icon: TrendingUp,
  },
  {
    name: "Clientes & Receita",
    href: "/clientes",
    icon: Users,
  },
  {
    name: "Estoque & Margens",
    href: "/estoque",
    icon: Package,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-[#0B1329] text-slate-100 flex flex-col shrink-0 border-r border-[#1E2C48] select-none">
      {/* Brand Header com a Logo Oficial da Samape Índio */}
      <div className="p-4 border-b border-[#1E2C48]">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md shadow-black/30 group-hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="Logo Samape Índio"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="font-black text-sm leading-tight tracking-tight text-white flex items-center gap-1">
              SAMAPE <span className="text-rose-500 font-extrabold">ÍNDIO</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] font-semibold tracking-wider uppercase">
              Finanças & OS
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-[#64748B] uppercase">
          Módulos Financeiros
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "text-slate-300 hover:bg-[#151E34] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#94A3B8]"}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-blue-950/60 text-blue-400 border border-blue-800/50"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Session Quick Profile */}
      {user && (
        <div className="px-3 py-2.5 mx-3 mb-2 rounded-xl bg-[#151E34] border border-[#1E2C48] flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-200 truncate leading-tight">
                {user.nome.split(" ")[0]}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user.cargo}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Encerrar sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Database & System Status Footer */}
      <div className="p-4 border-t border-[#1E2C48] bg-[#0A1024]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-400">PostgreSQL Railway</span>
        </div>
        <div className="text-[11px] text-[#64748B] flex items-center justify-between font-medium">
          <span>SAMAPEOP Base</span>
          <span className="flex items-center gap-1 text-[#94A3B8]">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sincronizado
          </span>
        </div>
      </div>
    </aside>
  );
}
