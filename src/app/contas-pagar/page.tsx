"use client";

import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CENTROS_DE_CUSTO,
  parseCentroCustoECategoria,
  formatarCategoriaParaSalvar,
} from "@/lib/centrosCusto";
import { ModalBaixaInteligente, TituloParaBaixa } from "@/components/ModalBaixaInteligente";
import { ModalReciboQuitacao } from "@/components/ModalReciboQuitacao";
import { deserializarObservacoesBaixa, DadosLiquidacao } from "@/lib/baixaInteligente";
import {
  ArrowUpRight,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Trash2,
  X,
  Tag,
  FolderTree,
  Sparkles,
  Building2,
  Wrench,
  Car,
  Users,
  FileCheck2,
  FileSpreadsheet,
} from "lucide-react";
import { ModalExportacaoFinanceira } from "@/components/ModalExportacaoFinanceira";

interface ContaPagar {
  id: number;
  fornecedor: string;
  descricao: string;
  categoria: string;
  centro_custo_id?: string;
  centro_custo_nome?: string;
  subcategoria?: string;
  cor?: string;
  corBg?: string;
  corTexto?: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string;
  observacoes: string | null;
  created_at: string;
}

export default function ContasPagarPage() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroCentroCusto, setFiltroCentroCusto] = useState("ALL");
  const [filtroCategoria, setFiltroCategoria] = useState("ALL");
  const [busca, setBusca] = useState("");
  const [seeding, setSeeding] = useState(false);

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [novoCentroCusto, setNovoCentroCusto] = useState("OFICINA");
  const [novoSubcategoria, setNovoSubcategoria] = useState("Peças & Fornecedores");
  const [novoValor, setNovoValor] = useState("");
  const [novoVencimento, setNovoVencimento] = useState("");
  const [novoFormaPagamento, setNovoFormaPagamento] = useState("BOLETO");
  const [novoObservacoes, setNovoObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Estados da Baixa Inteligente e Recibo de Quitação
  const [tituloBaixa, setTituloBaixa] = useState<TituloParaBaixa | null>(null);
  const [modalBaixaAberto, setModalBaixaAberto] = useState(false);
  const [reciboDados, setReciboDados] = useState<DadosLiquidacao | null>(null);
  const [modalReciboAberto, setModalReciboAberto] = useState(false);
  const [modalExportacaoAberto, setModalExportacaoAberto] = useState(false);

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

  const subcategoriasDisponiveis = useMemo(() => {
    const cc = CENTROS_DE_CUSTO.find((c) => c.id === novoCentroCusto);
    return cc ? cc.categorias : [];
  }, [novoCentroCusto]);

  const totaisPorCentro = useMemo(() => {
    const map: Record<string, number> = {
      OFICINA: 0,
      CAMPO: 0,
      PESSOAL: 0,
      ADMINISTRATIVO: 0,
      TRIBUTARIO: 0,
    };
    for (const c of contas) {
      const cid = c.centro_custo_id || "ADMINISTRATIVO";
      map[cid] = (map[cid] || 0) + c.valor;
    }
    return map;
  }, [contas]);

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
          centro_custo_id: novoCentroCusto,
          subcategoria: novoSubcategoria,
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

  const handleSeedExemplo = async () => {
    try {
      setSeeding(true);
      const res = await fetch("/api/centros-custo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_exemplo" }),
      });
      if (res.ok) {
        await carregarContas();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const handleAbrirBaixa = (conta: ContaPagar) => {
    setTituloBaixa({
      id: conta.id,
      tipo: "PAGAMENTO",
      descricao: conta.descricao,
      clienteOuFornecedor: conta.fornecedor,
      documentoRef: `DOC #${conta.id}`,
      valorOriginal: conta.valor,
      dataVencimento: conta.data_vencimento,
      formaPagamentoAtual: conta.forma_pagamento,
    });
    setModalBaixaAberto(true);
  };

  const handleAbrirRecibo = (conta: ContaPagar) => {
    const dados = deserializarObservacoesBaixa(conta.observacoes, {
      tituloId: conta.id,
      tipoOperacao: "PAGAMENTO",
      descricao: conta.descricao,
      clienteOuFornecedor: conta.fornecedor,
      valorOriginal: conta.valor,
      dataVencimento: conta.data_vencimento,
      dataPagamento: conta.data_pagamento,
      formaPagamento: conta.forma_pagamento,
    });
    if (dados) {
      setReciboDados(dados);
      setModalReciboAberto(true);
    }
  };

  const handleSucessoBaixa = async (dados: DadosLiquidacao) => {
    await carregarContas();
    setReciboDados(dados);
    setModalReciboAberto(true);
  };

  const handleMarcarComoPago = async (id: number) => {
    const conta = contas.find((c) => c.id === id);
    if (conta) {
      handleAbrirBaixa(conta);
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
      c.categoria.toLowerCase().includes(busca.toLowerCase()) ||
      (c.subcategoria && c.subcategoria.toLowerCase().includes(busca.toLowerCase()));

    if (!matchBusca) return false;

    if (filtroCentroCusto !== "ALL" && c.centro_custo_id !== filtroCentroCusto) return false;
    if (
      filtroCategoria !== "ALL" &&
      c.categoria !== filtroCategoria &&
      c.subcategoria !== filtroCategoria
    )
      return false;

    if (filtroStatus === "PENDENTE") return c.status !== "PAGO" && c.data_vencimento >= hoje;
    if (filtroStatus === "PAGO") return c.status === "PAGO";
    if (filtroStatus === "VENCIDO") return c.status !== "PAGO" && c.data_vencimento < hoje;

    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B1329]">
      <Header
        title="Contas a Pagar"
        subtitle="Controle de despesas operacionais, fornecedores e custos fixos da Samape"
        onRefresh={carregarContas}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* CENTROS DE CUSTO - CARDS SUPERIORES */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-blue-400" />
              <span>Centros de Custo Operacionais</span>
            </h3>
            <span className="text-[11px] text-gray-400">
              Clique em um centro para filtrar lançamentos
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CENTROS_DE_CUSTO.map((cc) => {
              const total = totaisPorCentro[cc.id] || 0;
              const isAtivo = filtroCentroCusto === cc.id;
              const Icon =
                cc.id === "OFICINA"
                  ? Wrench
                  : cc.id === "CAMPO"
                  ? Car
                  : cc.id === "PESSOAL"
                  ? Users
                  : cc.id === "TRIBUTARIO"
                  ? AlertTriangle
                  : Building2;

              return (
                <button
                  key={cc.id}
                  onClick={() => setFiltroCentroCusto(isAtivo ? "ALL" : cc.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isAtivo
                      ? "ring-2 ring-blue-500 shadow-lg scale-[1.02]"
                      : "hover:border-slate-600"
                  } bg-[#151E34]`}
                  style={{
                    borderColor: isAtivo ? cc.cor : "#1E2C48",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${cc.cor}20`, color: cc.cor }}
                    >
                      {cc.codigo}
                    </span>
                    <Icon className="w-4 h-4" style={{ color: cc.cor }} />
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{cc.nome}</h4>
                  <div className="mt-2 text-sm sm:text-base font-bold font-mono text-white">
                    {formatCurrency(total)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">A Pagar (Pendente)</span>
              <div className="p-2 bg-amber-950 text-amber-400 border border-amber-800/40 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(totalPendente)}
              </div>
              <p className="mt-1 text-xs text-[#94A3B8] font-medium">Contas e boletos a vencer</p>
            </div>
          </div>

          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Pago (Liquidado)</span>
              <div className="p-2 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-emerald-400 tracking-tight">
                {formatCurrency(totalPago)}
              </div>
              <p className="mt-1 text-xs text-emerald-500 font-medium">Despesas quitadas no período</p>
            </div>
          </div>

          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Vencido (Atrasado)</span>
              <div className="p-2 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-[#F87171] tracking-tight">
                {formatCurrency(totalVencido)}
              </div>
              <p className="mt-1 text-xs text-[#F87171] font-medium">Atenção a juros e multas</p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Ação */}
        <div className="bg-[#151E34] p-4 rounded-xl border border-[#1E2C48] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por descrição, fornecedor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-between md:justify-end">
            {/* Filtro Centro de Custo */}
            <select
              value={filtroCentroCusto}
              onChange={(e) => {
                setFiltroCentroCusto(e.target.value);
                setFiltroCategoria("ALL");
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-[#0B1329] border border-[#1E2C48] rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="ALL">Todos os Centros de Custo</option>
              {CENTROS_DE_CUSTO.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.codigo} - {cc.nome}
                </option>
              ))}
            </select>

            {/* Filtro Subcategoria */}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-[#0B1329] border border-[#1E2C48] rounded-lg text-slate-300 focus:outline-none max-w-[180px]"
            >
              <option value="ALL">Todas Subcategorias</option>
              {(filtroCentroCusto === "ALL"
                ? CENTROS_DE_CUSTO.flatMap((c) => c.categorias)
                : CENTROS_DE_CUSTO.find((c) => c.id === filtroCentroCusto)?.categorias || []
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Filtros de Status */}
            <div className="flex items-center gap-1">
              {[
                { id: "TODOS", label: "Todos" },
                { id: "PENDENTE", label: "No Prazo" },
                { id: "VENCIDO", label: "Vencidos" },
                { id: "PAGO", label: "Pagos" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroStatus(f.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    filtroStatus === f.id
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setModalExportacaoAberto(true)}
              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Exportar (.xlsx / PDF)
            </button>

            <button
              onClick={() => setModalNovoAberto(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Despesa
            </button>
          </div>
        </div>

        {/* Tabela de Contas a Pagar */}
        <div className="bg-[#151E34] rounded-2xl border border-[#1E2C48] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#11192E] text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#1E2C48]">
                <tr>
                  <th className="py-3 px-5">Fornecedor / Beneficiário</th>
                  <th className="py-3 px-5">Descrição</th>
                  <th className="py-3 px-5">Centro de Custo & Categoria</th>
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
                      Carregando contas a pagar...
                    </td>
                  </tr>
                ) : contasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 space-y-3">
                      <ArrowUpRight className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-semibold text-slate-300">Nenhuma despesa registrada para o filtro</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Cadastre contas a pagar associadas aos Centros de Custo da Samape ou insira as despesas padrão de teste.
                      </p>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => setModalNovoAberto(true)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Nova Despesa
                        </button>
                        <button
                          onClick={handleSeedExemplo}
                          disabled={seeding}
                          className="px-3.5 py-1.5 bg-[#0B1329] hover:bg-[#1B2745] text-blue-400 border border-blue-500/30 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          {seeding ? "Lançando..." : "Inserir Despesas Padrão da Oficina"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contasFiltradas.map((c) => {
                    const isPago = c.status === "PAGO";
                    const isVencido = !isPago && c.data_vencimento < hoje;
                    const dadosBaixaItem = isPago ? deserializarObservacoesBaixa(c.observacoes) : null;

                    return (
                      <tr key={c.id} className="hover:bg-[#1B2745]/60 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-white">{c.fornecedor}</td>
                        <td className="py-3.5 px-5 text-slate-300">{c.descricao}</td>
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                              style={{
                                backgroundColor: `${c.cor || "#3B82F6"}15`,
                                borderColor: `${c.cor || "#3B82F6"}40`,
                                color: c.cor || "#60A5FA",
                              }}
                            >
                              <FolderTree className="w-3 h-3" />
                              {c.centro_custo_nome || "Centro de Custo"}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium line-clamp-1">
                              {c.subcategoria || c.categoria}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-[#94A3B8]">
                          {formatDate(c.data_vencimento)}
                        </td>
                        <td className="py-3.5 px-5 text-slate-300 font-medium">
                          <div>{c.forma_pagamento || "BOLETO"}</div>
                          {dadosBaixaItem && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate max-w-[130px]">
                              {dadosBaixaItem.contaBancariaNome.split(" ")[0]}
                            </span>
                          )}
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
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/70 text-amber-400 border border-amber-800/50">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isPago ? (
                              <button
                                onClick={() => handleAbrirBaixa(c)}
                                title="Baixa Inteligente com cálculo de juros/multas e conciliação"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-emerald-200" /> Pagar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAbrirRecibo(c)}
                                title="Visualizar e Imprimir Comprovante de Pagamento"
                                className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <FileCheck2 className="w-3 h-3 text-blue-400" /> Recibo
                              </button>
                            )}
                            <button
                              onClick={() => handleExcluir(c.id)}
                              title="Excluir Lançamento"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
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

      {/* MODAL: NOVA DESPESA */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151E34] rounded-2xl shadow-2xl border border-[#1E2C48] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Nova Despesa / Conta a Pagar</h3>
                <p className="text-xs text-[#94A3B8]">Cadastre um pagamento a fornecedor ou custo operacional</p>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">Fornecedor / Beneficiário *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora de Rolamentos, Posto Ipiranga, Aluguel"
                  value={novoFornecedor}
                  onChange={(e) => setNovoFornecedor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Descrição do Pagamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de retentores e óleos para OS-014"
                  value={novoDescricao}
                  onChange={(e) => setNovoDescricao(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Centro de Custo Operacional *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CENTROS_DE_CUSTO.map((cc) => {
                    const isSel = novoCentroCusto === cc.id;
                    return (
                      <button
                        type="button"
                        key={cc.id}
                        onClick={() => {
                          setNovoCentroCusto(cc.id);
                          setNovoSubcategoria(cc.categorias[0]);
                        }}
                        className={`p-2 rounded-xl text-left border text-xs transition-all ${
                          isSel
                            ? "bg-[#1E2C48] border-blue-500 text-white font-bold ring-1 ring-blue-500"
                            : "bg-[#0B1329] border-[#1E2C48] text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="text-[10px] font-mono block" style={{ color: cc.cor }}>
                          {cc.codigo}
                        </span>
                        <span className="line-clamp-1">{cc.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Subcategoria da Despesa *
                </label>
                <select
                  value={novoSubcategoria}
                  onChange={(e) => setNovoSubcategoria(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {subcategoriasDisponiveis.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
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
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="DEBITO">Débito em Conta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Observações / NF</label>
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar Despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAIXA INTELIGENTE */}
      <ModalBaixaInteligente
        titulo={tituloBaixa}
        isOpen={modalBaixaAberto}
        onClose={() => setModalBaixaAberto(false)}
        onSucesso={handleSucessoBaixa}
      />

      {/* MODAL: COMPROVANTE DE PAGAMENTO / RECIBO */}
      <ModalReciboQuitacao
        dados={reciboDados}
        isOpen={modalReciboAberto}
        onClose={() => setModalReciboAberto(false)}
      />

      {/* MODAL: CENTRAL DE EXPORTAÇÃO FINANCEIRA */}
      <ModalExportacaoFinanceira
        isOpen={modalExportacaoAberto}
        onClose={() => setModalExportacaoAberto(false)}
      />
    </div>
  );
}
