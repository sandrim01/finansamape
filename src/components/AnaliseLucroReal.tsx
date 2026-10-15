"use client";

import { useEffect, useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Wrench,
  Car,
  Package,
  DollarSign,
  TrendingUp,
  Percent,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  Building2,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface LinhaData {
  chave: string;
  titulo: string;
  descricao: string;
  cor: string;
  corBg: string;
  corBorder: string;
  corTexto: string;
  faturamento: number;
  participacaoReceita: number;
  custoEstimado: number;
  lucroReal: number;
  margemPct: number;
  participacaoLucro: number;
  detalhes: any;
}

interface MecanicoData {
  id: number | null;
  nome: string;
  qtdOs: number;
  maoObra: number;
  pecas: number;
  deslocamento: number;
  kmRodados: number;
  total: number;
  custoTotal: number;
  lucroReal: number;
  margemPct: number;
  ticketMedio: number;
}

interface ClienteData {
  id: number | null;
  nome: string;
  cidade: string;
  qtdOs: number;
  maoObra: number;
  pecas: number;
  deslocamento: number;
  kmRodados: number;
  total: number;
  custoTotal: number;
  lucroReal: number;
  margemPct: number;
  ticketMedio: number;
}

interface OsDetalhada {
  id: number;
  numero_os: string;
  data: string;
  status: string;
  cliente_nome: string;
  mecanico_nome: string;
  maquina: string;
  valor_mao_obra: number;
  valor_pecas: number;
  km_rodados: number;
  valor_deslocamento: number;
  valor_total: number;
  custo_total: number;
  lucro_real: number;
  margem_pct: number;
  rentabilidade: "ALTA" | "MEDIA" | "BAIXA";
}

export function AnaliseLucroReal() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filtros
  const [ano, setAno] = useState("ALL");
  const [mecanicoId, setMecanicoId] = useState("ALL");
  const [clienteFiltro, setClienteFiltro] = useState("ALL");
  const [buscaTabela, setBuscaTabela] = useState("");
  const [filtroRentabilidade, setFiltroRentabilidade] = useState<"TODAS" | "ALTA" | "MEDIA" | "BAIXA">("TODAS");

  // Simulador de margens
  const [painelMargensAberto, setPainelMargensAberto] = useState(false);
  const [margemMo, setMargemMo] = useState(85);
  const [margemKm, setMargemKm] = useState(65);
  const [margemPecas, setMargemPecas] = useState(40);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ano,
        mecanico: mecanicoId,
        cliente: clienteFiltro,
        margem_mo: margemMo.toString(),
        margem_km: margemKm.toString(),
        margem_pecas: margemPecas.toString(),
      });

      const res = await fetch(`/api/analise-lucro-real?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar análise");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [ano, mecanicoId, clienteFiltro, margemMo, margemKm, margemPecas]);

  const restaurarMargensPadrao = () => {
    setMargemMo(85);
    setMargemKm(65);
    setMargemPecas(40);
  };

  const ordensFiltradasTabela = useMemo(() => {
    if (!data?.ordens) return [];
    return (data.ordens as OsDetalhada[]).filter((os) => {
      const matchBusca =
        os.numero_os.toLowerCase().includes(buscaTabela.toLowerCase()) ||
        os.cliente_nome.toLowerCase().includes(buscaTabela.toLowerCase()) ||
        os.mecanico_nome.toLowerCase().includes(buscaTabela.toLowerCase()) ||
        os.maquina.toLowerCase().includes(buscaTabela.toLowerCase());

      const matchRent =
        filtroRentabilidade === "TODAS" || os.rentabilidade === filtroRentabilidade;

      return matchBusca && matchRent;
    });
  }, [data?.ordens, buscaTabela, filtroRentabilidade]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium">Calculando lucro real e margens por linha...</p>
      </div>
    );
  }

  const resumo = data?.resumo || {
    totalOs: 0,
    receitaBrutaTotal: 0,
    custoTotalReal: 0,
    lucroTotalReal: 0,
    margemGeralPonderada: 0,
    ticketMedioGeral: 0,
  };

  const linhas: LinhaData[] = data?.linhas || [];
  const mecanicos: MecanicoData[] = data?.mecanicos || [];
  const topClientes: ClienteData[] = data?.topClientes || [];
  const evolucaoMensal = data?.evolucaoMensal || [];
  const insights = data?.insights || [];
  const anosDisponiveis: string[] = data?.filtrosDisponiveis?.anos || ["2026", "2025"];

  // Dados para Gráfico de Pizza do Mix de Lucro
  const pieData = linhas.map((l) => ({
    name: l.titulo,
    value: Math.round(l.lucroReal),
    color: l.cor,
  }));

  // Dados para Gráfico Comparativo Faturamento vs Lucro Real
  const comparativoChartData = linhas.map((l) => ({
    linha: l.titulo.split(" ")[0],
    faturamento: l.faturamento,
    custo: l.custoEstimado,
    lucro: l.lucroReal,
    margem: l.margemPct,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* BARRA SUPERIOR DE FILTROS & SIMULADOR DE MARGEM */}
      <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-sm">Filtrar Análise:</span>
          </div>

          {/* Filtro Ano */}
          <select
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="bg-[#0B1329] border border-[#1E2C48] text-white text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="ALL">Todo o Histórico</option>
            {anosDisponiveis.map((a) => (
              <option key={a} value={a}>
                Ano {a}
              </option>
            ))}
          </select>

          {/* Filtro Mecânico */}
          <select
            value={mecanicoId}
            onChange={(e) => setMecanicoId(e.target.value)}
            className="bg-[#0B1329] border border-[#1E2C48] text-white text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="ALL">Todos os Mecânicos</option>
            {mecanicos.map((m) => (
              <option key={m.id || m.nome} value={m.id?.toString() || m.nome}>
                {m.nome} ({m.qtdOs} OS)
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Simulação de Custos & Margens */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPainelMargensAberto(!painelMargensAberto)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              painelMargensAberto
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "bg-[#1E2C48] text-gray-200 hover:bg-[#253759] border border-[#2D4168]"
            }`}
          >
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Simulador de Margens Técnicas</span>
            <span className="bg-blue-500/20 text-blue-300 text-xs px-1.5 py-0.5 rounded font-mono">
              MO: {margemMo}% | KM: {margemKm}% | Pçs: {margemPecas}%
            </span>
          </button>

          <button
            onClick={carregarDados}
            title="Atualizar dados"
            className="p-2 rounded-xl bg-[#1E2C48] hover:bg-[#253759] text-gray-300 border border-[#2D4168] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* PAINEL EXPANSÍVEL DE SIMULAÇÃO DE MARGENS */}
      {painelMargensAberto && (
        <div className="bg-[#101A33] border-2 border-blue-500/30 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1E2C48]">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              <div>
                <h4 className="text-white text-sm font-bold">Simulador Interativo de Margens de Contribuição</h4>
                <p className="text-gray-400 text-xs">
                  Ajuste os parâmetros de custo direto para simular cenários de alta de diesel, insumos ou CMV de peças.
                </p>
              </div>
            </div>
            <button
              onClick={restaurarMargensPadrao}
              className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
            >
              Restaurar Padrões Técnicos da Samape
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Slider Mão de Obra */}
            <div className="bg-[#151E34] p-4 rounded-xl border border-[#1E2C48] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Mão de Obra Mecânica
                </span>
                <span className="font-bold text-white text-sm bg-blue-500/20 px-2 py-0.5 rounded">
                  {margemMo}% Margem
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={margemMo}
                onChange={(e) => setMargemMo(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Custo Direto: {100 - margemMo}%</span>
                <span>Padrão Oficina: 85%</span>
              </div>
            </div>

            {/* Slider Deslocamento */}
            <div className="bg-[#151E34] p-4 rounded-xl border border-[#1E2C48] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" /> Deslocamento & KM
                </span>
                <span className="font-bold text-white text-sm bg-amber-500/20 px-2 py-0.5 rounded">
                  {margemKm}% Margem
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="85"
                step="5"
                value={margemKm}
                onChange={(e) => setMargemKm(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Combustível/Frota: {100 - margemKm}%</span>
                <span>Padrão Socorro: 65%</span>
              </div>
            </div>

            {/* Slider Peças */}
            <div className="bg-[#151E34] p-4 rounded-xl border border-[#1E2C48] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Peças & Componentes
                </span>
                <span className="font-bold text-white text-sm bg-purple-500/20 px-2 py-0.5 rounded">
                  {margemPecas}% Margem
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="70"
                step="5"
                value={margemPecas}
                onChange={(e) => setMargemPecas(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Custo de Peças (CMV): {100 - margemPecas}%</span>
                <span>Padrão Mercado: 40%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 CARDS DE KPIS CONSOLIDADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Bruta Total */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Faturamento Bruto
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {formatCurrency(resumo.receitaBrutaTotal)}
          </div>
          <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
            <span className="text-blue-400 font-semibold">{resumo.totalOs}</span> Ordens de Serviço faturadas
          </p>
        </div>

        {/* Lucro Real Apurado */}
        <div className="bg-gradient-to-br from-[#151E34] to-[#0E2841] border border-emerald-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Lucro Real Apurado
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 font-mono">
              {resumo.margemGeralPonderada.toFixed(1)}% Margem
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {formatCurrency(resumo.lucroTotalReal)}
          </div>
          <p className="text-emerald-300/80 text-xs mt-2">
            Resultado operacional livre dos custos diretos
          </p>
        </div>

        {/* Custo Direto Total */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Custo Direto Estimado
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingUp className="w-5 h-5 rotate-180" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-400 font-mono">
            {formatCurrency(resumo.custoTotalReal)}
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Peças compradas + Diesel frota + Consumíveis
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Ticket Médio por O.S.
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-400 font-mono">
            {formatCurrency(resumo.ticketMedioGeral)}
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Lucro médio por atendimento:{" "}
            <span className="text-emerald-400 font-semibold font-mono">
              {formatCurrency(resumo.totalOs > 0 ? resumo.lucroTotalReal / resumo.totalOs : 0)}
            </span>
          </p>
        </div>
      </div>

      {/* OS 3 PILARES DE RECEITA & LUCRO (DETALHAMENTO ESTRUTURADO) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Distribuição do Lucro Real por Linha Operacional</span>
            </h3>
            <p className="text-gray-400 text-xs">
              Detalhamento de receita, custos diretos e lucro líquido gerado por cada serviço da SAMAPE.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {linhas.map((linha) => {
            const Icon =
              linha.chave === "mao_obra" ? Wrench : linha.chave === "deslocamento" ? Car : Package;

            return (
              <div
                key={linha.chave}
                className={`bg-[#151E34] border ${linha.corBorder} rounded-2xl p-5 shadow-xl relative overflow-hidden transition-all hover:border-opacity-60`}
              >
                {/* Header da Linha */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${linha.corBg} ${linha.corTexto}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-base">{linha.titulo}</h4>
                      <p className="text-gray-400 text-[11px] leading-tight line-clamp-1">
                        {linha.descricao}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métricas Principais */}
                <div className="space-y-3 mb-5">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Faturamento da Linha</span>
                      <span className="font-semibold text-white">
                        {linha.participacaoReceita.toFixed(1)}% da Receita Total
                      </span>
                    </div>
                    <div className="text-xl font-bold text-white font-mono">
                      {formatCurrency(linha.faturamento)}
                    </div>
                  </div>

                  {/* Barra de Distribuição de Lucro */}
                  <div className="bg-[#0B1329] p-3 rounded-xl border border-[#1E2C48] space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Margem Técnica:</span>
                      <span className="font-bold text-white font-mono">{linha.margemPct}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Custo Direto Estimado:</span>
                      <span className="text-rose-400 font-mono font-medium">
                        {formatCurrency(linha.custoEstimado)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#1E2C48] flex justify-between text-sm">
                      <span className="font-semibold text-emerald-400">Lucro Real:</span>
                      <span className="font-bold text-emerald-400 font-mono text-base">
                        {formatCurrency(linha.lucroReal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso de Participação no Lucro Total */}
                <div className="space-y-1.5 pt-3 border-t border-[#1E2C48]">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Participação no Lucro Real da Samape:</span>
                    <span className={`font-bold font-mono ${linha.corTexto}`}>
                      {linha.participacaoLucro.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#0B1329] rounded-full overflow-hidden p-0.5 border border-[#1E2C48]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(linha.participacaoLucro, 100)}%`,
                        backgroundColor: linha.cor,
                      }}
                    />
                  </div>
                </div>

                {/* Badges e Fatos Técnicos */}
                <div className="mt-4 pt-3 border-t border-[#1E2C48] flex items-center justify-between text-[11px] text-gray-400">
                  {linha.chave === "mao_obra" && (
                    <>
                      <span>{linha.detalhes?.totalOsComMo} Ordens c/ Serviço</span>
                      <span className="text-blue-400 font-semibold font-mono">
                        Média: {formatCurrency(linha.detalhes?.ticketMedioMo)}
                      </span>
                    </>
                  )}
                  {linha.chave === "deslocamento" && (
                    <>
                      <span>{linha.detalhes?.kmTotalRodados} km Rodados</span>
                      <span className="text-amber-400 font-semibold font-mono">
                        Taxa: {formatCurrency(linha.detalhes?.taxaMediaPorKm)}/km
                      </span>
                    </>
                  )}
                  {linha.chave === "pecas" && (
                    <>
                      <span>{linha.detalhes?.osComPecas} Ordens c/ Peças</span>
                      <span className="text-purple-400 font-semibold font-mono">
                        Ticket: {formatCurrency(linha.detalhes?.ticketMedioPecas)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRÁFICOS EXECUTIVOS RECHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Comparativo Receita vs Custo vs Lucro por Linha */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-xl">
          <div className="mb-4">
            <h4 className="text-white font-bold text-base">Faturamento Bruto vs. Lucro Real</h4>
            <p className="text-gray-400 text-xs">
              Visualização de quanto entra no caixa versus o que realmente fica de lucro limpo por linha.
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativoChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2C48" vertical={false} />
                <XAxis dataKey="linha" stroke="#94A3B8" tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis
                  stroke="#94A3B8"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), ""]}
                  contentStyle={{
                    backgroundColor: "#0B1329",
                    borderColor: "#1E2C48",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "10px" }}
                  formatter={(value) => <span className="text-xs text-gray-300 capitalize">{value}</span>}
                />
                <Bar dataKey="faturamento" name="Faturamento Bruto" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" name="Custo Direto" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro Real" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Evolução Histórica do Lucro Real Mensal */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-xl">
          <div className="mb-4">
            <h4 className="text-white font-bold text-base">Evolução Mensal do Lucro Real</h4>
            <p className="text-gray-400 text-xs">
              Comportamento do lucro mês a mês segregado por Mão de Obra, Deslocamento e Peças.
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoMensal} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2C48" vertical={false} />
                <XAxis dataKey="rotulo" stroke="#94A3B8" tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis
                  stroke="#94A3B8"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), ""]}
                  contentStyle={{
                    backgroundColor: "#0B1329",
                    borderColor: "#1E2C48",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "10px" }}
                  formatter={(value) => <span className="text-xs text-gray-300 capitalize">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="lucroMaoObra"
                  name="Lucro Mão de Obra"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="lucroDeslocamento"
                  name="Lucro Deslocamento"
                  stackId="1"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="lucroPecas"
                  name="Lucro Peças"
                  stackId="1"
                  stroke="#A855F7"
                  fill="#A855F7"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* COMPARATIVO DE PERFORMANCE POR MECÂNICO & TOP CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel por Mecânico */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-white font-bold text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>Desempenho por Especialista Técnico</span>
              </h4>
              <p className="text-gray-400 text-xs">
                Lucro real e volume gerado por cada mecânico na operação de campo e oficina.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {mecanicos.map((mec) => (
              <div
                key={mec.nome}
                className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-4 transition-all hover:border-blue-500/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-white font-bold text-sm">{mec.nome}</span>
                    <span className="ml-2 text-xs bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded font-mono">
                      {mec.qtdOs} Ordens
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold font-mono text-base">
                      {formatCurrency(mec.lucroReal)}
                    </span>
                    <p className="text-[11px] text-gray-400">Lucro Real ({mec.margemPct.toFixed(1)}%)</p>
                  </div>
                </div>

                {/* Sub-métricas */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E2C48] text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] block">MÃO DE OBRA</span>
                    <span className="font-mono text-gray-200 font-medium">
                      {formatCurrency(mec.maoObra)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">KM RODADOS</span>
                    <span className="font-mono text-amber-400 font-medium">
                      {mec.kmRodados.toFixed(0)} km ({formatCurrency(mec.deslocamento)})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">TICKET MÉDIO</span>
                    <span className="font-mono text-blue-400 font-medium">
                      {formatCurrency(mec.ticketMedio)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Clientes Mais Lucrativos */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-white font-bold text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>Top Clientes por Lucro Real Gerado</span>
              </h4>
              <p className="text-gray-400 text-xs">
                Clientes que trazem maior margem líquida para o caixa da SAMAPE.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {topClientes.slice(0, 5).map((cli, idx) => (
              <div
                key={cli.nome}
                className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-3.5 flex items-center justify-between transition-all hover:border-emerald-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
                    #{idx + 1}
                  </div>
                  <div>
                    <h5 className="text-white font-semibold text-xs sm:text-sm line-clamp-1">
                      {cli.nome}
                    </h5>
                    <p className="text-gray-400 text-[11px]">
                      {cli.qtdOs} OS | Mão de Obra: {formatCurrency(cli.maoObra)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-emerald-400 font-bold font-mono text-sm block">
                    {formatCurrency(cli.lucroReal)}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {cli.margemPct.toFixed(1)}% margem
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ALERTAS & INSIGHTS ESTRATÉGICOS */}
      {insights.length > 0 && (
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <span>Diagnósticos Financeiros & Recomendações Estratégicas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((ins: any, idx: number) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  ins.nivel === "alerta"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : ins.nivel === "sucesso"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-blue-500/10 border-blue-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {ins.nivel === "alerta" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <h5 className="text-white font-bold text-xs">{ins.titulo}</h5>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">{ins.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABELA DE AUDITORIA DE LUCRO REAL POR ORDEM DE SERVIÇO */}
      <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-white font-bold text-base">
              Auditoria de Rentabilidade por Ordem de Serviço
            </h4>
            <p className="text-gray-400 text-xs">
              Demonstrativo individualizado de faturamento, custo direto e lucro real de cada chamado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaTabela}
                onChange={(e) => setBuscaTabela(e.target.value)}
                placeholder="Buscar OS, cliente, máquina..."
                className="bg-[#0B1329] border border-[#1E2C48] text-white text-xs rounded-xl pl-9 pr-3 py-2 w-56 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Filtro por Margem */}
            <select
              value={filtroRentabilidade}
              onChange={(e: any) => setFiltroRentabilidade(e.target.value)}
              className="bg-[#0B1329] border border-[#1E2C48] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="TODAS">Todas as Margens</option>
              <option value="ALTA">Alta Margem (&gt; 70%)</option>
              <option value="MEDIA">Média Margem (45% a 70%)</option>
              <option value="BAIXA">Baixa Margem (&lt; 45%)</option>
            </select>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto rounded-xl border border-[#1E2C48]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1329] text-gray-400 uppercase text-[11px] tracking-wider border-b border-[#1E2C48]">
              <tr>
                <th className="py-3 px-3">O.S. / Data</th>
                <th className="py-3 px-3">Cliente / Máquina</th>
                <th className="py-3 px-3">Mecânico</th>
                <th className="py-3 px-3 text-right">Mão de Obra</th>
                <th className="py-3 px-3 text-right">Deslocamento</th>
                <th className="py-3 px-3 text-right">Peças</th>
                <th className="py-3 px-3 text-right">Faturamento</th>
                <th className="py-3 px-3 text-right">Custo Dir.</th>
                <th className="py-3 px-3 text-right">Lucro Real</th>
                <th className="py-3 px-3 text-center">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2C48] text-gray-300">
              {ordensFiltradasTabela.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Nenhuma ordem de serviço encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                ordensFiltradasTabela.map((os) => (
                  <tr key={os.id} className="hover:bg-[#1E2C48]/50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-white font-mono">{os.numero_os}</span>
                      <p className="text-[10px] text-gray-400">{formatDate(os.data)}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-white line-clamp-1">{os.cliente_nome}</span>
                      <p className="text-[10px] text-gray-400 line-clamp-1">{os.maquina}</p>
                    </td>
                    <td className="py-3 px-3 text-gray-300">{os.mecanico_nome}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400 font-medium">
                      {formatCurrency(os.valor_mao_obra)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">
                      {formatCurrency(os.valor_deslocamento)}
                      {os.km_rodados > 0 && (
                        <span className="block text-[10px] text-gray-500">
                          {os.km_rodados} km
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-purple-400">
                      {formatCurrency(os.valor_pecas)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {formatCurrency(os.valor_total)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-400">
                      {formatCurrency(os.custo_total)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-400">
                      {formatCurrency(os.lucro_real)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                          os.rentabilidade === "ALTA"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : os.rentabilidade === "MEDIA"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {os.margem_pct.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
