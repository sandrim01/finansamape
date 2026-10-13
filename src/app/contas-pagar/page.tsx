"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowUpRight,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  Calendar,
  X,
  Tag,
} from "lucide-react";

interface ContaPagar {
  id: number;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string;
  observacoes: string | null;
  created_at: string;
}

const CATEGORIAS = [
  "Peças & Fornecedores",
  "Combustível & Deslocamento",
  "Folha de Pagamento & Pró-labore",
  "Ferramentas & Equipamentos",
  "Aluguel & Infraestrutura",
  "Impostos & Tributos",
  "Software & Licenças",
  "Outros",
];

export default function ContasPagarPage() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState("ALL");
  const [busca, setBusca] = useState("");

  // Modal Nova Despesa
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [novoCategoria, setNovoCategoria] = useState("Peças & Fornecedores");
  const [novoValor, setNovoValor] = useState("");
  const [novoVencimento, setNovoVencimento] = useState("");
  const [novoFormaPagamento, setNovoFormaPagamento] = useState("BOLETO");
  const [novoObservacoes, setNovoObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarContas = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contas-pagar");
      if (!res.ok) throw new Error("Erro ao buscar contas a pagar");
      const data = await res.json();
      setContas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContas();
  }, []);

  const handleCriarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvando(true);
      const res = await fetch("/api/contas-pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedor: novoFornecedor,
          descricao: novoDescricao,
          categoria: novoCategoria,
          valor: novoValor,
          data_vencimento: novoVencimento,
          forma_pagamento: novoFormaPagamento,
          observacoes: novoObservacoes,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar despesa");

      setModalNovoAberto(false);
      setNovoFornecedor("");
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
    if (!confirm("Confirmar pagamento desta despesa?")) return;
    try {
      const res = await fetch("/api/contas-pagar", {
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
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;
    try {
      const res = await fetch(`/api/contas-pagar?id=${id}`, {
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
      c.fornecedor.toLowerCase().includes(busca.toLowerCase()) ||
      c.categoria.toLowerCase().includes(busca.toLowerCase());

    if (!matchBusca) return false;

    if (filtroCategoria !== "ALL" && c.categoria !== filtroCategoria) return false;

    if (filtroStatus === "PENDENTE") return c.status !== "PAGO" && c.data_vencimento >= hoje;
    if (filtroStatus === "PAGO") return c.status === "PAGO";
    if (filtroStatus === "VENCIDO") return c.status !== "PAGO" && c.data_vencimento < hoje;

    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header
        title="Contas a Pagar"
        subtitle="Controle de despesas operacionais, fornecedores e custos fixos da Samape"
        onRefresh={carregarContas}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">A Pagar (Pendente)</span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(totalPendente)}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">Contas e boletos a vencer</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Pago (Liquidado)</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                {formatCurrency(totalPago)}
              </div>
              <p className="mt-1 text-xs text-emerald-700 font-medium">Despesas quitadas no período</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Vencido (Atrasado)</span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
                {formatCurrency(totalVencido)}
              </div>
              <p className="mt-1 text-xs text-rose-600 font-medium">Atenção a juros e multas</p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Ação */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, fornecedor ou categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todas as Categorias</option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

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
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setModalNovoAberto(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Despesa
            </button>
          </div>
        </div>

        {/* Tabela de Contas a Pagar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Fornecedor / Beneficiário</th>
                  <th className="py-3 px-6">Descrição</th>
                  <th className="py-3 px-6">Categoria</th>
                  <th className="py-3 px-6">Vencimento</th>
                  <th className="py-3 px-6">Forma</th>
                  <th className="py-3 px-6 text-right">Valor</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Carregando contas a pagar...
                    </td>
                  </tr>
                ) : contasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <ArrowUpRight className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Nenhuma despesa registrada</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Clique em "Nova Despesa" para cadastrar boletos, fornecedores ou contas fixas.
                      </p>
                    </td>
                  </tr>
                ) : (
                  contasFiltradas.map((c) => {
                    const isPago = c.status === "PAGO";
                    const isVencido = !isPago && c.data_vencimento < hoje;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-900">{c.fornecedor}</td>
                        <td className="py-3.5 px-6 font-medium text-slate-700">{c.descricao}</td>
                        <td className="py-3.5 px-6">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {c.categoria}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-700 font-medium">
                          {formatDate(c.data_vencimento)}
                        </td>
                        <td className="py-3.5 px-6 text-xs font-semibold text-slate-600">
                          {c.forma_pagamento || "BOLETO"}
                        </td>
                        <td className="py-3.5 px-6 text-right font-extrabold text-slate-900">
                          {formatCurrency(c.valor)}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          {isPago ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Pago
                            </span>
                          ) : isVencido ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Vencido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!isPago && (
                              <button
                                onClick={() => handleMarcarComoPago(c.id)}
                                title="Marcar como Pago"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" /> Pagar
                              </button>
                            )}
                            <button
                              onClick={() => handleExcluir(c.id)}
                              title="Excluir Lançamento"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* MODAL: NOVA DESPESA MANUAL */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Nova Despesa / Conta a Pagar</h3>
                <p className="text-xs text-slate-500">Cadastre um pagamento a fornecedor ou custo operacional</p>
              </div>
              <button
                onClick={() => setModalNovoAberto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarConta} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fornecedor / Beneficiário *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora de Rolamentos, Posto Ipiranga, Aluguel"
                  value={novoFornecedor}
                  onChange={(e) => setNovoFornecedor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Pagamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de retentores e óleos para OS-014"
                  value={novoDescricao}
                  onChange={(e) => setNovoDescricao(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria de Custo *</label>
                <select
                  value={novoCategoria}
                  onChange={(e) => setNovoCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={novoVencimento}
                    onChange={(e) => setNovoVencimento(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                <select
                  value={novoFormaPagamento}
                  onChange={(e) => setNovoFormaPagamento(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="DEBITO">Débito em Conta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações / NF</label>
                <textarea
                  rows={2}
                  value={novoObservacoes}
                  onChange={(e) => setNovoObservacoes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar Despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
