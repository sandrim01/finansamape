"use client";

import { useRef, useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DADOS_EMPRESA, gerarHashAutenticacaoDocumento } from "@/lib/empresa";
import { DadosExportacaoFinanceira } from "@/lib/exportacaoFinanceira";
import { CENTROS_DE_CUSTO } from "@/lib/centrosCusto";
import {
  Printer,
  X,
  FileSpreadsheet,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Landmark,
} from "lucide-react";

interface RelatorioContabilPDFModalProps {
  dados: DadosExportacaoFinanceira | null;
  isOpen: boolean;
  onClose: () => void;
  onBaixarExcel?: () => void;
}

export function RelatorioContabilPDFModal({
  dados,
  isOpen,
  onClose,
  onBaixarExcel,
}: RelatorioContabilPDFModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [hashRelatorio, setHashRelatorio] = useState<string>("GERANDO...");

  useEffect(() => {
    if (dados) {
      gerarHashAutenticacaoDocumento({
        protocolo: `REL-DRE-${dados.periodoLabel.replace(/\s+/g, "")}`,
        data: new Date().toISOString().split("T")[0],
        valor: dados.dre.receitaBrutaTotal,
        pagadorOuFavorecido: DADOS_EMPRESA.razaoSocial,
      }).then(setHashRelatorio);
    }
  }, [dados]);

  if (!isOpen || !dados) return null;

  const handleImprimir = () => {
    window.print();
  };

  const hojeFormatado = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const horaFormatada = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Botões de Ação Superiores (ocultados na impressão) */}
      <div className="fixed top-4 right-6 flex items-center gap-3 print:hidden z-50">
        {onBaixarExcel && (
          <button
            onClick={onBaixarExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Baixar Planilha Excel (.xlsx)</span>
          </button>
        )}
        <button
          onClick={handleImprimir}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar PDF</span>
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-[#151E34] hover:bg-[#1B2745] text-slate-300 hover:text-white border border-[#1E2C48] rounded-xl transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* DOCUMENTO DO RELATÓRIO CONTÁBIL EXECUTIVO (Papel Timbrado A4) */}
      <div
        ref={printRef}
        className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl p-8 md:p-12 my-8 print:my-0 print:p-8 print:shadow-none print:max-w-none print:w-full print:rounded-none select-text border border-slate-200"
      >
        {/* CABEÇALHO OFICIAL COM IDENTIFICAÇÃO CADASTRAL */}
        <div className="flex items-start justify-between border-b-2 border-slate-900/10 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Logo Samape Índio"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
                {DADOS_EMPRESA.nomeFantasia}
              </h1>
              <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                {DADOS_EMPRESA.razaoSocial} • CNPJ: {DADOS_EMPRESA.cnpj} ({DADOS_EMPRESA.porte})
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {DADOS_EMPRESA.enderecoCompleto}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Telefone: {DADOS_EMPRESA.telefone} • Chave PIX: {DADOS_EMPRESA.chavePix} • CNAE {DADOS_EMPRESA.cnae}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block bg-slate-900 text-white font-black text-[11px] px-3 py-1 rounded uppercase tracking-wider">
              Relatório Financeiro Executivo
            </span>
            <div className="mt-2 text-right">
              <p className="text-xs font-extrabold text-blue-900">
                {dados.periodoLabel.toUpperCase()}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Emissão: {hojeFormatado} às {horaFormatada}
              </p>
            </div>
          </div>
        </div>

        {/* CARDS COM INDICADORES EXECUTIVOS RESUMIDOS */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Receita Bruta Total
            </span>
            <p className="text-base font-black text-slate-900 mt-0.5">
              {formatCurrency(dados.dre.receitaBrutaTotal)}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">100% Faturado</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Margem Contribuição
            </span>
            <p className="text-base font-black text-slate-900 mt-0.5">
              {formatCurrency(dados.dre.margemContribuicao)}
            </p>
            <span className="text-[10px] text-blue-600 font-bold">
              {dados.dre.margemContribuicaoPerc}% da Receita
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Despesas Operacionais
            </span>
            <p className="text-base font-black text-rose-700 mt-0.5">
              {formatCurrency(dados.dre.despesasTotais)}
            </p>
            <span className="text-[10px] text-slate-500">5 Centros de Custo</span>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              dados.dre.lucroLiquido >= 0
                ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                : "bg-rose-50 border-rose-300 text-rose-950"
            }`}
          >
            <span className="text-[10px] uppercase font-bold block">Resultado Líquido</span>
            <p className="text-base font-black mt-0.5">
              {formatCurrency(dados.dre.lucroLiquido)}
            </p>
            <span className="text-[10px] font-bold">
              Margem Líquida: {dados.dre.margemLiquidaPerc}%
            </span>
          </div>
        </div>

        {/* 1. QUADRO PRINCIPAL: DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO (DRE) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="bg-slate-100 px-4 py-2.5 text-xs font-black uppercase text-slate-700 tracking-wider flex justify-between border-b border-slate-200">
            <span>Demonstrativo do Resultado do Exercício (DRE Gerencial)</span>
            <span>Valor (R$)</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* 1. RECEITA BRUTA */}
            <div className="bg-slate-50/60 px-4 py-2 font-black text-slate-900 flex justify-between">
              <span>1.0 RECEITA OPERACIONAL BRUTA</span>
              <span>{formatCurrency(dados.dre.receitaBrutaTotal)}</span>
            </div>
            <div className="px-6 py-1.5 flex justify-between text-slate-600">
              <span>(+) Mão de Obra Mecânica Oficina & Campo</span>
              <span className="font-semibold text-slate-800">{formatCurrency(dados.dre.receitaMaoObra)}</span>
            </div>
            <div className="px-6 py-1.5 flex justify-between text-slate-600">
              <span>(+) Peças, Filtros e Componentes de Reposição</span>
              <span className="font-semibold text-slate-800">{formatCurrency(dados.dre.receitaPecas)}</span>
            </div>
            <div className="px-6 py-1.5 flex justify-between text-slate-600">
              <span>(+) Deslocamento Técnico e Auto Socorro</span>
              <span className="font-semibold text-slate-800">{formatCurrency(dados.dre.receitaDeslocamento)}</span>
            </div>

            {/* 2. CUSTOS DIRETOS */}
            <div className="bg-slate-50/60 px-4 py-2 font-black text-rose-800 flex justify-between">
              <span>2.0 (-) CUSTOS VARIÁVEIS DIRETOS TÉCNICOS</span>
              <span>-{formatCurrency(dados.dre.custosDiretosTotal)}</span>
            </div>
            <div className="px-6 py-1.5 flex justify-between text-slate-600">
              <span>(-) Custo de Reposição de Peças (CMV)</span>
              <span className="font-semibold text-slate-800">-{formatCurrency(dados.dre.custoPecas)}</span>
            </div>
            <div className="px-6 py-1.5 flex justify-between text-slate-600">
              <span>(-) Custo Operacional de Deslocamento / Combustível Frota</span>
              <span className="font-semibold text-slate-800">-{formatCurrency(dados.dre.custoFrota)}</span>
            </div>

            {/* 3. MARGEM DE CONTRIBUIÇÃO */}
            <div className="bg-blue-50/80 px-4 py-2 font-black text-blue-900 flex justify-between border-t border-b border-blue-200">
              <span>3.0 (=) MARGEM DE CONTRIBUIÇÃO BRUTA</span>
              <span>
                {formatCurrency(dados.dre.margemContribuicao)} ({dados.dre.margemContribuicaoPerc}%)
              </span>
            </div>

            {/* 4. DESPESAS POR CENTRO DE CUSTO */}
            <div className="bg-slate-50/60 px-4 py-2 font-black text-rose-800 flex justify-between">
              <span>4.0 (-) DESPESAS OPERACIONAIS FIXAS POR CENTRO DE CUSTO</span>
              <span>-{formatCurrency(dados.dre.despesasTotais)}</span>
            </div>
            {CENTROS_DE_CUSTO.map((cc) => {
              const val = dados.dre.despesasOperacionais[cc.id] || 0;
              const perc = dados.dre.despesasTotais
                ? ((val / dados.dre.despesasTotais) * 100).toFixed(1)
                : "0.0";
              return (
                <div key={cc.id} className="px-6 py-1.5 flex justify-between text-slate-600">
                  <span>
                    (-) {cc.codigo} - {cc.nome}
                  </span>
                  <span className="font-semibold text-slate-800">
                    -{formatCurrency(val)} ({perc}%)
                  </span>
                </div>
              );
            })}

            {/* 5. LUCRO LÍQUIDO */}
            <div
              className={`px-4 py-3 font-black text-sm flex justify-between ${
                dados.dre.lucroLiquido >= 0
                  ? "bg-slate-900 text-white"
                  : "bg-rose-900 text-white"
              }`}
            >
              <span>5.0 (=) RESULTADO OPERACIONAL LÍQUIDO</span>
              <span className={dados.dre.lucroLiquido >= 0 ? "text-emerald-400" : "text-rose-200"}>
                {formatCurrency(dados.dre.lucroLiquido)} ({dados.dre.margemLiquidaPerc}%)
              </span>
            </div>
          </div>
        </div>

        {/* 2. QUADRO DE PONTO DE EQUILÍBRIO & FLUXO DE CAIXA PROJETADO */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              Ponto de Equilíbrio (Break-Even)
            </h3>
            <p className="text-lg font-black text-slate-900">
              {formatCurrency(dados.dre.pontoEquilibrio)}
            </p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Faturamento mensal mínimo necessário para cobrir todos os custos diretos e despesas operacionais da oficina, zerando o risco de prejuízo.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-600" />
              Fluxo de Caixa Projetado
            </h3>
            <div className="space-y-1 text-xs">
              {dados.fluxoCaixaProjetado.map((fc) => (
                <div key={fc.dias} className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">{fc.label}:</span>
                  <span
                    className={`font-mono font-bold ${
                      fc.saldoAcumulado >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {formatCurrency(fc.saldoAcumulado)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. QUADRO DE INADIMPLÊNCIA & AGING LIST */}
        {dados.inadimplencia.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-rose-50 px-4 py-2 text-xs font-bold text-rose-900 border-b border-rose-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Resumo da Carteira de Inadimplência ({dados.inadimplencia.length} títulos vencidos)
              </span>
              <span className="font-black">
                Total:{" "}
                {formatCurrency(
                  dados.inadimplencia.reduce((acc, i) => acc + i.valorCobravel, 0)
                )}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {dados.inadimplencia.slice(0, 5).map((item, idx) => (
                <div key={idx} className="px-4 py-2 flex justify-between items-center text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900">{item.cliente}</span>
                    <span className="text-slate-400 text-[10px] ml-2 font-mono">
                      {item.documento} • {item.diasAtraso} dias de atraso ({item.faixaAtraso})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-rose-700">
                    {formatCurrency(item.valorCobravel)}
                  </span>
                </div>
              ))}
              {dados.inadimplencia.length > 5 && (
                <div className="px-4 py-1.5 text-center text-[10px] text-slate-500 bg-slate-50">
                  + {dados.inadimplencia.length - 5} outros títulos em atraso discriminados na planilha Excel completa.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TERMO DE ENCERRAMENTO & AUTENTICAÇÃO DIGITAL SHA-256 */}
        <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="max-w-md">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Autenticação Digital & Integridade Criptográfica (SHA-256)</span>
            </div>
            <p className="text-xs font-mono font-bold text-slate-800 mt-1 tracking-wider bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
              HASH: {hashRelatorio}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Relatório oficial consolidado emitido automaticamente pelo sistema SAMAPEOP Financeiro. Registros contábeis e gerenciais auditáveis.
            </p>
          </div>

          <div className="w-72 border-t border-slate-400 pt-2 text-center shrink-0">
            <p className="text-xs font-black text-slate-900">{DADOS_EMPRESA.razaoSocial}</p>
            <p className="text-[11px] font-bold text-slate-700">{DADOS_EMPRESA.nomeFantasia}</p>
            <p className="text-[10px] text-slate-500">Diretoria Executiva & Controladoria</p>
          </div>
        </div>
      </div>
    </div>
  );
}
