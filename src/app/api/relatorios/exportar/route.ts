// src/app/api/relatorios/exportar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularQuilometragem } from "@/lib/utils";
import { CENTROS_DE_CUSTO, parseCentroCustoECategoria } from "@/lib/centrosCusto";
import { calcularDiasAtraso, sugerirEncargos } from "@/lib/baixaInteligente";
import {
  DadosExportacaoFinanceira,
  construirWorkbookFinanceiro,
  gerarBufferExcel,
} from "@/lib/exportacaoFinanceira";
import { DADOS_EMPRESA } from "@/lib/empresa";

export const dynamic = "force-dynamic";

const NOMES_MESES: Record<string, string> = {
  "1": "Janeiro",
  "2": "Fevereiro",
  "3": "Março",
  "4": "Abril",
  "5": "Maio",
  "6": "Junho",
  "7": "Julho",
  "8": "Agosto",
  "9": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const formato = searchParams.get("formato") || "xlsx";
    const filtroAno = searchParams.get("ano");
    const filtroMes = searchParams.get("mes");
    const dataInicioParam = searchParams.get("dataInicio");
    const dataFimParam = searchParams.get("dataFim");

    // 1. Buscar todas as Ordens de Serviço
    const todasOS = await prisma.ordens_servico.findMany({
      include: {
        clientes: { select: { id: true, nome: true } },
        usuarios: { select: { id: true, nome: true, cargo: true } },
        maquinas: { select: { id: true, modelo: true, tipo: true } },
      },
      orderBy: { data_abertura: "desc" },
    });

    // 2. Filtrar OS
    const osFiltradas = todasOS.filter((os) => {
      const dataRef = os.data_fechamento || os.data_abertura;
      if (!dataRef) return true;
      const d = new Date(dataRef);
      const isoStr = d.toISOString().split("T")[0];

      if (dataInicioParam && isoStr < dataInicioParam) return false;
      if (dataFimParam && isoStr > dataFimParam) return false;

      const anoOS = d.getFullYear().toString();
      const mesOS = (d.getMonth() + 1).toString();

      if (filtroAno && filtroAno !== "ALL" && anoOS !== filtroAno) return false;
      if (filtroMes && filtroMes !== "ALL" && mesOS !== filtroMes) return false;

      return true;
    });

    const osFechadas = osFiltradas.filter(
      (os) => os.status?.toUpperCase() === "FECHADA" || os.status?.toUpperCase() === "CONCLUIDA"
    );

    const receitaMaoObra = osFechadas.reduce((acc, os) => acc + Number(os.valor_mao_obra || 0), 0);
    const receitaPecas = osFechadas.reduce((acc, os) => acc + Number(os.valor_pecas || 0), 0);
    const receitaDeslocamento = osFechadas.reduce((acc, os) => {
      const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);
      return acc + kmInfo.valorDeslocamento;
    }, 0);
    const receitaBrutaTotal = receitaMaoObra + receitaPecas + receitaDeslocamento;

    // Custos diretos
    const custoPecas = Number((receitaPecas * 0.45).toFixed(2));
    const custoFrota = Number((receitaDeslocamento * 0.35).toFixed(2));
    const custosDiretosTotal = custoPecas + custoFrota;
    const margemContribuicao = receitaBrutaTotal - custosDiretosTotal;
    const margemContribuicaoPerc = receitaBrutaTotal
      ? Number(((margemContribuicao / receitaBrutaTotal) * 100).toFixed(1))
      : 0;

    // 3. Buscar Contas a Pagar
    const todasContasPagar = await prisma.contas_pagar.findMany({
      orderBy: { data_vencimento: "asc" },
    });

    const contasPagarFiltradas = todasContasPagar.filter((c) => {
      const dataRef = c.data_pagamento || c.data_vencimento;
      const d = new Date(dataRef);
      const isoStr = d.toISOString().split("T")[0];

      if (dataInicioParam && isoStr < dataInicioParam) return false;
      if (dataFimParam && isoStr > dataFimParam) return false;

      const ano = d.getFullYear().toString();
      const mes = (d.getMonth() + 1).toString();

      if (filtroAno && filtroAno !== "ALL" && ano !== filtroAno) return false;
      if (filtroMes && filtroMes !== "ALL" && mes !== filtroMes) return false;

      return true;
    });

    // Despesas por Centro de Custo
    const despesasOperacionais: Record<string, number> = {
      OFICINA: 0,
      CAMPO: 0,
      PESSOAL: 0,
      ADMINISTRATIVO: 0,
      TRIBUTARIO: 0,
    };

    let despesasTotais = 0;
    const contasPagarFormatadas = contasPagarFiltradas.map((c) => {
      const parsed = parseCentroCustoECategoria(c.categoria);
      const val = Number(c.valor);
      despesasTotais += val;
      despesasOperacionais[parsed.centroCustoId] =
        (despesasOperacionais[parsed.centroCustoId] || 0) + val;

      return {
        id: c.id,
        fornecedor: c.fornecedor,
        centroCustoCodigo: parsed.centroCustoCodigo,
        centroCustoNome: parsed.centroCustoNome,
        subcategoria: parsed.categoriaNome,
        descricao: c.descricao,
        vencimento: new Date(c.data_vencimento).toISOString().split("T")[0],
        pagamento: c.data_pagamento ? new Date(c.data_pagamento).toISOString().split("T")[0] : null,
        valor: val,
        status: c.status || "PENDENTE",
        formaPagamento: c.forma_pagamento || "BOLETO",
        observacoes: c.observacoes,
      };
    });

    const lucroLiquido = margemContribuicao - despesasTotais;
    const margemLiquidaPerc = receitaBrutaTotal
      ? Number(((lucroLiquido / receitaBrutaTotal) * 100).toFixed(1))
      : 0;

    const margemContribuicaoIndice = receitaBrutaTotal ? margemContribuicao / receitaBrutaTotal : 0.6;
    const pontoEquilibrio =
      margemContribuicaoIndice > 0
        ? Number((despesasTotais / margemContribuicaoIndice).toFixed(2))
        : despesasTotais;

    // 4. Buscar Contas a Receber
    const todasContasReceber = await prisma.contas_receber.findMany({
      include: {
        clientes: { select: { nome: true, telefone: true } },
        ordens_servico: { select: { numero_os: true } },
      },
      orderBy: { data_vencimento: "asc" },
    });

    const contasReceberFiltradas = todasContasReceber.filter((c) => {
      const dataRef = c.data_pagamento || c.data_vencimento;
      const d = new Date(dataRef);
      const isoStr = d.toISOString().split("T")[0];

      if (dataInicioParam && isoStr < dataInicioParam) return false;
      if (dataFimParam && isoStr > dataFimParam) return false;

      const ano = d.getFullYear().toString();
      const mes = (d.getMonth() + 1).toString();

      if (filtroAno && filtroAno !== "ALL" && ano !== filtroAno) return false;
      if (filtroMes && filtroMes !== "ALL" && mes !== filtroMes) return false;

      return true;
    });

    const hoje = new Date().toISOString().split("T")[0];
    const inadimplenciaList: any[] = [];

    const contasReceberFormatadas = contasReceberFiltradas.map((c) => {
      const val = Number(c.valor);
      const dtVencStr = new Date(c.data_vencimento).toISOString().split("T")[0];
      const dtPagStr = c.data_pagamento ? new Date(c.data_pagamento).toISOString().split("T")[0] : null;

      // Se pendente e vencido, calcular inadimplência
      if (c.status !== "PAGO" && dtVencStr < hoje) {
        const diasAtraso = calcularDiasAtraso(dtVencStr, hoje);
        const encargos = sugerirEncargos(val, dtVencStr, hoje);
        let faixa = "1 a 15 dias";
        if (diasAtraso > 60) faixa = "Acima de 60 dias";
        else if (diasAtraso > 30) faixa = "31 a 60 dias";
        else if (diasAtraso > 15) faixa = "16 a 30 dias";

        inadimplenciaList.push({
          cliente: c.clientes?.nome || "Cliente Avulso",
          documento: c.ordens_servico?.numero_os ? `OS #${c.ordens_servico.numero_os}` : `TIT #${c.id}`,
          diasAtraso,
          faixaAtraso: faixa,
          valorOriginal: val,
          multa: encargos.multaSugerida,
          juros: encargos.jurosSugerido,
          valorCobravel: Number((val + encargos.multaSugerida + encargos.jurosSugerido).toFixed(2)),
        });
      }

      return {
        id: c.id,
        cliente: c.clientes?.nome || "Cliente Avulso",
        numeroOS: c.ordens_servico?.numero_os || null,
        descricao: c.descricao,
        vencimento: dtVencStr,
        pagamento: dtPagStr,
        valor: val,
        status: c.status || "PENDENTE",
        formaPagamento: c.forma_pagamento || "PIX",
        observacoes: c.observacoes,
      };
    });

    // 5. Fluxo de Caixa Projetado (7, 15, 30 e 60 dias)
    const hojeDate = new Date();
    const calcularPrevisao = (diasLimite: number) => {
      const dataLimite = new Date(hojeDate);
      dataLimite.setDate(dataLimite.getDate() + diasLimite);

      const aReceber = todasContasReceber
        .filter((c) => {
          if (c.status === "PAGO") return false;
          const dv = new Date(c.data_vencimento);
          return dv >= hojeDate && dv <= dataLimite;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0);

      const aPagar = todasContasPagar
        .filter((c) => {
          if (c.status === "PAGO") return false;
          const dv = new Date(c.data_vencimento);
          return dv >= hojeDate && dv <= dataLimite;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0);

      return { aReceber, aPagar, saldo: aReceber - aPagar };
    };

    const p7 = calcularPrevisao(7);
    const p15 = calcularPrevisao(15);
    const p30 = calcularPrevisao(30);
    const p60 = calcularPrevisao(60);

    const fluxoCaixaProjetado = [
      { dias: 7, label: "Curto Prazo (7 dias)", receberProjetado: p7.aReceber, pagarProjetado: p7.aPagar, saldoPeriodo: p7.saldo, saldoAcumulado: p7.saldo },
      { dias: 15, label: "Quinzenal (15 dias)", receberProjetado: p15.aReceber, pagarProjetado: p15.aPagar, saldoPeriodo: p15.saldo, saldoAcumulado: p15.saldo },
      { dias: 30, label: "Mensal (30 dias)", receberProjetado: p30.aReceber, pagarProjetado: p30.aPagar, saldoPeriodo: p30.saldo, saldoAcumulado: p30.saldo },
      { dias: 60, label: "Bimestral (60 dias)", receberProjetado: p60.aReceber, pagarProjetado: p60.aPagar, saldoPeriodo: p60.saldo, saldoAcumulado: p60.saldo },
    ];

    let periodoLabel = "Consolidado Geral";
    if (filtroMes && filtroAno) {
      periodoLabel = `${NOMES_MESES[filtroMes] || filtroMes} de ${filtroAno}`;
    } else if (filtroAno) {
      periodoLabel = `Exercício de ${filtroAno}`;
    } else if (dataInicioParam && dataFimParam) {
      periodoLabel = `De ${dataInicioParam} até ${dataFimParam}`;
    }

    const dadosConsolidados: DadosExportacaoFinanceira = {
      periodoLabel,
      dataInicio: dataInicioParam || undefined,
      dataFim: dataFimParam || undefined,
      dre: {
        receitaMaoObra,
        receitaPecas,
        receitaDeslocamento,
        receitaBrutaTotal,
        custoPecas,
        custoFrota,
        custosDiretosTotal,
        margemContribuicao,
        margemContribuicaoPerc,
        despesasOperacionais,
        despesasTotais,
        lucroLiquido,
        margemLiquidaPerc,
        pontoEquilibrio,
      },
      contasReceber: contasReceberFormatadas,
      contasPagar: contasPagarFormatadas,
      fluxoCaixaProjetado,
      inadimplencia: inadimplenciaList,
    };

    // Se o cliente pediu JSON (ex: para pré-visualização no modal ou PDF)
    if (formato === "json") {
      return NextResponse.json(dadosConsolidados);
    }

    // Se pediu XLSX, gera a planilha Excel e retorna o buffer
    const wb = construirWorkbookFinanceiro(dadosConsolidados);
    const buffer = gerarBufferExcel(wb);

    const safeFilename = `SAMAPE_Relatorio_Financeiro_${periodoLabel.replace(/[\s\/\\:]+/g, "_")}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar exportação financeira:", error);
    return NextResponse.json(
      { error: "Erro ao gerar exportação financeira", details: error.message },
      { status: 500 }
    );
  }
}
