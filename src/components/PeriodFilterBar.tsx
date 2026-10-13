"use client";

import { Calendar, Filter, ChevronDown, Check } from "lucide-react";

interface PeriodFilterBarProps {
  anoSelecionado: string;
  mesSelecionado: string;
  anosDisponiveis: string[];
  periodoLabel?: string;
  onPeriodChange: (ano: string, mes: string) => void;
  isLoading?: boolean;
}

const MESES = [
  { id: "ALL", nome: "Todos os Meses" },
  { id: "1", nome: "Janeiro" },
  { id: "2", nome: "Fevereiro" },
  { id: "3", nome: "Março" },
  { id: "4", nome: "Abril" },
  { id: "5", nome: "Maio" },
  { id: "6", nome: "Junho" },
  { id: "7", nome: "Julho" },
  { id: "8", nome: "Agosto" },
  { id: "9", nome: "Setembro" },
  { id: "10", nome: "Outubro" },
  { id: "11", nome: "Novembro" },
  { id: "12", nome: "Dezembro" },
];

export function PeriodFilterBar({
  anoSelecionado,
  mesSelecionado,
  anosDisponiveis,
  periodoLabel,
  onPeriodChange,
  isLoading,
}: PeriodFilterBarProps) {
  // Shortcuts
  const aplicarAtalho = (ano: string, mes: string) => {
    onPeriodChange(ano, mes);
  };

  const hoje = new Date();
  const anoAtual = hoje.getFullYear().toString();
  const mesAtual = (hoje.getMonth() + 1).toString();
  const mesAnterior = hoje.getMonth() === 0 ? "12" : hoje.getMonth().toString();
  const anoMesAnterior = hoje.getMonth() === 0 ? (hoje.getFullYear() - 1).toString() : anoAtual;

  return (
    <div className="bg-[#151E34] p-4 rounded-2xl border border-[#1E2C48] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Seletores de Ano e Mês */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Filtrar Período:</span>
        </div>

        {/* Dropdown de Ano */}
        <div className="relative">
          <select
            value={anoSelecionado}
            onChange={(e) => onPeriodChange(e.target.value, mesSelecionado)}
            disabled={isLoading}
            className="appearance-none bg-[#0B1329] border border-[#1E2C48] text-white text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
          >
            <option value="ALL">Todos os Anos</option>
            {anosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>
                Ano {ano}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown de Mês */}
        <div className="relative">
          <select
            value={mesSelecionado}
            onChange={(e) => onPeriodChange(anoSelecionado, e.target.value)}
            disabled={isLoading}
            className="appearance-none bg-[#0B1329] border border-[#1E2C48] text-white text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
          >
            {MESES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Badge do Período Ativo */}
        {periodoLabel && (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-950/70 border border-blue-800/50 text-[11px] font-bold text-blue-300">
            <Check className="w-3 h-3 text-blue-400" />
            <span>{periodoLabel}</span>
          </div>
        )}
      </div>

      {/* Atalhos Rápidos */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
        <span className="text-[10px] font-bold uppercase text-[#64748B] mr-1 shrink-0">
          Atalhos:
        </span>

        <button
          type="button"
          onClick={() => aplicarAtalho(anoAtual, mesAtual)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
            anoSelecionado === anoAtual && mesSelecionado === mesAtual
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
          }`}
        >
          Mês Atual
        </button>

        <button
          type="button"
          onClick={() => aplicarAtalho(anoMesAnterior, mesAnterior)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
            anoSelecionado === anoMesAnterior && mesSelecionado === mesAnterior
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
          }`}
        >
          Mês Anterior
        </button>

        <button
          type="button"
          onClick={() => aplicarAtalho(anoAtual, "ALL")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
            anoSelecionado === anoAtual && mesSelecionado === "ALL"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
          }`}
        >
          Ano {anoAtual}
        </button>

        <button
          type="button"
          onClick={() => aplicarAtalho("2025", "ALL")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
            anoSelecionado === "2025" && mesSelecionado === "ALL"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
          }`}
        >
          Ano 2025
        </button>

        <button
          type="button"
          onClick={() => aplicarAtalho("ALL", "ALL")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
            anoSelecionado === "ALL" && mesSelecionado === "ALL"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
          }`}
        >
          Todo Histórico
        </button>
      </div>
    </div>
  );
}
