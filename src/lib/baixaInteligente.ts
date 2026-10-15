// src/lib/baixaInteligente.ts
// Ferramenta 6: Baixa Inteligente de Títulos SAMAPE ÍNDIO

export interface ContaBancaria {
  id: string;
  nome: string;
  detalhes: string;
  icone: string;
  corBadge: string;
}

export const CONTAS_BANCARIAS: ContaBancaria[] = [
  {
    id: "BB_PRINCIPAL",
    nome: "Banco do Brasil (CC Principal)",
    detalhes: "Ag: 1234-5 | CC: 98765-4 • SAMAPE MECÂNICA",
    icone: "Landmark",
    corBadge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  {
    id: "SICOOB",
    nome: "Sicoob Cooperativa",
    detalhes: "Ag: 4321 | CC: 12345-6 • SAMAPE COOP",
    icone: "Building2",
    corBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "PIX_OFICIAL",
    nome: "Chave PIX Oficial Oficina",
    detalhes: "indio@samapeop.com • Recebimentos Instantâneos",
    icone: "Zap",
    corBadge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  {
    id: "CAIXA_FISICO",
    nome: "Caixa Físico Oficina (Espécie)",
    detalhes: "Gaveta Balcão / Tesouraria Dinheiro Vivo",
    icone: "Wallet",
    corBadge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  {
    id: "MAQUININHA",
    nome: "Maquininha Stone / Cartões",
    detalhes: "Débito e Crédito Balcão",
    icone: "CreditCard",
    corBadge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
];

export interface DadosLiquidacao {
  protocolo: string;
  tipoOperacao: "RECEBIMENTO" | "PAGAMENTO";
  tituloId: number;
  descricao: string;
  clienteOuFornecedor: string;
  documentoRef?: string;
  valorOriginal: number;
  multa: number;
  multaPercentual?: number;
  juros: number;
  jurosPercentual?: number;
  desconto: number;
  descontoPercentual?: number;
  valorTotalDevido: number;
  tipoBaixa: "TOTAL" | "PARCIAL";
  valorEfetivoPago: number;
  saldoRestante?: number;
  novoTituloId?: number;
  novaDataVencimento?: string;
  contaBancariaId: string;
  contaBancariaNome: string;
  formaPagamento: string;
  dataPagamento: string;
  observacoes?: string;
  dataLiquidacaoRegistro: string;
}

/**
 * Calcula os dias de atraso entre o vencimento e a data de pagamento
 */
export function calcularDiasAtraso(dataVencimento: string | Date, dataPagamento: string | Date): number {
  const venc = new Date(dataVencimento);
  const pag = new Date(dataPagamento);
  
  // Normalizar para meia-noite UTC
  const v = Date.UTC(venc.getFullYear(), venc.getMonth(), venc.getDate());
  const p = Date.UTC(pag.getFullYear(), pag.getMonth(), pag.getDate());

  const diffTime = p - v;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Sugere multa (padrão 2%) e juros (padrão 1% ao mês / 0.033% ao dia) com base no atraso
 */
export function sugerirEncargos(
  valorOriginal: number,
  dataVencimento: string | Date,
  dataPagamento: string | Date = new Date()
) {
  const diasAtraso = calcularDiasAtraso(dataVencimento, dataPagamento);

  if (diasAtraso <= 0) {
    return {
      diasAtraso: 0,
      multaSugerida: 0,
      multaPercentual: 0,
      jurosSugerido: 0,
      jurosPercentual: 0,
    };
  }

  // Multa de 2% sobre o valor original
  const multaSugerida = Number((valorOriginal * 0.02).toFixed(2));
  
  // Juros de 1% ao mês (0,0333% ao dia corrido)
  const taxaDiaria = 0.01 / 30;
  const jurosSugerido = Number((valorOriginal * taxaDiaria * diasAtraso).toFixed(2));

  return {
    diasAtraso,
    multaSugerida,
    multaPercentual: 2.0,
    jurosSugerido,
    jurosPercentual: Number((taxaDiaria * diasAtraso * 100).toFixed(2)),
  };
}

/**
 * Calcula o valor líquido final: Original + Multa + Juros - Desconto
 */
export function calcularValorFinal(
  valorOriginal: number,
  multa: number = 0,
  juros: number = 0,
  desconto: number = 0
): number {
  const total = valorOriginal + (Number(multa) || 0) + (Number(juros) || 0) - (Number(desconto) || 0);
  return Math.max(0, Number(total.toFixed(2)));
}

/**
 * Formata os dados de baixa inteligente para armazenar na coluna observacoes
 */
export function serializarObservacoesBaixa(
  dados: DadosLiquidacao,
  obsUsuario?: string | null
): string {
  const jsonCompacto = JSON.stringify({
    prot: dados.protocolo,
    tipo: dados.tipoOperacao,
    orig: dados.valorOriginal,
    mul: dados.multa,
    jur: dados.juros,
    desc: dados.desconto,
    totDev: dados.valorTotalDevido,
    baixa: dados.tipoBaixa,
    pago: dados.valorEfetivoPago,
    saldo: dados.saldoRestante || 0,
    conta: dados.contaBancariaNome,
    contaId: dados.contaBancariaId,
    forma: dados.formaPagamento,
    dtPag: dados.dataPagamento,
    dtReg: dados.dataLiquidacaoRegistro,
  });

  const textoResumo = `[BAIXA_INTELIGENTE:${dados.protocolo}] Quitado R$ ${dados.valorEfetivoPago.toLocaleString(
    "pt-BR",
    { minimumFractionDigits: 2 }
  )} em ${new Date(dados.dataPagamento).toLocaleDateString("pt-BR")} via ${
    dados.contaBancariaNome
  } (${dados.formaPagamento}). Original: R$ ${dados.valorOriginal.toLocaleString(
    "pt-BR",
    { minimumFractionDigits: 2 }
  )}${dados.multa > 0 ? ` + Multa: R$ ${dados.multa.toFixed(2)}` : ""}${
    dados.juros > 0 ? ` + Juros: R$ ${dados.juros.toFixed(2)}` : ""
  }${dados.desconto > 0 ? ` - Desc: R$ ${dados.desconto.toFixed(2)}` : ""}.${
    dados.tipoBaixa === "PARCIAL" && dados.saldoRestante
      ? ` [BAIXA PARCIAL: Saldo de R$ ${dados.saldoRestante.toFixed(2)} transferido]`
      : ""
  }`;

  const obsRestante = obsUsuario?.trim() ? ` Obs: ${obsUsuario.trim()}` : "";

  return `<!--JSON_BAIXA:${jsonCompacto}:END_JSON-->\n${textoResumo}${obsRestante}`;
}

/**
 * Extrai os dados estruturados da baixa a partir do campo observacoes
 */
export function deserializarObservacoesBaixa(
  observacoes?: string | null,
  fallback?: {
    tituloId: number;
    tipoOperacao: "RECEBIMENTO" | "PAGAMENTO";
    descricao: string;
    clienteOuFornecedor: string;
    valorOriginal: number;
    dataVencimento?: string | Date;
    dataPagamento?: string | Date | null;
    formaPagamento?: string | null;
  }
): DadosLiquidacao | null {
  if (!observacoes && !fallback) return null;

  if (observacoes) {
    const match = observacoes.match(/<!--JSON_BAIXA:(.*?):END_JSON-->/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        return {
          protocolo: parsed.prot,
          tipoOperacao: parsed.tipo,
          tituloId: fallback?.tituloId || 0,
          descricao: fallback?.descricao || "Título Quitado",
          clienteOuFornecedor: fallback?.clienteOuFornecedor || "SAMAPE",
          valorOriginal: parsed.orig,
          multa: parsed.mul || 0,
          juros: parsed.jur || 0,
          desconto: parsed.desc || 0,
          valorTotalDevido: parsed.totDev || parsed.orig,
          tipoBaixa: parsed.baixa || "TOTAL",
          valorEfetivoPago: parsed.pago || parsed.orig,
          saldoRestante: parsed.saldo || 0,
          contaBancariaId: parsed.contaId || "BB_PRINCIPAL",
          contaBancariaNome: parsed.conta || "Banco do Brasil",
          formaPagamento: parsed.forma || "PIX",
          dataPagamento: parsed.dtPag || new Date().toISOString().split("T")[0],
          dataLiquidacaoRegistro: parsed.dtReg || new Date().toISOString(),
          observacoes: observacoes.replace(/<!--JSON_BAIXA:.*?:END_JSON-->\n?/, ""),
        };
      } catch (e) {
        // Fallback para parsing manual caso o JSON tenha falhado
      }
    }
  }

  // Se não possui a tag JSON mas é um título pago, criar fallback gracioso
  if (fallback) {
    const dtPagStr = fallback.dataPagamento
      ? new Date(fallback.dataPagamento).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return {
      protocolo: `SMP-REC-${dtPagStr.replace(/-/g, "")}-${String(fallback.tituloId).padStart(4, "0")}`,
      tipoOperacao: fallback.tipoOperacao,
      tituloId: fallback.tituloId,
      descricao: fallback.descricao,
      clienteOuFornecedor: fallback.clienteOuFornecedor,
      valorOriginal: fallback.valorOriginal,
      multa: 0,
      juros: 0,
      desconto: 0,
      valorTotalDevido: fallback.valorOriginal,
      tipoBaixa: "TOTAL",
      valorEfetivoPago: fallback.valorOriginal,
      contaBancariaId: "BB_PRINCIPAL",
      contaBancariaNome: "Banco do Brasil (CC Principal)",
      formaPagamento: fallback.formaPagamento || "PIX",
      dataPagamento: dtPagStr,
      dataLiquidacaoRegistro: new Date().toISOString(),
      observacoes: observacoes || undefined,
    };
  }

  return null;
}
