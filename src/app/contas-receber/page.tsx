"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowDownLeft,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  X,
} from "lucide-react";

interface ContaReceber {
  id: number;
  cliente_id: number | null;
  cliente_nome: string;
  os_id: number | null;
  numero_os: string | null;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string;
  observacoes: string | null;
  created_at: string;
}

interface ClienteOpt {
  id: number;
  nome: string;
}

export default function ContasReceberPage() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoClienteId, setNovoClienteId] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoVencimento, setNovoVencimento] = useState("");
  const [novoFormaPagamento, setNovoFormaPagamento] = useState("PIX");
  const [novoObservacoes, setNovoObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarContas = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contas-receber");
      if (!res.ok) throw new Error("Erro ao buscar contas a receber");
      const data = await res.json();
      setContas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const carregarClientes = async () => {
    try {
      const res = await fetch("/api/clientes");
      if (res.ok) {
        const data = await res.json();
        setClientes(data.map((c: any) => ({ id: c.id, nome: c.nome })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarContas();
    carregarClientes();
  }, []);

  const handleCriarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvando(true);
      const res = await fetch("/api/contas-receber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: novoClienteId || null,
          descricao: novoDescricao,
          valor: novoValor,
          data_vencimento: novoVencimento,
          forma_pagamento: novoFormaPagamento,
          observacoes: novoObservacoes,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar cobrança");

      setModalNovoAberto(false);
      setNovoDescricao("");
      setNovoValor("");
      setNovoVencimento("");
      setNovoObservacoes("");
      await carregarContas();
    } catch (err: any) {
      alert(err.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const handleMarcarComoPago = async (id: number) => {
    if (!confirm("Confirmar recebimento deste valor?")) return;
    try {
      const res = await fetch("/api/contas-receber", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "PAGO",
          data_pagamento: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        await carregarContas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
    try {
      const res = await fetch(`/api/contas-receber?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await carregarContas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hoje = new Date().toISOString().split("T")[0];

  const totalPendente = contas
    .filter((c) => c.status !== "PAGO")
    .reduce((acc, c) => acc + c.valor, 0);

  const totalPago = contas
    .filter((c) => c.status === "PAGO")
    .reduce((acc, c) => acc + c.valor, 0);

  const totalVencido = contas
    .filter((c) => c.status !== "PAGO" && c.data_vencimento < hoje)
    .reduce((acc, c) => acc + c.valor, 0);

  const contasFiltradas = contas.filter((c) => {
    const matchBusca =
      c.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      c.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.numero_os && c.numero_os.toLowerCase().includes(busca.toLowerCase()));

    if (!matchBusca) return false;

    if (filtroStatus === "PENDENTE") return c.status !== "PAGO" && c.data_vencimento >= hoje;
    if (filtroStatus === "PAGO") return c.status === "PAGO";
    if (filtroStatus === "VENCIDO") return c.status !== "PAGO" && c.data_vencimento < hoje;

    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B1329]">
      <Header
        title="Contas a Receber"
        subtitle="Gerencie entradas financeiras, cobranças e recebimentos da Samape"
        onRefresh={carregarContas}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">A Receber (No Prazo)</span>
              <div className="p-2 bg-blue-950 text-blue-400 border border-blue-800/40 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(totalPendente)}
              </div>
              <p className="mt-1 text-xs text-[#94A3B8] font-medium">Previsão de entrada futura</p>
            </div>
          </div>

          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Recebido (Liquidado)</span>
              <div className="p-2 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-emerald-400 tracking-tight">
                {formatCurrency(totalPago)}
              </div>
              <p className="mt-1 text-xs text-emerald-500 font-medium">Entradas confirmadas em caixa</p>
            </div>
          </div>

          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Vencido / Em Atraso</span>
              <div className="p-2 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-[#F87171] tracking-tight">
                {formatCurrency(totalVencido)}
              </div>
              <p className="mt-1 text-xs text-[#F87171] font-medium">Cobranças em atraso</p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Ação */}
        <div className="bg-[#151E34] p-4 rounded-xl border border-[#1E2C48] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por descrição, cliente ou OS..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between">
            <div className="flex items-center gap-2">
              {[
                { id: "TODOS", label: "Todos" },
                { id: "PENDENTE", label: "No Prazo" },
                { id: "VENCIDO", label: "Vencidos" },
                { id: "PAGO", label: "Pagos" },
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

            <button
              onClick={() => setModalNovoAberto(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Cobrança
            </button>
          </div>
        </div>

        {/* Tabela de Contas a Receber */}
        <div className="bg-[#151E34] rounded-2xl border border-[#1E2C48] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#11192E] text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#1E2C48]">
                <tr>
                  <th className="py-3 px-5">Descrição</th>
                  <th className="py-3 px-5">Cliente</th>
                  <th className="py-3 px-5">Origem</th>
                  <th className="py-3 px-5">Vencimento</th>
                  <th className="py-3 px-5">Forma</th>
                  <th className="py-3 px-5 text-right">Valor</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2C48]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Carregando contas a receber...
                    </td>
                  </tr>
                ) : contasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <ArrowDownLeft className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-semibold text-slate-300">Nenhum recebimento registrado</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Fature uma Ordem de Serviço ou clique em "Nova Cobrança" para começar.
                      </p>
                    </td>
                  </tr>
                ) : (
                  contasFiltradas.map((c) => {
                    const isPago = c.status === "PAGO";
                    const isVencido = !isPago && c.data_vencimento < hoje;

                    return (
                      <tr key={c.id} className="hover:bg-[#1B2745]/60 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-white">{c.descricao}</td>
                        <td className="py-3.5 px-5 text-slate-300">{c.cliente_nome}</td>
                        <td className="py-3.5 px-5">
                          {c.numero_os ? (
                            <span className="font-bold text-xs text-blue-400">OS #{c.numero_os}</span>
                          ) : (
                            <span className="text-slate-500">Avulso</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-[#94A3B8]">
                          {formatDate(c.data_vencimento)}
                        </td>
                        <td className="py-3.5 px-5 text-slate-300 font-medium">
                          {c.forma_pagamento || "PIX"}
                        </td>
                        <td className="py-3.5 px-5 text-right font-black text-white">
                          {formatCurrency(c.valor)}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {isPago ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                              Pago
                            </span>
                          ) : isVencido ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/70 text-rose-400 border border-rose-800/50">
                              Vencido
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/70 text-blue-400 border border-blue-800/50">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!isPago && (
                              <button
                                onClick={() => handleMarcarComoPago(c.id)}
                                title="Marcar como Pago"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" /> Receber
                              </button>
                            )}
                            <button
                              onClick={() => handleExcluir(c.id)}
                              title="Excluir Lançamento"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* MODAL: NOVA COBRANÇA */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151E34] rounded-2xl shadow-2xl border border-[#1E2C48] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Nova Cobrança a Receber</h3>
                <p className="text-xs text-[#94A3B8]">Lançamento financeiro manual ou avulso</p>
              </div>
              <button
                onClick={() => setModalNovoAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarConta} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cliente</label>
                <select
                  value={novoClienteId}
                  onChange={(e) => setNovoClienteId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione um cliente (opcional)</option>
                  {clientes.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manutenção preventiva avulsa, Consultoria"
                  value={novoDescricao}
                  onChange={(e) => setNovoDescricao(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Data Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={novoVencimento}
                    onChange={(e) => setNovoVencimento(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Forma de Pagamento</label>
                <select
                  value={novoFormaPagamento}
                  onChange={(e) => setNovoFormaPagamento(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                  <option value="DINHEIRO">Dinheiro / À Vista</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={novoObservacoes}
                  onChange={(e) => setNovoObservacoes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1B2745] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar Cobrança"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
