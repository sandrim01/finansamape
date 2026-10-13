"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Calendar,
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

  // Cálculos do DRE Gerencial
  const receitaMaoObra = resumo?.totalMaoObra || 0;
  const receitaPecas = resumo?.totalPecas || 0;
  const receitaKm = resumo?.totalDeslocamento || 0;
  const receitaBruta = receitaMaoObra + receitaPecas + receitaKm;

  // Custo estimado de peças (usando proporção média da tabela pecas de custo x venda)
  const custoPecasEstimado = receitaPecas > 0 ? receitaPecas * 0.55 : 0;
  const lucroBruto = receitaBruta - custoPecasEstimado;

  const despesasOperacionais = resumo?.aPagarRealizado || 0;
  const lucroLiquidoRealizado = lucroBruto - despesasOperacionais;

  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
  const margemLiquida = receitaBruta > 0 ? (lucroLiquidoRealizado / receitaBruta) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header
        title="Fluxo de Caixa & DRE Gerencial"
        subtitle="Demonstrativo de resultado e rentabilidade operacional da Samape"
        onRefresh={carregarDados}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* KPI Cards de Resultado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Receita Bruta Total</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(receitaBruta)}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">OS Concluídas & Faturadas</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Lucro Bruto Operacional</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
                {formatCurrency(lucroBruto)}
              </div>
              <p className="mt-1 text-xs text-indigo-700 font-medium">
                Margem Bruta: {margemBruta.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Despesas Pagas</span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
                {formatCurrency(despesasOperacionais)}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">Custos fixos e fornecedores</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Resultado Líquido</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                {formatCurrency(lucroLiquidoRealizado)}
              </div>
              <p className="mt-1 text-xs text-emerald-700 font-medium">
                Margem Líquida: {margemLiquida.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* ESTRUTURA DO DRE (Demonstrativo de Resultado do Exercício) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Demonstrativo de Resultado Gerencial (DRE)
              </h3>
              <p className="text-xs text-slate-500">
                Visão contábil e operacional consolidada a partir do banco de dados da Samape
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              Regime de Competência
            </span>
          </div>

          <div className="p-6 space-y-4">
            {/* 1. Receita Operacional Bruta */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-blue-50/70 rounded-xl font-bold text-sm text-blue-900">
                <span>(+) RECEITA BRUTA DE SERVIÇOS E MANUTENÇÕES</span>
                <span>{formatCurrency(receitaBruta)}</span>
              </div>
              <div className="pl-6 pr-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>• Receita de Mão de Obra Técnica (OS)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(receitaMaoObra)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Receita de Peças e Insumos Faturados</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(receitaPecas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Receita de Deslocamento Técnico (Quilometragem)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(receitaKm)}</span>
                </div>
              </div>
            </div>

            {/* 2. Custos dos Serviços Prestados */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3 bg-amber-50/70 rounded-xl font-bold text-sm text-amber-900">
                <span>(-) CUSTOS DIRETOS (CPV / PEÇAS E MATERIAIS)</span>
                <span>- {formatCurrency(custoPecasEstimado)}</span>
              </div>
              <div className="pl-6 pr-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>• Custo de Aquisição das Peças Aplicadas</span>
                  <span className="font-semibold text-slate-900">- {formatCurrency(custoPecasEstimado)}</span>
                </div>
              </div>
            </div>

            {/* 3. Lucro Bruto */}
            <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-xl font-extrabold text-sm text-slate-900 border border-slate-200">
              <span>(=) LUCRO BRUTO OPERACIONAL</span>
              <span className="text-base text-blue-700">{formatCurrency(lucroBruto)}</span>
            </div>

            {/* 4. Despesas Operacionais e Fixas */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3 bg-rose-50/70 rounded-xl font-bold text-sm text-rose-900">
                <span>(-) DESPESAS OPERACIONAIS E ADMINISTRATIVAS</span>
                <span>- {formatCurrency(despesasOperacionais)}</span>
              </div>
              <div className="pl-6 pr-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>• Despesas Pagas (Contas a Pagar Liquidadas)</span>
                  <span className="font-semibold text-slate-900">- {formatCurrency(despesasOperacionais)}</span>
                </div>
              </div>
            </div>

            {/* 5. Lucro Líquido */}
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl font-extrabold text-base text-emerald-900 border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>(=) RESULTADO LÍQUIDO FINAL</span>
              </div>
              <span className="text-lg text-emerald-700">{formatCurrency(lucroLiquidoRealizado)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
