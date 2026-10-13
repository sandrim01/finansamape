"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { PeriodFilterBar } from "@/components/PeriodFilterBar";
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
  AlertCircle,
  Percent,
} from "lucide-react";

export default function FluxoCaixaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros de período
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
        title="Demonstrativo de Resultado & DRE"
        subtitle="Apuração contábil e rentabilidade operacional da Samape por período"
        onRefresh={() => carregarDados(ano, mes)}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* BARRA DE FILTROS DE PERÍODO (ANO E MÊS) */}
        <PeriodFilterBar
          anoSelecionado={ano}
          mesSelecionado={mes}
          anosDisponiveis={periodo?.anosDisponiveis || ["2026", "2025"]}
          periodoLabel={periodo?.label}
          onPeriodChange={handlePeriodChange}
          isLoading={loading}
        />

        {/* 1. CARDS DE KPI DO PERÍODO SELECIONADO */}
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

        {/* 2. ESTRUTURA DO DRE (DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO) */}
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

            {/* 4. DESPESAS OPERACIONAIS E FIXAS */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-rose-950/40 border border-rose-900/40 rounded-xl font-bold text-sm text-rose-300">
                <span>(-) DESPESAS OPERACIONAIS E ADMINISTRATIVAS</span>
                <span>- {formatCurrency(despesasOperacionais)}</span>
              </div>
              <div className="pl-6 pr-3 space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>• Despesas Pagas no Período (Fornecedores, Combustível, Folha)</span>
                  <span className="font-semibold text-white">- {formatCurrency(despesasOperacionais)}</span>
                </div>
                {despesasPendentes > 0 && (
                  <div className="flex justify-between text-amber-400/80 pt-1">
                    <span>* Contas a Pagar Ainda Pendentes de Vencimento</span>
                    <span>{formatCurrency(despesasPendentes)}</span>
                  </div>
                )}
              </div>
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
    </div>
  );
}
