"use client";

import { useRef, useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, X, Landmark, ShieldCheck, FileCheck2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { DadosLiquidacao } from "@/lib/baixaInteligente";
import { DADOS_EMPRESA, gerarHashAutenticacaoDocumento } from "@/lib/empresa";

interface ModalReciboQuitacaoProps {
  dados: DadosLiquidacao | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ModalReciboQuitacao({ dados, isOpen, onClose }: ModalReciboQuitacaoProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [hashAutenticacao, setHashAutenticacao] = useState<string>("PROCESSANDO...");

  useEffect(() => {
    if (dados) {
      gerarHashAutenticacaoDocumento({
        protocolo: dados.protocolo,
        data: dados.dataPagamento,
        valor: dados.valorEfetivoPago,
        pagadorOuFavorecido: dados.clienteOuFornecedor,
      }).then(setHashAutenticacao);
    }
  }, [dados]);

  if (!isOpen || !dados) return null;

  const handleImprimir = () => {
    window.print();
  };

  const isRecebimento = dados.tipoOperacao === "RECEBIMENTO";

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Botões de Ação Superiores (ocultados na impressão) */}
      <div className="fixed top-4 right-6 flex items-center gap-3 print:hidden z-50">
        <button
          onClick={handleImprimir}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
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

      {/* DOCUMENTO DO RECIBO (Estilo Folha Timbrada / A4) */}
      <div
        ref={printRef}
        className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl p-8 md:p-10 my-8 print:my-0 print:p-8 print:shadow-none print:max-w-none print:w-full print:rounded-none select-text border border-slate-200"
      >
        {/* CABEÇALHO OFICIAL COM DADOS CADASTRAIS DA SAMAPE */}
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
              <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                {DADOS_EMPRESA.nomeFantasia}
              </h2>
              <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                {DADOS_EMPRESA.razaoSocial} • CNPJ: {DADOS_EMPRESA.cnpj} ({DADOS_EMPRESA.porte})
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {DADOS_EMPRESA.enderecoCompleto}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Tel: {DADOS_EMPRESA.telefone} • Chave PIX: {DADOS_EMPRESA.chavePix} • CNAE {DADOS_EMPRESA.cnae}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 font-black text-[11px] px-3 py-1 rounded-md uppercase tracking-wider ${
                isRecebimento
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-blue-100 text-blue-800 border border-blue-300"
              }`}
            >
              {isRecebimento ? (
                <>
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                  Recibo de Quitação
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                  Comprovante de Pagamento
                </>
              )}
            </span>
            <div className="mt-2 text-right">
              <p className="text-xs font-mono font-bold text-slate-800">
                {dados.protocolo}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Autenticação Gerencial
              </p>
              <p className="text-[11px] font-semibold text-slate-600 mt-1">
                Data: {formatDate(dados.dataPagamento)}
              </p>
            </div>
          </div>
        </div>

        {/* IDENTIFICAÇÃO DAS PARTES */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {isRecebimento ? "Pagador (Cliente)" : "Pagador (Empresa Emitente)"}
            </span>
            <p className="text-sm font-extrabold text-slate-900 leading-tight">
              {isRecebimento ? dados.clienteOuFornecedor : DADOS_EMPRESA.razaoSocial}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {isRecebimento
                ? "Cliente / Tomador de Serviços"
                : `CNPJ: ${DADOS_EMPRESA.cnpj} • ${DADOS_EMPRESA.nomeFantasia}`}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {isRecebimento ? "Beneficiário (Credor)" : "Beneficiário (Fornecedor / Favorecido)"}
            </span>
            <p className="text-sm font-extrabold text-slate-900 leading-tight">
              {isRecebimento ? DADOS_EMPRESA.razaoSocial : dados.clienteOuFornecedor}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {isRecebimento
                ? `CNPJ: ${DADOS_EMPRESA.cnpj} • ${DADOS_EMPRESA.nomeFantasia}`
                : "Fornecedor / Prestador Homologado"}
            </p>
          </div>
        </div>

        {/* DISCRIMINAÇÃO DO TÍTULO */}
        <div className="mb-6">
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Referência do Título / Serviço
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                {dados.descricao}
              </span>
              {dados.documentoRef && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 rounded text-slate-700">
                  {dados.documentoRef}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TABELA DE DEMONSTRATIVO FINANCEIRO */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="bg-slate-100 px-4 py-2 text-[10px] font-black uppercase text-slate-600 tracking-wider flex justify-between border-b border-slate-200">
            <span>Item Demonstrativo</span>
            <span>Valor (R$)</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-slate-600 font-medium">Valor Nominal Original</span>
              <span className="font-semibold text-slate-800">{formatCurrency(dados.valorOriginal)}</span>
            </div>

            {dados.multa > 0 && (
              <div className="px-4 py-2 flex justify-between items-center bg-rose-50/50">
                <span className="text-rose-700 font-medium flex items-center gap-1">
                  (+) Multa por Atraso {dados.multaPercentual ? `(${dados.multaPercentual}%)` : ""}
                </span>
                <span className="font-bold text-rose-700">+{formatCurrency(dados.multa)}</span>
              </div>
            )}

            {dados.juros > 0 && (
              <div className="px-4 py-2 flex justify-between items-center bg-amber-50/50">
                <span className="text-amber-800 font-medium flex items-center gap-1">
                  (+) Juros de Mora Diários {dados.jurosPercentual ? `(${dados.jurosPercentual}%)` : ""}
                </span>
                <span className="font-bold text-amber-800">+{formatCurrency(dados.juros)}</span>
              </div>
            )}

            {dados.desconto > 0 && (
              <div className="px-4 py-2 flex justify-between items-center bg-emerald-50/50">
                <span className="text-emerald-800 font-medium flex items-center gap-1">
                  (-) Desconto / Abatimento Especial {dados.descontoPercentual ? `(${dados.descontoPercentual}%)` : ""}
                </span>
                <span className="font-bold text-emerald-800">-{formatCurrency(dados.desconto)}</span>
              </div>
            )}

            <div className="px-4 py-3 flex justify-between items-center bg-slate-900 text-white font-black text-sm">
              <span>VALOR TOTAL LIQUIDADO</span>
              <span className="text-base text-emerald-400">
                {formatCurrency(dados.valorEfetivoPago)}
              </span>
            </div>
          </div>
        </div>

        {/* ALERTA DE BAIXA PARCIAL SE APLICÁVEL */}
        {dados.tipoBaixa === "PARCIAL" && dados.saldoRestante ? (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <span className="font-bold">⚠️ Baixa Parcial Efetivada:</span>
            <span>
              Foi realizado o pagamento parcial de {formatCurrency(dados.valorEfetivoPago)}. Resta um saldo de{" "}
              <strong>{formatCurrency(dados.saldoRestante)}</strong>
              {dados.novaDataVencimento ? ` com vencimento agendado para ${formatDate(dados.novaDataVencimento)}.` : "."}
            </span>
          </div>
        ) : null}

        {/* DADOS BANCÁRIOS & MEIO DE PAGAMENTO */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Conta Bancária / Tesouraria
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Landmark className="w-3.5 h-3.5 text-slate-600" />
              <span>{dados.contaBancariaNome}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Forma de Pagamento
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{dados.formaPagamento}</span>
            </div>
          </div>
        </div>

        {/* DECLARAÇÃO DE QUITAÇÃO FORMAL */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-[11px] text-slate-600 text-justify leading-relaxed mb-8">
          <p>
            <strong>DECLARAÇÃO:</strong> Declaramos para os devidos fins de direito que o valor acima discriminado foi
            efetivamente {isRecebimento ? "recebido e creditado" : "pago e liquidado"} na presente data, conferindo{" "}
            {dados.tipoBaixa === "PARCIAL" ? "quitação parcial no limite deste valor" : "plena, rasa e geral quitação"}{" "}
            às obrigações referentes a este título financeiro.
          </p>
        </div>

        {/* ASSINATURA & AUTENTICAÇÃO DIGITAL SHA-256 */}
        <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="max-w-md">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Autenticação Digital & Integridade (SHA-256)</span>
            </div>
            <p className="text-xs font-mono font-bold text-slate-800 mt-1 tracking-wider bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
              HASH: {hashAutenticacao}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Código de validação criptográfica pública que comprova a integridade e autenticidade deste documento no sistema SAMAPEOP.
            </p>
          </div>

          <div className="w-72 border-t border-slate-400 pt-2 text-center shrink-0">
            <p className="text-xs font-black text-slate-900">{DADOS_EMPRESA.razaoSocial}</p>
            <p className="text-[11px] font-bold text-slate-700">{DADOS_EMPRESA.nomeFantasia}</p>
            <p className="text-[10px] text-slate-500">CNPJ {DADOS_EMPRESA.cnpj} • Financeiro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
