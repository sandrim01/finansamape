"use client";

import { RefreshCw, Calendar } from "lucide-react";
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
      day: "2-digit",
      month: "short",
    }).format(new Date());
  });

  return (
    <header className="h-16 bg-[#0B1329] border-b border-[#1E2C48] px-6 md:px-8 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-[#94A3B8] font-medium">{subtitle}</p>}
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

        {/* Date badge matching SAMAPEOP style */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-[#151E34] border border-[#1E2C48] px-3 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{dataAtual}</span>
        </div>

        {/* Version badge matching SAMAPEOP style */}
        <div className="text-[11px] font-bold text-slate-400 border border-[#1E2C48] px-2.5 py-1 rounded-md bg-[#151E34]/50">
          v1.2.1 Finan
        </div>

        <div className="h-6 w-px bg-[#1E2C48] mx-1"></div>

        {/* User avatar */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-blue-500/30">
            AL
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-200 leading-none">Alessandro</div>
            <div className="text-[10px] text-slate-400 font-medium leading-tight">SAMAPE Gestão</div>
          </div>
        </div>
      </div>
    </header>
  );
}
