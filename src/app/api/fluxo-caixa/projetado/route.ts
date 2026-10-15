import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dias = parseInt(searchParams.get("dias") || "30", 10);
    const saldoInicialParam = parseFloat(searchParams.get("saldoInicial") || "0");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataLimite = new Date(hoje);
    dataLimite.setDate(dataLimite.getDate() + dias);
    dataLimite.setHours(23, 59, 59, 999);

    // 1. Busca Contas a Receber Pendentes
    const contasReceber = await prisma.contas_receber.findMany({
      where: {
        status: "PENDENTE",
        data_vencimento: {
          lte: dataLimite,
        },
      },
      include: {
        clientes: { select: { id: true, nome: true } },
        ordens_servico: { select: { id: true, numero_os: true } },
      },
      orderBy: { data_vencimento: "asc" },
    });

    // 2. Busca Contas a Pagar Pendentes
    const contasPagar = await prisma.contas_pagar.findMany({
      where: {
        status: "PENDENTE",
        data_vencimento: {
          lte: dataLimite,
        },
      },
      orderBy: { data_vencimento: "asc" },
    });

    // 3. Busca OS em aberto com valor para visão de pipeline de receita
    const osAbertas = await prisma.ordens_servico.findMany({
      where: {
        status: "ABERTA",
        valor_total: { gt: 0 },
      },
      include: {
        clientes: { select: { id: true, nome: true } },
      },
      orderBy: { data_abertura: "asc" },
    });

    // Calcula saldo histórico realizado acumulado para servir de base se saldoInicial for 0
    let saldoBase = saldoInicialParam;
    if (saldoInicialParam === 0) {
      const totalRecebidoHistorico = await prisma.contas_receber.aggregate({
        where: { status: "PAGO" },
        _sum: { valor: true },
      });
      const totalPagoHistorico = await prisma.contas_pagar.aggregate({
        where: { status: "PAGO" },
        _sum: { valor: true },
      });
      const rec = Number(totalRecebidoHistorico._sum.valor || 0);
      const pag = Number(totalPagoHistorico._sum.valor || 0);
      // Se houver movimentação histórica, usa a diferença como saldo de partida
      saldoBase = rec - pag;
    }

    // Separa vencidos anteriores a hoje (impacto imediato)
    let totalAtrasadosReceber = 0;
    const itensAtrasadosReceber: any[] = [];
    let totalAtrasadosPagar = 0;
    const itensAtrasadosPagar: any[] = [];

    // Mapeamento diário
    const mapaDias: Record<string, {
      data: string;
      dataFormatada: string;
      diaSemana: string;
      entradas: number;
      saidas: number;
      itensEntrada: any[];
      itensSaida: any[];
    }> = {};

    const diasSemanaNomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    // Inicializa todos os dias do horizonte
    for (let i = 0; i <= dias; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      const chave = d.toISOString().split("T")[0];
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const diaSemana = diasSemanaNomes[d.getDay()];

      mapaDias[chave] = {
        data: chave,
        dataFormatada: `${dia}/${mes}`,
        diaSemana,
        entradas: 0,
        saidas: 0,
        itensEntrada: [],
        itensSaida: [],
      };
    }

    // Processa Contas a Receber
    for (const cr of contasReceber) {
      const vencStr = new Date(cr.data_vencimento).toISOString().split("T")[0];
      const valor = Number(cr.valor);
      const vencData = new Date(cr.data_vencimento);
      vencData.setHours(0, 0, 0, 0);

      const item = {
        id: cr.id,
        descricao: cr.descricao,
        cliente: cr.clientes?.nome || "Cliente avulso",
        numero_os: cr.ordens_servico?.numero_os,
        valor,
        data_vencimento: vencStr,
        forma_pagamento: cr.forma_pagamento,
      };

      if (vencData < hoje) {
        totalAtrasadosReceber += valor;
        itensAtrasadosReceber.push(item);
        // Aloca os atrasados no dia de hoje (ou no primeiro dia)
        const chaveHoje = hoje.toISOString().split("T")[0];
        if (mapaDias[chaveHoje]) {
          mapaDias[chaveHoje].entradas += valor;
          mapaDias[chaveHoje].itensEntrada.push({ ...item, emAtraso: true });
        }
      } else if (mapaDias[vencStr]) {
        mapaDias[vencStr].entradas += valor;
        mapaDias[vencStr].itensEntrada.push(item);
      }
    }

    // Processa Contas a Pagar
    for (const cp of contasPagar) {
      const vencStr = new Date(cp.data_vencimento).toISOString().split("T")[0];
      const valor = Number(cp.valor);
      const vencData = new Date(cp.data_vencimento);
      vencData.setHours(0, 0, 0, 0);

      const item = {
        id: cp.id,
        descricao: cp.descricao,
        fornecedor: cp.fornecedor,
        categoria: cp.categoria,
        valor,
        data_vencimento: vencStr,
        forma_pagamento: cp.forma_pagamento,
      };

      if (vencData < hoje) {
        totalAtrasadosPagar += valor;
        itensAtrasadosPagar.push(item);
        const chaveHoje = hoje.toISOString().split("T")[0];
        if (mapaDias[chaveHoje]) {
          mapaDias[chaveHoje].saidas += valor;
          mapaDias[chaveHoje].itensSaida.push({ ...item, emAtraso: true });
        }
      } else if (mapaDias[vencStr]) {
        mapaDias[vencStr].saidas += valor;
        mapaDias[vencStr].itensSaida.push(item);
      }
    }

    // Monta a série temporal ordenada calculando a curva de saldo acumulado
    let saldoCorrente = saldoBase;
    let menorSaldo = saldoCorrente;
    let dataMenorSaldo = hoje.toISOString().split("T")[0];
    let maiorSaldo = saldoCorrente;
    let totalEntradas = 0;
    let totalSaidas = 0;
    const diasCriticos: any[] = [];

    const serieTemporal = Object.values(mapaDias).map((dia) => {
      totalEntradas += dia.entradas;
      totalSaidas += dia.saidas;
      const saldoDoDia = dia.entradas - dia.saidas;
      saldoCorrente += saldoDoDia;

      if (saldoCorrente < menorSaldo) {
        menorSaldo = saldoCorrente;
        dataMenorSaldo = dia.data;
      }
      if (saldoCorrente > maiorSaldo) {
        maiorSaldo = saldoCorrente;
      }

      const isNegativo = saldoCorrente < 0;
      if (isNegativo) {
        diasCriticos.push({
          data: dia.data,
          dataFormatada: dia.dataFormatada,
          saldoProjetado: saldoCorrente,
          deficit: Math.abs(saldoCorrente),
        });
      }

      return {
        data: dia.data,
        dataFormatada: dia.dataFormatada,
        diaSemana: dia.diaSemana,
        entradas: dia.entradas,
        saidas: dia.saidas,
        saldoDoDia,
        saldoAcumulado: saldoCorrente,
        isNegativo,
        itensEntrada: dia.itensEntrada,
        itensSaida: dia.itensSaida,
      };
    });

    const totalPipelineOS = osAbertas.reduce((acc, os) => acc + Number(os.valor_total || 0), 0);

    return NextResponse.json({
      config: {
        dias,
        dataInicio: hoje.toISOString().split("T")[0],
        dataFim: dataLimite.toISOString().split("T")[0],
        saldoBase,
      },
      resumo: {
        saldoAtual: saldoBase,
        totalEntradasPrevistas: totalEntradas,
        totalSaidasPrevistas: totalSaidas,
        saldoFinalProjetado: saldoCorrente,
        variacaoPeriodo: totalEntradas - totalSaidas,
        menorSaldoProjetado: menorSaldo,
        dataMenorSaldo,
        temRiscoNegativo: menorSaldo < 0,
        diasCriticosCount: diasCriticos.length,
        diasCriticos,
        totalAtrasadosReceber,
        totalAtrasadosPagar,
        totalPipelineOS,
        osAbertasCount: osAbertas.length,
      },
      serieTemporal,
      pipelineOS: osAbertas.map(os => ({
        id: os.id,
        numero_os: os.numero_os,
        cliente: os.clientes?.nome || "Cliente",
        valor_total: Number(os.valor_total || 0),
        data_abertura: os.data_abertura,
      })),
      atrasados: {
        receber: itensAtrasadosReceber,
        pagar: itensAtrasadosPagar,
      },
    });
  } catch (error: any) {
    console.error("Erro na projeção de fluxo de caixa:", error);
    return NextResponse.json(
      { error: "Erro ao calcular fluxo de caixa projetado", details: error.message },
      { status: 500 }
    );
  }
}
