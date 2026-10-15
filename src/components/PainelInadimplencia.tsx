"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DADOS_EMPRESA } from "@/lib/empresa";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageSquare,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  Search,
  Filter,
  Users,
  Percent,
  TrendingDown,
  DollarSign,
  ChevronRight,
  X,
  Phone,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface PainelInadimplenciaProps {
  onRefreshParent?: () => void;
}

export function PainelInadimplencia({ onRefreshParent }: PainelInadimplenciaProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [faixaFiltro, setFaixaFiltro] = useState<string>("TODAS");
  const [busca, setBusca] = useState<string>("");

  // Modal de Cobrança WhatsApp
  const [modalCobrancaAberto, setModalCobrancaAberto] = useState(false);
  const [tituloSelecionado, setTituloSelecionado] = useState<any>(null);
  const [incluirJuros, setIncluirJuros] = useState(false);
  const [telefoneDestino, setTelefoneDestino] = useState("");
  const [chavePix, setChavePix] = useState("indio@samapeop.com");
  const [copiado, setCopiado] = useState(false);

  // Modal de Renegociação
  const [modalRenegociarAberto, setModalRenegociarAberto] = useState(false);
  const [novaDataVencimento, setNovaDataVencimento] = useState("");
  const [motivoRenegociacao, setMotivoRenegociacao] = useState("");
  const [salvandoRenegociacao, setSalvandoRenegociacao] = useState(false);

  const carregarInadimplencia = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contas-receber/inadimplencia");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de inadimplência:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarInadimplencia();
  }, []);

  const handleMarcarComoPago = async (id: number) => {
    if (!confirm("Confirmar baixa e recebimento deste título vencido?")) return;
    try {
      const res = await fetch("/api/contas-receber", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "PAGO",
          data_pagamento: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        await carregarInadimplencia();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAbrirModalCobranca = (titulo: any) => {
    setTituloSelecionado(titulo);
    // Limpa telefone removendo caracteres não numéricos
    const tel = (titulo.cliente_telefone || "").replace(/\D/g, "");
    setTelefoneDestino(tel);
    setIncluirJuros(false);
    setCopiado(false);
    setModalCobrancaAberto(true);
  };

  const handleAbrirModalRenegociar = (titulo: any) => {
    setTituloSelecionado(titulo);
    setNovaDataVencimento("");
    setMotivoRenegociacao("");
    setModalRenegociarAberto(true);
  };

  const handleSalvarRenegociacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloSelecionado || !novaDataVencimento) return;

    try {
      setSalvandoRenegociacao(true);
      const obsAnterior = tituloSelecionado.observacoes || "";
      const novaObs = `${obsAnterior ? obsAnterior + " | " : ""}Renegociado em ${new Date().toLocaleDateString("pt-BR")}: Vencimento anterior ${new Date(tituloSelecionado.data_vencimento).toLocaleDateString("pt-BR")}. Motivo: ${motivoRenegociacao || "Acordo com cliente"}`;

      const res = await fetch("/api/contas-receber", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tituloSelecionado.id,
          data_vencimento: novaDataVencimento,
          observacoes: novaObs,
        }),
      });

      if (res.ok) {
        setModalRenegociarAberto(false);
        await carregarInadimplencia();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSalvandoRenegociacao(false);
    }
  };

  // Gerador de mensagem formatada para WhatsApp
  const gerarMensagemWhatsApp = (t: any, comJuros: boolean) => {
    if (!t) return "";

    const valorCobrado = comJuros ? t.valorAtualizado : t.valorOriginal;
    const dataVencFormatada = new Date(t.data_vencimento).toLocaleDateString("pt-BR");

    let texto = `Olá, *${t.cliente_nome}*! Tudo bem?\n\n`;
    texto += `Aqui é do setor financeiro da *${DADOS_EMPRESA.nomeFantasia}* (${DADOS_EMPRESA.razaoSocial}).\n\n`;
    texto += `Identificamos em nosso sistema uma pendência em aberto:\n`;
    texto += `📄 *Fatura:* ${t.descricao} ${t.numero_os ? `(OS #${t.numero_os})` : ""}\n`;
    texto += `📅 *Vencimento original:* ${dataVencFormatada} (*${t.diasAtraso} dias de atraso*)\n`;

    if (comJuros) {
      texto += `💵 *Valor original:* ${formatCurrency(t.valorOriginal)}\n`;
      texto += `⚖️ *Encargos/Juros contratuais:* ${formatCurrency(t.valorMulta + t.valorJuros)}\n`;
      texto += `💰 *Valor atualizado para quitação:* *${formatCurrency(valorCobrado)}*\n\n`;
    } else {
      texto += `💰 *Valor para quitação imediata:* *${formatCurrency(valorCobrado)}*\n\n`;
    }

    texto += `Para sua comodidade, a quitação pode ser realizada via PIX:\n`;
    texto += `🔑 *Chave PIX:* ${chavePix || DADOS_EMPRESA.chavePix}\n`;
    texto += `🏢 *Favorecido:* ${DADOS_EMPRESA.razaoSocial} (CNPJ: ${DADOS_EMPRESA.cnpj})\n\n`;
    texto += `Caso o pagamento já tenha sido efetuado nas últimas 24h, por favor desconsidere este aviso e nos envie o comprovante por aqui para baixa no sistema.\n\n`;
    texto += `Dúvidas ou negociações: Telefone/WhatsApp: ${DADOS_EMPRESA.telefone}\n`;
    texto += `Agradecemos pela parceria!\n*Equipe ${DADOS_EMPRESA.nomeFantasia}* 🚜`;

    return texto;
  };

  const handleCopiarMensagem = () => {
    if (!tituloSelecionado) return;
    const msg = gerarMensagemWhatsApp(tituloSelecionado, incluirJuros);
    navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleEnviarWhatsApp = () => {
    if (!tituloSelecionado) return;
    const msg = gerarMensagemWhatsApp(tituloSelecionado, incluirJuros);
    let tel = telefoneDestino.replace(/\D/g, "");
    if (tel.length === 10 || tel.length === 11) {
      tel = "55" + tel;
    }
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const resumo = data?.resumo;
  const titulos = data?.titulosVencidos || [];
  const topClientes = data?.topClientesInadimplentes || [];
  const faixas = resumo?.faixas || {};

  // Filtro por faixa e busca
  const titulosFiltrados = titulos.filter((t: any) => {
    if (faixaFiltro !== "TODAS" && t.faixaId !== faixaFiltro) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      const matchNome = (t.cliente_nome || "").toLowerCase().includes(b);
      const matchDesc = (t.descricao || "").toLowerCase().includes(b);
      const matchOS = (t.numero_os || "").toLowerCase().includes(b);
      if (!matchNome && !matchDesc && !matchOS) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. CARDS DE KPI DA INADIMPLÊNCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Vencido */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">Total Vencido em Atraso</span>
            <div className="p-2 bg-rose-950/80 text-rose-400 border border-rose-800/40 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {formatCurrency(resumo?.totalVencido || 0)}
            </div>
            <p className="mt-1 text-[11px] text-rose-300/80">
              {resumo?.qtdTitulosVencidos || 0} título(s) pendentes de cobrança
            </p>
          </div>
        </div>

        {/* Card 2: Taxa de Inadimplência */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">Taxa de Inadimplência</span>
            <div
              className={`p-2 rounded-xl border ${
                (resumo?.taxaInadimplencia || 0) > 15
                  ? "bg-rose-950/80 text-rose-400 border-rose-800/40"
                  : (resumo?.taxaInadimplencia || 0) > 5
                  ? "bg-amber-950/80 text-amber-400 border-amber-800/40"
                  : "bg-emerald-950/80 text-emerald-400 border-emerald-800/40"
              }`}
            >
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight ${
                (resumo?.taxaInadimplencia || 0) > 15
                  ? "text-rose-400"
                  : (resumo?.taxaInadimplencia || 0) > 5
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {(resumo?.taxaInadimplencia || 0).toFixed(1)}%
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Sobre o faturamento pendente total
            </p>
          </div>
        </div>

        {/* Card 3: Clientes Inadimplentes */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">Clientes com Débito</span>
            <div className="p-2 bg-amber-950/80 text-amber-400 border border-amber-800/40 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              {resumo?.qtdClientesInadimplentes || 0}
            </div>
            <p className="mt-1 text-[11px] text-amber-300/80">
              Concentração da carteira em cobrança
            </p>
          </div>
        </div>

        {/* Card 4: A Receber no Prazo */}
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94A3B8]">A Receber no Prazo</span>
            <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(resumo?.totalNoPrazo || 0)}
            </div>
            <p className="mt-1 text-[11px] text-emerald-500/80">
              {data?.titulosNoPrazoCount || 0} títulos dentro do vencimento
            </p>
          </div>
        </div>
      </div>

      {/* 2. RÉGUA DE COBRANÇA: 4 FAIXAS DE ATRASO (AGING BUCKETS) */}
      <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Régua de Cobrança por Envelhecimento da Dívida (Aging Buckets)
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Clique em uma faixa para filtrar os títulos correspondentes na tabela abaixo
            </p>
          </div>

          {faixaFiltro !== "TODAS" && (
            <button
              onClick={() => setFaixaFiltro("TODAS")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline"
            >
              Limpar filtro de faixa
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Faixa 1: 1 a 15 dias */}
          <div
            onClick={() => setFaixaFiltro(faixaFiltro === "ate15" ? "TODAS" : "ate15")}
            className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
              faixaFiltro === "ate15"
                ? "bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-lg"
                : "bg-[#0B1329] border-[#1E2C48] hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-amber-400">1 a 15 dias</span>
              <span className="text-[10px] text-slate-400 bg-[#151E34] px-2 py-0.5 rounded border border-[#1E2C48]">
                {faixas.ate15?.count || 0} título(s)
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {formatCurrency(faixas.ate15?.valor || 0)}
            </div>
            <div className="text-[11px] text-amber-300/80 font-medium mt-1">
              • Cobrança Amigável / Lembrete
            </div>
          </div>

          {/* Faixa 2: 16 a 30 dias */}
          <div
            onClick={() => setFaixaFiltro(faixaFiltro === "de16a30" ? "TODAS" : "de16a30")}
            className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
              faixaFiltro === "de16a30"
                ? "bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30 shadow-lg"
                : "bg-[#0B1329] border-[#1E2C48] hover:border-orange-500/50"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-orange-400">16 a 30 dias</span>
              <span className="text-[10px] text-slate-400 bg-[#151E34] px-2 py-0.5 rounded border border-[#1E2C48]">
                {faixas.de16a30?.count || 0} título(s)
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {formatCurrency(faixas.de16a30?.valor || 0)}
            </div>
            <div className="text-[11px] text-orange-300/80 font-medium mt-1">
              • Cobrança Formal com Juros
            </div>
          </div>

          {/* Faixa 3: 31 a 60 dias */}
          <div
            onClick={() => setFaixaFiltro(faixaFiltro === "de31a60" ? "TODAS" : "de31a60")}
            className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
              faixaFiltro === "de31a60"
                ? "bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30 shadow-lg"
                : "bg-[#0B1329] border-[#1E2C48] hover:border-rose-500/50"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-rose-400">31 a 60 dias</span>
              <span className="text-[10px] text-slate-400 bg-[#151E34] px-2 py-0.5 rounded border border-[#1E2C48]">
                {faixas.de31a60?.count || 0} título(s)
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {formatCurrency(faixas.de31a60?.valor || 0)}
            </div>
            <div className="text-[11px] text-rose-300/80 font-medium mt-1">
              • Notificação / Suspensão Crédito
            </div>
          </div>

          {/* Faixa 4: Mais de 60 dias */}
          <div
            onClick={() => setFaixaFiltro(faixaFiltro === "maisDe60" ? "TODAS" : "maisDe60")}
            className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
              faixaFiltro === "maisDe60"
                ? "bg-red-950/50 border-red-500 ring-2 ring-red-500/30 shadow-lg"
                : "bg-[#0B1329] border-[#1E2C48] hover:border-red-500/50"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-red-400">Mais de 60 dias</span>
              <span className="text-[10px] text-slate-400 bg-[#151E34] px-2 py-0.5 rounded border border-[#1E2C48]">
                {faixas.maisDe60?.count || 0} título(s)
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {formatCurrency(faixas.maisDe60?.valor || 0)}
            </div>
            <div className="text-[11px] text-red-300/80 font-medium mt-1">
              • Protesto / Ação Judicial
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONCENTRAÇÃO: TOP CLIENTES INADIMPLENTES */}
      {topClientes.length > 0 && (
        <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Concentração da Inadimplência por Cliente ({topClientes.length})
            </h3>
            <span className="text-xs text-[#94A3B8]">
              Ordenado por maior valor devido
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topClientes.slice(0, 6).map((cl: any, idx: number) => (
              <div
                key={idx}
                className="bg-[#0B1329] border border-[#1E2C48] p-3.5 rounded-xl flex items-center justify-between"
              >
                <div className="overflow-hidden pr-2">
                  <div className="font-bold text-xs text-white truncate">{cl.nome}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{cl.qtdTitulos} fatura(s)</span>
                    <span>•</span>
                    <span className="text-rose-400">Maior atraso: {cl.maiorAtraso}d</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-xs text-rose-400">
                    {formatCurrency(cl.totalVencido)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TABELA DE TÍTULOS VENCIDOS & AÇÕES DE COBRANÇA */}
      <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#1E2C48] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Títulos em Atraso para Cobrança Ativa ({titulosFiltrados.length})
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Utilize os botões de ação para cobrar via WhatsApp com chave PIX ou dar baixa
            </p>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por cliente, OS ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-xl focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {titulosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-500/40 mb-2" />
              <p className="font-bold text-slate-300 text-sm">
                Nenhum título em atraso encontrado!
              </p>
              <p className="text-slate-500 mt-1">
                {faixaFiltro !== "TODAS"
                  ? "Não há débitos nesta faixa de atraso selecionada."
                  : "Todos os recebimentos estão em dia ou não há faturas vencidas."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0B1329] text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#1E2C48]">
                <tr>
                  <th className="py-3 px-4">Cliente / Contato</th>
                  <th className="py-3 px-4">Descrição / OS</th>
                  <th className="py-3 px-4 text-center">Vencimento</th>
                  <th className="py-3 px-4 text-center">Atraso</th>
                  <th className="py-3 px-4 text-right">Valor Original</th>
                  <th className="py-3 px-4 text-right">Valor Atualizado</th>
                  <th className="py-3 px-4 text-center">Ações de Cobrança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2C48]">
                {titulosFiltrados.map((t: any) => (
                  <tr key={t.id} className="hover:bg-[#1B2745]/50 transition-colors">
                    {/* Cliente e Telefone */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs">{t.cliente_nome}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{t.cliente_telefone || "Sem telefone cadastrado"}</span>
                      </div>
                    </td>

                    {/* Descrição e OS */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-white font-medium truncate">{t.descricao}</div>
                      {t.numero_os && (
                        <div className="text-[11px] text-blue-400 font-semibold mt-0.5">
                          OS #{t.numero_os}
                        </div>
                      )}
                    </td>

                    {/* Data de Vencimento */}
                    <td className="py-3.5 px-4 text-center text-[#94A3B8] whitespace-nowrap">
                      {formatDate(t.data_vencimento)}
                    </td>

                    {/* Badge de Dias de Atraso */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          t.diasAtraso > 60
                            ? "bg-red-950 text-red-400 border-red-800"
                            : t.diasAtraso > 30
                            ? "bg-rose-950 text-rose-400 border-rose-800"
                            : t.diasAtraso > 15
                            ? "bg-orange-950 text-orange-400 border-orange-800"
                            : "bg-amber-950 text-amber-400 border-amber-800"
                        }`}
                      >
                        {t.diasAtraso} dias de atraso
                      </span>
                    </td>

                    {/* Valor Original */}
                    <td className="py-3.5 px-4 text-right font-bold text-white whitespace-nowrap">
                      {formatCurrency(t.valorOriginal)}
                    </td>

                    {/* Valor Atualizado com Juros */}
                    <td className="py-3.5 px-4 text-right font-black text-rose-400 whitespace-nowrap">
                      <div>{formatCurrency(t.valorAtualizado)}</div>
                      <div className="text-[9px] text-slate-500 font-normal">
                        (+{formatCurrency(t.valorMulta + t.valorJuros)} juros)
                      </div>
                    </td>

                    {/* Botões de Ação */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botão Cobrança WhatsApp */}
                        <button
                          onClick={() => handleAbrirModalCobranca(t)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1 transition-all"
                          title="Gerar cobrança e enviar pelo WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Cobrar WhatsApp</span>
                        </button>

                        {/* Botão Renegociar Vencimento */}
                        <button
                          onClick={() => handleAbrirModalRenegociar(t)}
                          className="px-2 py-1.5 bg-[#0B1329] hover:bg-[#1E2C48] text-slate-300 hover:text-white border border-[#1E2C48] rounded-lg text-xs font-semibold transition-colors"
                          title="Prorrogar ou renegociar data de vencimento"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Baixar / Receber */}
                        <button
                          onClick={() => handleMarcarComoPago(t.id)}
                          className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
                          title="Confirmar recebimento / Baixar título"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. MODAL: COBRANÇA VIA WHATSAPP COM CHAVE PIX */}
      {modalCobrancaAberto && tituloSelecionado && (
        <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151E34] rounded-2xl shadow-2xl border border-[#1E2C48] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-600/30">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Enviar Cobrança via WhatsApp
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    {tituloSelecionado.cliente_nome} • {tituloSelecionado.diasAtraso} dias de atraso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCobrancaAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Opções de Valor: Original vs Com Juros */}
              <div className="p-3 bg-[#0B1329] border border-[#1E2C48] rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Opção de Cobrança:</span>
                  <span className="text-slate-400 text-[11px]">
                    {incluirJuros ? "Incluindo juros e multa contratuais" : "Cobrar apenas o valor original"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIncluirJuros(false)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      !incluirJuros
                        ? "bg-blue-600 text-white"
                        : "bg-[#151E34] text-slate-400 hover:text-white"
                    }`}
                  >
                    Original: {formatCurrency(tituloSelecionado.valorOriginal)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncluirJuros(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      incluirJuros
                        ? "bg-rose-600 text-white"
                        : "bg-[#151E34] text-slate-400 hover:text-white"
                    }`}
                  >
                    C/ Juros: {formatCurrency(tituloSelecionado.valorAtualizado)}
                  </button>
                </div>
              </div>

              {/* Telefone de Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Número de WhatsApp do Cliente (com DDD)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={telefoneDestino}
                    onChange={(e) => setTelefoneDestino(e.target.value)}
                    placeholder="Ex: 11999998888"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Chave PIX */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Chave PIX da Samape para Recebimento
                </label>
                <input
                  type="text"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Prévia da Mensagem */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Prévia da Mensagem Formatada
                </label>
                <div className="p-3 bg-[#0B1329] border border-[#1E2C48] rounded-xl text-slate-300 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                  {gerarMensagemWhatsApp(tituloSelecionado, incluirJuros)}
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCopiarMensagem}
                  className="px-3 py-2 bg-[#0B1329] hover:bg-[#1E2C48] text-slate-200 border border-[#1E2C48] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiado ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCobrancaAberto(false)}
                    className="px-3 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    onClick={handleEnviarWhatsApp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir no WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: RENEGOCIAÇÃO / ALTERAR DATA DE VENCIMENTO */}
      {modalRenegociarAberto && tituloSelecionado && (
        <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151E34] rounded-2xl shadow-2xl border border-[#1E2C48] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Renegociar Vencimento</h3>
                <p className="text-xs text-[#94A3B8]">
                  {tituloSelecionado.cliente_nome} • {formatCurrency(tituloSelecionado.valorOriginal)}
                </p>
              </div>
              <button
                onClick={() => setModalRenegociarAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarRenegociacao} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vencimento Atual
                </label>
                <div className="px-3 py-2 bg-[#0B1329] border border-[#1E2C48] rounded-xl text-rose-400 font-bold">
                  {formatDate(tituloSelecionado.data_vencimento)} ({tituloSelecionado.diasAtraso} dias de atraso)
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nova Data de Vencimento Pactuada *
                </label>
                <input
                  type="date"
                  required
                  value={novaDataVencimento}
                  onChange={(e) => setNovaDataVencimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Motivo da Renegociação / Acordo
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Cliente solicitou prorrogação para o dia 25 devido a fechamento de medição de obra"
                  value={motivoRenegociacao}
                  onChange={(e) => setMotivoRenegociacao(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-xl focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalRenegociarAberto(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoRenegociacao}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {salvandoRenegociacao ? "Salvando..." : "Confirmar Renegociação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
