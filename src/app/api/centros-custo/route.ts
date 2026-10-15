import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CENTROS_DE_CUSTO,
  parseCentroCustoECategoria,
  formatarCategoriaParaSalvar,
} from "@/lib/centrosCusto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filtroAno = searchParams.get("ano"); // "2026", "2025", "ALL"
    const filtroMes = searchParams.get("mes"); // "1" a "12", "ALL"
    const filtroStatus = searchParams.get("status"); // "PAGO", "PENDENTE", "ALL"
    const filtroCentro = searchParams.get("centro_custo"); // "OFICINA", "CAMPO", etc.

    // 1. Buscar todas as contas a pagar
    const contas = await prisma.contas_pagar.findMany({
      orderBy: { data_vencimento: "asc" },
    });

    // 2. Filtrar por período e status
    const contasFiltradas = contas.filter((c) => {
      const dataRef = c.data_pagamento || c.data_vencimento || c.created_at;
      if (dataRef) {
        const d = new Date(dataRef);
        const ano = d.getFullYear().toString();
        const mes = (d.getMonth() + 1).toString();
        if (filtroAno && filtroAno !== "ALL" && ano !== filtroAno) return false;
        if (filtroMes && filtroMes !== "ALL" && mes !== filtroMes) return false;
      }

      if (filtroStatus && filtroStatus !== "ALL") {
        if (filtroStatus === "PAGO" && c.status?.toUpperCase() !== "PAGO") return false;
        if (filtroStatus === "PENDENTE" && c.status?.toUpperCase() === "PAGO") return false;
      }

      if (filtroCentro && filtroCentro !== "ALL") {
        const info = parseCentroCustoECategoria(c.categoria);
        if (info.centroCustoId !== filtroCentro) return false;
      }

      return true;
    });

    // 3. Buscar receita bruta do mesmo período para cálculo de impacto
    const todasOrdens = await prisma.ordens_servico.findMany({
      select: {
        data_fechamento: true,
        data_abertura: true,
        valor_total: true,
        status: true,
      },
    });

    const ordensFechadas = todasOrdens.filter((os) => {
      const dataRef = os.data_fechamento || os.data_abertura;
      if (!dataRef) return false;
      const d = new Date(dataRef);
      const ano = d.getFullYear().toString();
      const mes = (d.getMonth() + 1).toString();
      if (filtroAno && filtroAno !== "ALL" && ano !== filtroAno) return false;
      if (filtroMes && filtroMes !== "ALL" && mes !== filtroMes) return false;
      const st = os.status?.toUpperCase();
      return st === "FECHADA" || st === "CONCLUIDA";
    });

    const receitaBrutaPeriodo = ordensFechadas.reduce(
      (acc, os) => acc + Number(os.valor_total || 0),
      0
    );

    // 4. Estruturar Centros de Custo
    const centrosMap: Record<
      string,
      {
        id: string;
        codigo: string;
        nome: string;
        descricao: string;
        cor: string;
        corBg: string;
        corBorder: string;
        corTexto: string;
        totalPago: number;
        totalPendente: number;
        totalGeral: number;
        qtdDespesas: number;
        subcategoriasMap: Record<
          string,
          {
            nome: string;
            pago: number;
            pendente: number;
            total: number;
            qtd: number;
          }
        >;
        despesas: any[];
      }
    > = {};

    // Inicializar todos os centros oficiais
    for (const cc of CENTROS_DE_CUSTO) {
      centrosMap[cc.id] = {
        ...cc,
        totalPago: 0,
        totalPendente: 0,
        totalGeral: 0,
        qtdDespesas: 0,
        subcategoriasMap: {},
        despesas: [],
      };
    }

    let totalDespesasPagas = 0;
    let totalDespesasPendentes = 0;

    for (const c of contasFiltradas) {
      const parsed = parseCentroCustoECategoria(c.categoria);
      const cc = centrosMap[parsed.centroCustoId] || centrosMap["ADMINISTRATIVO"];

      const valor = Number(c.valor || 0);
      const isPago = c.status?.toUpperCase() === "PAGO";

      if (isPago) {
        cc.totalPago += valor;
        totalDespesasPagas += valor;
      } else {
        cc.totalPendente += valor;
        totalDespesasPendentes += valor;
      }

      cc.totalGeral += valor;
      cc.qtdDespesas += 1;

      // Subcategorias
      const subNome = parsed.categoriaNome || "Diversos";
      if (!cc.subcategoriasMap[subNome]) {
        cc.subcategoriasMap[subNome] = {
          nome: subNome,
          pago: 0,
          pendente: 0,
          total: 0,
          qtd: 0,
        };
      }
      if (isPago) cc.subcategoriasMap[subNome].pago += valor;
      else cc.subcategoriasMap[subNome].pendente += valor;
      cc.subcategoriasMap[subNome].total += valor;
      cc.subcategoriasMap[subNome].qtd += 1;

      cc.despesas.push({
        id: c.id,
        fornecedor: c.fornecedor,
        descricao: c.descricao,
        categoriaCompleta: c.categoria,
        centroCustoId: parsed.centroCustoId,
        centroCustoNome: parsed.centroCustoNome,
        subcategoriaNome: parsed.categoriaNome,
        valor,
        data_vencimento: c.data_vencimento,
        data_pagamento: c.data_pagamento,
        status: c.status || "PENDENTE",
        forma_pagamento: c.forma_pagamento,
        observacoes: c.observacoes,
      });
    }

    const totalDespesasGerais = totalDespesasPagas + totalDespesasPendentes;

    // Converter para array final
    const centrosArray = Object.values(centrosMap).map((cc) => {
      const participacaoDespesasPct =
        totalDespesasGerais > 0 ? (cc.totalGeral / totalDespesasGerais) * 100 : 0;
      const impactoReceitaPct =
        receitaBrutaPeriodo > 0 ? (cc.totalGeral / receitaBrutaPeriodo) * 100 : 0;

      return {
        id: cc.id,
        codigo: cc.codigo,
        nome: cc.nome,
        descricao: cc.descricao,
        cor: cc.cor,
        corBg: cc.corBg,
        corBorder: cc.corBorder,
        corTexto: cc.corTexto,
        totalPago: Number(cc.totalPago.toFixed(2)),
        totalPendente: Number(cc.totalPendente.toFixed(2)),
        totalGeral: Number(cc.totalGeral.toFixed(2)),
        qtdDespesas: cc.qtdDespesas,
        participacaoDespesasPct: Number(participacaoDespesasPct.toFixed(1)),
        impactoReceitaPct: Number(impactoReceitaPct.toFixed(1)),
        subcategorias: Object.values(cc.subcategoriasMap).sort((a, b) => b.total - a.total),
        despesas: cc.despesas,
      };
    });

    return NextResponse.json({
      resumo: {
        totalDespesasPagas: Number(totalDespesasPagas.toFixed(2)),
        totalDespesasPendentes: Number(totalDespesasPendentes.toFixed(2)),
        totalDespesasGerais: Number(totalDespesasGerais.toFixed(2)),
        qtdTotalContas: contasFiltradas.length,
        receitaBrutaPeriodo: Number(receitaBrutaPeriodo.toFixed(2)),
        sobrecargaOperacionalPct:
          receitaBrutaPeriodo > 0
            ? Number(((totalDespesasGerais / receitaBrutaPeriodo) * 100).toFixed(1))
            : 0,
      },
      centrosDeCusto: centrosArray,
      centrosOficiais: CENTROS_DE_CUSTO,
    });
  } catch (error: any) {
    console.error("Erro ao processar centros de custo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar centros de custo", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Se for ação de seed de exemplo para testes da oficina
    if (body.action === "seed_exemplo") {
      const hoje = new Date();
      const d1 = new Date(hoje.getFullYear(), hoje.getMonth(), 5);
      const d2 = new Date(hoje.getFullYear(), hoje.getMonth(), 10);
      const d3 = new Date(hoje.getFullYear(), hoje.getMonth(), 15);
      const d4 = new Date(hoje.getFullYear(), hoje.getMonth(), 20);

      const exemplos = [
        {
          fornecedor: "Posto Shell / Trevo",
          descricao: "Diesel S10 para Caminhonete de Socorro em Campo (Atendimentos Franciscópolis)",
          categoria: formatarCategoriaParaSalvar("CAMPO", "Combustível & Lubrificantes (Frota)"),
          valor: 2450.0,
          data_vencimento: d1,
          data_pagamento: d1,
          status: "PAGO",
          forma_pagamento: "PIX",
          observacoes: "Frota de socorro em mineração",
        },
        {
          fornecedor: "Distribuidora de Peças Cat & Tratores MG",
          descricao: "Kits de Reparo Hidráulico, Retentores e Filtros de Óleo",
          categoria: formatarCategoriaParaSalvar("OFICINA", "Peças & Fornecedores"),
          valor: 3890.0,
          data_vencimento: d2,
          data_pagamento: d2,
          status: "PAGO",
          forma_pagamento: "BOLETO",
          observacoes: "Peças para estoque de giro e revisões de 500h",
        },
        {
          fornecedor: "Imobiliária Central / Locação",
          descricao: "Aluguel do Galpão e Oficina Matriz Samape",
          categoria: formatarCategoriaParaSalvar("ADMINISTRATIVO", "Aluguel & IPTU do Galpão"),
          valor: 3500.0,
          data_vencimento: d2,
          data_pagamento: d2,
          status: "PAGO",
          forma_pagamento: "TRANSFERENCIA",
          observacoes: "Estrutura principal da oficina",
        },
        {
          fornecedor: "Energia Elétrica (CEMIG / EDP)",
          descricao: "Fatura de Energia Elétrica da Oficina Mecânica",
          categoria: formatarCategoriaParaSalvar("ADMINISTRATIVO", "Energia Elétrica, Água & Telefonia"),
          valor: 820.0,
          data_vencimento: d3,
          data_pagamento: null,
          status: "PENDENTE",
          forma_pagamento: "BOLETO",
          observacoes: "Consumo de compressores e solda",
        },
        {
          fornecedor: "Receita Federal / Simples Nacional",
          descricao: "Guia DAS Simples Nacional - Manutenção de Máquinas e Equipamentos",
          categoria: formatarCategoriaParaSalvar("TRIBUTARIO", "Impostos & Tributos (DAS Simples/ISS)"),
          valor: 1650.0,
          data_vencimento: d4,
          data_pagamento: null,
          status: "PENDENTE",
          forma_pagamento: "BOLETO",
          observacoes: "Tributo mensal sobre notas faturadas",
        },
        {
          fornecedor: "EPI Seg Segurança do Trabalho",
          descricao: "Botinas de bico de aço, luvas nitrílicas e óculos de proteção para mecânicos",
          categoria: formatarCategoriaParaSalvar("PESSOAL", "EPIs & Fardamento de Proteção"),
          valor: 640.0,
          data_vencimento: d1,
          data_pagamento: d1,
          status: "PAGO",
          forma_pagamento: "PIX",
          observacoes: "Equipamentos de proteção individual",
        },
      ];

      for (const ex of exemplos) {
        await prisma.contas_pagar.create({
          data: ex,
        });
      }

      return NextResponse.json({
        message: "Despesas padrão da Samape inseridas com sucesso!",
        totalCriado: exemplos.length,
      });
    }

    const {
      fornecedor,
      descricao,
      centro_custo_id,
      subcategoria,
      categoria,
      valor,
      data_vencimento,
      data_pagamento,
      status,
      forma_pagamento,
      observacoes,
    } = body;

    if (!fornecedor || !descricao || !valor || !data_vencimento) {
      return NextResponse.json(
        { error: "Fornecedor, descrição, valor e data de vencimento são obrigatórios." },
        { status: 400 }
      );
    }

    const catFormatada =
      centro_custo_id && subcategoria
        ? formatarCategoriaParaSalvar(centro_custo_id, subcategoria)
        : categoria || "ADMINISTRATIVO - Diversos";

    const st = status || (data_pagamento ? "PAGO" : "PENDENTE");

    const novaConta = await prisma.contas_pagar.create({
      data: {
        fornecedor,
        descricao,
        categoria: catFormatada,
        valor: parseFloat(valor),
        data_vencimento: new Date(data_vencimento),
        data_pagamento: data_pagamento ? new Date(data_pagamento) : null,
        status: st,
        forma_pagamento: forma_pagamento || "BOLETO",
        observacoes,
      },
    });

    return NextResponse.json(novaConta, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao salvar conta:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta a pagar", details: error.message },
      { status: 500 }
    );
  }
}
