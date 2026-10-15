"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Menu,
  X,
  FileSpreadsheet,
  CalendarCheck,
  BellRing,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ModalExportacaoFinanceira } from "./ModalExportacaoFinanceira";

const navItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Faturamento OS",
    href: "/faturamento-os",
    icon: Receipt,
    badge: "OS",
  },
  {
    name: "A Receber",
    href: "/contas-receber",
    icon: ArrowDownLeft,
  },
  {
    name: "Cobrança",
    href: "/cobranca-automatica",
    icon: BellRing,
    badge: "Auto",
  },
  {
    name: "A Pagar",
    href: "/contas-pagar",
    icon: ArrowUpRight,
  },
  {
    name: "Fluxo de Caixa & DRE",
    href: "/fluxo-caixa",
    icon: TrendingUp,
  },
  {
    name: "Balanço Mensal",
    href: "/fechamento-mensal",
    icon: CalendarCheck,
    badge: "Auto",
  },
  {
    name: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    name: "Estoque",
    href: "/estoque",
    icon: Package,
  },
];

export function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [modalExportacaoAberto, setModalExportacaoAberto] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return "SA";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getDisplayName = (name?: string) => {
    if (!name) return "Usuário";
    return name.trim().split(" ")[0];
  };

  return (
    <header className="h-16 bg-[#0B1329] border-b border-[#1E2C48] px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-30 sticky top-0 w-full shadow-lg shadow-black/20">
      {/* 1. BRAND & LOGO OFICIAL */}
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md shadow-black/40 border border-white/20 group-hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="Logo Samape Índio"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <div className="font-black text-sm leading-tight tracking-tight text-white flex items-center gap-1">
              SAMAPE <span className="text-rose-500 font-extrabold">ÍNDIO</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] font-semibold tracking-wider uppercase">
              Finanças & OS
            </p>
          </div>
        </Link>
      </div>

      {/* 2. MENU HORIZONTAL DE NAVEGAÇÃO (DESKTOP) */}
      <nav className="hidden xl:flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-[#151E34]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#94A3B8]"}`} />
              <span>{item.name}</span>
              {item.badge && (
                <span
                  className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded ${
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

      {/* 3. AÇÕES À DIREITA: STATUS BANCO + USUÁRIO + LOGOUT */}
      <div className="flex items-center gap-3">
        {/* Status Banco Railway */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#151E34] border border-[#1E2C48] text-[11px] text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400">Railway DB</span>
        </div>

        {/* Botão Exportação Executiva */}
        <button
          onClick={() => setModalExportacaoAberto(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
          title="Exportar Relatórios Financeiros (Excel e PDF)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Exportar Relatórios</span>
        </button>

        <div className="hidden sm:block h-5 w-px bg-[#1E2C48]"></div>

        {/* Perfil do Usuário */}
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-blue-500/30 shadow-md">
              {getInitials(user.nome)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-slate-200 leading-none truncate max-w-[120px]">
                {getDisplayName(user.nome)}
              </div>
              <div className="text-[10px] text-blue-400 font-semibold leading-tight mt-0.5">
                {user.cargo || "ADMIN"}
              </div>
            </div>
          </div>
        )}

        {/* Botão Sair (Logout) */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
          title="Encerrar sessão"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-bold">Sair</span>
        </button>

        {/* Botão Hambúrguer Mobile / Tablet */}
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="xl:hidden p-2 text-slate-400 hover:text-white bg-[#151E34] border border-[#1E2C48] rounded-lg transition-colors"
          title="Abrir menu de navegação"
        >
          {menuAberto ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* 4. MENU DROPDOWN MOBILE / TABLET */}
      {menuAberto && (
        <div className="xl:hidden absolute top-16 left-0 right-0 bg-[#0B1329] border-b border-[#1E2C48] p-4 shadow-2xl z-40 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuAberto(false)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-300 hover:text-white bg-[#151E34] border border-[#1E2C48]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-blue-400"}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}

            <button
              onClick={() => {
                setMenuAberto(false);
                setModalExportacaoAberto(true);
              }}
              className="flex items-center gap-2 p-3 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Relatórios (Excel e PDF)</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL CENTRAL DE EXPORTAÇÃO FINANCEIRA */}
      <ModalExportacaoFinanceira
        isOpen={modalExportacaoAberto}
        onClose={() => setModalExportacaoAberto(false)}
      />
    </header>
  );
}
