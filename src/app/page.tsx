"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Users,
  Wrench,
  CheckCircle,
  Clock,
  Car,
  Package,
  Layers,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardData {
  resumo: {
    faturamentoTotal: number;
    faturamentoAberto: number;
    ticketMedio: number;
    totalOs: number;
    osFechadasQtd: number;
    osAbertasQtd: number;
    totalMaoObra: number;
    totalPecas: number;
    totalDeslocamento: number;
    aReceberPendente: number;
    aReceberRealizado: number;
    aPagarPendente: number;
    aPagarRealizado: number;
    saldoPrevisao: number;
    valorEstoqueCusto: number;
    valorEstoqueVenda: number;
    lucroProjetadoEstoque: number;
  };
  historicoMensal: Array<{ mes: string; total: number; maoObra: number; pecas: number }>;
  topClientes: Array<{ nome: string; total: number; qtdOs: number }>;
  rankingMecanicos: Array<{ nome: string; total: number; qtdOs: number }>;
  ultimasOrdens: Array<{
    id: number;
    numero_os: string;
    cliente: string;
    maquina: string;
    mecanico: string;
    status: string;
    valor_total: number;
    valor_mao_obra: number;
    valor_pecas: number;
    data_abertura: string;
    data_fechamento: string;
  }>;
}

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Falha ao buscar dados do dashboard");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const resumo = data?.resumo;

  // Dados para o gráfico de pizza de composição de receita
  const composicaoReceita = resumo
    ? [
        { name: "Mão de Obra", value: resumo.totalMaoObra },
        { name: "Peças", value: resumo.totalPecas },
        { name: "Deslocamento (KM)", value: resumo.totalDeslocamento },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header
        title="Painel Executivo Financeiro"
        subtitle="Visão consolidada de faturamento operacional, custos e fluxo de caixa da Samape"
        onRefresh={carregarDados}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Não foi possível carregar os dados financeiros</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* 1. CARDS DE KPI PRINCIPAIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Faturamento Histórico */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Faturamento Realizado
              </span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(resumo?.faturamentoTotal)}
              </div>
              <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {resumo?.osFechadasQtd || 0} Ordens de Serviço Fechadas
              </p>
            </div>
          </div>

          {/* Em Aberto / A Faturar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Previsão de Receita (OS Abertas)
              </span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(resumo?.faturamentoAberto)}
              </div>
              <p className="mt-1 text-xs text-amber-600 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {resumo?.osAbertasQtd || 0} OS em andamento na oficina
              </p>
            </div>
          </div>

          {/* Ticket Médio por OS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ticket Médio por OS
              </span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(resumo?.ticketMedio)}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Média calculada sobre {resumo?.osFechadasQtd || 0} manutenções
              </p>
            </div>
          </div>

          {/* Saldo / Despesas Pendentes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Contas a Pagar (Despesas)
              </span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(resumo?.aPagarPendente)}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Pago no período: {formatCurrency(resumo?.aPagarRealizado)}
              </p>
            </div>
          </div>
        </div>

        {/* 2. GRÁFICOS: EVOLUÇÃO MENSAL E COMPOSIÇÃO DE RECEITA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Faturamento Mensal (Barras) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Evolução do Faturamento Mensal</h3>
                <p className="text-xs text-slate-500">Mão de Obra e Peças faturadas nas Ordens de Serviço</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Histórico Live
              </span>
            </div>

            <div className="h-72 w-full">
              {data?.historicoMensal && data.historicoMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.historicoMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), "Valor"]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="maoObra" name="Mão de Obra" fill="#2563eb" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="pecas" name="Peças & Materiais" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Carregando dados mensais...
                </div>
              )}
            </div>
          </div>

          {/* Composição de Receita (Donut / Card) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Origem das Receitas</h3>
              <p className="text-xs text-slate-500 mb-4">De onde vem o faturamento das manutenções</p>

              <div className="h-48 w-full flex items-center justify-center">
                {composicaoReceita.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={composicaoReceita}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {composicaoReceita.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-xs">Sem dados suficientes</p>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Mão de Obra
                </span>
                <span className="font-bold text-slate-900">{formatCurrency(resumo?.totalMaoObra)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Peças Trocadas
                </span>
                <span className="font-bold text-slate-900">{formatCurrency(resumo?.totalPecas)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Deslocamento / KM
                </span>
                <span className="font-bold text-slate-900">{formatCurrency(resumo?.totalDeslocamento)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. RANKINGS: TOP CLIENTES E DESEMPENHO DOS MECÂNICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Clientes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> Clientes Mais Rentáveis
                </h3>
                <p className="text-xs text-slate-500">Maiores geradores de faturamento para a Samape</p>
              </div>
              <Link href="/clientes" className="text-xs font-semibold text-blue-600 hover:underline flex items-center">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {data?.topClientes.map((c, i) => (
                <div
                  key={c.nome}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-slate-900 leading-tight">{c.nome}</p>
                      <p className="text-[11px] text-slate-500">{c.qtdOs} ordens de serviço concluídas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-slate-900">{formatCurrency(c.total)}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold">Total Faturado</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking por Técnico / Mecânico */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-600" /> Faturamento por Mecânico / Técnico
                </h3>
                <p className="text-xs text-slate-500">Volume financeiro executado por cada profissional</p>
              </div>
            </div>

            <div className="space-y-3">
              {data?.rankingMecanicos.map((m, i) => (
                <div
                  key={m.nome}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-slate-900 leading-tight">{m.nome}</p>
                      <p className="text-[11px] text-slate-500">{m.qtdOs} manutenções realizadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-slate-900">{formatCurrency(m.total)}</p>
                    <p className="text-[10px] text-slate-500">Receita Gerada</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. ÚLTIMAS ORDENS DE SERVIÇO */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Últimas Manutenções & Ordens de Serviço</h3>
              <p className="text-xs text-slate-500">Acompanhamento dos valores executados e status</p>
            </div>
            <Link
              href="/faturamento-os"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" /> Faturar Ordens de Serviço
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Nº OS</th>
                  <th className="py-3 px-6">Cliente</th>
                  <th className="py-3 px-6">Máquina</th>
                  <th className="py-3 px-6">Mecânico</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Mão de Obra</th>
                  <th className="py-3 px-6 text-right">Peças</th>
                  <th className="py-3 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.ultimasOrdens.map((os) => {
                  const isFechada = os.status?.toUpperCase() === "FECHADA";
                  return (
                    <tr key={os.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-blue-600">{os.numero_os}</td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800">{os.cliente}</td>
                      <td className="py-3.5 px-6 text-xs text-slate-500">{os.maquina}</td>
                      <td className="py-3.5 px-6 text-xs text-slate-600">{os.mecanico}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
