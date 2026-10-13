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
  ArrowRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileCheck,
} from "lucide-react";

interface OrdemServico {
  id: number;
  numero_os: string;
  cliente_id: number;
  cliente_nome: string;
  maquina: string;
  mecanico: string;
  data_abertura: string;
  data_fechamento: string | null;
  status: string;
  valor_mao_obra: number;
  valor_pecas: number;
  valor_total: number;
  km_total: number;
  valor_por_km: number;
  faturado: boolean;
  faturamento_info?: {
    id: number;
    status: string;
    valor: number;
    data_vencimento: string;
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

  // Abrir modal para faturar
  const abrirModalFaturar = (os: OrdemServico) => {
    setOsSelecionada(os);
    // Data default: 15 dias a partir de hoje
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

      setSucessoMsg(`OS ${osSelecionada.numero_os} faturada com sucesso em Contas a Receber!`);
      setOsSelecionada(null);
      await carregarOrdens();

      setTimeout(() => setSucessoMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || "Falha ao gerar faturamento");
    } finally {
      setFaturando(false);
    }
  };

  // Filtragem
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
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header
        title="Faturamento de Ordens de Serviço"
        subtitle="Integração direta com a operação: transforme manutenções concluídas em Contas a Receber"
        onRefresh={carregarOrdens}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {sucessoMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <p className="font-semibold text-sm">{sucessoMsg}</p>
          </div>
        )}

        {/* Resumo Rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">OS Concluídas</p>
              <p className="text-xl font-bold text-slate-900">{totalFechadas}</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Faturadas no Financeiro</p>
              <p className="text-xl font-bold text-emerald-600">{totalFaturadas}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Prontas para Faturar</p>
              <p className="text-xl font-bold text-amber-600">{pendentesFaturar}</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Nº da OS, Cliente ou Máquina..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
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
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Ordens de Serviço */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Ordem de Serviço</th>
                  <th className="py-3 px-6">Cliente & Máquina</th>
                  <th className="py-3 px-6">Mecânico</th>
                  <th className="py-3 px-6">Status Oficina</th>
                  <th className="py-3 px-6 text-right">Mão de Obra</th>
                  <th className="py-3 px-6 text-right">Peças</th>
                  <th className="py-3 px-6 text-right">Valor Total</th>
                  <th className="py-3 px-6 text-center">Faturamento</th>
                  <th className="py-3 px-6 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Carregando ordens de serviço do banco de dados...
                    </td>
                  </tr>
                ) : ordensFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Nenhuma ordem de serviço encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  ordensFiltradas.map((os) => {
                    const isFechada = os.status?.toUpperCase() === "FECHADA";

                    return (
                      <tr key={os.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6">
                          <span className="font-bold text-blue-600 block">{os.numero_os}</span>
                          <span className="text-[11px] text-slate-400">{formatDate(os.data_abertura)}</span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="font-semibold text-slate-900 block">{os.cliente_nome}</span>
                          <span className="text-xs text-slate-500">{os.maquina}</span>
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-600">{os.mecanico}</td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isFechada
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isFechada ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {os.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right text-xs font-medium text-slate-700">
                          {formatCurrency(os.valor_mao_obra)}
                        </td>
                        <td className="py-3.5 px-6 text-right text-xs font-medium text-slate-700">
                          {formatCurrency(os.valor_pecas)}
                        </td>
                        <td className="py-3.5 px-6 text-right font-extrabold text-slate-900">
                          {formatCurrency(os.valor_total)}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          {os.faturado ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <FileCheck className="w-3 h-3 text-blue-600" />
                              Faturado
                            </span>
                          ) : isFechada ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Pendente
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Em manutenção</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          {!os.faturado && isFechada ? (
                            <button
                              onClick={() => abrirModalFaturar(os)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1"
                            >
                              <Receipt className="w-3.5 h-3.5" /> Faturar
                            </button>
                          ) : os.faturado ? (
                            <span className="text-xs text-slate-400 font-medium">Contas a Receber #</span>
                          ) : (
                            <span className="text-xs text-slate-400">Aguardando OS</span>
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

      {/* MODAL: GERAR CONTA A RECEBER DA OS */}
      {osSelecionada && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900">Faturar Ordem de Serviço</h3>
              <p className="text-xs text-slate-500">
                Gere uma entrada financeira em Contas a Receber para a OS #{osSelecionada.numero_os}
              </p>
            </div>

            <form onSubmit={handleGerarContaReceber} className="p-6 space-y-4">
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Cliente:</span>
                  <span className="text-slate-900 font-bold">{osSelecionada.cliente_nome}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Valor Total da OS:</span>
                  <span className="text-blue-700 font-extrabold text-sm">
                    {formatCurrency(osSelecionada.valor_total)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Pagamento Prevista</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="A_VISTA">Dinheiro / À Vista</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações / Instruções</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOsSelecionada(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={faturando}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {faturando ? "Gerando Fatura..." : "Confirmar e Lançar no Financeiro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
