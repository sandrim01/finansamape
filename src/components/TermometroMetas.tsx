"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Target,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Settings,
  X,
  Flame,
  Zap,
  DollarSign,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

interface TermometroMetasProps {
  ano?: string;
  mes?: string;
  compacto?: boolean;
}

export function TermometroMetas({ ano, mes, compacto = false }: TermometroMetasProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Configurações personalizadas (salvas no localStorage)
  const [metaCustomizada, setMetaCustomizada] = useState<string>("");
  const [custosFixosCustomizados, setCustosFixosCustomizados] = useState<string>("");
  const [modalConfigAberto, setModalConfigAberto] = useState(false);

  useEffect(() => {
    const metaSalva = localStorage.getItem("finansamape_meta_faturamento");
    if (metaSalva) setMetaCustomizada(metaSalva);

    const custosSalvos = localStorage.getItem("finansamape_custos_fixos");
    if (custosSalvos) setCustosFixosCustomizados(custosSalvos);
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (ano && ano !== "ALL") query.set("ano", ano);
      if (mes && mes !== "ALL") query.set("mes", mes);

      const metaNum = parseFloat(metaCustomizada) || 0;
      if (metaNum > 0) query.set("meta", String(metaNum));

      const custosNum = parseFloat(custosFixosCustomizados) || 0;
      if (custosNum > 0) query.set("custosFixos", String(custosNum));

      const res = await fetch(`/api/metas-ponto-equilibrio?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao buscar metas e ponto de equilíbrio:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [ano, mes, metaCustomizada, custosFixosCustomizados]);

  const handleSalvarConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (metaCustomizada) {
      localStorage.setItem("finansamape_meta_faturamento", metaCustomizada);
    } else {
      localStorage.removeItem("finansamape_meta_faturamento");
    }

    if (custosFixosCustomizados) {
      localStorage.setItem("finansamape_custos_fixos", custosFixosCustomizados);
    } else {
      localStorage.removeItem("finansamape_custos_fixos");
    }

    setModalConfigAberto(false);
    carregarDados();
  };

  const pe = data?.pontoEquilibrio;
  const metas = data?.metas;
  const periodo = data?.periodo;

  const faturado = metas?.faturadoAtual || 0;
  const metaValor = metas?.metaFaturamento || 120000;
  const peValor = pe?.valor || 27692;

  // Percentuais para a barra de progresso (com limite visual máximo de 100%)
  const progressoMeta = Math.min(100, metas?.percentualAtingido || 0);
  const progressoPE = Math.min(100, pe?.percentualAtingido || 0);
  const posicaoMarcadorPE = metaValor > 0 ? Math.min(95, Math.max(10, (peValor / metaValor) * 100)) : 25;

  return (
    <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 md:p-6 space-y-5">
      {/* 1. CABEÇALHO DO TERMÔMETRO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2C48] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/30">
            <Flame className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white tracking-tight">
                Termômetro de Metas & Ponto de Equilíbrio
              </h3>
              {pe?.atingido ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ponto de Equilíbrio Superado
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Em Busca do Ponto de Equilíbrio
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Acompanhamento do ritmo operacional e cobertura de custos fixos no mês
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalConfigAberto(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1329] hover:bg-[#1E2C48] text-slate-300 hover:text-white border border-[#1E2C48] text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
          title="Ajustar Meta do Mês e Custos Fixos"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Configurar Metas</span>
        </button>
      </div>

      {/* 2. BARRA DO TERMÔMETRO VISUAL (PROGRESSO & MARCADORES) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              Faturado: {formatCurrency(faturado)}
            </span>
            <span className="text-[11px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800/40">
              {progressoMeta.toFixed(1)}% da Meta
            </span>
          </div>
          <div className="text-slate-400 font-semibold text-xs">
            Meta Alvo: <strong className="text-white">{formatCurrency(metaValor)}</strong>
          </div>
        </div>

        {/* Trilha do Termômetro */}
        <div className="relative w-full h-5 bg-[#0B1329] rounded-full border border-[#1E2C48] p-0.5 overflow-visible">
          {/* Barra de Preenchimento com Gradiente Dinâmico */}
          <div
            className={`h-full rounded-full transition-all duration-700 shadow-md ${
              progressoMeta >= 100
                ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400"
                : pe?.atingido
                ? "bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400"
                : "bg-gradient-to-r from-blue-600 to-indigo-500"
            }`}
            style={{ width: `${Math.max(2, progressoMeta)}%` }}
          />

          {/* Marcador Físico do Ponto de Equilíbrio (Break-Even) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
            style={{ left: `${posicaoMarcadorPE}%` }}
          >
            <div className="absolute -top-7 -translate-x-1/2 whitespace-nowrap text-[10px] font-black bg-amber-950/90 text-amber-300 border border-amber-600/50 px-2 py-0.5 rounded shadow-lg">
              P.E: {formatCurrency(peValor)}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400"></div>
          </div>
        </div>

        {/* Legenda Explicativa Abaixo da Barra */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <div>
            <span>R$ 0</span>
          </div>
          <div className="text-center font-medium">
            {pe?.atingido ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Custos fixos quitados! Toda receita adicional gera lucro líquido real.
              </span>
            ) : (
              <span className="text-amber-400 font-medium">
                Faltam {formatCurrency(pe?.faltaParaAtingir || 0)} para quitar os custos fixos da oficina.
              </span>
            )}
          </div>
          <div>
            <span>100% da Meta</span>
          </div>
        </div>
      </div>

      {/* 3. CARDS ESTRATÉGICOS DE DECISÃO FINANCEIRA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {/* Card 1: Ponto de Equilíbrio */}
        <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">Ponto de Equilíbrio</span>
            <div className="p-1.5 bg-amber-950/80 text-amber-400 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white">
              {formatCurrency(peValor)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Custo Fixo: {formatCurrency(pe?.custosFixos || 0)} (MC: {(pe?.margemContribuicaoPct || 65).toFixed(0)}%)
            </p>
          </div>
        </div>

        {/* Card 2: Lucro Líquido Além do Ponto */}
        <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">Lucro Líquido Real</span>
            <div className="p-1.5 bg-emerald-950/80 text-emerald-400 rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-emerald-400">
              {formatCurrency(pe?.lucroAlemPonto || 0)}
            </div>
            <p className="mt-1 text-[11px] text-emerald-500/80">
              Lucro livre de custos fixos no mês
            </p>
          </div>
        </div>

        {/* Card 3: Projeção de Fechamento (Run-Rate) */}
        <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">Projeção de Fechamento</span>
            <div className="p-1.5 bg-cyan-950/80 text-cyan-400 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-cyan-400">
              {formatCurrency(metas?.projecaoFechamento || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Ritmo: {formatCurrency(metas?.mediaDiariaRealizada || 0)}/dia
            </p>
          </div>
        </div>

        {/* Card 4: Ritmo Diário Necessário */}
        <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">Meta Diária Restante</span>
            <div className="p-1.5 bg-indigo-950/80 text-indigo-400 rounded-lg">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-indigo-300">
              {formatCurrency(metas?.metaDiariaRestante || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Para {periodo?.diasRestantes || 0} dias restantes no mês
            </p>
          </div>
        </div>
      </div>

      {/* 4. MODAL: CONFIGURAÇÃO DE META E CUSTOS FIXOS */}
      {modalConfigAberto && (
        <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151E34] rounded-2xl shadow-2xl border border-[#1E2C48] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Configurar Metas & Custos Fixos</h3>
                <p className="text-xs text-[#94A3B8]">Personalize as metas mensais da SAMAPE ÍNDIO</p>
              </div>
              <button
                onClick={() => setModalConfigAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarConfig} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Meta de Faturamento Mensal (R$)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ex: 120000"
                  value={metaCustomizada}
                  onChange={(e) => setMetaCustomizada(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-xl focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Meta financeira total que a oficina busca atingir no mês.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Custos Fixos Mensais da Oficina (R$)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ex: 18000"
                  value={custosFixosCustomizados}
                  onChange={(e) => setCustosFixosCustomizados(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-xl focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Soma de aluguel, salários fixos, pró-labore, energia e despesas administrativas.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalConfigAberto(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-colors"
                >
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
