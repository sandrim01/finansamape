"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency } from "@/lib/utils";
import { Package, Search, AlertTriangle, TrendingUp, DollarSign, Layers } from "lucide-react";

interface Peca {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
  fabricante: string | null;
  quantidade_estoque: number;
  estoque_minimo: number;
  preco_custo: number;
  preco_venda: number;
  margem_reais: number;
  margem_perc: number;
  total_custo_estoque: number;
  total_venda_estoque: number;
  ativo: boolean;
}

export default function EstoquePage() {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const carregarEstoque = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/estoque");
      if (res.ok) {
        const data = await res.json();
        setPecas(data.pecas);
        setResumo(data.resumo);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEstoque();
  }, []);

  const pecasFiltradas = pecas.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      p.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header
        title="Estoque & Margens de Peças"
        subtitle="Controle de capital investido em peças, valor de venda e margens de lucro"
        onRefresh={carregarEstoque}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Capital em Estoque</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(resumo?.totalCusto)}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">Custo total das peças armazenadas</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Potencial de Venda</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                {formatCurrency(resumo?.totalVenda)}
              </div>
              <p className="mt-1 text-xs text-emerald-700 font-medium">Preço de tabela ao cliente</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Lucro Projetado</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
                {formatCurrency(resumo?.totalLucro)}
              </div>
              <p className="mt-1 text-xs text-indigo-700 font-medium">Ganho bruto na revenda de peças</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Estoque Crítico</span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
                {resumo?.pecasCriticas || 0} itens
              </div>
              <p className="mt-1 text-xs text-amber-700 font-medium">Abaixo do estoque mínimo</p>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar peça por código, nome ou fabricante..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tabela de Peças */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Código</th>
                  <th className="py-3 px-6">Peça / Insumo</th>
                  <th className="py-3 px-6">Categoria</th>
                  <th className="py-3 px-6 text-center">Qtd Estoque</th>
                  <th className="py-3 px-6 text-right">Preço Custo</th>
                  <th className="py-3 px-6 text-right">Preço Venda</th>
                  <th className="py-3 px-6 text-right">Margem Unitária</th>
                  <th className="py-3 px-6 text-right">Total em Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Carregando dados do estoque...
                    </td>
                  </tr>
                ) : pecasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nenhuma peça encontrada.
                    </td>
                  </tr>
                ) : (
                  pecasFiltradas.map((p) => {
                    const isCritico = p.quantidade_estoque <= p.estoque_minimo && p.estoque_minimo > 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-700">{p.codigo}</td>
                        <td className="py-3.5 px-6">
                          <span className="font-semibold text-slate-900 block">{p.nome}</span>
                          {p.fabricante && <span className="text-[11px] text-slate-400">{p.fabricante}</span>}
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-600">{p.categoria}</td>
                        <td className="py-3.5 px-6 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isCritico
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {p.quantidade_estoque} un
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right text-xs font-medium text-slate-600">
                          {formatCurrency(p.preco_custo)}
                        </td>
                        <td className="py-3.5 px-6 text-right text-xs font-semibold text-slate-900">
                          {formatCurrency(p.preco_venda)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="font-bold text-xs text-emerald-600 block">
                            +{formatCurrency(p.margem_reais)}
                          </span>
                          <span className="text-[10px] text-slate-400">({p.margem_perc.toFixed(0)}%)</span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-extrabold text-slate-900">
                          {formatCurrency(p.total_venda_estoque)}
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
    </div>
  );
}
