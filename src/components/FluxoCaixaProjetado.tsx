"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  RefreshCw,
  Info,
  DollarSign,
} from "lucide-react";

export function FluxoCaixaProjetado() {
  const [dias, setDias] = useState<number>(30);
  const [saldoInicial, setSaldoInicial] = useState<string>("0");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apenasComMovimentacao, setApenasComMovimentacao] = useState<boolean>(true);

  const carregarProjecao = async () => {
    try {
      setLoading(true);
      const saldoNum = parseFloat(saldoInicial.replace(/[^\d.-]/g, "")) || 0;
      const res = await fetch(`/api/fluxo-caixa/projetado?dias=${dias}&saldoInicial=${saldoNum}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao buscar projeção:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarProjecao();
  }, [dias]);

  const handleRecalcularComSaldo = (e: React.FormEvent) => {
    e.preventDefault();
    carregarProjecao();
  };

  const resumo = data?.resumo;
  const serie = data?.serieTemporal || [];
  const pipelineOS = data?.pipelineOS || [];

  // Filtra dias com movimentação para a tabela
  const diasFiltrados = apenasComMovimentacao
    ? serie.filter((d: any) => d.entradas > 0 || d.saidas > 0)
    : serie;

  return (
    <div className="space-y-6">
      {/* 1. BARRA DE CONTROLE: HORIZONTE DE DIAS E SALDO INICIAL */}
      <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Seletor de Horizonte de Previsão */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#94A3B8] mr-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Horizonte de Previsão:
          </span>
          {[
            { label: "Próximos 7 Dias", val: 7 },
            { label: "Próximos 15 Dias", val: 15 },
            { label: "Próximos 30 Dias", val: 30 },
            { label: "Próximos 60 Dias", val: 60 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setDias(item.val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dias === item.val
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-[#0B1329] text-slate-300 hover:text-white border border-[#1E2C48] hover:border-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Informar Saldo Atual de Caixa / Banco */}
        <form onSubmit={handleRecalcularComSaldo} className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <input
              type="number"
              step="any"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              placeholder="Saldo bancário hoje (R$)"
              className="pl-9 pr-3 py-1.5 w-44 bg-[#0B1329] border border-[#1E2C48] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Digite o saldo bancário real disponível hoje para ajustar a projeção"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-[#1E2C48] hover:bg-blue-600 text-xs font-bold text-slate-200 hover:text-white rounded-xl transition-colors border border-slate-700/50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Recalcular</span>
          </button>
        </form>
      </div>

      {/* 2. CARDS DE KPIS DO FLUXO PROJETADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Inicial / Atual */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">Saldo Disponível Base</span>
            <div className="p-2 bg-blue-950/80 text-blue-400 border border-blue-800/40 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(resumo?.saldoAtual || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Ponto de partida da projeção (Hoje)
            </p>
          </div>
        </div>

        {/* Card 2: Entradas Previstas */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">(+) Entradas Previstas</span>
            <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(resumo?.totalEntradasPrevistas || 0)}
            </div>
            <p className="mt-1 text-[11px] text-emerald-500/80">
              Recebíveis com vencimento em até {dias} dias
            </p>
          </div>
        </div>

        {/* Card 3: Saídas Previstas */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">(-) Saídas Previstas</span>
            <div className="p-2 bg-rose-950/80 text-rose-400 border border-rose-800/40 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {formatCurrency(resumo?.totalSaidasPrevistas || 0)}
            </div>
            <p className="mt-1 text-[11px] text-rose-500/80">
              Contas a pagar até o dia {data?.config?.dataFim ? new Date(data.config.dataFim).toLocaleDateString("pt-BR") : ""}
            </p>
          </div>
        </div>

        {/* Card 4: Saldo Final Projetado */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">(=) Saldo Final Projetado</span>
            <div
              className={`p-2 rounded-xl border ${
                (resumo?.saldoFinalProjetado || 0) >= 0
                  ? "bg-cyan-950/80 text-cyan-400 border-cyan-800/40"
                  : "bg-rose-950/80 text-rose-400 border-rose-800/40"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight ${
                (resumo?.saldoFinalProjetado || 0) >= 0 ? "text-cyan-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(resumo?.saldoFinalProjetado || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Variação: {formatCurrency(resumo?.variacaoPeriodo || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. ALERTA INTELIGENTE DE PONTO CRÍTICO / SALDO NEGATIVO */}
      {resumo?.temRiscoNegativo ? (
        <div className="bg-rose-950/30 border border-rose-600/40 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-4 animate-pulse">
          <div className="p-3 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-200">
              Atenção Gestor: Risco de Saldo Negativo Projetado!
            </h4>
            <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">
              O sistema identificou que o caixa atingirá o ponto crítico negativo de{" "}
              <strong className="text-white font-black">{formatCurrency(resumo.menorSaldoProjetado)}</strong> no dia{" "}
              <strong className="text-white">{resumo.dataMenorSaldo ? new Date(resumo.dataMenorSaldo).toLocaleDateString("pt-BR") : ""}</strong>.
              Recomenda-se antecipar recebimentos de OS faturadas ou negociar prazos de boletos de fornecedores de peças.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-600/30 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-4">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-xl shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-200">
              Fluxo de Caixa Saudável para os próximos {dias} dias
            </h4>
            <p className="text-xs text-emerald-300/80 mt-0.5 leading-relaxed">
              As entradas previstas superam as saídas compromissadas em todo o horizonte analisado.
              Menor saldo previsto no período: <strong className="text-white">{formatCurrency(resumo?.menorSaldoProjetado || 0)}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* 4. GRÁFICO INTERATIVO DE CURVA DE SALDO FUTURO */}
      <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Curva de Saldo Acumulado & Movimentações Diárias
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Evolução prevista do saldo bancário dia a dia considerando entradas e saídas agendadas
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500"></span>
              <span className="text-slate-300">Entradas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-rose-500"></span>
              <span className="text-slate-300">Saídas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-cyan-400"></span>
              <span className="text-slate-300 font-bold">Saldo Acumulado</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="corSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2C48" vertical={false} />
              <XAxis
                dataKey="dataFormatada"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#1E2C48" }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#1E2C48" }}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-[#0B1329] border border-[#1E2C48] p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[200px]">
                        <div className="font-bold text-white border-b border-[#1E2C48] pb-1.5 flex justify-between">
                          <span>{item.data ? new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }) : label}</span>
                          <span className={item.saldoAcumulado >= 0 ? "text-cyan-400 font-black" : "text-rose-400 font-black"}>
                            {formatCurrency(item.saldoAcumulado)}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-emerald-400">
                            <span>(+) Entradas no dia:</span>
                            <span className="font-bold">{formatCurrency(item.entradas)}</span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span>(-) Saídas no dia:</span>
                            <span className="font-bold">{formatCurrency(item.saidas)}</span>
                          </div>
                          <div className="flex justify-between text-slate-300 pt-1 border-t border-[#1E2C48]">
                            <span>Resultado do dia:</span>
                            <span className={`font-bold ${item.saldoDoDia >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {formatCurrency(item.saldoDoDia)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
              <Bar dataKey="entradas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="saidas" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Area
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="#22D3EE"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#corSaldo)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. LINHA DO TEMPO CRONOLÓGICA (EXTRATO FUTURO DETALHADO) */}
      <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#1E2C48] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Agenda Cronológica de Vencimentos & Saldo Diário
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Detalhamento de cada dia com títulos a receber e compromissos a pagar
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={apenasComMovimentacao}
                onChange={(e) => setApenasComMovimentacao(e.target.checked)}
                className="rounded border-[#1E2C48] bg-[#0B1329] text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span>Ocultar dias sem movimentação</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          {diasFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Nenhuma movimentação agendada para os próximos {dias} dias.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1329] text-slate-400 font-semibold border-b border-[#1E2C48]">
                <tr>
                  <th className="py-3.5 px-4">Data do Vencimento</th>
                  <th className="py-3.5 px-4">Detalhes dos Compromissos</th>
                  <th className="py-3.5 px-4 text-right">(+) Entradas</th>
                  <th className="py-3.5 px-4 text-right">(-) Saídas</th>
                  <th className="py-3.5 px-4 text-right">Saldo do Dia</th>
                  <th className="py-3.5 px-4 text-right">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2C48]">
                {diasFiltrados.map((item: any) => (
                  <tr
                    key={item.data}
                    className={`hover:bg-[#1E2C48]/40 transition-colors ${
                      item.isNegativo ? "bg-rose-950/20" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.dataFormatada}</span>
                        <span className="text-[10px] text-slate-400 bg-[#0B1329] px-2 py-0.5 rounded border border-[#1E2C48]">
                          {item.diaSemana}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-md">
                      <div className="space-y-1">
                        {item.itensEntrada.map((e: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                            <ArrowDownLeft className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {e.cliente} - {e.descricao} {e.numero_os ? `(${e.numero_os})` : ""}
                            </span>
                          </div>
                        ))}
                        {item.itensSaida.map((s: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-rose-300">
                            <ArrowUpRight className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {s.fornecedor} - {s.descricao} ({s.categoria || "Geral"})
                            </span>
                          </div>
                        ))}
                        {item.itensEntrada.length === 0 && item.itensSaida.length === 0 && (
                          <span className="text-slate-500 italic text-[11px]">Sem lançamentos agendados</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-emerald-400">
                      {item.entradas > 0 ? formatCurrency(item.entradas) : "-"}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-rose-400">
                      {item.saidas > 0 ? formatCurrency(item.saidas) : "-"}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold">
                      <span className={item.saldoDoDia > 0 ? "text-emerald-400" : item.saldoDoDia < 0 ? "text-rose-400" : "text-slate-500"}>
                        {formatCurrency(item.saldoDoDia)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-black">
                      <span className={item.saldoAcumulado >= 0 ? "text-cyan-400" : "text-rose-400 font-black"}>
                        {formatCurrency(item.saldoAcumulado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 6. PIPELINE DE RECEITAS EM ANDAMENTO (ORDENS DE SERVIÇO ABERTAS) */}
      {pipelineOS.length > 0 && (
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">
                Pipeline de Receitas: OS em Andamento na Oficina ({resumo?.osAbertasCount || 0})
              </h3>
            </div>
            <div className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-3 py-1 rounded-xl">
              Potencial Futuro: {formatCurrency(resumo?.totalPipelineOS || 0)}
            </div>
          </div>
          <p className="text-xs text-[#94A3B8] mb-4">
            Ordens de serviço abertas que estão gerando peças e mão de obra e entrarão no Contas a Receber assim que finalizadas:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pipelineOS.map((os: any) => (
              <div
                key={os.id}
                className="bg-[#0B1329] border border-[#1E2C48] p-3.5 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{os.numero_os}</span>
                    <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded">
                      ABERTA
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[170px] mt-0.5">
                    {os.cliente}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-xs text-emerald-400">
                    {formatCurrency(os.valor_total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
