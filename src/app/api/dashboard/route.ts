import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Ordens de Serviço
    const ordensServico = await prisma.ordens_servico.findMany({
      include: {
        clientes: { select: { id: true, nome: true } },
        usuarios: { select: { id: true, nome: true, cargo: true } },
        maquinas: { select: { id: true, modelo: true, tipo: true } },
      },
      orderBy: { data_abertura: "desc" },
    });

    const osFechadas = ordensServico.filter(
      (os) => os.status?.toUpperCase() === "FECHADA" || os.status?.toUpperCase() === "CONCLUIDA"
    );
    const osAbertas = ordensServico.filter(
      (os) => os.status?.toUpperCase() !== "FECHADA" && os.status?.toUpperCase() !== "CONCLUIDA"
    );

    const faturamentoTotal = osFechadas.reduce((acc, os) => acc + Number(os.valor_total || 0), 0);
    const faturamentoAberto = osAbertas.reduce((acc, os) => acc + Number(os.valor_total || 0), 0);

    const totalMaoObra = osFechadas.reduce((acc, os) => acc + Number(os.valor_mao_obra || 0), 0);
    const totalPecas = osFechadas.reduce((acc, os) => acc + Number(os.valor_pecas || 0), 0);
    
    // Cálculo correto do hodômetro: km_volta - km_ida = km rodados
    const totalDeslocamento = osFechadas.reduce((acc, os) => {
      const ida = Number(os.km_ida || 0);
      const volta = Number(os.km_volta || 0);
      const taxaKm = Number(os.valor_por_km || 0);
      const kmRodados = (volta > 0 && ida > 0 && volta >= ida) ? (volta - ida) : (volta > 0 && ida === 0 ? volta : 0);
      return acc + (kmRodados * taxaKm);
    }, 0);

    const ticketMedio = osFechadas.length > 0 ? faturamentoTotal / osFechadas.length : 0;

    // 2. Contas a Receber e a Pagar
    const contasReceber = await prisma.contas_receber.findMany({
      include: {
        clientes: { select: { nome: true } },
        ordens_servico: { select: { numero_os: true } },
      },
      orderBy: { data_vencimento: "asc" },
    });

    const contasPagar = await prisma.contas_pagar.findMany({
      orderBy: { data_vencimento: "asc" },
    });

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

    // 3. Faturamento por Mês (Histórico)
    const faturamentoPorMesMap: Record<string, { mes: string; total: number; maoObra: number; pecas: number }> = {};
    for (const os of osFechadas) {
      const dataRef = os.data_fechamento || os.data_abertura;
      if (!dataRef) continue;
      const d = new Date(dataRef);
      const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const nomeMes = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

      if (!faturamentoPorMesMap[chaveMes]) {
        faturamentoPorMesMap[chaveMes] = { mes: nomeMes, total: 0, maoObra: 0, pecas: 0 };
      }
      faturamentoPorMesMap[chaveMes].total += Number(os.valor_total || 0);
      faturamentoPorMesMap[chaveMes].maoObra += Number(os.valor_mao_obra || 0);
      faturamentoPorMesMap[chaveMes].pecas += Number(os.valor_pecas || 0);
    }

    const historicoMensal = Object.keys(faturamentoPorMesMap)
      .sort()
      .map((k) => faturamentoPorMesMap[k]);

    // 4. Faturamento por Cliente (Top 5)
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

    // 5. Faturamento por Mecânico / Técnico
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

    // 6. Peças em Estoque e Custo vs Venda
    const pecas = await prisma.pecas.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        codigo: true,
        quantidade_estoque: true,
        preco_custo: true,
        preco_venda: true,
      },
    });

    const valorEstoqueCusto = pecas.reduce(
      (acc, p) => acc + (p.quantidade_estoque || 0) * Number(p.preco_custo || 0),
      0
    );
    const valorEstoqueVenda = pecas.reduce(
      (acc, p) => acc + (p.quantidade_estoque || 0) * Number(p.preco_venda || 0),
      0
    );

    // 7. Amostra das últimas OS
    const ultimasOrdens = ordensServico.slice(0, 8).map((os) => ({
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
      resumo: {
        faturamentoTotal,
        faturamentoAberto,
        ticketMedio,
        totalOs: ordensServico.length,
        osFechadasQtd: osFechadas.length,
        osAbertasQtd: osAbertas.length,
        totalMaoObra,
        totalPecas,
        totalDeslocamento,
        aReceberPendente,
        aReceberRealizado,
        aPagarPendente,
        aPagarRealizado,
        saldoPrevisao: faturamentoTotal + aReceberPendente - aPagarPendente,
        valorEstoqueCusto,
        valorEstoqueVenda,
        lucroProjetadoEstoque: valorEstoqueVenda - valorEstoqueCusto,
      },
      historicoMensal,
      topClientes,
      rankingMecanicos,
      ultimasOrdens,
    });
  } catch (error: any) {
    console.error("Erro na API dashboard:", error);
    return NextResponse.json(
      { error: "Erro ao consultar dados do dashboard", details: error.message },
      { status: 500 }
    );
  }
}
