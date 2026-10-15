"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BellRing,
  Power,
  PowerOff,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings,
  DollarSign,
  Users,
  Copy,
  Check,
  Building2,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Phone,
  FileText,
  Eye,
  AlertCircle,
  TrendingDown,
  Info,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DADOS_EMPRESA } from "@/lib/empresa";

interface TituloItem {
  id: number;
  descricao: string;
  numeroOS?: string | null;
  valor: number;
  dataVencimento: string;
  diasAtraso: number;
  statusFaixa: string;
}

interface ClientePendente {
  clienteId: number;
  clienteNome: string;
  clienteEmail: string | null;
  clienteTelefone: string | null;
  clienteCnpjCpf: string | null;
  totalPendente: number;
  maiorAtrasoDias: number;
  titulos: TituloItem[];
}

interface HistoricoCobranca {
  id: number;
  data: string;
  clienteNome: string;
  clienteEmail: string;
  totalCobrado: number;
  titulosCount: number;
  hashAutenticacao: string;
  modoSimulado: boolean;
}

interface ConfiguracaoCobranca {
  ativa: boolean;
  horaDisparo: string;
  diasSemana: number[];
  enviarCopiaFinanceiro: boolean;
  regua: {
    lembreteAntesVencimento: boolean;
    avisoVencimentoHoje: boolean;
    cobrancaVencidoD3: boolean;
    cobrancaVencidoD7: boolean;
    cobrancaVencidoD15: boolean;
    cobrancaVencidoD30: boolean;
  };
  dadosFinanceiro: {
    nomeRemetente: string;
    emailRemetente: string;
    emailResposta: string;
    telefoneContato: string;
    chavePix: string;
    favorecidoPix: string;
  };
  templates: {
    assuntoPadrao: string;
    mensagemAbertura: string;
    mensagemCorpo: string;
    mensagemEncerramento: string;
  };
}

export default function CobrancaAutomaticaPage() {
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [disparandoLote, setDisparandoLote] = useState(false);
  const [disparandoClienteId, setDisparandoClienteId] = useState<number | null>(null);

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<"clientes" | "modelo" | "preview" | "historico">("clientes");

  const [config, setConfig] = useState<ConfiguracaoCobranca>({
    ativa: true,
    horaDisparo: "09:00",
    diasSemana: [1, 2, 3, 4, 5],
    enviarCopiaFinanceiro: true,
    regua: {
      lembreteAntesVencimento: true,
      avisoVencimentoHoje: true,
      cobrancaVencidoD3: true,
      cobrancaVencidoD7: true,
      cobrancaVencidoD15: true,
      cobrancaVencidoD30: true,
    },
    dadosFinanceiro: {
      nomeRemetente: `Financeiro - ${DADOS_EMPRESA.nomeFantasia}`,
      emailRemetente: "samapeindio.financeiro@gmail.com",
      emailResposta: "samapeindio.financeiro@gmail.com",
      telefoneContato: DADOS_EMPRESA.telefone,
      chavePix: DADOS_EMPRESA.chavePix,
      favorecidoPix: DADOS_EMPRESA.razaoSocial,
    },
    templates: {
      assuntoPadrao: `Aviso Financeiro de Regularização - ${DADOS_EMPRESA.nomeFantasia}`,
      mensagemAbertura: "Prezado(a) {cliente_nome}, esperamos que este comunicado o encontre bem.",
      mensagemCorpo:
        "Identificamos em nosso sistema financeiro a existência de título(s) pendente(s) de regularização referente(s) aos serviços e manutenções mecânicas prestadas pela SAMAPE ÍNDIO MECÂNICA PESADA. Solicitamos a gentileza de verificar os detalhes abaixo para quitação:",
      mensagemEncerramento:
        "Caso o pagamento já tenha sido realizado nas últimas horas, por favor desconsidere este aviso ou nos encaminhe o comprovante em resposta a este e-mail. Para maiores dúvidas ou propostas de negociação, entre em contato diretamente com nossa equipe financeira.",
    },
  });

  const [clientes, setClientes] = useState<ClientePendente[]>([]);
  const [historico, setHistorico] = useState<HistoricoCobranca[]>([]);
  const [estatisticas, setEstatisticas] = useState({
    totalPendente: 0,
    totalClientes: 0,
    totalTitulos: 0,
    cobrancaAtiva: true,
  });

  // Carrega dados da API
  const carregarDados = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cobranca-automatica");
      const data = await res.json();
      if (data.sucesso) {
        setConfig(data.config);
        setClientes(data.clientes || []);
        setHistorico(data.historico || []);
        setEstatisticas(data.estatisticas);
      } else {
        setMensagemErro(data.erro || "Falha ao carregar dados de cobrança.");
      }
    } catch (err: any) {
      setMensagemErro(err.message || "Erro de conexão ao carregar cobrança.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // BOTÃO DE LIGA E DESLIGA DA COBRANÇA AUTOMÁTICA
  const handleToggleCobranca = async () => {
    const novoStatus = !config.ativa;
    try {
      setToggling(true);
      setMensagemSucesso(null);
      setMensagemErro(null);

      const res = await fetch("/api/cobranca-automatica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "toggle",
          ativa: novoStatus,
        }),
      });

      const data = await res.json();
      if (data.sucesso) {
        setConfig(data.config);
        setEstatisticas((prev) => ({ ...prev, cobrancaAtiva: novoStatus }));
        setMensagemSucesso(
          novoStatus
            ? "🟢 Cobrança Automática LIGADA com sucesso! O sistema fará os disparos programados."
            : "⚪ Cobrança Automática DESLIGADA / PAUSADA. Nenhum e-mail automático será enviado."
        );
        setTimeout(() => setMensagemSucesso(null), 4000);
      } else {
        setMensagemErro(data.erro || "Erro ao alterar status da cobrança.");
      }
    } catch (err: any) {
      setMensagemErro(err.message || "Erro ao comunicar com o servidor.");
    } finally {
      setToggling(false);
    }
  };

  // Salvar modelo de e-mail e configurações
  const handleSalvarModelo = async () => {
    try {
      setSalvandoConfig(true);
      setMensagemSucesso(null);
      setMensagemErro(null);

      const res = await fetch("/api/cobranca-automatica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "salvar_config",
          config,
        }),
      });

      const data = await res.json();
      if (data.sucesso) {
        setMensagemSucesso("✅ Modelo do e-mail financeiro salvo com sucesso!");
        setTimeout(() => setMensagemSucesso(null), 4000);
      } else {
        setMensagemErro(data.erro || "Erro ao salvar modelo.");
      }
    } catch (err: any) {
      setMensagemErro(err.message || "Erro ao salvar configurações.");
    } finally {
      setSalvandoConfig(false);
    }
  };

  // Disparo manual para um cliente
  const handleDispararCliente = async (cliente: ClientePendente) => {
    if (!cliente.clienteEmail || !cliente.clienteEmail.includes("@")) {
      alert(`O cliente ${cliente.clienteNome} não possui um e-mail válido cadastrado.`);
      return;
    }

    const confirmacao = window.confirm(
      `Deseja enviar o e-mail personalizado de cobrança para ${cliente.clienteNome} (${cliente.clienteEmail}) no valor total de ${formatCurrency(cliente.totalPendente)}?`
    );
    if (!confirmacao) return;

    try {
      setDisparandoClienteId(cliente.clienteId);
      setMensagemSucesso(null);
      setMensagemErro(null);

      const res = await fetch("/api/cobranca-automatica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "disparar_cliente",
          clienteId: cliente.clienteId,
        }),
      });

      const data = await res.json();
      if (data.sucesso) {
        setMensagemSucesso(`🚀 ${data.mensagem}`);
        carregarDados();
      } else {
        setMensagemErro(data.erro || "Falha ao enviar cobrança.");
      }
    } catch (err: any) {
      setMensagemErro(err.message || "Erro no envio.");
    } finally {
      setDisparandoClienteId(null);
    }
  };

  // Disparo em lote para todos os clientes pendentes
  const handleDispararTodos = async () => {
    if (clientes.length === 0) {
      alert("Nenhum cliente inadimplente encontrado.");
      return;
    }

    const confirmacao = window.confirm(
      `Confirma o disparo de cobrança para todos os ${clientes.length} clientes com títulos pendentes?`
    );
    if (!confirmacao) return;

    try {
      setDisparandoLote(true);
      setMensagemSucesso(null);
      setMensagemErro(null);

      const res = await fetch("/api/cobranca-automatica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "disparar_todos",
        }),
      });

      const data = await res.json();
      if (data.sucesso) {
        setMensagemSucesso(`🚀 ${data.mensagem}`);
        carregarDados();
      } else {
        setMensagemErro(data.erro || "Falha no disparo em lote.");
      }
    } catch (err: any) {
      setMensagemErro(err.message || "Erro no disparo em lote.");
    } finally {
      setDisparandoLote(false);
    }
  };

  // Gerar título de demonstração/teste
  const handleGerarTituloTeste = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cobranca-automatica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "gerar_titulo_teste" }),
      });
      const data = await res.json();
      if (data.sucesso) {
        setMensagemSucesso(`🧪 ${data.mensagem}`);
        carregarDados();
      } else {
        setMensagemErro(data.erro || "Erro ao criar título de teste.");
      }
    } catch (err: any) {
      setMensagemErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#070D1E] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* 1. CABEÇALHO COM BOTÃO LIGA / DESLIGA DESTACADO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-rose-500 font-bold uppercase tracking-wider mb-1">
            <Link href="/contas-receber" className="hover:underline flex items-center gap-1">
              Contas a Receber
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Automação & Régua de Cobrança</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BellRing className="w-8 h-8 text-rose-500" />
            Automação de Cobrança
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {DADOS_EMPRESA.razaoSocial} • Disparo automatizado de e-mails do financeiro com chave PIX e demonstrativo
          </p>
        </div>

        {/* BOTÃO LIGA E DESLIGA (SWITCH INTERATIVO DESTACADO) */}
        <div className="flex items-center gap-4 bg-[#0B1329] border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-2xl">
          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-wider flex items-center justify-end gap-1.5">
              <span className={`w-2 h-2 rounded-full ${config.ativa ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
              <span className={config.ativa ? "text-emerald-400 font-black" : "text-slate-400 font-bold"}>
                {config.ativa ? "COBRANÇA ATIVADA (LIGADA)" : "COBRANÇA PAUSADA (DESLIGADA)"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {config.ativa
                ? `Disparos diários às ${config.horaDisparo} (Seg a Sex)`
                : "Nenhum e-mail é enviado automaticamente"}
            </div>
          </div>

          {/* BOTÃO INTERATIVO LIGA/DESLIGA */}
          <button
            onClick={handleToggleCobranca}
            disabled={toggling}
            title={config.ativa ? "Clique para DESLIGAR a cobrança automática" : "Clique para LIGAR a cobrança automática"}
            className={`relative flex items-center justify-between w-20 h-10 rounded-full transition-all duration-300 p-1 shadow-inner focus:outline-none ${
              config.ativa
                ? "bg-emerald-500 shadow-emerald-500/30 shadow-lg border border-emerald-400"
                : "bg-slate-800 border border-slate-700 hover:border-slate-600"
            }`}
          >
            <span className={`text-[10px] font-black uppercase tracking-tighter pl-2 transition-opacity ${config.ativa ? "opacity-100 text-white" : "opacity-0"}`}>
              ON
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 transform ${
                config.ativa ? "translate-x-0" : "-translate-x-10"
              }`}
            >
              {config.ativa ? (
                <Power className="w-4 h-4 text-emerald-600 stroke-[3]" />
              ) : (
                <PowerOff className="w-4 h-4 text-slate-500 stroke-[2]" />
              )}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter pr-2 transition-opacity ${!config.ativa ? "opacity-100 text-slate-400" : "opacity-0"}`}>
              OFF
            </span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO OU ERRO */}
      {mensagemSucesso && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button onClick={() => setMensagemSucesso(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {mensagemErro && (
        <div className="p-4 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
          <button onClick={() => setMensagemErro(null)} className="text-rose-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* 2. KPIS EM DESTAQUE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0B1329] border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total a Receber Pendente</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
            {formatCurrency(estatisticas.totalPendente)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {estatisticas.totalTitulos} faturas em aberto
          </div>
        </div>

        <div className="bg-[#0B1329] border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Clientes com Pendência</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {estatisticas.totalClientes}
          </div>
          <div className="text-[11px] text-sky-400 mt-1">
            Base monitorada pelo sistema
          </div>
        </div>

        <div className="bg-[#0B1329] border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Canal Oficial de Resposta</span>
            <Mail className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs sm:text-sm font-black text-emerald-400 mt-1 truncate">
            {config.dadosFinanceiro.emailResposta}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            PIX: {config.dadosFinanceiro.chavePix}
          </div>
        </div>

        <div className="bg-[#0B1329] border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Status da Automação</span>
            <Power className={`w-4 h-4 ${config.ativa ? "text-emerald-400" : "text-slate-500"}`} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${config.ativa ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            <span className="text-sm font-black text-white">
              {config.ativa ? "LIGADO / ATIVO" : "DESLIGADO"}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {config.ativa ? "Disparos automáticos ativos" : "Disparo automático pausado"}
          </div>
        </div>
      </div>

      {/* 3. ABAS DE NAVEGAÇÃO INTERNA */}
      <div className="bg-[#0B1329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex border-b border-slate-800 px-6 pt-4 gap-2 sm:gap-6 overflow-x-auto">
          <button
            onClick={() => setAbaAtiva("clientes")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
              abaAtiva === "clientes"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes & Títulos Pendentes ({clientes.length})
          </button>

          <button
            onClick={() => setAbaAtiva("modelo")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
              abaAtiva === "modelo"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            E-mail Personalizado do Financeiro
          </button>

          <button
            onClick={() => setAbaAtiva("preview")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
              abaAtiva === "preview"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-4 h-4" />
            Prévia em Tempo Real
          </button>

          <button
            onClick={() => setAbaAtiva("historico")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
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
          {/* ABA 1: CLIENTES & TÍTULOS PENDENTES */}
          {abaAtiva === "clientes" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">Régua de Clientes Inadimplentes</div>
                  <div className="text-[11px] text-slate-400">
                    O sistema agrupa todos os títulos por cliente para envio de um extrato consolidado.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGerarTituloTeste}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Cria um título demonstrativo no banco para teste imediato"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Gerar Título de Teste
                  </button>

                  <button
                    onClick={handleDispararTodos}
                    disabled={disparandoLote || clientes.length === 0}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950/40 disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${disparandoLote ? "animate-pulse" : ""}`} />
                    {disparandoLote ? "Enviando..." : "Disparar para Todos"}
                  </button>
                </div>
              </div>

              {clientes.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold text-white">Nenhum cliente inadimplente no momento!</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Não há contas a receber pendentes ou vencidas no banco de dados. Caso queira testar a automação agora mesmo, clique no botão abaixo para gerar um título demonstrativo.
                  </p>
                  <button
                    onClick={handleGerarTituloTeste}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Criar Título de Teste para Simulação
                  </button>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Contato / E-mail</th>
                        <th className="p-3">Títulos Pendentes</th>
                        <th className="p-3">Maior Atraso</th>
                        <th className="p-3">Valor Total</th>
                        <th className="p-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {clientes.map((c) => {
                        const temEmail = c.clienteEmail && c.clienteEmail.includes("@");
                        return (
                          <tr key={c.clienteId} className="hover:bg-slate-900/40">
                            <td className="p-3">
                              <div className="font-bold text-white">{c.clienteNome}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {c.clienteCnpjCpf || "Sem documento"}
                              </div>
                            </td>
                            <td className="p-3">
                              {temEmail ? (
                                <div className="text-slate-300 flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-sky-400 shrink-0" />
                                  <span>{c.clienteEmail}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                                  Sem e-mail cadastrado
                                </span>
                              )}
                              {c.clienteTelefone && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>{c.clienteTelefone}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-semibold text-[10px]">
                                {c.titulos.length} fatura(s)
                              </span>
                            </td>
                            <td className="p-3">
                              {c.maiorAtrasoDias > 0 ? (
                                <span className="px-2 py-0.5 bg-rose-950/60 text-rose-400 border border-rose-500/30 rounded font-bold text-[10px]">
                                  {c.maiorAtrasoDias} dia(s)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-sky-950/60 text-sky-400 border border-sky-500/30 rounded font-bold text-[10px]">
                                  Vence Hoje
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-black text-rose-400 text-sm">
                              {formatCurrency(c.totalPendente)}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDispararCliente(c)}
                                disabled={disparandoClienteId === c.clienteId || !temEmail}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all border border-slate-700 disabled:opacity-40 inline-flex items-center gap-1.5 shadow-sm"
                              >
                                <Send className={`w-3 h-3 ${disparandoClienteId === c.clienteId ? "animate-pulse" : "text-rose-400"}`} />
                                {disparandoClienteId === c.clienteId ? "Enviando..." : "Disparar E-mail"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: MODELO DE E-MAIL PERSONALIZADO DO FINANCEIRO */}
          {abaAtiva === "modelo" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* COLUNA 1: DADOS DE CONTATO DO FINANCEIRO */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Identificação do Financeiro da Empresa
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Nome do Remetente Oficial:</label>
                      <input
                        type="text"
                        value={config.dadosFinanceiro.nomeRemetente}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            dadosFinanceiro: { ...config.dadosFinanceiro, nomeRemetente: e.target.value },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-300 block mb-1">E-mail de Envio (SMTP):</label>
                        <input
                          type="email"
                          value={config.dadosFinanceiro.emailRemetente}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              dadosFinanceiro: { ...config.dadosFinanceiro, emailRemetente: e.target.value },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-300 block mb-1">E-mail para Receber Comprovantes:</label>
                        <input
                          type="email"
                          value={config.dadosFinanceiro.emailResposta}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              dadosFinanceiro: { ...config.dadosFinanceiro, emailResposta: e.target.value },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-300 block mb-1">Telefone / WhatsApp Financeiro:</label>
                        <input
                          type="text"
                          value={config.dadosFinanceiro.telefoneContato}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              dadosFinanceiro: { ...config.dadosFinanceiro, telefoneContato: e.target.value },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-300 block mb-1">Chave PIX Oficial:</label>
                        <input
                          type="text"
                          value={config.dadosFinanceiro.chavePix}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              dadosFinanceiro: { ...config.dadosFinanceiro, chavePix: e.target.value },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Favorecido do PIX:</label>
                      <input
                        type="text"
                        value={config.dadosFinanceiro.favorecidoPix}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            dadosFinanceiro: { ...config.dadosFinanceiro, favorecidoPix: e.target.value },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* RÉGUA DE COBRANÇA */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Régua de Gatilhos de Cobrança:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.regua.lembreteAntesVencimento}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              regua: { ...config.regua, lembreteAntesVencimento: e.target.checked },
                            })
                          }
                          className="rounded text-rose-600"
                        />
                        <span>D-2 (Lembrete prévio)</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.regua.avisoVencimentoHoje}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              regua: { ...config.regua, avisoVencimentoHoje: e.target.checked },
                            })
                          }
                          className="rounded text-rose-600"
                        />
                        <span>D-0 (Vence hoje)</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.regua.cobrancaVencidoD3}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              regua: { ...config.regua, cobrancaVencidoD3: e.target.checked },
                            })
                          }
                          className="rounded text-rose-600"
                        />
                        <span>D+3 (Aviso de atraso)</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.regua.cobrancaVencidoD7}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              regua: { ...config.regua, cobrancaVencidoD7: e.target.checked },
                            })
                          }
                          className="rounded text-rose-600"
                        />
                        <span>D+7 (Cobrança amigável)</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.regua.cobrancaVencidoD15}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              regua: { ...config.regua, cobrancaVencidoD15: e.target.checked },
                            })
                          }
                          className="rounded text-rose-600"
                        />
                        <span>D+15 (Aviso de suspensão)</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.regua.cobrancaVencidoD30}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              regua: { ...config.regua, cobrancaVencidoD30: e.target.checked },
                            })
                          }
                          className="rounded text-rose-600"
                        />
                        <span>D+30 (Notificação extrajudicial)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* COLUNA 2: TEXTOS DO E-MAIL PERSONALIZADO */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <FileText className="w-4 h-4 text-rose-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Textos do E-mail Personalizado
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Assunto do E-mail:</label>
                      <input
                        type="text"
                        value={config.templates.assuntoPadrao}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            templates: { ...config.templates, assuntoPadrao: e.target.value },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Saudação Inicial (Abertura):</label>
                      <textarea
                        rows={2}
                        value={config.templates.mensagemAbertura}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            templates: { ...config.templates, mensagemAbertura: e.target.value },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Mensagem Central / Corpo do Comunicado:</label>
                      <textarea
                        rows={4}
                        value={config.templates.mensagemCorpo}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            templates: { ...config.templates, mensagemCorpo: e.target.value },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Mensagem de Encerramento & Orientações:</label>
                      <textarea
                        rows={3}
                        value={config.templates.mensagemEncerramento}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            templates: { ...config.templates, mensagemEncerramento: e.target.value },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    {/* DICA DE VARIÁVEIS DISPONÍVEIS */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <div className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-sky-400" />
                        Variáveis dinâmicas para usar no texto:
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap gap-1.5 pt-1">
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">{`{cliente_nome}`}</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">{`{valor_total}`}</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">{`{dias_atraso}`}</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">{`{chave_pix}`}</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">{`{telefone}`}</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">{`{empresa_nome}`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÃO SALVAR MODELO */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setAbaAtiva("preview")}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4 text-sky-400" />
                  Ver Prévia do E-mail
                </button>

                <button
                  onClick={handleSalvarModelo}
                  disabled={salvandoConfig}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-rose-950/40 flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {salvandoConfig ? "Salvando..." : "Salvar Modelo do Financeiro"}
                </button>
              </div>
            </div>
          )}

          {/* ABA 3: PRÉVIA EM TEMPO REAL DO E-MAIL */}
          {abaAtiva === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <strong>Assunto:</strong> {config.templates.assuntoPadrao}
                </div>
                <div className="text-[11px] text-emerald-400 font-bold">
                  ✓ Pré-visualização com dados reais da empresa
                </div>
              </div>

              {/* RENDERIZADOR DO E-MAIL REAL */}
              <div className="max-w-2xl mx-auto bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 text-left">
                {/* CABEÇALHO DO E-MAIL */}
                <div className="bg-[#0B1329] text-white p-6 border-b-4 border-rose-600">
                  <div className="inline-block bg-slate-800 text-sky-400 text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider mb-2 border border-slate-700">
                    Aviso de Regularização Financeira
                  </div>
                  <h2 className="text-xl font-black tracking-tight">{DADOS_EMPRESA.nomeFantasia}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {DADOS_EMPRESA.razaoSocial} • CNPJ: {DADOS_EMPRESA.cnpj}
                  </p>
                  <p className="text-xs text-slate-400">
                    Departamento Financeiro • Tel: {config.dadosFinanceiro.telefoneContato}
                  </p>
                </div>

                {/* CORPO DO E-MAIL */}
                <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
                  <div className="font-bold text-sm text-slate-900">
                    {config.templates.mensagemAbertura.replace(/{cliente_nome}/g, "R&M Mineração Franciscópolis")}
                  </div>

                  <p>
                    {config.templates.mensagemCorpo
                      .replace(/{cliente_nome}/g, "R&M Mineração Franciscópolis")
                      .replace(/{empresa_nome}/g, DADOS_EMPRESA.nomeFantasia)}
                  </p>

                  {/* TABELA DE FATURAS EXEMPLO */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden my-3">
                    <div className="bg-slate-100 p-2.5 font-bold text-[11px] text-slate-700 uppercase">
                      Demonstrativo de Título(s) Pendente(s)
                    </div>
                    <div className="divide-y divide-slate-100 text-[11px]">
                      <div className="flex justify-between p-2.5">
                        <div>
                          <div className="font-bold text-slate-900">Manutenção Mecânica de Escavadeira CAT 320</div>
                          <div className="text-[10px] text-slate-500">
                            Vencimento: 08/10/2026 • <span className="text-rose-600 font-bold">7 dias em atraso</span> • OS #38
                          </div>
                        </div>
                        <div className="font-black text-slate-900">R$ 8.450,00</div>
                      </div>
                      <div className="flex justify-between p-2.5">
                        <div>
                          <div className="font-bold text-slate-900">Deslocamento Técnico e Socorro de Campo</div>
                          <div className="text-[10px] text-slate-500">
                            Vencimento: 08/10/2026 • <span className="text-rose-600 font-bold">7 dias em atraso</span> • OS #38
                          </div>
                        </div>
                        <div className="font-black text-slate-900">R$ 1.200,00</div>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-900 text-white font-black text-xs">
                        <span>VALOR TOTAL CONSOLIDADO</span>
                        <span className="text-emerald-400">R$ 9.650,00</span>
                      </div>
                    </div>
                  </div>

                  {/* QUADRO PIX OFICIAL */}
                  <div className="p-4 bg-emerald-50 border-2 border-dashed border-emerald-500 rounded-xl text-center space-y-1">
                    <div className="text-xs font-black text-emerald-800 uppercase">Chave PIX Oficial para Quitação</div>
                    <div className="font-mono text-base font-black bg-white px-4 py-1.5 rounded-lg border border-emerald-200 inline-block text-slate-900 my-1">
                      {config.dadosFinanceiro.chavePix}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Favorecido: <strong>{config.dadosFinanceiro.favorecidoPix}</strong> (CNPJ: {DADOS_EMPRESA.cnpj})
                    </div>
                    <div className="text-[10px] text-emerald-600 pt-1">
                      Envie o comprovante respondendo a este e-mail ou no WhatsApp: <strong>{config.dadosFinanceiro.telefoneContato}</strong>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    {config.templates.mensagemEncerramento}
                  </p>

                  <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-600">
                    Atenciosamente,<br />
                    <strong>{config.dadosFinanceiro.nomeRemetente}</strong><br />
                    {DADOS_EMPRESA.razaoSocial}<br />
                    Contato: {config.dadosFinanceiro.telefoneContato} | {config.dadosFinanceiro.emailResposta}
                  </div>
                </div>

                {/* RODAPÉ */}
                <div className="bg-slate-50 p-4 text-center text-[10px] text-slate-500 border-t border-slate-200 space-y-1">
                  <p className="font-bold text-slate-700">{DADOS_EMPRESA.razaoSocial} • {DADOS_EMPRESA.enderecoCompleto}</p>
                  <p>Autenticação SHA-256: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">9A4F-2E10-BC33-4D91</code></p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: HISTÓRICO & AUDITORIA DE DISPAROS */}
          {abaAtiva === "historico" && (
            <div className="space-y-4">
              {historico.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nenhum disparo de cobrança registrado no histórico ainda. Quando os e-mails forem enviados (automaticamente ou manualmente), os comprovantes e logs de auditoria aparecerão listados aqui.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Data e Hora</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">E-mail Destino</th>
                        <th className="p-3">Valor Cobrado</th>
                        <th className="p-3">Títulos</th>
                        <th className="p-3">Modo</th>
                        <th className="p-3">Hash SHA-256</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {historico.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/40">
                          <td className="p-3 text-slate-400 font-semibold">{item.data}</td>
                          <td className="p-3 font-bold text-white">{item.clienteNome}</td>
                          <td className="p-3 text-slate-300 font-mono text-[11px]">{item.clienteEmail}</td>
                          <td className="p-3 font-bold text-rose-400">{formatCurrency(item.totalCobrado)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold text-[10px]">
                              {item.titulosCount} fatura(s)
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.modoSimulado
                                ? "bg-amber-950/60 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
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
    </div>
  );
}
