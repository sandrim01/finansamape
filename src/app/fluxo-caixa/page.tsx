"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PeriodFilterBar } from "@/components/PeriodFilterBar";
import { FluxoCaixaProjetado } from "@/components/FluxoCaixaProjetado";
import { TermometroMetas } from "@/components/TermometroMetas";
import { AnaliseLucroReal } from "@/components/AnaliseLucroReal";
import { ModalExportacaoFinanceira } from "@/components/ModalExportacaoFinanceira";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  Clock,
  Target,
  Flame,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FolderTree,
  Tag,
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

export default function FluxoCaixaPage() {
  const [activeTab, setActiveTab] = useState<"projetado" | "dre" | "metas" | "lucro-linhas">("projetado");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [modalExportacaoAberto, setModalExportacaoAberto] = useState(false);
  const [centrosExpandidos, setCentrosExpandidos] = useState<Record<string, boolean>>({
    OFICINA: true,
    CAMPO: true,
    PESSOAL: true,
    ADMINISTRATIVO: true,
    TRIBUTARIO: true,
  });

  const toggleCentro = (id: string) => {
    setCentrosExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSeedDespesas = async () => {
    try {
      setSeeding(true);
      const res = await fetch("/api/centros-custo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_exemplo" }),
      });
      if (res.ok) {
        await carregarDados(ano, mes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  // Filtros de período para o DRE
  const [ano, setAno] = useState("ALL");
  const [mes, setMes] = useState("ALL");

  const carregarDados = async (anoParam = ano, mesParam = mes) => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        ano: anoParam,
        mes: mesParam,
      }).toString();

      const res = await fetch(`/api/dashboard?${query}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados(ano, mes);
  }, [ano, mes]);

  const handlePeriodChange = (novoAno: string, novoMes: string) => {
    setAno(novoAno);
    setMes(novoMes);
  };

  const resumo = data?.resumo;
  const periodo = data?.periodo;

  const receitaMaoObra = resumo?.totalMaoObra || 0;
  const receitaPecas = resumo?.totalPecas || 0;
  const receitaKm = resumo?.totalDeslocamento || 0;
  const receitaBruta = resumo?.receitaBruta ?? (receitaMaoObra + receitaPecas + receitaKm);

  const custoPecasEstimado = resumo?.custoPecasEstimado ?? (receitaPecas > 0 ? receitaPecas * 0.55 : 0);
  const lucroBruto = resumo?.lucroBruto ?? (receitaBruta - custoPecasEstimado);

  const despesasOperacionais = resumo?.aPagarRealizado || 0;
  const despesasPendentes = resumo?.aPagarPendente || 0;
  const lucroLiquidoRealizado = resumo?.lucroLiquidoRealizado ?? (lucroBruto - despesasOperacionais);

  const margemBruta = resumo?.margemBruta ?? (receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0);
  const margemLiquida = resumo?.margemLiquida ?? (receitaBruta > 0 ? (lucroLiquidoRealizado / receitaBruta) * 100 : 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B1329]">
      <Header
        title={
          activeTab === "projetado"
            ? "Fluxo de Caixa Projetado & Previsão"
            : activeTab === "metas"
            ? "Ponto de Equilíbrio & Metas Mensais"
            : activeTab === "lucro-linhas"
            ? "Análise de Lucro Real por Linha de Receita"
            : "Demonstrativo de Resultado & DRE"
        }
        subtitle={
          activeTab === "projetado"
            ? "Previsão do saldo bancário futuro e análise de ponto crítico (7, 15, 30 e 60 dias)"
            : activeTab === "metas"
            ? "Análise de cobertura de custos fixos, margem de contribuição e ritmo de fechamento"
            : activeTab === "lucro-linhas"
            ? "Mão de Obra vs. Peças vs. Deslocamento: apuração real da margem de contribuição da Samape"
            : "Apuração contábil e rentabilidade operacional da Samape por período"
        }
        onRefresh={() => carregarDados(ano, mes)}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* SELETOR DE ABAS PRINCIPAIS */}
        <div className="flex items-center gap-2 border-b border-[#1E2C48] pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab("projetado")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "projetado"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-[#151E34]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Fluxo de Caixa Projetado</span>
          </button>

          <button
            onClick={() => setActiveTab("metas")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "metas"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-[#151E34]"
            }`}
          >
            <Target className="w-4 h-4 text-amber-300" />
            <span>Ponto de Equilíbrio & Metas</span>
            <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-black">
              Novo
            </span>
          </button>

          <button
            onClick={() => setActiveTab("lucro-linhas")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "lucro-linhas"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-slate-400 hover:text-white hover:bg-[#151E34]"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Lucro Real por Linha</span>
            <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-black">
              Novo
            </span>
          </button>

          <button
            onClick={() => setActiveTab("dre")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "dre"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-[#151E34]"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Demonstrativo DRE</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setModalExportacaoAberto(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Executivo (Excel / PDF)</span>
            </button>
          </div>
        </div>

        {/* CONTEÚDO DA ABA: LUCRO REAL POR LINHA */}
        {activeTab === "lucro-linhas" && <AnaliseLucroReal />}

        {/* CONTEÚDO DA ABA 1: FLUXO DE CAIXA PROJETADO */}
        {activeTab === "projetado" && <FluxoCaixaProjetado />}

        {/* CONTEÚDO DA ABA 2: PONTO DE EQUILÍBRIO & METAS */}
        {activeTab === "metas" && (
          <div className="space-y-6">
            <PeriodFilterBar
              anoSelecionado={ano}
              mesSelecionado={mes}
              anosDisponiveis={periodo?.anosDisponiveis || ["2026", "2025"]}
              periodoLabel={periodo?.label}
              onPeriodChange={handlePeriodChange}
              isLoading={loading}
            />
            <TermometroMetas ano={ano} mes={mes} />
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: DRE DO EXERCÍCIO */}
        {activeTab === "dre" && (
          <div className="space-y-6">
            {/* BARRA DE FILTROS DE PERÍODO (ANO E MÊS) */}
            <PeriodFilterBar
              anoSelecionado={ano}
              mesSelecionado={mes}
              anosDisponiveis={periodo?.anosDisponiveis || ["2026", "2025"]}
              periodoLabel={periodo?.label}
              onPeriodChange={handlePeriodChange}
              isLoading={loading}
            />

            {/* CARDS DE KPI DO PERÍODO SELECIONADO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#94A3B8]">Receita Bruta</span>
                  <div className="p-2 bg-blue-950 text-blue-400 border border-blue-800/40 rounded-lg">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black text-white tracking-tight">
                    {formatCurrency(receitaBruta)}
                  </div>
                  <p className="mt-1 text-xs text-blue-400 font-medium">
                    {resumo?.osFechadasQtd || 0} OS no período selecionado
                  </p>
                </div>
              </div>

              <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#94A3B8]">Lucro Bruto Operacional</span>
                  <div className="p-2 bg-cyan-950 text-cyan-400 border border-cyan-800/40 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black text-cyan-400 tracking-tight">
                    {formatCurrency(lucroBruto)}
                  </div>
                  <p className="mt-1 text-xs text-cyan-500 font-medium">
                    Margem Bruta: {margemBruta.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#94A3B8]">Despesas Quitadas</span>
                  <div className="p-2 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-lg">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black text-[#F87171] tracking-tight">
                    {formatCurrency(despesasOperacionais)}
                  </div>
                  <p className="mt-1 text-xs text-[#94A3B8] font-medium">
                    Pendente: {formatCurrency(despesasPendentes)}
                  </p>
                </div>
              </div>

              <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#94A3B8]">Resultado Líquido Final</span>
                  <div className="p-2 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black text-emerald-400 tracking-tight">
                    {formatCurrency(lucroLiquidoRealizado)}
                  </div>
                  <p className="mt-1 text-xs text-emerald-500 font-medium">
                    Margem Líquida: {margemLiquida.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* ESTRUTURA DO DRE (DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO) */}
            <div id="dre-documento" className="bg-[#151E34] rounded-2xl border border-[#1E2C48] overflow-hidden">
              <div className="p-5 border-b border-[#1E2C48] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-white text-sm">
                      Demonstrativo de Resultado do Exercício (DRE)
                    </h3>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Período em apuração: <span className="text-white font-bold">{periodo?.label}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 bg-[#0B1329] border border-[#1E2C48] px-2.5 py-1 rounded-md">
                    Regime de Competência
                  </span>

                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-[#0B1329] hover:bg-[#1B2745] text-slate-300 hover:text-white border border-[#1E2C48] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    title="Imprimir demonstrativo"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Imprimir DRE</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* 1. RECEITA OPERACIONAL BRUTA */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3.5 bg-blue-950/40 border border-blue-900/40 rounded-xl font-bold text-sm text-blue-300">
                    <span>(+) RECEITA BRUTA DE SERVIÇOS E MANUTENÇÕES</span>
                    <span>{formatCurrency(receitaBruta)}</span>
                  </div>
                  <div className="pl-6 pr-3 space-y-1.5 text-slate-400">
                    <div className="flex justify-between">
                      <span>• Mão de Obra Técnica Especializada (OS)</span>
                      <span className="font-semibold text-white">{formatCurrency(receitaMaoObra)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Peças & Insumos Mecânicos Faturados</span>
                      <span className="font-semibold text-white">{formatCurrency(receitaPecas)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        • Deslocamento Técnico ({resumo?.totalKmRodados || 0} km rodados via hodômetro)
                      </span>
                      <span className="font-semibold text-white">{formatCurrency(receitaKm)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. CUSTO DOS SERVIÇOS PRESTADOS */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-3.5 bg-amber-950/40 border border-amber-900/40 rounded-xl font-bold text-sm text-amber-300">
                    <span>(-) CUSTOS DIRETOS (CPV / PEÇAS E MATERIAIS)</span>
                    <span>- {formatCurrency(custoPecasEstimado)}</span>
                  </div>
                  <div className="pl-6 pr-3 space-y-1.5 text-slate-400">
                    <div className="flex justify-between">
                      <span>• Custo Estimado de Aquisição das Peças Aplicadas</span>
                      <span className="font-semibold text-white">- {formatCurrency(custoPecasEstimado)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. LUCRO BRUTO OPERACIONAL */}
                <div className="flex items-center justify-between p-3.5 bg-[#0B1329] rounded-xl font-black text-sm text-white border border-[#1E2C48]">
                  <div className="flex items-center gap-2">
                    <span>(=) LUCRO BRUTO OPERACIONAL</span>
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-800/40 px-2 py-0.5 rounded">
                      Margem: {margemBruta.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-base text-cyan-400">{formatCurrency(lucroBruto)}</span>
                </div>

                {/* 4. DESPESAS OPERACIONAIS E CENTROS DE CUSTO */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3.5 bg-rose-950/40 border border-rose-900/40 rounded-xl font-bold text-sm text-rose-300">
                    <div className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-rose-400" />
                      <span>(-) DESPESAS OPERACIONAIS POR CENTRO DE CUSTO</span>
                    </div>
                    <span>- {formatCurrency(despesasOperacionais)}</span>
                  </div>

                  {/* Se houver despesas por centro de custo */}
                  {data?.despesasPorCentroCusto && data.despesasPorCentroCusto.some((cc: any) => cc.totalGeral > 0) ? (
                    <div className="space-y-3 pl-2 sm:pl-4">
                      {/* Mini Gráfico Donut de Despesas por Centro de Custo */}
                      <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="w-full md:w-48 h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={data.despesasPorCentroCusto.filter((cc: any) => cc.totalGeral > 0)}
                                dataKey="totalGeral"
                                nameKey="nome"
                                cx="50%"
                                cy="50%"
                                innerRadius={28}
                                outerRadius={48}
                                paddingAngle={3}
                              >
                                {data.despesasPorCentroCusto
                                  .filter((cc: any) => cc.totalGeral > 0)
                                  .map((entry: any) => (
                                    <Cell key={entry.id} fill={entry.cor} />
                                  ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any) => [formatCurrency(val), "Despesa"]}
                                contentStyle={{
                                  backgroundColor: "#151E34",
                                  borderColor: "#1E2C48",
                                  borderRadius: "8px",
                                  color: "#fff",
                                  fontSize: "12px",
                                }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Pílulas de Legenda dos Centros */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
                          {data.despesasPorCentroCusto
                            .filter((cc: any) => cc.totalGeral > 0)
                            .map((cc: any) => {
                              const pct =
                                despesasOperacionais + despesasPendentes > 0
                                  ? (cc.totalGeral / (despesasOperacionais + despesasPendentes)) * 100
                                  : 0;
                              return (
                                <div
                                  key={cc.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-[#151E34] border border-[#1E2C48] text-xs"
                                >
                                  <div className="flex items-center gap-1.5 line-clamp-1">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: cc.cor }}
                                    />
                                    <span className="text-gray-300 font-medium truncate">{cc.nome}</span>
                                  </div>
                                  <span className="text-white font-mono font-bold shrink-0 ml-2">
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Lista Hierárquica Expansível dos 5 Centros de Custos */}
                      <div className="space-y-2">
                        {data.despesasPorCentroCusto.map((cc: any) => {
                          const expandido = centrosExpandidos[cc.id] ?? true;
                          const pct =
                            despesasOperacionais + despesasPendentes > 0
                              ? (cc.totalGeral / (despesasOperacionais + despesasPendentes)) * 100
                              : 0;

                          return (
                            <div
                              key={cc.id}
                              className="bg-[#0B1329] border border-[#1E2C48] rounded-xl overflow-hidden transition-all hover:border-slate-700"
                            >
                              <button
                                type="button"
                                onClick={() => toggleCentro(cc.id)}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-[#151E34]/50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="p-1 rounded-md text-gray-400"
                                    style={{ color: cc.cor }}
                                  >
                                    {expandido ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </div>
                                  <span
                                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: `${cc.cor}20`, color: cc.cor }}
                                  >
                                    {cc.codigo}
                                  </span>
                                  <span className="font-semibold text-white text-xs">{cc.nome}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-gray-400 font-mono">
                                    {pct > 0 ? `${pct.toFixed(1)}% das despesas` : "0%"}
                                  </span>
                                  <span className="font-mono font-bold text-rose-400 text-xs">
                                    - {formatCurrency(cc.totalGeral)}
                                  </span>
                                </div>
                              </button>

                              {/* Subcategorias expandidas */}
                              {expandido && (
                                <div className="px-4 pb-3 pt-1 border-t border-[#1E2C48]/60 bg-[#0E172A]/40 space-y-1.5">
                                  {cc.subcategoriasLista && cc.subcategoriasLista.length > 0 ? (
                                    cc.subcategoriasLista.map((sub: any) => (
                                      <div
                                        key={sub.nome}
                                        className="flex items-center justify-between text-xs text-gray-400 pl-6"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-gray-600">•</span>
                                          <span>{sub.nome}</span>
                                        </div>
                                        <span className="font-mono text-gray-300">
                                          {formatCurrency(sub.valor)}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-gray-500 text-[11px] pl-6 italic">
                                      Nenhum lançamento neste centro no período.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-[#0B1329] border border-[#1E2C48] text-center space-y-3 my-2">
                      <p className="text-gray-400 text-xs">
                        Nenhuma despesa operacional cadastrada no período selecionado ({periodo?.label}).
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={handleSeedDespesas}
                          disabled={seeding}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>
                            {seeding
                              ? "Lançando despesas padrão..."
                              : "Inserir Despesas Padrão da Oficina (Exemplo Realista)"}
                          </span>
                        </button>
                        <Link
                          href="/contas-pagar"
                          className="px-4 py-2 bg-[#151E34] hover:bg-[#1E2C48] text-gray-300 text-xs font-semibold rounded-xl border border-[#1E2C48] transition-colors"
                        >
                          Lançar em Contas a Pagar
                        </Link>
                      </div>
                    </div>
                  )}

                  {despesasPendentes > 0 && (
                    <div className="flex justify-between text-amber-400/80 pt-1 text-xs px-2">
                      <span>* Contas a Pagar Ainda Pendentes de Vencimento no Período</span>
                      <span className="font-mono font-bold">{formatCurrency(despesasPendentes)}</span>
                    </div>
                  )}
                </div>

                {/* 5. LUCRO LÍQUIDO FINAL */}
                <div className="flex items-center justify-between p-4 bg-emerald-950/50 rounded-xl font-black text-sm text-emerald-300 border border-emerald-800/50">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span>(=) RESULTADO LÍQUIDO FINAL DO PERÍODO</span>
                    <span className="text-[10px] font-black text-emerald-300 bg-emerald-900/80 border border-emerald-700/60 px-2 py-0.5 rounded">
                      Margem Líquida: {margemLiquida.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-lg text-emerald-400 font-black">
                    {formatCurrency(lucroLiquidoRealizado)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CENTRAL DE EXPORTAÇÃO FINANCEIRA */}
      <ModalExportacaoFinanceira
        isOpen={modalExportacaoAberto}
        onClose={() => setModalExportacaoAberto(false)}
      />
    </div>
  );
}
