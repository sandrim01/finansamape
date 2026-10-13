"use client";

import { Bell, RefreshCw, Calendar } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Header({ title, subtitle, onRefresh, isLoading }: HeaderProps) {
  const [dataAtual] = useState(() => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg capitalize">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {dataAtual}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar dados em tempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        )}

        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        {/* User avatar / badge */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold ring-2 ring-blue-500/20">
            ADM
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-none">Gestor Financeiro</div>
            <div className="text-[10px] text-slate-500 font-medium leading-tight">Samape Operações</div>
          </div>
        </div>
      </div>
    </header>
  );
}
