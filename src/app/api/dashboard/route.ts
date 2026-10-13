import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularQuilometragem } from "@/lib/utils";

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
    const filtroAno = searchParams.get("ano"); // "2026", "2025", "ALL" ou null
    const filtroMes = searchParams.get("mes"); // "1" a "12", "ALL" ou null

    // 1. Buscar todas as Ordens de Serviço
    const todasOrdensServico = await prisma.ordens_servico.findMany({
      include: {
        clientes: { select: { id: true, nome: true } },
        usuarios: { select: { id: true, nome: true, cargo: true } },
        maquinas: { select: { id: true, modelo: true, tipo: true } },
      },
      orderBy: { data_abertura: "desc" },
    });

    // Descobrir todos os anos presentes no banco
    const anosSet = new Set<string>();
    for (const os of todasOrdensServico) {
      const dataRef = os.data_fechamento || os.data_abertura;
      if (dataRef) {
        anosSet.add(new Date(dataRef).getFullYear().toString());
      }
    }
    const anosDisponiveis = Array.from(anosSet).sort().reverse();
    if (anosDisponiveis.length === 0) anosDisponiveis.push("2026");

    // 2. Filtrar Ordens de Serviço pelo Período selecionado
    const ordensFiltradas = todasOrdensServico.filter((os) => {
      const dataRef = os.data_fechamento || os.data_abertura;
      if (!dataRef) return true;
      const d = new Date(dataRef);
      const anoOS = d.getFullYear().toString();
      const mesOS = (d.getMonth() + 1).toString();

      if (filtroAno && filtroAno !== "ALL" && anoOS !== filtroAno) return false;
      if (filtroMes && filtroMes !== "ALL" && mesOS !== filtroMes) return false;
      return true;
    });

    const osFechadas = ordensFiltradas.filter(
      (os) => os.status?.toUpperCase() === "FECHADA" || os.status?.toUpperCase() === "CONCLUIDA"
    );
    const osAbertas = ordensFiltradas.filter(
      (os) => os.status?.toUpperCase() !== "FECHADA" && os.status?.toUpperCase() !== "CONCLUIDA"
    );

    const faturamentoTotal = osFechadas.reduce((acc, os) => acc + Number(os.valor_total || 0), 0);
    const faturamentoAberto = osAbertas.reduce((acc, os) => acc + Number(os.valor_total || 0), 0);

    const totalMaoObra = osFechadas.reduce((acc, os) => acc + Number(os.valor_mao_obra || 0), 0);
    const totalPecas = osFechadas.reduce((acc, os) => acc + Number(os.valor_pecas || 0), 0);

    // Cálculo da quilometragem usando hodômetro real (km_volta - km_ida)
    const totalDeslocamento = osFechadas.reduce((acc, os) => {
      const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);
      return acc + kmInfo.valorDeslocamento;
    }, 0);

    const totalKmRodados = osFechadas.reduce((acc, os) => {
      const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);
      return acc + kmInfo.kmRodados;
    }, 0);

    const ticketMedio = osFechadas.length > 0 ? faturamentoTotal / osFechadas.length : 0;

    // 3. Contas a Receber e a Pagar filtradas por período
    const todasContasReceber = await prisma.contas_receber.findMany({
      include: {
        clientes: { select: { nome: true } },
        ordens_servico: { select: { numero_os: true } },
      },
      orderBy: { data_vencimento: "asc" },
    });

    const todasContasPagar = await prisma.contas_pagar.findMany({
      orderBy: { data_vencimento: "asc" },
    });

    const filtrarPorPeriodo = (item: { data_pagamento?: Date | null; data_vencimento?: Date | null; created_at?: Date | null }) => {
      const dataRef = item.data_pagamento || item.data_vencimento || item.created_at;
      if (!dataRef) return true;
      const d = new Date(dataRef);
      const ano = d.getFullYear().toString();
      const mes = (d.getMonth() + 1).toString();

      if (filtroAno && filtroAno !== "ALL" && ano !== filtroAno) return false;
      if (filtroMes && filtroMes !== "ALL" && mes !== filtroMes) return false;
      return true;
    };

    const contasReceber = todasContasReceber.filter(filtrarPorPeriodo);
    const contasPagar = todasContasPagar.filter(filtrarPorPeriodo);

    const aReceberPendente = contasReceber
      .filter((c) => c.status?.toUpperCase() !== "PAGO")
      .reduce((acc, c) => acc + Number(c.valor || 0), 0);

    const aReceberRealizado = contasReceber
      .filter((c) => c.status?.toUpperCase() === "PAGO")
      .reduce((acc, c) => acc + Number(c.valor || 0), 0);

    const aPagarPendente = contasPagar
      .filter((c) => c.status?.toUpperCase() !== "PAGO")
      .reduce((acc, c) => acc + Number(c.valor || 0), 0);

    const aPagarRealizado = contasPagar
      .filter((c) => c.status?.toUpperCase() === "PAGO")
      .reduce((acc, c) => acc + Number(c.valor || 0), 0);

    // 4. Histórico Mensal
    // Se o filtro for por ano específico ou ALL, agrupa por mês daquele período
    const faturamentoPorMesMap: Record<string, { mes: string; total: number; maoObra: number; pecas: number; deslocamento: number }> = {};
    for (const os of osFechadas) {
      const dataRef = os.data_fechamento || os.data_abertura;
      if (!dataRef) continue;
      const d = new Date(dataRef);
      const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const nomeMes = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

      if (!faturamentoPorMesMap[chaveMes]) {
        faturamentoPorMesMap[chaveMes] = { mes: nomeMes, total: 0, maoObra: 0, pecas: 0, deslocamento: 0 };
      }
      const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);
      faturamentoPorMesMap[chaveMes].total += Number(os.valor_total || 0);
      faturamentoPorMesMap[chaveMes].maoObra += Number(os.valor_mao_obra || 0);
      faturamentoPorMesMap[chaveMes].pecas += Number(os.valor_pecas || 0);
      faturamentoPorMesMap[chaveMes].deslocamento += kmInfo.valorDeslocamento;
    }

    const historicoMensal = Object.keys(faturamentoPorMesMap)
      .sort()
      .map((k) => faturamentoPorMesMap[k]);

    // 5. Top Clientes no período
    const faturamentoPorClienteMap: Record<string, { nome: string; total: number; qtdOs: number }> = {};
    for (const os of osFechadas) {
      const nomeCliente = os.clientes?.nome || "Cliente Não Identificado";
      if (!faturamentoPorClienteMap[nomeCliente]) {
        faturamentoPorClienteMap[nomeCliente] = { nome: nomeCliente, total: 0, qtdOs: 0 };
      }
      faturamentoPorClienteMap[nomeCliente].total += Number(os.valor_total || 0);
      faturamentoPorClienteMap[nomeCliente].qtdOs += 1;
    }
    const topClientes = Object.values(faturamentoPorClienteMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // 6. Ranking Mecânicos no período
    const faturamentoPorMecanicoMap: Record<string, { nome: string; total: number; qtdOs: number }> = {};
    for (const os of osFechadas) {
      const nomeMecanico = os.usuarios?.nome || "Não Atribuído";
      if (!faturamentoPorMecanicoMap[nomeMecanico]) {
        faturamentoPorMecanicoMap[nomeMecanico] = { nome: nomeMecanico, total: 0, qtdOs: 0 };
      }
      faturamentoPorMecanicoMap[nomeMecanico].total += Number(os.valor_total || 0);
      faturamentoPorMecanicoMap[nomeMecanico].qtdOs += 1;
    }
    const rankingMecanicos = Object.values(faturamentoPorMecanicoMap).sort((a, b) => b.total - a.total);

    // 7. DRE Consolidado do Período
    const receitaBruta = totalMaoObra + totalPecas + totalDeslocamento;
    const custoPecasEstimado = totalPecas > 0 ? totalPecas * 0.55 : 0;
    const lucroBruto = receitaBruta - custoPecasEstimado;
    const lucroLiquidoRealizado = lucroBruto - aPagarRealizado;
    const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
    const margemLiquida = receitaBruta > 0 ? (lucroLiquidoRealizado / receitaBruta) * 100 : 0;

    // Rótulo do período
    let periodoLabel = "Todo o Histórico";
    if (filtroAno && filtroAno !== "ALL" && filtroMes && filtroMes !== "ALL") {
      periodoLabel = `${NOMES_MESES[filtroMes] || "Mês " + filtroMes} de ${filtroAno}`;
    } else if (filtroAno && filtroAno !== "ALL") {
      periodoLabel = `Ano de ${filtroAno}`;
    } else if (filtroMes && filtroMes !== "ALL") {
      periodoLabel = `${NOMES_MESES[filtroMes] || "Mês " + filtroMes} (Todos os anos)`;
    }

    // 8. Amostra das últimas OS no período
    const ultimasOrdens = ordensFiltradas.slice(0, 8).map((os) => ({
      id: os.id,
      numero_os: os.numero_os,
      cliente: os.clientes?.nome || "Não informado",
      maquina: os.maquinas ? `${os.maquinas.tipo} ${os.maquinas.modelo}` : "Máquina s/ ref.",
      mecanico: os.usuarios?.nome || "Não atribuído",
      status: os.status,
      valor_total: Number(os.valor_total || 0),
      valor_mao_obra: Number(os.valor_mao_obra || 0),
      valor_pecas: Number(os.valor_pecas || 0),
      data_abertura: os.data_abertura,
      data_fechamento: os.data_fechamento,
    }));

    return NextResponse.json({
      periodo: {
        ano: filtroAno || "ALL",
        mes: filtroMes || "ALL",
        label: periodoLabel,
        anosDisponiveis,
      },
      resumo: {
        faturamentoTotal,
        faturamentoAberto,
        ticketMedio,
        totalOs: ordensFiltradas.length,
        osFechadasQtd: osFechadas.length,
        osAbertasQtd: osAbertas.length,
        totalMaoObra,
        totalPecas,
        totalDeslocamento,
        totalKmRodados,
        aReceberPendente,
        aReceberRealizado,
        aPagarPendente,
        aPagarRealizado,
        saldoPrevisao: faturamentoTotal + aReceberPendente - aPagarPendente,
        receitaBruta,
        custoPecasEstimado,
        lucroBruto,
        lucroLiquidoRealizado,
        margemBruta,
        margemLiquida,
      },
      historicoMensal,
      topClientes,
      rankingMecanicos,
      ultimasOrdens,
    });
  } catch (error: any) {
    console.error("Erro na API dashboard:", error);
    return NextResponse.json(
      { error: "Erro ao consultar dados com filtro de período", details: error.message },
      { status: 500 }
    );
  }
}
