"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function FluxoCaixaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
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
    carregarDados();
  }, []);

  const resumo = data?.resumo;

  const receitaMaoObra = resumo?.totalMaoObra || 0;
  const receitaPecas = resumo?.totalPecas || 0;
  const receitaKm = resumo?.totalDeslocamento || 0;
  const receitaBruta = receitaMaoObra + receitaPecas + receitaKm;

  const custoPecasEstimado = receitaPecas > 0 ? receitaPecas * 0.55 : 0;
  const lucroBruto = receitaBruta - custoPecasEstimado;

  const despesasOperacionais = resumo?.aPagarRealizado || 0;
  const lucroLiquidoRealizado = lucroBruto - despesasOperacionais;

  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
  const margemLiquida = receitaBruta > 0 ? (lucroLiquidoRealizado / receitaBruta) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B1329]">
      <Header
        title="Fluxo de Caixa & DRE Gerencial"
        subtitle="Demonstrativo de resultado e rentabilidade operacional da Samape"
        onRefresh={carregarDados}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* KPI Cards de Resultado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Receita Bruta Total</span>
              <div className="p-2 bg-blue-950 text-blue-400 border border-blue-800/40 rounded-lg">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(receitaBruta)}
              </div>
              <p className="mt-1 text-xs text-[#94A3B8] font-medium">OS Concluídas & Faturadas</p>
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
              <span className="text-xs font-semibold text-[#94A3B8]">Despesas Pagas</span>
              <div className="p-2 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-[#F87171] tracking-tight">
                {formatCurrency(despesasOperacionais)}
              </div>
              <p className="mt-1 text-xs text-[#94A3B8] font-medium">Custos fixos e fornecedores</p>
            </div>
          </div>

          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Resultado Líquido</span>
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

        {/* ESTRUTURA DO DRE */}
        <div className="bg-[#151E34] rounded-2xl border border-[#1E2C48] overflow-hidden">
          <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" /> Demonstrativo de Resultado Gerencial (DRE)
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Visão contábil consolidada a partir do banco de dados da Samape
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-[#0B1329] border border-[#1E2C48] px-2.5 py-1 rounded-md">
              Regime de Competência
            </span>
          </div>

          <div className="p-6 space-y-4 text-xs">
            {/* 1. Receita Operacional Bruta */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3.5 bg-blue-950/40 border border-blue-900/40 rounded-xl font-bold text-sm text-blue-300">
                <span>(+) RECEITA BRUTA DE SERVIÇOS E MANUTENÇÕES</span>
                <span>{formatCurrency(receitaBruta)}</span>
              </div>
              <div className="pl-6 pr-3 space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>• Receita de Mão de Obra Técnica (OS)</span>
                  <span className="font-semibold text-white">{formatCurrency(receitaMaoObra)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Receita de Peças e Insumos Faturados</span>
                  <span className="font-semibold text-white">{formatCurrency(receitaPecas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Receita de Deslocamento Técnico (Quilometragem)</span>
                  <span className="font-semibold text-white">{formatCurrency(receitaKm)}</span>
                </div>
              </div>
            </div>

            {/* 2. Custos dos Serviços Prestados */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-amber-950/40 border border-amber-900/40 rounded-xl font-bold text-sm text-amber-300">
                <span>(-) CUSTOS DIRETOS (CPV / PEÇAS E MATERIAIS)</span>
                <span>- {formatCurrency(custoPecasEstimado)}</span>
              </div>
              <div className="pl-6 pr-3 space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>• Custo de Aquisição das Peças Aplicadas</span>
                  <span className="font-semibold text-white">- {formatCurrency(custoPecasEstimado)}</span>
                </div>
              </div>
            </div>

            {/* 3. Lucro Bruto */}
            <div className="flex items-center justify-between p-3.5 bg-[#0B1329] rounded-xl font-black text-sm text-white border border-[#1E2C48]">
              <span>(=) LUCRO BRUTO OPERACIONAL</span>
              <span className="text-base text-cyan-400">{formatCurrency(lucroBruto)}</span>
            </div>

            {/* 4. Despesas Operacionais e Fixas */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-rose-950/40 border border-rose-900/40 rounded-xl font-bold text-sm text-rose-300">
                <span>(-) DESPESAS OPERACIONAIS E ADMINISTRATIVAS</span>
                <span>- {formatCurrency(despesasOperacionais)}</span>
              </div>
              <div className="pl-6 pr-3 space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>• Despesas Pagas (Contas a Pagar Liquidadas)</span>
                  <span className="font-semibold text-white">- {formatCurrency(despesasOperacionais)}</span>
                </div>
              </div>
            </div>

            {/* 5. Lucro Líquido */}
            <div className="flex items-center justify-between p-4 bg-emerald-950/50 rounded-xl font-black text-sm text-emerald-300 border border-emerald-800/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>(=) RESULTADO LÍQUIDO FINAL</span>
              </div>
              <span className="text-lg text-emerald-400 font-black">{formatCurrency(lucroLiquidoRealizado)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
