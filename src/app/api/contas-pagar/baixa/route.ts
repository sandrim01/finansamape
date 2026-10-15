// src/app/api/contas-pagar/baixa/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DadosLiquidacao,
  serializarObservacoesBaixa,
} from "@/lib/baixaInteligente";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      conta_id,
      valor_original,
      multa = 0,
      multa_percentual = 0,
      juros = 0,
      juros_percentual = 0,
      desconto = 0,
      desconto_percentual = 0,
      valor_total_devido,
      tipo_baixa = "TOTAL",
      valor_efetivo_pago,
      gerar_saldo_restante = false,
      saldo_restante = 0,
      nova_data_vencimento,
      conta_bancaria_id,
      conta_bancaria_nome,
      forma_pagamento,
      data_pagamento,
      observacoes,
    } = body;

    if (!conta_id) {
      return NextResponse.json({ error: "ID da conta é obrigatório." }, { status: 400 });
    }

    const conta = await prisma.contas_pagar.findUnique({
      where: { id: parseInt(conta_id) },
    });

    if (!conta) {
      return NextResponse.json({ error: "Conta a pagar não encontrada." }, { status: 404 });
    }

    const dtPagamentoStr = data_pagamento || new Date().toISOString().split("T")[0];
    const dataRefFormat = dtPagamentoStr.replace(/-/g, "");
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const protocolo = `SMP-PAG-${dataRefFormat}-${randomHex}`;

    const valorPagoNum = Number(valor_efetivo_pago || valor_total_devido || conta.valor);
    const valorOriginalNum = Number(valor_original || conta.valor);
    const multaNum = Number(multa || 0);
    const jurosNum = Number(juros || 0);
    const descontoNum = Number(desconto || 0);
    const totalDevidoNum = Number(valor_total_devido || (valorOriginalNum + multaNum + jurosNum - descontoNum));
    const saldoRestanteNum = Number(saldo_restante || 0);

    const dadosLiquidacao: DadosLiquidacao = {
      protocolo,
      tipoOperacao: "PAGAMENTO",
      tituloId: conta.id,
      descricao: conta.descricao,
      clienteOuFornecedor: conta.fornecedor,
      documentoRef: `DOC #${conta.id}`,
      valorOriginal: valorOriginalNum,
      multa: multaNum,
      multaPercentual: Number(multa_percentual || 0),
      juros: jurosNum,
      jurosPercentual: Number(juros_percentual || 0),
      desconto: descontoNum,
      descontoPercentual: Number(desconto_percentual || 0),
      valorTotalDevido: totalDevidoNum,
      tipoBaixa: tipo_baixa,
      valorEfetivoPago: valorPagoNum,
      saldoRestante: tipo_baixa === "PARCIAL" ? saldoRestanteNum : 0,
      contaBancariaId: conta_bancaria_id || "BB_PRINCIPAL",
      contaBancariaNome: conta_bancaria_nome || "Banco do Brasil (CC Principal)",
      formaPagamento: forma_pagamento || conta.forma_pagamento || "BOLETO",
      dataPagamento: dtPagamentoStr,
      observacoes: observacoes || undefined,
      dataLiquidacaoRegistro: new Date().toISOString(),
    };

    let novoTituloId: number | undefined = undefined;

    // Se for baixa parcial com geração do saldo devedor restante
    if (tipo_baixa === "PARCIAL" && gerar_saldo_restante && saldoRestanteNum > 0) {
      const dtNovoVenc = nova_data_vencimento
        ? new Date(nova_data_vencimento)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const novoTitulo = await prisma.contas_pagar.create({
        data: {
          fornecedor: conta.fornecedor,
          descricao: `${conta.descricao} (Saldo Parcial Remanescente)`,
          categoria: conta.categoria,
          valor: saldoRestanteNum,
          data_vencimento: dtNovoVenc,
          status: "PENDENTE",
          forma_pagamento: forma_pagamento || conta.forma_pagamento || "BOLETO",
          observacoes: `Saldo a pagar de R$ ${saldoRestanteNum.toFixed(2)} gerado da Baixa Parcial do Título #${conta.id} (Protocolo: ${protocolo}).`,
        },
      });
      novoTituloId = novoTitulo.id;
      dadosLiquidacao.novoTituloId = novoTitulo.id;
      dadosLiquidacao.novaDataVencimento = dtNovoVenc.toISOString().split("T")[0];
    }

    const obsSerializada = serializarObservacoesBaixa(dadosLiquidacao, observacoes);

    // Atualiza a conta a pagar
    const contaAtualizada = await prisma.contas_pagar.update({
      where: { id: conta.id },
      data: {
        status: "PAGO",
        data_pagamento: new Date(dtPagamentoStr),
        forma_pagamento: forma_pagamento || conta.forma_pagamento || "BOLETO",
        valor: tipo_baixa === "PARCIAL" ? valorPagoNum : undefined,
        observacoes: obsSerializada,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      protocolo,
      dadosLiquidacao,
      novoTituloId,
      contaAtualizada,
    });
  } catch (error: any) {
    console.error("Erro na baixa de contas a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao processar baixa de conta a pagar", details: error.message },
      { status: 500 }
    );
  }
}
