"use client";

import { useRef } from "react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { DADOS_EMPRESA } from "@/lib/empresa";
import { Printer, X, CheckCircle, FileText, Calendar, Building, Wrench, ShieldCheck, DollarSign } from "lucide-react";

export interface NotaFaturamentoData {
  fatura_id: number;
  numero_os: string;
  data_abertura?: string | null;
  data_fechamento?: string | null;
  data_emissao?: string | Date | null;
  data_vencimento: string | Date;
  forma_pagamento: string;
  observacoes?: string | null;
  status_pagamento?: string;
  valor_mao_obra: number;
  valor_pecas: number;
  km_ida?: number | null;
  km_volta?: number | null;
  km_total?: number;
  valor_por_km?: number;
  valor_deslocamento?: number;
  valor_total: number;
  cliente: {
    nome: string;
    cnpj?: string | null;
    cpf?: string | null;
    telefone?: string | null;
    email?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
  } | null;
  maquina?: {
    tipo?: string;
    modelo?: string;
    numero_serie?: string;
    ano?: number | null;
  } | null;
  mecanico?: string;
  servicos_realizados?: string | null;
  descricao_problema?: string | null;
}

interface NotaFaturamentoModalProps {
  nota: NotaFaturamentoData | null;
  onClose: () => void;
}

export function NotaFaturamentoModal({ nota, onClose }: NotaFaturamentoModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!nota) return null;

  const handleImprimir = () => {
    window.print();
  };

  const numeroFatura = `FAT-${String(nota.fatura_id).padStart(5, "0")}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Botões de Ação Superiores (ocultados na impressão) */}
      <div className="fixed top-4 right-6 flex items-center gap-3 print:hidden z-50">
        <button
          onClick={handleImprimir}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar PDF</span>
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-[#151E34] hover:bg-[#1B2745] text-slate-300 hover:text-white border border-[#1E2C48] rounded-xl transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* DOCUMENTO DA NOTA DE FATURAMENTO (Estilo Folha A4 / Papel Timbrado) */}
      <div
        ref={printRef}
        id="nota-faturamento-impressao"
        className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl p-8 md:p-10 my-8 print:my-0 print:p-8 print:shadow-none print:max-w-none print:w-full print:rounded-none select-text"
      >
        {/* 1. CABEÇALHO COM A LOGO OFICIAL NO TOPO */}
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
              <h2 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
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

          <div className="text-right">
            <span className="inline-block bg-slate-900 text-white font-black text-xs px-3 py-1 rounded-md uppercase tracking-wider">
              Nota de Faturamento
            </span>
            <div className="mt-2">
              <p className="text-sm font-extrabold text-slate-900">{numeroFatura}</p>
              <p className="text-xs font-bold text-blue-700">OS #{nota.numero_os}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Emissão: {formatDate(nota.data_emissao || new Date())}
              </p>
            </div>
          </div>
        </div>

        {/* 2. DADOS DO CLIENTE & EQUIPAMENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Dados do Cliente */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Dados do Cliente / Faturamento</span>
            </div>
            <p className="font-extrabold text-sm text-slate-900">{nota.cliente?.nome || "Cliente não informado"}</p>
            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
              {nota.cliente?.cnpj && <p><span className="font-semibold text-slate-700">CNPJ:</span> {nota.cliente.cnpj}</p>}
              {nota.cliente?.cpf && <p><span className="font-semibold text-slate-700">CPF:</span> {nota.cliente.cpf}</p>}
              {nota.cliente?.telefone && <p><span className="font-semibold text-slate-700">Telefone:</span> {nota.cliente.telefone}</p>}
              {(nota.cliente?.cidade || nota.cliente?.estado) && (
                <p><span className="font-semibold text-slate-700">Localidade:</span> {[nota.cliente.cidade, nota.cliente.estado].filter(Boolean).join(" - ")}</p>
              )}
              {nota.cliente?.endereco && (
                <p><span className="font-semibold text-slate-700">Endereço:</span> {nota.cliente.endereco}</p>
              )}
            </div>
          </div>

          {/* Dados da Máquina & Serviço */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
              <span>Equipamento & Manutenção</span>
            </div>
            <p className="font-extrabold text-sm text-slate-900">
              {nota.maquina ? `${nota.maquina.tipo || "Máquina"} - ${nota.maquina.modelo || ""}` : "Equipamento Geral"}
            </p>
            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
              {nota.maquina?.numero_serie && (
                <p><span className="font-semibold text-slate-700">Nº de Série:</span> {nota.maquina.numero_serie}</p>
              )}
              <p><span className="font-semibold text-slate-700">Técnico / Mecânico:</span> {nota.mecanico || "Técnico Samape"}</p>
              {nota.data_fechamento && (
                <p><span className="font-semibold text-slate-700">Conclusão OS:</span> {formatDate(nota.data_fechamento)}</p>
              )}
              {nota.servicos_realizados && (
                <p className="line-clamp-2 text-[11px] text-slate-500 pt-0.5">
                  <span className="font-semibold text-slate-700">Serviço:</span> {nota.servicos_realizados}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. DISCRIMINAÇÃO DOS VALORES FATURADOS */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Item / Descrição do Custo</th>
                <th className="py-2.5 px-4 text-center">Referência</th>
                <th className="py-2.5 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4">
                  <span className="font-bold text-slate-900 block">Mão de Obra Técnica Especializada</span>
                  <span className="text-[11px] text-slate-500">
                    Serviço de manutenção mecânica, desmontagem, reparo e testes operacionais
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-slate-500">Serviço</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">
                  {formatCurrency(nota.valor_mao_obra)}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4">
                  <span className="font-bold text-slate-900 block">Peças & Insumos Aplicados</span>
                  <span className="text-[11px] text-slate-500">
                    Componentes, reparos, óleos e filtros aplicados conforme ordem de serviço
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-slate-500">Materiais</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">
                  {formatCurrency(nota.valor_pecas)}
                </td>
              </tr>

              {(nota.valor_deslocamento || 0) > 0 && (
                <tr>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">Deslocamento Técnico (Quilometragem)</span>
                    <span className="text-[11px] text-slate-500">
                      Transporte técnico até o cliente: {nota.km_total || 0} km rodados a {formatCurrency(nota.valor_por_km)}/km
                    </span>
                    {Boolean(nota.km_ida && nota.km_volta) && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Hodômetro Saída: {Number(nota.km_ida).toLocaleString("pt-BR")} km | Retorno: {Number(nota.km_volta).toLocaleString("pt-BR")} km
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 font-semibold">{nota.km_total || 0} km</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800">
                    {formatCurrency(nota.valor_deslocamento)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-extrabold text-sm">
              <tr>
                <td colSpan={2} className="py-3 px-4 uppercase tracking-wider">
                  Valor Total Faturado
                </td>
                <td className="py-3 px-4 text-right text-base text-emerald-400 font-black">
                  {formatCurrency(nota.valor_total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 4. CONDIÇÕES DE PAGAMENTO & VENCIMENTO (EM DESTAQUE) */}
        <div className="bg-amber-50/80 border-2 border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                Condições de Faturamento
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xs font-bold text-slate-700">Vencimento da Fatura:</span>
                <span className="text-lg font-black text-rose-600 bg-white border border-rose-200 px-2.5 py-0.5 rounded-lg shadow-sm">
                  {formatDate(nota.data_vencimento)}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-1">
                Forma de Pagamento: <span className="font-black text-slate-900 uppercase">{nota.forma_pagamento || "BOLETO"}</span>
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-amber-200 pt-3 sm:pt-0 sm:pl-5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Dados para Pagamento / PIX</span>
              <p className="text-xs font-black text-slate-900 mt-0.5">{DADOS_EMPRESA.chavePix}</p>
              <p className="text-[10px] text-slate-600">Tel / Whats: {DADOS_EMPRESA.telefone}</p>
              <p className="text-[10px] text-slate-500">Titular: {DADOS_EMPRESA.razaoSocial}</p>
            </div>
          </div>

          {nota.observacoes && (
            <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Observações:</span> {nota.observacoes}
            </div>
          )}
        </div>

        {/* 5. TERMOS & ASSINATURAS */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-[10px] text-slate-400 text-center mb-8">
            Os serviços descritos foram prestados e aprovados conforme ordem de serviço correspondente. Favor efetuar o pagamento até a data limite indicada.
          </p>

          <div className="grid grid-cols-2 gap-12 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                {DADOS_EMPRESA.razaoSocial}
              </div>
              <p className="text-[10px] text-slate-500">{DADOS_EMPRESA.nomeFantasia} • CNPJ {DADOS_EMPRESA.cnpj}</p>
            </div>

            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                {nota.cliente?.nome || "Cliente / Contratante"}
              </div>
              <p className="text-[10px] text-slate-500">De acordo / Recebimento</p>
            </div>
          </div>
        </div>
      </div>

      {/* ESTILOS DE IMPRESSÃO CSS PARA GERAR PDF LIMPO */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, aside, button, nav {
            display: none !important;
          }
          #nota-faturamento-impressao {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
