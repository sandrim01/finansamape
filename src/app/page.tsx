"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { PeriodFilterBar } from "@/components/PeriodFilterBar";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  Wrench,
  Clock,
  Package,
  Layers,
  ChevronRight,
  AlertCircle,
  Plus,
  Activity,
  FileCheck,
  CheckCircle,
  Database,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { TermometroMetas } from "@/components/TermometroMetas";
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
} from "recharts";

interface DashboardData {
  periodo?: {
    ano: string;
    mes: string;
    label: string;
    anosDisponiveis: string[];
  };
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
    totalKmRodados?: number;
    aReceberPendente: number;
    aReceberRealizado: number;
    aPagarPendente: number;
    aPagarRealizado: number;
    saldoPrevisao: number;
    valorEstoqueCusto?: number;
    valorEstoqueVenda?: number;
    lucroProjetadoEstoque?: number;
    receitaBruta?: number;
    custoPecasEstimado?: number;
    lucroBruto?: number;
    lucroLiquidoRealizado?: number;
    margemBruta?: number;
    margemLiquida?: number;
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

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const primeiroNome = user?.nome ? user.nome.split(" ")[0] : "Gestor";

  // Filtros de período
  const [ano, setAno] = useState("ALL");
  const [mes, setMes] = useState("ALL");

  const carregarDados = async (anoParam = ano, mesParam = mes) => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        ano: anoParam,
        mes: mesParam,
      }).toString();
      const res = await fetch(`/api/dashboard?${query}`);
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
    carregarDados(ano, mes);
  }, [ano, mes]);

  const resumo = data?.resumo;

  const composicaoReceita = resumo
    ? [
        { name: "Mão de Obra", value: resumo.totalMaoObra },
        { name: "Peças", value: resumo.totalPecas },
        { name: "Deslocamento (KM)", value: resumo.totalDeslocamento },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B1329]">
      <Header
        title="Dashboard"
        subtitle="Painel de controle financeiro integrado ao operacional SAMAPEOP"
        onRefresh={carregarDados}
        isLoading={loading}
      />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold text-sm">Não foi possível carregar os dados financeiros</p>
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          </div>
        )}

        {/* 1. BANNER DE BOAS-VINDAS (ESTILO SAMAPEOP) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Olá, <span className="text-blue-500">{primeiroNome}!</span>
            </h2>
            <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
              Bem-vindo ao painel financeiro e de faturamento do SAMAPEOP.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/fluxo-caixa"
              className="px-3.5 py-2 bg-[#151E34] hover:bg-[#1B2745] text-cyan-400 hover:text-cyan-300 border border-cyan-800/40 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
              title="Acessar previsão futura do saldo de caixa"
            >
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Previsão de Caixa</span>
            </Link>

            <Link
              href="/faturamento-os"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>+ Faturar OS</span>
            </Link>

            <Link
              href="/contas-receber"
              className="px-3.5 py-2 bg-[#151E34] hover:bg-[#1B2745] text-slate-200 hover:text-white border border-[#1E2C48] text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-slate-400" />
              <span>+ Nova Cobrança</span>
            </Link>
          </div>
        </div>

        {/* FILTRO DE PERÍODO (ANO E MÊS) */}
        <PeriodFilterBar
          anoSelecionado={ano}
          mesSelecionado={mes}
          anosDisponiveis={data?.periodo?.anosDisponiveis || ["2026", "2025"]}
          periodoLabel={data?.periodo?.label}
          onPeriodChange={(novoAno, novoMes) => {
            setAno(novoAno);
            setMes(novoMes);
          }}
          isLoading={loading}
        />

        {/* TERMÔMETRO DE METAS & PONTO DE EQUILÍBRIO DO MÊS */}
        <TermometroMetas ano={ano} mes={mes} />

        {/* 2. CARDS DE KPI (ESTILO EXATO DOS CARDS DO SAMAPEOP) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Faturamento Realizado */}
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48] relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Faturamento Realizado</span>
              <div className="p-2 bg-blue-950/70 border border-blue-800/40 text-blue-400 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(resumo?.faturamentoTotal)}
              </div>
              <p className="mt-1 text-xs text-emerald-400 font-medium">
                {resumo?.osFechadasQtd || 0} manutenções concluídas
              </p>
            </div>
          </div>

          {/* Card 2: Previsão OS Abertas */}
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48] relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Previsão (OS Abertas)</span>
              <div className="p-2 bg-amber-950/70 border border-amber-800/40 text-amber-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(resumo?.faturamentoAberto)}
              </div>
              <p className="mt-1 text-xs text-amber-400 font-medium">
                {resumo?.osAbertasQtd || 0} OS em andamento na oficina
              </p>
            </div>
          </div>

          {/* Card 3: Ticket Médio */}
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48] relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Ticket Médio por OS</span>
              <div className="p-2 bg-cyan-950/70 border border-cyan-800/40 text-cyan-400 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(resumo?.ticketMedio)}
              </div>
              <p className="mt-1 text-xs text-[#94A3B8] font-medium">
                Média calculada sobre OS fechadas
              </p>
            </div>
          </div>

          {/* Card 4: Contas a Pagar */}
          <div className="bg-[#151E34] p-5 rounded-2xl border border-[#1E2C48] relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8]">Contas a Pagar (Despesas)</span>
              <div className="p-2 bg-rose-950/70 border border-rose-800/40 text-rose-400 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-[#F87171] tracking-tight">
                {formatCurrency(resumo?.aPagarPendente)}
              </div>
              <p className="mt-1 text-xs text-[#94A3B8] font-medium">
                Quitado: {formatCurrency(resumo?.aPagarRealizado)}
              </p>
            </div>
          </div>
        </div>

        {/* 3. GRID PRINCIPAL: ORDENS RECENTES (TABELA SAMAPEOP) + RESUMO DE ATIVIDADES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabela de Ordens Recentes (2 colunas) */}
          <div className="lg:col-span-2 bg-[#151E34] rounded-2xl border border-[#1E2C48] overflow-hidden">
            <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Ordens Recentes</h3>
              </div>
              <Link
                href="/faturamento-os"
                className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                Ver todas →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#11192E] text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#1E2C48]">
                  <tr>
                    <th className="py-3 px-5">Nº</th>
                    <th className="py-3 px-5">CLIENTE</th>
                    <th className="py-3 px-5">MÁQUINA</th>
                    <th className="py-3 px-5">MECÂNICO</th>
                    <th className="py-3 px-5">ABERTURA</th>
                    <th className="py-3 px-5">STATUS</th>
                    <th className="py-3 px-5 text-right">VALOR</th>
                    <th className="py-3 px-5 text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2C48]">
                  {data?.ultimasOrdens.map((os) => {
                    const isFechada = os.status?.toUpperCase() === "FECHADA";

                    return (
                      <tr key={os.id} className="hover:bg-[#1B2745]/60 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-white whitespace-nowrap">
                          {os.numero_os}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-200 max-w-[140px] truncate">
                          {os.cliente}
                        </td>
                        <td className="py-3.5 px-5 text-slate-400 max-w-[130px] truncate">
                          {os.maquina}
                        </td>
                        <td className="py-3.5 px-5 text-slate-400 max-w-[130px] truncate">
                          {os.mecanico}
                        </td>
                        <td className="py-3.5 px-5 text-[#94A3B8] whitespace-nowrap">
                          {formatDate(os.data_abertura)}
                        </td>
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
                        <td className="py-3.5 px-5 text-right font-black text-white whitespace-nowrap">
                          {formatCurrency(os.valor_total)}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <Link
                            href="/faturamento-os"
                            className="inline-flex items-center justify-center h-6 w-6 rounded bg-[#1B2745] hover:bg-blue-600 text-slate-400 hover:text-white transition-colors"
                            title="Ver detalhes de faturamento"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Painel Lateral: Resumo de Atividades & Sistema (Estilo exato da imagem) */}
          <div className="bg-[#151E34] rounded-2xl border border-[#1E2C48] p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-white text-sm mb-4">Resumo de Atividades</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0B1329]/60 border border-[#1E2C48]">
                  <div className="p-2 rounded-lg bg-blue-950 text-blue-400 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Sistema Operacional</p>
                    <p className="text-[11px] text-[#94A3B8]">Conectado ao PostgreSQL Railway</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0B1329]/60 border border-[#1E2C48]">
                  <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">22 Clientes Ativos</p>
                    <p className="text-[11px] text-[#94A3B8]">Base de dados sincronizada</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0B1329]/60 border border-[#1E2C48]">
                  <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">44 Máquinas Registradas</p>
                    <p className="text-[11px] text-[#94A3B8]">Frota completa sob gestão</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0B1329]/60 border border-[#1E2C48]">
                  <div className="p-2 rounded-lg bg-amber-950 text-amber-400 shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">26 Peças Cadastradas</p>
                    <p className="text-[11px] text-[#94A3B8]">Controle de custo e revenda</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#1E2C48]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8]">Status da Sincronização</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Tempo Real
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. GRÁFICOS: EVOLUÇÃO MENSAL E ORIGEM DAS RECEITAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Faturamento Mensal (Barras) */}
          <div className="lg:col-span-2 bg-[#151E34] p-6 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Evolução do Faturamento Mensal</h3>
                <p className="text-xs text-[#94A3B8]">Mão de Obra e Peças faturadas nas Ordens de Serviço</p>
              </div>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-950/70 px-2.5 py-1 rounded-md border border-blue-800/50">
                Histórico Live
              </span>
            </div>

            <div className="h-64 w-full">
              {data?.historicoMensal && data.historicoMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.historicoMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2C48" />
                    <XAxis dataKey="mes" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), "Valor"]}
                      contentStyle={{
                        backgroundColor: "#151E34",
                        borderColor: "#1E2C48",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="maoObra" name="Mão de Obra" fill="#1D64F2" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="pecas" name="Peças & Materiais" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Carregando dados mensais...
                </div>
              )}
            </div>
          </div>

          {/* Origem das Receitas (Donut) */}
          <div className="bg-[#151E34] p-6 rounded-2xl border border-[#1E2C48] flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Origem das Receitas</h3>
              <p className="text-xs text-[#94A3B8] mb-4">Composição do faturamento da empresa</p>

              <div className="h-44 w-full flex items-center justify-center">
                {composicaoReceita.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={composicaoReceita}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {composicaoReceita.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatCurrency(Number(value))}
                        contentStyle={{
                          backgroundColor: "#151E34",
                          borderColor: "#1E2C48",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-xs">Sem dados suficientes</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-[#1E2C48]">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Mão de Obra
                </span>
                <span className="font-bold text-white">{formatCurrency(resumo?.totalMaoObra)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Peças Trocadas
                </span>
                <span className="font-bold text-white">{formatCurrency(resumo?.totalPecas)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Deslocamento / KM
                </span>
                <span className="font-bold text-white">{formatCurrency(resumo?.totalDeslocamento)}</span>
              </div>

              <div className="pt-3 border-t border-[#1E2C48]">
                <Link
                  href="/faturamento-os?tab=lucro-real"
                  className="w-full py-2 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all group"
                >
                  <TrendingUp className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  <span>Ver Análise de Lucro Real por Linha</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 5. TOP CLIENTES & RANKING DE MECÂNICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Clientes */}
          <div className="bg-[#151E34] p-6 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" /> Clientes Mais Rentáveis
                </h3>
                <p className="text-xs text-[#94A3B8]">Volume financeiro acumulado por empresa</p>
              </div>
              <Link href="/clientes" className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {data?.topClientes.map((c, i) => (
                <div
                  key={c.nome}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0B1329]/70 border border-[#1E2C48] hover:border-blue-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-950 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-800/40">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-white leading-tight">{c.nome}</p>
                      <p className="text-[10px] text-[#94A3B8]">{c.qtdOs} ordens concluídas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xs text-white">{formatCurrency(c.total)}</p>
                    <p className="text-[10px] text-emerald-400 font-medium">Total Faturado</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking por Mecânico */}
          <div className="bg-[#151E34] p-6 rounded-2xl border border-[#1E2C48]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" /> Faturamento por Mecânico
                </h3>
                <p className="text-xs text-[#94A3B8]">Receita gerada pelo serviço executado por cada técnico</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {data?.rankingMecanicos.map((m, i) => (
                <div
                  key={m.nome}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0B1329]/70 border border-[#1E2C48]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-800/40">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-white leading-tight">{m.nome}</p>
                      <p className="text-[10px] text-[#94A3B8]">{m.qtdOs} manutenções realizadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xs text-white">{formatCurrency(m.total)}</p>
                    <p className="text-[10px] text-[#94A3B8]">Receita Executada</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
