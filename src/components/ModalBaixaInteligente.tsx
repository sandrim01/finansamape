"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CONTAS_BANCARIAS,
  calcularDiasAtraso,
  sugerirEncargos,
  calcularValorFinal,
  DadosLiquidacao,
} from "@/lib/baixaInteligente";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  Calculator,
  Percent,
  DollarSign,
  ArrowRight,
  Split,
  FileCheck2,
  Calendar,
  Sparkles,
} from "lucide-react";

export interface TituloParaBaixa {
  id: number;
  tipo: "RECEBIMENTO" | "PAGAMENTO";
  descricao: string;
  clienteOuFornecedor: string;
  documentoRef?: string;
  valorOriginal: number;
  dataVencimento: string | Date;
  formaPagamentoAtual?: string;
}

interface ModalBaixaInteligenteProps {
  titulo: TituloParaBaixa | null;
  isOpen: boolean;
  onClose: () => void;
  onSucesso: (dados: DadosLiquidacao) => void;
}

export function ModalBaixaInteligente({
  titulo,
  isOpen,
  onClose,
  onSucesso,
}: ModalBaixaInteligenteProps) {
  if (!isOpen || !titulo) return null;

  const hojeStr = new Date().toISOString().split("T")[0];

  // Estados do formulário
  const [dataPagamento, setDataPagamento] = useState(hojeStr);
  const [multa, setMulta] = useState<number>(0);
  const [multaTipo, setMultaTipo] = useState<"VALOR" | "PORCENTO">("VALOR");
  const [multaPercentual, setMultaPercentual] = useState<number>(0);

  const [juros, setJuros] = useState<number>(0);
  const [jurosTipo, setJurosTipo] = useState<"VALOR" | "PORCENTO">("VALOR");
  const [jurosPercentual, setJurosPercentual] = useState<number>(0);

  const [desconto, setDesconto] = useState<number>(0);
  const [descontoTipo, setDescontoTipo] = useState<"VALOR" | "PORCENTO">("VALOR");
  const [descontoPercentual, setDescontoPercentual] = useState<number>(0);

  const [tipoBaixa, setTipoBaixa] = useState<"TOTAL" | "PARCIAL">("TOTAL");
  const [valorPago, setValorPago] = useState<string>("");
  const [gerarSaldoRestante, setGerarSaldoRestante] = useState<boolean>(true);
  const [vencimentoSaldo, setVencimentoSaldo] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [contaBancariaId, setContaBancariaId] = useState<string>("BB_PRINCIPAL");
  const [formaPagamento, setFormaPagamento] = useState<string>(
    titulo.formaPagamentoAtual || (titulo.tipo === "RECEBIMENTO" ? "PIX" : "BOLETO")
  );
  const [observacoes, setObservacoes] = useState<string>("");
  const [salvando, setSalvando] = useState<boolean>(false);

  // Cálculo de dias de atraso
  const diasAtraso = useMemo(() => {
    return calcularDiasAtraso(titulo.dataVencimento, dataPagamento);
  }, [titulo.dataVencimento, dataPagamento]);

  // Cálculos de Multa, Juros e Desconto em R$
  const multaCalculada = useMemo(() => {
    if (multaTipo === "PORCENTO") {
      return Number(((titulo.valorOriginal * (multaPercentual || 0)) / 100).toFixed(2));
    }
    return Number(multa || 0);
  }, [multaTipo, multaPercentual, multa, titulo.valorOriginal]);

  const jurosCalculado = useMemo(() => {
    if (jurosTipo === "PORCENTO") {
      return Number(((titulo.valorOriginal * (jurosPercentual || 0)) / 100).toFixed(2));
    }
    return Number(juros || 0);
  }, [jurosTipo, jurosPercentual, juros, titulo.valorOriginal]);

  const descontoCalculado = useMemo(() => {
    if (descontoTipo === "PORCENTO") {
      return Number(((titulo.valorOriginal * (descontoPercentual || 0)) / 100).toFixed(2));
    }
    return Number(desconto || 0);
  }, [descontoTipo, descontoPercentual, desconto, titulo.valorOriginal]);

  // Valor Total Devido
  const valorTotalDevido = useMemo(() => {
    return calcularValorFinal(
      titulo.valorOriginal,
      multaCalculada,
      jurosCalculado,
      descontoCalculado
    );
  }, [titulo.valorOriginal, multaCalculada, jurosCalculado, descontoCalculado]);

  // Ajusta o valor pago se for quitação total
  const valorEfetivoPago = useMemo(() => {
    if (tipoBaixa === "TOTAL") {
      return valorTotalDevido;
    }
    const parsed = parseFloat(valorPago);
    return isNaN(parsed) ? 0 : parsed;
  }, [tipoBaixa, valorPago, valorTotalDevido]);

  // Saldo restante em caso de baixa parcial
  const saldoRestante = useMemo(() => {
    if (tipoBaixa === "TOTAL") return 0;
    return Math.max(0, Number((valorTotalDevido - valorEfetivoPago).toFixed(2)));
  }, [tipoBaixa, valorTotalDevido, valorEfetivoPago]);

  // Aplica sugestões inteligentes automáticas caso haja atraso
  const handleAplicarSugestoes = () => {
    const sugestao = sugerirEncargos(titulo.valorOriginal, titulo.dataVencimento, dataPagamento);
    if (sugestao.diasAtraso > 0) {
      setMultaTipo("VALOR");
      setMulta(sugestao.multaSugerida);
      setMultaPercentual(sugestao.multaPercentual);

      setJurosTipo("VALOR");
      setJuros(sugestao.jurosSugerido);
      setJurosPercentual(sugestao.jurosPercentual);
    }
  };

  // Submissão da baixa
  const handleConfirmarBaixa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (valorEfetivoPago <= 0) {
      alert("Informe um valor pago maior que zero.");
      return;
    }

    if (tipoBaixa === "PARCIAL" && valorEfetivoPago >= valorTotalDevido) {
      alert("Para baixa parcial, o valor deve ser menor que o total devido. Use 'Quitação Total'.");
      return;
    }

    const contaSelecionada = CONTAS_BANCARIAS.find((c) => c.id === contaBancariaId);

    const payload = {
      conta_id: titulo.id,
      valor_original: titulo.valorOriginal,
      multa: multaCalculada,
      multa_percentual: multaTipo === "PORCENTO" ? multaPercentual : 0,
      juros: jurosCalculado,
      juros_percentual: jurosTipo === "PORCENTO" ? jurosPercentual : 0,
      desconto: descontoCalculado,
      desconto_percentual: descontoTipo === "PORCENTO" ? descontoPercentual : 0,
      valor_total_devido: valorTotalDevido,
      tipo_baixa: tipoBaixa,
      valor_efetivo_pago: valorEfetivoPago,
      gerar_saldo_restante: tipoBaixa === "PARCIAL" && gerarSaldoRestante,
      saldo_restante: saldoRestante,
      nova_data_vencimento: vencimentoSaldo,
      conta_bancaria_id: contaBancariaId,
      conta_bancaria_nome: contaSelecionada?.nome || "Banco do Brasil",
      forma_pagamento: formaPagamento,
      data_pagamento: dataPagamento,
      observacoes: observacoes.trim() || undefined,
    };

    try {
      setSalvando(true);
      const url =
        titulo.tipo === "RECEBIMENTO"
          ? "/api/contas-receber/baixa"
          : "/api/contas-pagar/baixa";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao processar a baixa do título.");
      }

      onSucesso(data.dadosLiquidacao);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erro inesperado ao liquidar título.");
    } finally {
      setSalvando(false);
    }
  };

  const isRecebimento = titulo.tipo === "RECEBIMENTO";

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1329]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#151E34] border border-[#1E2C48] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="p-5 border-b border-[#1E2C48] flex items-center justify-between bg-[#11192E]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isRecebimento
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              }`}
            >
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Baixa Inteligente de Título
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-extrabold ${
                    isRecebimento
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-blue-950 text-blue-300 border border-blue-800"
                  }`}
                >
                  {isRecebimento ? "RECEBIMENTO" : "PAGAMENTO"}
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Liquidação com cálculo de juros, multas, descontos e conciliação bancária
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2C48] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmarBaixa} className="p-6 space-y-5">
          {/* Card Resumo do Título */}
          <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  {isRecebimento ? "Cliente / Pagador" : "Fornecedor / Beneficiário"}
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {titulo.clienteOuFornecedor}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {titulo.descricao}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Vencimento Original
                </span>
                <p className="text-xs font-semibold text-slate-300">
                  {formatDate(titulo.dataVencimento)}
                </p>
                {diasAtraso > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    {diasAtraso} {diasAtraso === 1 ? "dia" : "dias"} de atraso
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> No prazo
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Valor Nominal
                </span>
                <p className="text-base font-black text-white">
                  {formatCurrency(titulo.valorOriginal)}
                </p>
              </div>
            </div>

            {/* Botão de Sugestão Automática se houver atraso */}
            {diasAtraso > 0 && (
              <div className="mt-3 pt-3 border-t border-[#1E2C48] flex items-center justify-between">
                <span className="text-xs text-amber-300/90 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Calcular encargos contratuais padrão (2% multa + 1% a.m.)?
                </span>
                <button
                  type="button"
                  onClick={handleAplicarSugestoes}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  ⚡ Sugerir Encargos
                </button>
              </div>
            )}
          </div>

          {/* Painel de Cálculo: Multa, Juros, Desconto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* (+) Multa */}
            <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                  (+) Multa
                </label>
                <div className="flex items-center rounded bg-[#151E34] p-0.5 border border-[#1E2C48]">
                  <button
                    type="button"
                    onClick={() => setMultaTipo("VALOR")}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      multaTipo === "VALOR" ? "bg-rose-600 text-white" : "text-slate-400"
                    }`}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultaTipo("PORCENTO")}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      multaTipo === "PORCENTO" ? "bg-rose-600 text-white" : "text-slate-400"
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>

              {multaTipo === "VALOR" ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={multa || ""}
                  onChange={(e) => setMulta(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#151E34] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                />
              ) : (
                <div className="space-y-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={multaPercentual || ""}
                    onChange={(e) => setMultaPercentual(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 2.0"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#151E34] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <p className="text-[10px] text-rose-400 text-right font-mono">
                    = +{formatCurrency(multaCalculada)}
                  </p>
                </div>
              )}
            </div>

            {/* (+) Juros de Mora */}
            <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  (+) Juros Mora
                </label>
                <div className="flex items-center rounded bg-[#151E34] p-0.5 border border-[#1E2C48]">
                  <button
                    type="button"
                    onClick={() => setJurosTipo("VALOR")}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      jurosTipo === "VALOR" ? "bg-amber-600 text-white" : "text-slate-400"
                    }`}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => setJurosTipo("PORCENTO")}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      jurosTipo === "PORCENTO" ? "bg-amber-600 text-white" : "text-slate-400"
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>

              {jurosTipo === "VALOR" ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={juros || ""}
                  onChange={(e) => setJuros(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#151E34] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                />
              ) : (
                <div className="space-y-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={jurosPercentual || ""}
                    onChange={(e) => setJurosPercentual(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 1.0"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#151E34] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-amber-400 text-right font-mono">
                    = +{formatCurrency(jurosCalculado)}
                  </p>
                </div>
              )}
            </div>

            {/* (-) Desconto */}
            <div className="bg-[#0B1329] border border-[#1E2C48] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  (-) Desconto
                </label>
                <div className="flex items-center rounded bg-[#151E34] p-0.5 border border-[#1E2C48]">
                  <button
                    type="button"
                    onClick={() => setDescontoTipo("VALOR")}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      descontoTipo === "VALOR" ? "bg-emerald-600 text-white" : "text-slate-400"
                    }`}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescontoTipo("PORCENTO")}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      descontoTipo === "PORCENTO" ? "bg-emerald-600 text-white" : "text-slate-400"
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>

              {descontoTipo === "VALOR" ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={desconto || ""}
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#151E34] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                />
              ) : (
                <div className="space-y-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={descontoPercentual || ""}
                    onChange={(e) => setDescontoPercentual(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 5.0"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#151E34] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-emerald-400 text-right font-mono">
                    = -{formatCurrency(descontoCalculado)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Demonstração em Tempo Real */}
          <div className="p-3 bg-[#0B1329] border border-[#1E2C48] rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span>{formatCurrency(titulo.valorOriginal)}</span>
              {multaCalculada > 0 && <span className="text-rose-400">+{formatCurrency(multaCalculada)}</span>}
              {jurosCalculado > 0 && <span className="text-amber-400">+{formatCurrency(jurosCalculado)}</span>}
              {descontoCalculado > 0 && <span className="text-emerald-400">-{formatCurrency(descontoCalculado)}</span>}
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Total Devido:</span>
              <span className="text-base font-black text-white">{formatCurrency(valorTotalDevido)}</span>
            </div>
          </div>

          {/* Tipo de Baixa: Quitação Total vs Parcial */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#1E2C48] pb-2">
              <button
                type="button"
                onClick={() => setTipoBaixa("TOTAL")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  tipoBaixa === "TOTAL"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Quitação Total ({formatCurrency(valorTotalDevido)})
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoBaixa("PARCIAL");
                  if (!valorPago) {
                    setValorPago((valorTotalDevido / 2).toFixed(2));
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  tipoBaixa === "PARCIAL"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                    : "bg-[#0B1329] text-slate-400 hover:text-white border border-[#1E2C48]"
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                Baixa Parcial
              </button>
            </div>

            {/* Painel de Baixa Parcial */}
            {tipoBaixa === "PARCIAL" && (
              <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1">
                      Valor Efetivamente Pago (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={valorPago}
                      onChange={(e) => setValorPago(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-amber-600/50 text-white rounded-lg focus:outline-none focus:border-amber-400 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Saldo Restante Devedor
                    </label>
                    <div className="px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-rose-400 rounded-lg font-mono font-black">
                      {formatCurrency(saldoRestante)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-800/30 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gerarSaldoRestante}
                      onChange={(e) => setGerarSaldoRestante(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-[#0B1329] border-[#1E2C48]"
                    />
                    <span>
                      Gerar automaticamente novo título pendente para o saldo restante de{" "}
                      <strong>{formatCurrency(saldoRestante)}</strong>
                    </span>
                  </label>

                  {gerarSaldoRestante && (
                    <div className="pl-6 pt-1">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Novo Vencimento do Saldo:
                      </label>
                      <input
                        type="date"
                        required
                        value={vencimentoSaldo}
                        onChange={(e) => setVencimentoSaldo(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Destino Bancário, Forma e Data de Liquidação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Data do Pagamento *
              </label>
              <input
                type="date"
                required
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Conta Bancária / Caixa *
              </label>
              <select
                value={contaBancariaId}
                onChange={(e) => setContaBancariaId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
              >
                {CONTAS_BANCARIAS.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Forma de Pagamento *
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="TRANSFERENCIA">Transferência / TED</option>
                <option value="DINHEIRO">Dinheiro Espécie (Caixa)</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              </select>
            </div>
          </div>

          {/* Observações da Liquidação */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Observações / Justificativa Financeira (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Negociado com o cliente via WhatsApp; desconto autorizado pela diretoria"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0B1329] border border-[#1E2C48] text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          {/* Rodapé e Botões */}
          <div className="pt-4 border-t border-[#1E2C48] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando}
              className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                isRecebimento
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
              } ${salvando ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {salvando
                  ? "Processando Baixa..."
                  : `Confirmar Baixa de ${formatCurrency(valorEfetivoPago)}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
