import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hoje = new Date();

    const ano = parseInt(searchParams.get("ano") || String(hoje.getFullYear()), 10);
    const mes = parseInt(searchParams.get("mes") || String(hoje.getMonth() + 1), 10);

    const metaFaturamentoParam = parseFloat(searchParams.get("meta") || "0");
    const custosFixosParam = parseFloat(searchParams.get("custosFixos") || "0");

    // Intervalo do mês selecionado
    const dataInicio = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);

    const totalDiasMes = new Date(ano, mes, 0).getDate();
    const isMesCorrente = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
    const diaAtual = isMesCorrente ? hoje.getDate() : totalDiasMes;
    const diasRestantes = Math.max(0, totalDiasMes - diaAtual);

    // 1. Busca Ordens de Serviço Fechadas no Mês
    const ordensServico = await prisma.ordens_servico.findMany({
      where: {
        status: "FECHADA",
        OR: [
          { data_fechamento: { gte: dataInicio, lte: dataFim } },
          {
            data_fechamento: null,
            data_abertura: { gte: dataInicio, lte: dataFim },
          },
        ],
      },
      select: {
        id: true,
        numero_os: true,
        valor_total: true,
        valor_mao_obra: true,
        valor_pecas: true,
        km_ida: true,
        km_volta: true,
        valor_por_km: true,
        data_fechamento: true,
        data_abertura: true,
      },
    });

    let receitaTotalMes = 0;
    let totalMaoObra = 0;
    let totalPecas = 0;
    let totalDeslocamento = 0;

    for (const os of ordensServico) {
      receitaTotalMes += Number(os.valor_total || 0);
      totalMaoObra += Number(os.valor_mao_obra || 0);
      totalPecas += Number(os.valor_pecas || 0);

      const ida = Number(os.km_ida || 0);
      const volta = Number(os.km_volta || 0);
      const kmRodados = volta > ida && ida > 0 ? volta - ida : 0;
      totalDeslocamento += kmRodados * Number(os.valor_por_km || 0);
    }

    // 2. Busca Despesas do Mês (Contas a Pagar)
    const despesasMes = await prisma.contas_pagar.findMany({
      where: {
        data_vencimento: { gte: dataInicio, lte: dataFim },
      },
      select: {
        id: true,
        descricao: true,
        categoria: true,
        valor: true,
        status: true,
      },
    });

    let totalDespesasMes = 0;
    let despesasPagas = 0;
    let despesasPendentes = 0;

    for (const d of despesasMes) {
      const val = Number(d.valor || 0);
      totalDespesasMes += val;
      if (d.status === "PAGO") despesasPagas += val;
      else despesasPendentes += val;
    }

    // 3. Cálculo da Margem de Contribuição Operacional
    // Custo variável das peças aplicadas (estimado em 55% do valor cobrado de peças)
    const custoVariavelPecas = totalPecas * 0.55;
    // Custo estimado de combustível dos deslocamentos (estimado em 35% do valor cobrado do km)
    const custoVariavelDeslocamento = totalDeslocamento * 0.35;
    const custoVariavelTotal = custoVariavelPecas + custoVariavelDeslocamento;

    const margemContribuicaoValor = receitaTotalMes - custoVariavelTotal;
    const margemContribuicaoPct =
      receitaTotalMes > 0
        ? (margemContribuicaoValor / receitaTotalMes) * 100
        : 65.0; // Padrão da oficina: ~65% margem de contribuição média

    // 4. Custos Fixos Operacionais
    // Se o gestor informar custosFixos no parâmetro, usa ele; senão usa despesas totais ou base estimada
    let custosFixos = custosFixosParam > 0 ? custosFixosParam : totalDespesasMes;
    if (custosFixos === 0) {
      // Se não houver despesas lançadas no mês, adota uma base de custos operacionais padrão para a oficina
      custosFixos = 18000;
    }

    // 5. Ponto de Equilíbrio (Break-Even Point)
    // Ponto de Equilíbrio = Custos Fixos / (Margem de Contribuição % / 100)
    const fatorMargem = (margemContribuicaoPct || 65) / 100;
    const pontoEquilibrioValor = fatorMargem > 0 ? custosFixos / fatorMargem : custosFixos;

    const percentualAtingidoPonto =
      pontoEquilibrioValor > 0 ? (receitaTotalMes / pontoEquilibrioValor) * 100 : 0;
    const pontoEquilibrioAtingido = receitaTotalMes >= pontoEquilibrioValor;
    const faltaParaPontoEquilibrio = Math.max(0, pontoEquilibrioValor - receitaTotalMes);

    // 6. Metas do Mês
    // Meta padrão de faturamento da oficina se não fornecida
    const metaFaturamento =
      metaFaturamentoParam > 0
        ? metaFaturamentoParam
        : Math.max(120000, Math.round(pontoEquilibrioValor * 1.5));

    const percentualAtingidoMeta =
      metaFaturamento > 0 ? (receitaTotalMes / metaFaturamento) * 100 : 0;
    const faltaParaMeta = Math.max(0, metaFaturamento - receitaTotalMes);
    const metaAtingida = receitaTotalMes >= metaFaturamento;

    // 7. Projeção de Fechamento (Run-Rate)
    const mediaDiariaRealizada = diaAtual > 0 ? receitaTotalMes / diaAtual : 0;
    const projecaoFechamento = receitaTotalMes + mediaDiariaRealizada * diasRestantes;
    const metaDiariaRestante =
      diasRestantes > 0 ? faltaParaMeta / diasRestantes : faltaParaMeta;

    // Lucro estimado após o ponto de equilíbrio
    const lucroLiquidoEstimado = Math.max(0, (receitaTotalMes - pontoEquilibrioValor) * fatorMargem);

    return NextResponse.json({
      periodo: {
        ano,
        mes,
        totalDiasMes,
        diaAtual,
        diasRestantes,
        isMesCorrente,
      },
      pontoEquilibrio: {
        valor: pontoEquilibrioValor,
        custosFixos,
        margemContribuicaoPct,
        margemContribuicaoValor,
        percentualAtingido: percentualAtingidoPonto,
        atingido: pontoEquilibrioAtingido,
        faltaParaAtingir: faltaParaPontoEquilibrio,
        lucroAlemPonto: lucroLiquidoEstimado,
      },
      metas: {
        metaFaturamento,
        faturadoAtual: receitaTotalMes,
        percentualAtingido: percentualAtingidoMeta,
        faltaParaMeta,
        atingida: metaAtingida,
        mediaDiariaRealizada,
        metaDiariaRestante,
        projecaoFechamento,
        superacaoProjetada: projecaoFechamento - metaFaturamento,
      },
      composicao: {
        receitaTotal: receitaTotalMes,
        totalMaoObra,
        totalPecas,
        totalDeslocamento,
        custoVariavelTotal,
        qtdOS: ordensServico.length,
      },
    });
  } catch (error: any) {
    console.error("Erro no cálculo do ponto de equilíbrio:", error);
    return NextResponse.json(
      { error: "Erro ao calcular metas e ponto de equilíbrio", details: error.message },
      { status: 500 }
    );
  }
}
