"use client";

import { RefreshCw, Calendar, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Header({ title, subtitle, onRefresh, isLoading }: HeaderProps) {
  const { user, logout } = useAuth();
  const [dataAtual] = useState(() => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(new Date());
  });

  const getInitials = (name?: string) => {
    if (!name) return "SA";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getDisplayName = (name?: string) => {
    if (!name) return "Usuário";
    const parts = name.trim().split(" ");
    return parts[0];
  };

  return (
    <header className="h-16 bg-[#0B1329] border-b border-[#1E2C48] px-6 md:px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo Icon no Header exatamente como no SAMAPEOP */}
        <div className="h-8 w-8 rounded-lg bg-white/95 p-1 flex items-center justify-center shrink-0 shadow-sm border border-white/20">
          <img
            src="/logo.png"
            alt="Logo Samape Índio"
            className="h-full w-full object-contain"
          />
        </div>

        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-[#94A3B8] font-medium">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-[#151E34] hover:bg-[#1B2745] border border-[#1E2C48] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar dados em tempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        )}

        {/* Tag de data matching SAMAPEOP style */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-[#151E34] border border-[#1E2C48] px-3 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{dataAtual}</span>
        </div>

        {/* Tag de versão matching SAMAPEOP style */}
        <div className="text-[11px] font-bold text-slate-400 border border-[#1E2C48] px-2.5 py-1 rounded-md bg-[#151E34]/50 hidden sm:block">
          v1.2 Finan
        </div>

        <div className="h-6 w-px bg-[#1E2C48] mx-1"></div>

        {/* User profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-blue-500/30">
              {getInitials(user?.nome)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-slate-200 leading-none truncate max-w-[120px]">
                {getDisplayName(user?.nome)}
              </div>
              <div className="text-[10px] text-blue-400 font-semibold leading-tight mt-0.5">
                {user?.cargo || "CONECTADO"}
              </div>
            </div>
          </div>

          {/* Botão Sair */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Encerrar sessão"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
