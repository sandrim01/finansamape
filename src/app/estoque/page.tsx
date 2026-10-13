"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency } from "@/lib/utils";
import { Package, Search, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B1329]">
      <Header
        title="Estoque & Margens de Peças"
        subtitle="Controle de capital investido em peças, valor de venda e margens de lucro"
        onRefresh={carregarEstoque}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Capital em Estoque</span>
              <div className="p-2 bg-blue-950 text-blue-400 border border-blue-800/40 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(resumo?.totalCusto)}
              </div>
              <p className="mt-1 text-xs text-[#94A3B8] font-medium">Custo total das peças armazenadas</p>
            </div>
          </div>

          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Potencial de Venda</span>
              <div className="p-2 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-emerald-400 tracking-tight">
                {formatCurrency(resumo?.totalVenda)}
              </div>
              <p className="mt-1 text-xs text-emerald-500 font-medium">Preço de tabela ao cliente</p>
            </div>
          </div>

          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Lucro Projetado</span>
              <div className="p-2 bg-cyan-950 text-cyan-400 border border-cyan-800/40 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-cyan-400 tracking-tight">
                {formatCurrency(resumo?.totalLucro)}
              </div>
              <p className="mt-1 text-xs text-cyan-500 font-medium">Ganho bruto na revenda de peças</p>
            </div>
          </div>

          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Estoque Crítico</span>
              <div className="p-2 bg-amber-950 text-amber-400 border border-amber-800/40 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-amber-400 tracking-tight">
                {resumo?.pecasCriticas || 0} itens
              </div>
              <p className="mt-1 text-xs text-amber-500 font-medium">Abaixo do estoque mínimo</p>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-[#151E34] p-4 rounded-xl border border-[#1E2C48]">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar peça por código, nome ou fabricante..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Tabela de Peças */}
        <div className="bg-[#151E34] rounded-2xl border border-[#1E2C48] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#11192E] text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#1E2C48]">
                <tr>
                  <th className="py-3 px-5">Código</th>
                  <th className="py-3 px-5">Peça / Insumo</th>
                  <th className="py-3 px-5">Categoria</th>
                  <th className="py-3 px-5 text-center">Qtd Estoque</th>
                  <th className="py-3 px-5 text-right">Preço Custo</th>
                  <th className="py-3 px-5 text-right">Preço Venda</th>
                  <th className="py-3 px-5 text-right">Margem Unitária</th>
                  <th className="py-3 px-5 text-right">Total em Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2C48]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Carregando dados do estoque...
                    </td>
                  </tr>
                ) : pecasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Nenhuma peça encontrada.
                    </td>
                  </tr>
                ) : (
                  pecasFiltradas.map((p) => {
                    const isCritico = p.quantidade_estoque <= p.estoque_minimo && p.estoque_minimo > 0;

                    return (
                      <tr key={p.id} className="hover:bg-[#1B2745]/60 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-300">{p.codigo}</td>
                        <td className="py-3.5 px-5">
                          <span className="font-semibold text-white block">{p.nome}</span>
                          {p.fabricante && <span className="text-[10px] text-slate-500">{p.fabricante}</span>}
                        </td>
                        <td className="py-3.5 px-5 text-slate-400">{p.categoria}</td>
                        <td className="py-3.5 px-5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCritico
                                ? "bg-amber-950/70 text-amber-400 border border-amber-800/50"
                                : "bg-[#0B1329] text-slate-300 border border-[#1E2C48]"
                            }`}
                          >
                            {p.quantidade_estoque} un
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-400 font-medium">
                          {formatCurrency(p.preco_custo)}
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-200 font-semibold">
                          {formatCurrency(p.preco_venda)}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className="font-bold text-emerald-400 block">
                            +{formatCurrency(p.margem_reais)}
                          </span>
                          <span className="text-[10px] text-slate-500">({p.margem_perc.toFixed(0)}%)</span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-black text-white">
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
