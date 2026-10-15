// src/lib/exportacaoFinanceira.ts
// Ferramenta 7: Exportação Financeira Executiva (Excel .xlsx e PDF Contábil)
// SAMAPE ÍNDIO MECÂNICA PESADA LTDA

import * as XLSX from "xlsx";
import { DADOS_EMPRESA } from "./empresa";
import { CENTROS_DE_CUSTO, parseCentroCustoECategoria } from "./centrosCusto";
import { calcularQuilometragem } from "./utils";

export interface DadosExportacaoFinanceira {
  periodoLabel: string;
  dataInicio?: string;
  dataFim?: string;
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
  contasReceber: Array<{
    id: number;
    cliente: string;
    numeroOS?: string | null;
    descricao: string;
    vencimento: string;
    pagamento?: string | null;
    valor: number;
    status: string;
    formaPagamento: string;
    observacoes?: string | null;
  }>;
  contasPagar: Array<{
    id: number;
    fornecedor: string;
    centroCustoCodigo: string;
    centroCustoNome: string;
    subcategoria: string;
    descricao: string;
    vencimento: string;
    pagamento?: string | null;
    valor: number;
    status: string;
    formaPagamento: string;
    observacoes?: string | null;
  }>;
  fluxoCaixaProjetado: Array<{
    dias: number;
    label: string;
    receberProjetado: number;
    pagarProjetado: number;
    saldoPeriodo: number;
    saldoAcumulado: number;
  }>;
  inadimplencia: Array<{
    cliente: string;
    documento: string;
    diasAtraso: number;
    faixaAtraso: string;
    valorOriginal: number;
    multa: number;
    juros: number;
    valorCobravel: number;
  }>;
}

/**
 * Constrói a planilha multipáginas completa da SAMAPE no formato XLSX
 */
export function construirWorkbookFinanceiro(dados: DadosExportacaoFinanceira): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. ABA: DRE GERENCIAL
  const dreRows: any[][] = [
    [DADOS_EMPRESA.nomeFantasia.toUpperCase()],
    [`Razão Social: ${DADOS_EMPRESA.razaoSocial} | CNPJ: ${DADOS_EMPRESA.cnpj}`],
    [`Endereço: ${DADOS_EMPRESA.enderecoCompleto} | Tel: ${DADOS_EMPRESA.telefone}`],
    [`DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO (DRE GERENCIAL) - ${dados.periodoLabel.toUpperCase()}`],
    [`Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`],
    [],
    ["CÓDIGO", "DISCRIMINAÇÃO CONTÁBIL", "VALOR (R$)", "PART. (%)"],
    ["1.0", "RECEITA BRUTA OPERACIONAL TOTAL", dados.dre.receitaBrutaTotal, 100.0],
    ["1.1", "  (+) Faturamento de Mão de Obra Oficina & Campo", dados.dre.receitaMaoObra, dados.dre.receitaBrutaTotal ? Number(((dados.dre.receitaMaoObra / dados.dre.receitaBrutaTotal) * 100).toFixed(1)) : 0],
    ["1.2", "  (+) Venda de Peças, Filtros & Componentes", dados.dre.receitaPecas, dados.dre.receitaBrutaTotal ? Number(((dados.dre.receitaPecas / dados.dre.receitaBrutaTotal) * 100).toFixed(1)) : 0],
    ["1.3", "  (+) Deslocamento Técnico e Auto Socorro Mecânico", dados.dre.receitaDeslocamento, dados.dre.receitaBrutaTotal ? Number(((dados.dre.receitaDeslocamento / dados.dre.receitaBrutaTotal) * 100).toFixed(1)) : 0],
    [],
    ["2.0", "(-) CUSTOS VARIÁVEIS DIRETOS TÉCNICOS", dados.dre.custosDiretosTotal, dados.dre.receitaBrutaTotal ? Number(((dados.dre.custosDiretosTotal / dados.dre.receitaBrutaTotal) * 100).toFixed(1)) : 0],
    ["2.1", "  (-) Custo Direto de Reposição de Peças (CMV)", dados.dre.custoPecas, ""],
    ["2.2", "  (-) Custo Operacional de Deslocamento / Combustível Frota", dados.dre.custoFrota, ""],
    [],
    ["3.0", "(=) MARGEM DE CONTRIBUIÇÃO BRUTA", dados.dre.margemContribuicao, dados.dre.margemContribuicaoPerc],
    [],
    ["4.0", "(-) DESPESAS OPERACIONAIS FIXAS POR CENTRO DE CUSTO", dados.dre.despesasTotais, dados.dre.receitaBrutaTotal ? Number(((dados.dre.despesasTotais / dados.dre.receitaBrutaTotal) * 100).toFixed(1)) : 0],
  ];

  for (const cc of CENTROS_DE_CUSTO) {
    const valCC = dados.dre.despesasOperacionais[cc.id] || 0;
    const percCC = dados.dre.despesasTotais ? Number(((valCC / dados.dre.despesasTotais) * 100).toFixed(1)) : 0;
    dreRows.push([`4.${cc.codigo}`, `  (-) ${cc.codigo} - ${cc.nome}`, valCC, percCC]);
  }

  dreRows.push(
    [],
    ["5.0", "(=) RESULTADO OPERACIONAL LÍQUIDO (LUCRO REAL)", dados.dre.lucroLiquido, dados.dre.margemLiquidaPerc],
    [],
    ["6.0", "INDICADORES ESTRATÉGICOS & PONTO DE EQUILÍBRIO"],
    ["6.1", "Ponto de Equilíbrio Operacional Necessário (Break-Even)", dados.dre.pontoEquilibrio, ""],
    ["6.2", "Margem Líquida Efetiva Sobre o Faturamento", `${dados.dre.margemLiquidaPerc}%`, ""],
    ["6.3", "Status do Resultado", dados.dre.lucroLiquido >= 0 ? "SUPERAVITÁRIO (LUCRO)" : "DEFICITÁRIO (PREJUÍZO)", ""]
  );

  const wsDre = XLSX.utils.aoa_to_sheet(dreRows);
  wsDre["!cols"] = [{ wch: 10 }, { wch: 60 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsDre, "DRE Gerencial");

  // 2. ABA: CONTAS A RECEBER
  const crRows: any[][] = [
    [DADOS_EMPRESA.nomeFantasia.toUpperCase(), "RELATÓRIO DE CONTAS A RECEBER"],
    [`Período: ${dados.periodoLabel}`],
    [],
    ["ID", "CLIENTE", "DOC / OS", "DESCRIÇÃO DO SERVIÇO", "VENCIMENTO", "DATA PAGAMENTO", "VALOR (R$)", "STATUS", "FORMA", "OBSERVAÇÕES"],
  ];

  let totalCR = 0;
  let totalCRPago = 0;
  for (const c of dados.contasReceber) {
    totalCR += c.valor;
    if (c.status === "PAGO") totalCRPago += c.valor;
    crRows.push([
      c.id,
      c.cliente,
      c.numeroOS ? `OS #${c.numeroOS}` : `TIT #${c.id}`,
      c.descricao,
      c.vencimento,
      c.pagamento || "-",
      c.valor,
      c.status,
      c.formaPagamento,
      c.observacoes || "",
    ]);
  }
  crRows.push(
    [],
    ["TOTAL GERAL CARTEIRA", "", "", "", "", "", totalCR],
    ["TOTAL EFETIVAMENTE RECEBIDO", "", "", "", "", "", totalCRPago],
    ["TOTAL PENDENTE A RECEBER", "", "", "", "", "", totalCR - totalCRPago]
  );

  const wsCR = XLSX.utils.aoa_to_sheet(crRows);
  wsCR["!cols"] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 12 },
    { wch: 35 },
    { wch: 14 },
    { wch: 16 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCR, "Contas a Receber");

  // 3. ABA: CONTAS A PAGAR & CENTROS DE CUSTO
  const cpRows: any[][] = [
    [DADOS_EMPRESA.nomeFantasia.toUpperCase(), "RELATÓRIO DE CONTAS A PAGAR & CENTROS DE CUSTO"],
    [`Período: ${dados.periodoLabel}`],
    [],
    ["ID", "FORNECEDOR / BENEFICIÁRIO", "CENTRO DE CUSTO", "SUBCATEGORIA", "DESCRIÇÃO", "VENCIMENTO", "DATA PAGAMENTO", "VALOR (R$)", "STATUS", "FORMA", "OBSERVAÇÕES"],
  ];

  let totalCP = 0;
  let totalCPPago = 0;
  for (const c of dados.contasPagar) {
    totalCP += c.valor;
    if (c.status === "PAGO") totalCPPago += c.valor;
    cpRows.push([
      c.id,
      c.fornecedor,
      `${c.centroCustoCodigo} - ${c.centroCustoNome}`,
      c.subcategoria,
      c.descricao,
      c.vencimento,
      c.pagamento || "-",
      c.valor,
      c.status,
      c.formaPagamento,
      c.observacoes || "",
    ]);
  }
  cpRows.push(
    [],
    ["TOTAL GERAL DESPESAS", "", "", "", "", "", "", totalCP],
    ["TOTAL PAGO EFETIVAMENTE", "", "", "", "", "", "", totalCPPago],
    ["TOTAL PENDENTE DE PAGAMENTO", "", "", "", "", "", "", totalCP - totalCPPago]
  );

  const wsCP = XLSX.utils.aoa_to_sheet(cpRows);
  wsCP["!cols"] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 25 },
    { wch: 25 },
    { wch: 30 },
    { wch: 14 },
    { wch: 16 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCP, "Contas a Pagar");

  // 4. ABA: FLUXO DE CAIXA PROJETADO
  const fcRows: any[][] = [
    [DADOS_EMPRESA.nomeFantasia.toUpperCase(), "FLUXO DE CAIXA PROJETADO (7, 15, 30 E 60 DIAS)"],
    [`Posição Atualizada em: ${new Date().toLocaleDateString("pt-BR")}`],
    [],
    ["HORIZONTE", "DIAS", "RECEBIMENTOS PREVISTOS (R$)", "PAGAMENTOS PREVISTOS (R$)", "RESULTADO LÍQUIDO DO PERÍODO (R$)", "SALDO ACUMULADO PREVISTO (R$)"],
  ];

  for (const fc of dados.fluxoCaixaProjetado) {
    fcRows.push([
      fc.label,
      fc.dias,
      fc.receberProjetado,
      fc.pagarProjetado,
      fc.saldoPeriodo,
      fc.saldoAcumulado,
    ]);
  }

  const wsFC = XLSX.utils.aoa_to_sheet(fcRows);
  wsFC["!cols"] = [{ wch: 22 }, { wch: 8 }, { wch: 26 }, { wch: 26 }, { wch: 30 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsFC, "Fluxo de Caixa Projetado");

  // 5. ABA: AGING LIST & INADIMPLÊNCIA
  const inadRows: any[][] = [
    [DADOS_EMPRESA.nomeFantasia.toUpperCase(), "RELATÓRIO DE INADIMPLÊNCIA & AGING LIST"],
    [`Total de Casos em Atraso: ${dados.inadimplencia.length}`],
    [],
    ["CLIENTE", "DOCUMENTO / OS", "DIAS EM ATRASO", "FAIXA DE ATRASO", "VALOR ORIGINAL (R$)", "MULTA CONTRATUAL (R$)", "JUROS MORA (R$)", "VALOR COBRÁVEL ATUALIZADO (R$)"],
  ];

  let totInadOrig = 0;
  let totInadCob = 0;
  for (const item of dados.inadimplencia) {
    totInadOrig += item.valorOriginal;
    totInadCob += item.valorCobravel;
    inadRows.push([
      item.cliente,
      item.documento,
      item.diasAtraso,
      item.faixaAtraso,
      item.valorOriginal,
      item.multa,
      item.juros,
      item.valorCobravel,
    ]);
  }
  inadRows.push(
    [],
    ["TOTAL EM ATRASO (NOMINAL)", "", "", "", totInadOrig],
    ["TOTAL ATUALIZADO COM ENCARGOS", "", "", "", "", "", "", totInadCob]
  );

  const wsInad = XLSX.utils.aoa_to_sheet(inadRows);
  wsInad["!cols"] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInad, "Inadimplência & Aging List");

  return wb;
}

/**
 * Gera o buffer binário (.xlsx) para envio HTTP
 */
export function gerarBufferExcel(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
