"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DADOS_EMPRESA } from "@/lib/empresa";
import { DadosExportacaoFinanceira } from "@/lib/exportacaoFinanceira";
import { RelatorioContabilPDFModal } from "./RelatorioContabilPDFModal";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  X,
  Printer,
  Sparkles,
  BarChart3,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ModalExportacaoFinanceiraProps {
  isOpen: boolean;
  onClose: () => void;
  tipoInicial?: "CONSOLIDADO" | "DRE" | "RECEBER" | "PAGAR" | "INADIMPLENCIA";
}

export function ModalExportacaoFinanceira({
  isOpen,
  onClose,
  tipoInicial = "CONSOLIDADO",
}: ModalExportacaoFinanceiraProps) {
  const [tipoPeriodo, setTipoPeriodo] = useState<"MES_ATUAL" | "ANO_ATUAL" | "PERSONALIZADO">("ANO_ATUAL");
  const [ano, setAno] = useState<string>("2026");
  const [mes, setMes] = useState<string>("10");
  const [dataInicio, setDataInicio] = useState<string>("2026-01-01");
  const [dataFim, setDataFim] = useState<string>("2026-12-31");

  const [baixando, setBaixando] = useState<boolean>(false);
  const [carregandoPDF, setCarregandoPDF] = useState<boolean>(false);
  const [dadosRelatorio, setDadosRelatorio] = useState<DadosExportacaoFinanceira | null>(null);
  const [modalPDFAberto, setModalPDFAberto] = useState<boolean>(false);

  if (!isOpen) return null;

  const buildQueryString = (formato: "xlsx" | "json") => {
    const params = new URLSearchParams();
    params.set("formato", formato);

    if (tipoPeriodo === "ANO_ATUAL") {
      params.set("ano", ano);
    } else if (tipoPeriodo === "MES_ATUAL") {
      params.set("ano", ano);
      params.set("mes", mes);
    } else if (tipoPeriodo === "PERSONALIZADO") {
      if (dataInicio) params.set("dataInicio", dataInicio);
      if (dataFim) params.set("dataFim", dataFim);
    }

    return params.toString();
  };

  const handleBaixarExcel = () => {
    try {
      setBaixando(true);
      const qs = buildQueryString("xlsx");
      const url = `/api/relatorios/exportar?${qs}`;
      // Inicia o download nativo do arquivo .xlsx
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Erro ao disparar download do Excel.");
    } finally {
      setTimeout(() => setBaixando(false), 2000);
    }
  };

  const handleAbrirPDF = async () => {
    try {
      setCarregandoPDF(true);
      const qs = buildQueryString("json");
      const res = await fetch(`/api/relatorios/exportar?${qs}`);
      if (!res.ok) throw new Error("Erro ao carregar dados do relatório contábil.");
      const data: DadosExportacaoFinanceira = await res.json();
      setDadosRelatorio(data);
      setModalPDFAberto(true);
    } catch (err: any) {
      alert(err.message || "Erro ao gerar visualização do PDF.");
    } finally {
      setCarregandoPDF(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Cabeçalho */}
          <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between bg-[#11192E]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  Central de Exportação Financeira Executiva
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-extrabold bg-blue-950 text-blue-300 border border-blue-800">
                    EXCEL & PDF
                  </span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Emissão de DRE, Fluxo de Caixa, Aging List e Extratos Contábeis da SAMAPE
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2C48] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Seletor de Período */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Selecione o Período de Apuração:
              </label>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setTipoPeriodo("ANO_ATUAL")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                    tipoPeriodo === "ANO_ATUAL"
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30"
                      : "bg-[#0B1329] border-[#1E2C48] text-slate-400 hover:text-white"
                  }`}
                >
                  Ano Corrente (2026)
                </button>

                <button
                  type="button"
                  onClick={() => setTipoPeriodo("MES_ATUAL")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                    tipoPeriodo === "MES_ATUAL"
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30"
                      : "bg-[#0B1329] border-[#1E2C48] text-slate-400 hover:text-white"
                  }`}
                >
                  Mês de Outubro / 2026
                </button>

                <button
                  type="button"
                  onClick={() => setTipoPeriodo("PERSONALIZADO")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                    tipoPeriodo === "PERSONALIZADO"
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30"
                      : "bg-[#0B1329] border-[#1E2C48] text-slate-400 hover:text-white"
                  }`}
                >
                  Data Personalizada
                </button>
              </div>

              {tipoPeriodo === "PERSONALIZADO" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#0B1329] rounded-xl border border-[#1E2C48] animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Data Início:
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#151E34] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Data Fim:
                    </label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#151E34] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Opções de Exportação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Planilha Excel .XLSX */}
              <div className="bg-[#0B1329] border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/60 transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">Planilha Excel (.xlsx)</h4>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">5 Abas Integradas</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2 mb-4">
                    Gera arquivo nativo do Microsoft Excel com fórmulas ativas:
                  </p>
                  <ul className="text-[11px] text-slate-300 space-y-1 mb-4">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Aba 1: DRE Gerencial Completo
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Aba 2: Contas a Receber & Clientes
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Aba 3: Despesas & 5 Centros de Custo
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Aba 4: Fluxo de Caixa Projetado
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Aba 5: Aging List de Inadimplência
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleBaixarExcel}
                  disabled={baixando}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{baixando ? "Gerando Planilha..." : "Baixar Planilha Excel (.xlsx)"}</span>
                </button>
              </div>

              {/* Card 2: PDF Contábil Executivo */}
              <div className="bg-[#0B1329] border border-blue-500/30 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/60 transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40">
                      <FileText className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">Relatório Contábil (PDF)</h4>
                      <span className="text-[10px] text-blue-400 font-bold uppercase">Papel Timbrado Oficial</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2 mb-4">
                    Documento executivo formatado para impressão A4 ou envio à diretoria e contabilidade:
                  </p>
                  <ul className="text-[11px] text-slate-300 space-y-1 mb-4">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      Dados Oficiais da Samape Mecânica Pesada
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      Demonstrativo Contábil Estruturado
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      Ponto de Equilíbrio & Indicadores
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      Autenticação Digital Criptográfica SHA-256
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      Termo e Linha de Assinatura
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleAbrirPDF}
                  disabled={carregandoPDF}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>{carregandoPDF ? "Carregando..." : "Visualizar & Imprimir PDF"}</span>
                </button>
              </div>
            </div>

            {/* Rodapé informativo */}
            <div className="p-3 bg-[#11192E] border border-[#1E2C48] rounded-xl flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Compatível com auditoria contábil e conciliação bancária SAMAPEOP
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO E IMPRESSÃO DO PDF */}
      <RelatorioContabilPDFModal
        dados={dadosRelatorio}
        isOpen={modalPDFAberto}
        onClose={() => setModalPDFAberto(false)}
        onBaixarExcel={handleBaixarExcel}
      />
    </>
  );
}
