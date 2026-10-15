"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Settings,
  FileSpreadsheet,
  Printer,
  AlertCircle,
  Building2,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Play,
  Users,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DADOS_EMPRESA } from "@/lib/empresa";
import { CENTROS_DE_CUSTO } from "@/lib/centrosCusto";
import { RelatorioContabilPDFModal } from "@/components/RelatorioContabilPDFModal";
import { DadosExportacaoFinanceira } from "@/lib/exportacaoFinanceira";

interface Destinatario {
  nome: string;
  email: string;
  cargo: string;
  selecionado: boolean;
}

interface Configuracao {
  ativa: boolean;
  diaDisparo: number;
  horaDisparo: string;
  anexarPlanilhaExcel: boolean;
  destinatarios: Destinatario[];
  emailsAdicionais: string[];
}

interface DadosFechamento {
  mes: number;
  ano: number;
  periodoLabel: string;
  dataFechamento: string;
  hashAutenticacao: string;
  dre: {
    receitaMaoObra: number;
    receitaPecas: number;
    receitaDeslocamento: number;
    receitaBrutaTotal: number;
    custoPecas: number;
    custoFrota: number;
    custosDiretosTotal: number;
    margemContribuicao: number;
    margemContribuicaoPerc: number;
    despesasOperacionais: Record<string, number>;
    despesasTotais: number;
    lucroLiquido: number;
    margemLiquidaPerc: number;
    pontoEquilibrio: number;
  };
  operacional: {
    totalOrdensServico: number;
    osFechadas: number;
    osEmAberto: number;
    ticketMedio: number;
    kmRodadosFrota: number;
  };
  financeiro: {
    totalRecebidoMes: number;
    totalPagoMes: number;
    saldoOperacionalMes: number;
    titulosInadimplentesTotal: number;
    quantidadeInadimplentes: number;
  };
}

interface HistoricoItem {
  id: number;
  data: string;
  periodoLabel: string;
  receitaBruta: number;
  lucroLiquido: number;
  hashAutenticacao: string;
  enviados: string[];
  falhas: Array<{ email: string; erro: string }>;
  modoSimulado: boolean;
}

const MESES = [
  { valor: 1, nome: "Janeiro" },
  { valor: 2, nome: "Fevereiro" },
  { valor: 3, nome: "Março" },
  { valor: 4, nome: "Abril" },
  { valor: 5, nome: "Maio" },
  { valor: 6, nome: "Junho" },
  { valor: 7, nome: "Julho" },
  { valor: 8, nome: "Agosto" },
  { valor: 9, nome: "Setembro" },
  { valor: 10, nome: "Outubro" },
  { valor: 11, nome: "Novembro" },
  { valor: 12, nome: "Dezembro" },
];

export default function FechamentoMensalPage() {
  const hoje = new Date();
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const [config, setConfig] = useState<Configuracao>({
    ativa: true,
    diaDisparo: 1,
    horaDisparo: "08:00",
    anexarPlanilhaExcel: true,
    destinatarios: [],
    emailsAdicionais: [],
  });

  const [novoEmailAdicional, setNovoEmailAdicional] = useState("");
  const [dadosFechamento, setDadosFechamento] = useState<DadosFechamento | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<"email" | "dre" | "historico">("email");

  // Modal PDF
  const [pdfModalAberto, setPdfModalAberto] = useState(false);

  // Carrega dados iniciais
  const carregarDados = async (ano: number, mes: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/fechamento-mensal?ano=${ano}&mes=${mes}`);
      const data = await res.json();
      if (data.sucesso) {
        setConfig(data.config);
        setHistorico(data.historico || []);
        setDadosFechamento(data.dadosFechamento || null);
      } else {
        setMensagemErro(data.erro || "Falha ao carregar fechamento mensal");
      }
    } catch (e: any) {
      setMensagemErro(e.message || "Erro de conexão ao carregar balanço.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados(anoSelecionado, mesSelecionado);
  }, [anoSelecionado, mesSelecionado]);

  // Salvar alterações de configuração
  const handleSalvarConfig = async () => {
    try {
      setSalvando(true);
      setMensagemSucesso(null);
      setMensagemErro(null);

      const res = await fetch("/api/fechamento-mensal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "salvar_config",
          config,
        }),
      });

      const data = await res.json();
      if (data.sucesso) {
        setMensagemSucesso("✅ Configurações da automação salvas com sucesso!");
        setTimeout(() => setMensagemSucesso(null), 4000);
      } else {
        setMensagemErro(data.erro || "Erro ao salvar configuração.");
      }
    } catch (e: any) {
      setMensagemErro(e.message || "Erro de conexão.");
    } finally {
      setSalvando(false);
    }
  };

  // Disparar balanço manualmente agora
  const handleDispararManual = async () => {
    const confirmacao = window.confirm(
      `Confirma o fechamento e disparo imediato do balanço de ${MESES.find((m) => m.valor === mesSelecionado)?.nome}/${anoSelecionado} para os destinatários selecionados?`
    );
    if (!confirmacao) return;

    try {
      setDisparando(true);
      setMensagemSucesso(null);
      setMensagemErro(null);

      const res = await fetch("/api/fechamento-mensal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "disparar",
          ano: anoSelecionado,
          mes: mesSelecionado,
          anexarExcel: config.anexarPlanilhaExcel,
        }),
      });

      const data = await res.json();
      if (data.sucesso) {
        setMensagemSucesso(`🚀 ${data.mensagem}`);
        if (data.dadosFechamento) {
          setDadosFechamento(data.dadosFechamento);
        }
        // Recarregar histórico
        carregarDados(anoSelecionado, mesSelecionado);
      } else {
        setMensagemErro(data.erro || "Falha no disparo do balanço.");
      }
    } catch (e: any) {
      setMensagemErro(e.message || "Erro ao comunicar com o servidor.");
    } finally {
      setDisparando(false);
    }
  };

  // Toggle de seleção de destinatário
  const handleToggleDestinatario = (index: number) => {
    const novos = [...config.destinatarios];
    novos[index].selecionado = !novos[index].selecionado;
    setConfig({ ...config, destinatarios: novos });
  };

  // Adicionar e-mail adicional
  const handleAdicionarEmail = () => {
    if (!novoEmailAdicional || !novoEmailAdicional.includes("@")) {
      alert("Informe um endereço de e-mail válido.");
      return;
    }
    const lista = config.emailsAdicionais || [];
    if (lista.includes(novoEmailAdicional.trim())) {
      alert("Este e-mail já está na lista.");
      return;
    }
    setConfig({
      ...config,
      emailsAdicionais: [...lista, novoEmailAdicional.trim()],
    });
    setNovoEmailAdicional("");
  };

  // Remover e-mail adicional
  const handleRemoverEmail = (emailRemover: string) => {
    setConfig({
      ...config,
      emailsAdicionais: (config.emailsAdicionais || []).filter((e) => e !== emailRemover),
    });
  };

  // Download da planilha Excel
  const handleBaixarExcel = () => {
    window.open(`/api/relatorios/exportar?periodo=${anoSelecionado}-${String(mesSelecionado).padStart(2, "0")}&tipo=xlsx`, "_blank");
  };

  // Converte dados para o formato do modal PDF
  const dadosParaPdf: DadosExportacaoFinanceira | null = dadosFechamento
    ? {
        periodoLabel: dadosFechamento.periodoLabel,
        dre: dadosFechamento.dre,
        contasReceber: [],
        contasPagar: [],
        fluxoCaixaProjetado: [],
        inadimplencia: [],
      }
    : null;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#070D1E] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* 1. CABEÇALHO EXECUTIVO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-rose-500 font-bold uppercase tracking-wider mb-1">
            <span>Automações & Inteligência</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Fechamento Contábil</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-8 h-8 text-rose-500" />
            Automação de Balanço Mensal
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {DADOS_EMPRESA.razaoSocial} • Fechamento de DRE, apuração de margens e disparo de relatório executivo por e-mail
          </p>
        </div>

        {/* AÇÕES NO TOPO */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSalvarConfig}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            <Settings className={`w-4 h-4 ${salvando ? "animate-spin text-rose-400" : "text-slate-400"}`} />
            {salvando ? "Salvando..." : "Salvar Configuração"}
          </button>

          <button
            onClick={handleDispararManual}
            disabled={disparando || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-rose-950/40 disabled:opacity-50 active:scale-95"
          >
            <Send className={`w-4 h-4 ${disparando ? "animate-pulse" : ""}`} />
            {disparando ? "Apurando & Disparando..." : "Disparar Balanço Agora"}
          </button>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO OU ERRO */}
      {mensagemSucesso && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button onClick={() => setMensagemSucesso(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {mensagemErro && (
        <div className="p-4 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
          <button onClick={() => setMensagemErro(null)} className="text-rose-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* 2. GRID DE CONFIGURAÇÃO E DESTINATÁRIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: AGENDAMENTO AUTOMÁTICO (5 cols) */}
        <div className="lg:col-span-5 bg-[#0B1329] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Regras de Disparo Automático
              </h2>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              config.ativa ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${config.ativa ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {config.ativa ? "Automação Ativa" : "Pausada"}
            </div>
          </div>

          {/* TOGGLE ATIVA */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
            <div>
              <div className="text-xs font-bold text-white">Status da Rotina Mensal</div>
              <div className="text-[11px] text-slate-400">Gera e envia o balanço periodicamente</div>
            </div>
            <button
              onClick={() => setConfig({ ...config, ativa: !config.ativa })}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                config.ativa ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.ativa ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          {/* DIA DO DISPARO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Dia do Mês para Fechamento & Disparo:
            </label>
            <div className="flex items-center gap-3">
              <select
                value={config.diaDisparo}
                onChange={(e) => setConfig({ ...config, diaDisparo: parseInt(e.target.value) })}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-rose-500 flex-1"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Todo dia {d}º de cada mês (às {config.horaDisparo})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500">
              💡 Recomendado: <strong>Dia 1º</strong> (fecha o mês anterior completo) ou <strong>Dia 5º</strong>.
            </p>
          </div>

          {/* CHECKBOX ANEXO EXCEL */}
          <label className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900/80 transition-colors">
            <input
              type="checkbox"
              checked={config.anexarPlanilhaExcel}
              onChange={(e) => setConfig({ ...config, anexarPlanilhaExcel: e.target.checked })}
              className="w-4 h-4 text-rose-600 rounded bg-slate-800 border-slate-700 focus:ring-rose-500"
            />
            <div className="text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Anexar Planilha Executiva (.xlsx)
              </div>
              <div className="text-[11px] text-slate-400">
                Gera o arquivo com 5 abas (DRE, Receber, Pagar, Fluxo de Caixa, Aging List)
              </div>
            </div>
          </label>

          {/* INFORMAÇÃO PRÓXIMO DISPARO */}
          <div className="p-3.5 bg-sky-950/30 border border-sky-500/20 rounded-xl flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-sky-300">Próximo Fechamento Programado:</div>
              <div className="text-[11px] text-slate-300">
                Dia {config.diaDisparo} do próximo mês às {config.horaDisparo}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: DESTINATÁRIOS (7 cols) */}
        <div className="lg:col-span-7 bg-[#0B1329] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Destinatários do Relatório
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              {config.destinatarios.filter((d) => d.selecionado).length + (config.emailsAdicionais?.length || 0)} selecionados
            </span>
          </div>

          {/* LISTA DE FUNCIONÁRIOS CADASTRADOS */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {config.destinatarios.map((dest, idx) => (
              <div
                key={dest.email}
                onClick={() => handleToggleDestinatario(idx)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  dest.selecionado
                    ? "bg-slate-900 border-rose-500/40 text-white shadow-sm"
                    : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={dest.selecionado}
                    onChange={() => {}} // tratado no wrapper
                    className="w-4 h-4 text-rose-600 rounded bg-slate-800 border-slate-700 pointer-events-none"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {dest.nome}
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {dest.cargo}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{dest.email}</div>
                  </div>
                </div>
                <Mail className={`w-4 h-4 ${dest.selecionado ? "text-rose-400" : "text-slate-600"}`} />
              </div>
            ))}
          </div>

          {/* E-MAILS ADICIONAIS */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>E-mails Externos / Contabilidade Adicional:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="contador@assessoria.com.br"
                value={novoEmailAdicional}
                onChange={(e) => setNovoEmailAdicional(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdicionarEmail();
                  }
                }}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 flex-1 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAdicionarEmail}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            {/* TAGS DE E-MAILS EXTRAS */}
            {config.emailsAdicionais && config.emailsAdicionais.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {config.emailsAdicionais.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px]"
                  >
                    <Mail className="w-3 h-3 text-sky-400" />
                    {email}
                    <button
                      onClick={() => handleRemoverEmail(email)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BARRA DE SELEÇÃO DE PERÍODO & KPIS SINTÉTICOS */}
      <div className="bg-[#0B1329] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Mês de Apuração:
            </div>
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-rose-500"
            >
              {MESES.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.nome}
                </option>
              ))}
            </select>
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-rose-500"
            >
              {[2024, 2025, 2026, 2027].map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>

          {/* BOTÕES DE EXPORTAÇÃO DIRETA DO MÊS */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPdfModalAberto(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-rose-400" />
              Ver Relatório A4 (PDF)
            </button>
            <button
              onClick={handleBaixarExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Baixar Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* 4 CARDS KPIS CONSOLIDADOS */}
        {dadosFechamento && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase">Receita Bruta Total</div>
              <div className="text-base sm:text-lg font-black text-white mt-0.5">
                {formatCurrency(dadosFechamento.dre.receitaBrutaTotal)}
              </div>
              <div className="text-[10px] text-sky-400 font-semibold mt-0.5">
                {dadosFechamento.operacional.osFechadas} OS Concluídas
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase">Margem Contribuição</div>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
                {formatCurrency(dadosFechamento.dre.margemContribuicao)}
              </div>
              <div className="text-[10px] text-emerald-400/80 font-semibold mt-0.5">
                {dadosFechamento.dre.margemContribuicaoPerc}% do faturamento
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase">Despesas Operacionais</div>
              <div className="text-base sm:text-lg font-black text-rose-400 mt-0.5">
                {formatCurrency(dadosFechamento.dre.despesasTotais)}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                5 Centros de Custo
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase">Lucro Líquido Final</div>
              <div className={`text-base sm:text-lg font-black mt-0.5 ${dadosFechamento.dre.lucroLiquido >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatCurrency(dadosFechamento.dre.lucroLiquido)}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Margem Líquida: {dadosFechamento.dre.margemLiquidaPerc}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. TABS: PRÉVIA DO E-MAIL / DETALHES DRE / HISTÓRICO */}
      <div className="bg-[#0B1329] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex border-b border-slate-800 px-6 pt-4 gap-4">
          <button
            onClick={() => setAbaAtiva("email")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              abaAtiva === "email"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="w-4 h-4" />
            Prévia do E-mail Executivo
          </button>
          <button
            onClick={() => setAbaAtiva("dre")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              abaAtiva === "dre"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Estrutura DRE & Centros de Custo
          </button>
          <button
            onClick={() => setAbaAtiva("historico")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              abaAtiva === "historico"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Histórico de Disparos ({historico.length})
          </button>
        </div>

        <div className="p-6">
          {/* ABA 1: PRÉVIA DO E-MAIL OFICIAL */}
          {abaAtiva === "email" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <strong>Assunto:</strong> 📊 Balanço & Fechamento Mensal ({dadosFechamento?.periodoLabel}) - SAMAPE ÍNDIO
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  SHA-256: {dadosFechamento?.hashAutenticacao}
                </div>
              </div>

              {/* MOCKUP DO E-MAIL */}
              <div className="max-w-2xl mx-auto bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 text-left">
                {/* TOPO DO E-MAIL */}
                <div className="bg-[#0B1329] text-white p-6 border-b-4 border-rose-600">
                  <div className="inline-block bg-slate-800 text-sky-400 text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider mb-2 border border-slate-700">
                    Relatório Oficial de Fechamento Contábil
                  </div>
                  <h2 className="text-xl font-black tracking-tight">{DADOS_EMPRESA.nomeFantasia}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {DADOS_EMPRESA.razaoSocial} • CNPJ: {DADOS_EMPRESA.cnpj}
                  </p>
                  <p className="text-xs text-slate-400">
                    Período: <strong className="text-white">{dadosFechamento?.periodoLabel}</strong>
                  </p>
                </div>

                {/* CORPO DO E-MAIL */}
                <div className="p-6 space-y-5 text-xs text-slate-700">
                  <p className="leading-relaxed">
                    Olá, <strong>Equipe Samape</strong>! Segue o balanço consolidado e fechamento financeiro oficial referente ao exercício de <strong>{dadosFechamento?.periodoLabel}</strong> gerado automaticamente pelo sistema <strong>SAMAPEOP</strong>.
                  </p>

                  {/* KPIS */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase">Receita Operacional Bruta</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        {formatCurrency(dadosFechamento?.dre.receitaBrutaTotal || 0)}
                      </div>
                      <div className="text-[10px] text-sky-600 font-bold mt-0.5">
                        {dadosFechamento?.operacional.osFechadas} OS Concluídas
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase">Margem de Contribuição</div>
                      <div className="text-base font-black text-emerald-600 mt-0.5">
                        {formatCurrency(dadosFechamento?.dre.margemContribuicao || 0)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                        {dadosFechamento?.dre.margemContribuicaoPerc}% do Faturamento
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase">Despesas Operacionais Fixas</div>
                      <div className="text-base font-black text-rose-600 mt-0.5">
                        {formatCurrency(dadosFechamento?.dre.despesasTotais || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                        5 Centros de Custo
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border-l-4 border-l-emerald-500 border-slate-200 rounded-xl">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase">Lucro Operacional Líquido</div>
                      <div className={`text-base font-black mt-0.5 ${(dadosFechamento?.dre.lucroLiquido || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatCurrency(dadosFechamento?.dre.lucroLiquido || 0)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                        Margem Líquida: {dadosFechamento?.dre.margemLiquidaPerc}%
                      </div>
                    </div>
                  </div>

                  {/* DRE SINTÉTICO */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 p-2.5 font-bold text-[11px] text-slate-700 uppercase">
                      DRE Gerencial Sintético
                    </div>
                    <div className="divide-y divide-slate-100 text-[11px]">
                      <div className="flex justify-between p-2">
                        <span>(+) Faturamento Mão de Obra</span>
                        <strong>{formatCurrency(dadosFechamento?.dre.receitaMaoObra || 0)}</strong>
                      </div>
                      <div className="flex justify-between p-2">
                        <span>(+) Venda de Peças e Insumos</span>
                        <strong>{formatCurrency(dadosFechamento?.dre.receitaPecas || 0)}</strong>
                      </div>
                      <div className="flex justify-between p-2">
                        <span>(+) Deslocamento Técnico e Socorro</span>
                        <strong>{formatCurrency(dadosFechamento?.dre.receitaDeslocamento || 0)}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50 font-bold">
                        <span>(=) Receita Bruta Total</span>
                        <span>{formatCurrency(dadosFechamento?.dre.receitaBrutaTotal || 0)}</span>
                      </div>
                      <div className="flex justify-between p-2 text-rose-600">
                        <span>(-) Custos Diretos Técnicos (CMV + Frota)</span>
                        <span>-{formatCurrency(dadosFechamento?.dre.custosDiretosTotal || 0)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-sky-50 text-sky-800 font-bold">
                        <span>(=) Margem de Contribuição Bruta</span>
                        <span>{formatCurrency(dadosFechamento?.dre.margemContribuicao || 0)}</span>
                      </div>
                      <div className="flex justify-between p-2 text-rose-600">
                        <span>(-) Despesas Operacionais Fixas</span>
                        <span>-{formatCurrency(dadosFechamento?.dre.despesasTotais || 0)}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-900 text-white font-black text-xs">
                        <span>(=) RESULTADO LÍQUIDO FINAL</span>
                        <span className="text-emerald-400">{formatCurrency(dadosFechamento?.dre.lucroLiquido || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* INDICADORES ADICIONAIS */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                    <div>• <strong>Ponto de Equilíbrio Operacional:</strong> {formatCurrency(dadosFechamento?.dre.pontoEquilibrio || 0)}</div>
                    <div>• <strong>Ticket Médio por OS Concluída:</strong> {formatCurrency(dadosFechamento?.operacional.ticketMedio || 0)}</div>
                    <div>• <strong>Quilometragem Total Rodada Frota:</strong> {(dadosFechamento?.operacional.kmRodadosFrota || 0).toFixed(0)} km</div>
                    <div>• <strong>Inadimplência do Período:</strong> {dadosFechamento?.financeiro.quantidadeInadimplentes || 0} títulos ({formatCurrency(dadosFechamento?.financeiro.titulosInadimplentesTotal || 0)})</div>
                  </div>
                </div>

                {/* RODAPÉ DO E-MAIL */}
                <div className="bg-slate-50 p-5 text-center text-[10px] text-slate-500 border-t border-slate-200 space-y-1">
                  <p className="font-bold text-slate-700">{DADOS_EMPRESA.razaoSocial} • {DADOS_EMPRESA.nomeFantasia}</p>
                  <p>{DADOS_EMPRESA.enderecoCompleto} • Tel: {DADOS_EMPRESA.telefone}</p>
                  <p>Autenticação SHA-256: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">{dadosFechamento?.hashAutenticacao}</code></p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: ESTRUTURA DRE & CENTROS DE CUSTO */}
          {abaAtiva === "dre" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DESPESAS POR CENTRO DE CUSTO */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    Despesas por Centro de Custo ({dadosFechamento?.periodoLabel})
                  </div>
                  <div className="space-y-2">
                    {CENTROS_DE_CUSTO.map((cc) => {
                      const valor = dadosFechamento?.dre.despesasOperacionais[cc.id] || 0;
                      const totalDespesas = dadosFechamento?.dre.despesasTotais || 1;
                      const perc = ((valor / totalDespesas) * 100).toFixed(1);
                      return (
                        <div key={cc.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                          <div className="flex justify-between text-xs font-bold text-white">
                            <span className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 bg-slate-800 text-sky-400 text-[10px] font-mono rounded">
                                {cc.codigo}
                              </span>
                              {cc.nome}
                            </span>
                            <span>{formatCurrency(valor)}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                            <div
                              className="bg-rose-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(parseFloat(perc), 100)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500 text-right mt-1">
                            {perc}% do total de despesas
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RESUMO OPERACIONAL & BREAK-EVEN */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Indicadores Estratégicos & Ponto de Equilíbrio
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400 font-bold uppercase">Ponto de Equilíbrio Operacional</div>
                        <div className="text-xs text-slate-500">Mínimo necessário para cobrir todos os custos</div>
                      </div>
                      <div className="text-sm font-black text-amber-400">
                        {formatCurrency(dadosFechamento?.dre.pontoEquilibrio || 0)}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400 font-bold uppercase">Ticket Médio por OS Concluída</div>
                        <div className="text-xs text-slate-500">{dadosFechamento?.operacional.osFechadas} ordens faturadas</div>
                      </div>
                      <div className="text-sm font-black text-sky-400">
                        {formatCurrency(dadosFechamento?.operacional.ticketMedio || 0)}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400 font-bold uppercase">Quilometragem Total Rodada Frota</div>
                        <div className="text-xs text-slate-500">Deslocamentos de campo e socorro</div>
                      </div>
                      <div className="text-sm font-black text-white">
                        {(dadosFechamento?.operacional.kmRodadosFrota || 0).toFixed(0)} km
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400 font-bold uppercase">Saldo Operacional Financeiro</div>
                        <div className="text-xs text-slate-500">Recebido ({formatCurrency(dadosFechamento?.financeiro.totalRecebidoMes || 0)}) - Pago ({formatCurrency(dadosFechamento?.financeiro.totalPagoMes || 0)})</div>
                      </div>
                      <div className={`text-sm font-black ${(dadosFechamento?.financeiro.saldoOperacionalMes || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatCurrency(dadosFechamento?.financeiro.saldoOperacionalMes || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: HISTÓRICO DE DISPAROS */}
          {abaAtiva === "historico" && (
            <div className="space-y-4">
              {historico.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nenhum disparo de balanço registrado até o momento. Utilize o botão <strong>"Disparar Balanço Agora"</strong> para realizar o primeiro envio e teste.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Data e Hora</th>
                        <th className="p-3">Período de Referência</th>
                        <th className="p-3">Faturamento Bruto</th>
                        <th className="p-3">Lucro Líquido</th>
                        <th className="p-3">Destinatários</th>
                        <th className="p-3">Modo</th>
                        <th className="p-3">Hash SHA-256</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {historico.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/40">
                          <td className="p-3 font-semibold text-slate-300">{item.data}</td>
                          <td className="p-3 font-bold text-white">{item.periodoLabel}</td>
                          <td className="p-3 text-sky-400 font-bold">{formatCurrency(item.receitaBruta)}</td>
                          <td className={`p-3 font-bold ${item.lucroLiquido >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {formatCurrency(item.lucroLiquido)}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold text-[10px]">
                              {item.enviados.length} e-mails
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.modoSimulado ? "bg-amber-950/60 text-amber-400 border border-amber-500/30" : "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                            }`}>
                              {item.modoSimulado ? "Auditado (Simulado)" : "SMTP Real"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-500">
                            {item.hashAutenticacao ? `${item.hashAutenticacao.substring(0, 9)}...` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE IMPRESSÃO DO RELATÓRIO CONTÁBIL PDF */}
      <RelatorioContabilPDFModal
        dados={dadosParaPdf}
        isOpen={pdfModalAberto}
        onClose={() => setPdfModalAberto(false)}
        onBaixarExcel={handleBaixarExcel}
      />
    </div>
  );
}
