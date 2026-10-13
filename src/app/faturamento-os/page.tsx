"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Receipt,
  CheckCircle,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  FileCheck,
  X,
  FileText,
  Printer,
} from "lucide-react";
import {
  NotaFaturamentoModal,
  NotaFaturamentoData,
} from "@/components/NotaFaturamentoModal";

interface OrdemServico {
  id: number;
  numero_os: string;
  cliente_id: number;
  cliente_nome: string;
  cliente?: {
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
  maquina: string;
  maquina_detalhes?: {
    tipo?: string;
    modelo?: string;
    numero_serie?: string;
    ano?: number | null;
  } | null;
  mecanico: string;
  data_abertura: string;
  data_fechamento: string | null;
  descricao_problema?: string | null;
  servicos_realizados?: string | null;
  status: string;
  valor_mao_obra: number;
  valor_pecas: number;
  valor_total: number;
  km_total: number;
  valor_por_km: number;
  valor_deslocamento: number;
  faturado: boolean;
  faturamento_info?: {
    id: number;
    status: string;
    valor: number;
    data_vencimento: string;
    forma_pagamento?: string;
    observacoes?: string;
    created_at?: string;
  } | null;
}

export default function FaturamentoOsPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("TODAS");
  const [busca, setBusca] = useState("");

  // Modal de faturamento
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);
  const [dataVencimento, setDataVencimento] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("BOLETO");
  const [observacoes, setObservacoes] = useState("");
  const [faturando, setFaturando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Estado para exibir a Nota de Faturamento gerada ou existente
  const [notaExibicao, setNotaExibicao] = useState<NotaFaturamentoData | null>(null);

  const carregarOrdens = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ordens-servico/faturar");
      if (!res.ok) throw new Error("Erro ao carregar OS");
      const data = await res.json();
      setOrdens(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOrdens();
  }, []);

  const abrirModalFaturar = (os: OrdemServico) => {
    setOsSelecionada(os);
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setDataVencimento(d.toISOString().split("T")[0]);
    setFormaPagamento("BOLETO");
    setObservacoes(`Faturamento da OS ${os.numero_os} (${os.cliente_nome})`);
  };

  const handleGerarContaReceber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osSelecionada) return;

    try {
      setFaturando(true);
      const res = await fetch("/api/ordens-servico/faturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          os_id: osSelecionada.id,
          data_vencimento: dataVencimento,
          forma_pagamento: formaPagamento,
          observacoes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao faturar OS");
      }

      const json = await res.json();

      setSucessoMsg(`OS ${osSelecionada.numero_os} faturada com sucesso!`);
      setOsSelecionada(null);
      await carregarOrdens();

      // Abrir imediatamente a Nota de Faturamento completa na tela com a logo
      if (json.nota_faturamento) {
        setNotaExibicao(json.nota_faturamento);
      }

      setTimeout(() => setSucessoMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || "Falha ao gerar faturamento");
    } finally {
      setFaturando(false);
    }
  };

  const visualizarNotaExistente = (os: OrdemServico) => {
    if (!os.faturamento_info) return;

    const nota: NotaFaturamentoData = {
      fatura_id: os.faturamento_info.id,
      numero_os: os.numero_os,
      data_abertura: os.data_abertura,
      data_fechamento: os.data_fechamento,
      data_emissao: os.faturamento_info.created_at || os.data_fechamento,
      data_vencimento: os.faturamento_info.data_vencimento,
      forma_pagamento: os.faturamento_info.forma_pagamento || "BOLETO",
      observacoes: os.faturamento_info.observacoes,
      status_pagamento: os.faturamento_info.status,
      valor_mao_obra: os.valor_mao_obra,
      valor_pecas: os.valor_pecas,
      km_total: os.km_total,
      valor_por_km: os.valor_por_km,
      valor_deslocamento: os.valor_deslocamento,
      valor_total: os.valor_total,
      cliente: os.cliente || { nome: os.cliente_nome },
      maquina: os.maquina_detalhes || { modelo: os.maquina },
      mecanico: os.mecanico,
      servicos_realizados: os.servicos_realizados,
      descricao_problema: os.descricao_problema,
    };

    setNotaExibicao(nota);
  };

  const ordensFiltradas = ordens.filter((os) => {
    const matchBusca =
      os.numero_os.toLowerCase().includes(busca.toLowerCase()) ||
      os.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
      os.maquina.toLowerCase().includes(busca.toLowerCase());

    if (!matchBusca) return false;

    if (filtroStatus === "FECHADAS") return os.status?.toUpperCase() === "FECHADA";
    if (filtroStatus === "ABERTAS") return os.status?.toUpperCase() !== "FECHADA";
    if (filtroStatus === "FATURADAS") return os.faturado;
    if (filtroStatus === "PENDENTES_FAT") return os.status?.toUpperCase() === "FECHADA" && !os.faturado;

    return true;
  });

  const totalFechadas = ordens.filter((os) => os.status?.toUpperCase() === "FECHADA").length;
  const totalFaturadas = ordens.filter((os) => os.faturado).length;
  const pendentesFaturar = totalFechadas - totalFaturadas;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B1329]">
      <Header
        title="Faturamento de OS"
        subtitle="Integração direta com o operacional: fature manutenções concluídas da Samape"
        onRefresh={carregarOrdens}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {sucessoMsg && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <p className="font-semibold text-xs">{sucessoMsg}</p>
            </div>
            {notaExibicao && (
              <button
                onClick={() => setNotaExibicao(notaExibicao)}
                className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Ver Nota de Faturamento
              </button>
            )}
          </div>
        )}

        {/* Resumo Rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#94A3B8]">OS Concluídas na Oficina</p>
              <p className="text-2xl font-black text-white mt-1">{totalFechadas}</p>
            </div>
            <div className="p-2.5 bg-blue-950 text-blue-400 border border-blue-800/40 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#94A3B8]">Faturadas no Financeiro</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{totalFaturadas}</p>
            </div>
            <div className="p-2.5 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#94A3B8]">Prontas para Faturar</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{pendentesFaturar}</p>
            </div>
            <div className="p-2.5 bg-amber-950 text-amber-400 border border-amber-800/40 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-[#151E34] p-4 rounded-xl border border-[#1E2C48] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por Nº da OS, Cliente ou Máquina..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            {[
              { id: "TODAS", label: "Todas" },
              { id: "PENDENTES_FAT", label: "Prontas p/ Faturar" },
              { id: "FATURADAS", label: "Faturadas" },
              { id: "ABERTAS", label: "Em Aberto" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroStatus(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  filtroStatus === f.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Ordens de Serviço */}
        <div className="bg-[#151E34] rounded-2xl border border-[#1E2C48] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#11192E] text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#1E2C48]">
                <tr>
                  <th className="py-3 px-5">Ordem de Serviço</th>
                  <th className="py-3 px-5">Cliente & Máquina</th>
                  <th className="py-3 px-5">Mecânico</th>
                  <th className="py-3 px-5">Status Oficina</th>
                  <th className="py-3 px-5 text-right">Mão de Obra</th>
                  <th className="py-3 px-5 text-right">Peças</th>
                  <th className="py-3 px-5 text-right">Valor Total</th>
                  <th className="py-3 px-5 text-center">Faturamento</th>
                  <th className="py-3 px-5 text-center">Nota / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2C48]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Carregando ordens de serviço...
                    </td>
                  </tr>
                ) : ordensFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Nenhuma ordem de serviço encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  ordensFiltradas.map((os) => {
                    const isFechada = os.status?.toUpperCase() === "FECHADA";

                    return (
                      <tr key={os.id} className="hover:bg-[#1B2745]/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <span className="font-bold text-white block">{os.numero_os}</span>
                          <span className="text-[10px] text-slate-500">{formatDate(os.data_abertura)}</span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-semibold text-slate-200 block">{os.cliente_nome}</span>
                          <span className="text-[11px] text-slate-400">{os.maquina}</span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-400">{os.mecanico}</td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${
                              isFechada
                                ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/50"
                                : "bg-amber-950/70 text-amber-400 border border-amber-800/50"
                            }`}
                          >
                            {os.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-300 font-medium">
                          {formatCurrency(os.valor_mao_obra)}
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-300 font-medium">
                          {formatCurrency(os.valor_pecas)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-black text-white">
                          {formatCurrency(os.valor_total)}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {os.faturado ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/50">
                              <FileCheck className="w-3 h-3 text-blue-400" />
                              Faturado
                            </span>
                          ) : isFechada ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-[#1B2745] text-slate-300">
                              Pendente
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Em oficina</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {!os.faturado && isFechada ? (
                            <button
                              onClick={() => abrirModalFaturar(os)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1"
                            >
                              <Receipt className="w-3 h-3" /> Faturar
                            </button>
                          ) : os.faturado ? (
                            <button
                              onClick={() => visualizarNotaExistente(os)}
                              className="px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/50 text-[11px] font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
                              title="Visualizar e Imprimir Nota de Faturamento"
                            >
                              <Printer className="w-3 h-3" /> Ver Fatura
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500">Aguardando OS</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: FORMULÁRIO PARA FATURAR OS */}
      {osSelecionada && (
        <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151E34] rounded-2xl shadow-2xl border border-[#1E2C48] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Faturar Ordem de Serviço</h3>
                <p className="text-xs text-[#94A3B8]">
                  Gere a cobrança e emita a Nota de Faturamento da OS #{osSelecionada.numero_os}
                </p>
              </div>
              <button
                onClick={() => setOsSelecionada(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGerarContaReceber} className="p-6 space-y-4">
              <div className="bg-[#0B1329] p-3 rounded-xl border border-[#1E2C48] text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Cliente:</span>
                  <span className="text-white font-bold">{osSelecionada.cliente_nome}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Valor Total da OS:</span>
                  <span className="text-emerald-400 font-black text-sm">
                    {formatCurrency(osSelecionada.valor_total)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Forma de Pagamento Prevista *</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="A_VISTA">Dinheiro / À Vista</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Observações de Faturamento</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOsSelecionada(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1B2745] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={faturando}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {faturando ? "Gerando Fatura..." : "Faturar & Gerar Nota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOTA DE FATURAMENTO COM A LOGO NO TOPO */}
      {notaExibicao && (
        <NotaFaturamentoModal
          nota={notaExibicao}
          onClose={() => setNotaExibicao(null)}
        />
      )}
    </div>
  );
}
