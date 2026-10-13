import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pecas = await prisma.pecas.findMany({
      orderBy: { nome: "asc" },
    });

    const formatadas = pecas.map((p) => {
      const custo = Number(p.preco_custo || 0);
      const venda = Number(p.preco_venda || 0);
      const estoque = p.quantidade_estoque || 0;
      const margemReais = venda - custo;
      const margemPerc = custo > 0 ? (margemReais / custo) * 100 : 0;

      return {
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        categoria: p.categoria || "Geral",
        fabricante: p.fabricante,
        quantidade_estoque: estoque,
        estoque_minimo: p.estoque_minimo || 0,
        preco_custo: custo,
        preco_venda: venda,
        margem_reais: margemReais,
        margem_perc: margemPerc,
        total_custo_estoque: estoque * custo,
        total_venda_estoque: estoque * venda,
        ativo: p.ativo,
      };
    });

    const totalCusto = formatadas.reduce((acc, p) => acc + p.total_custo_estoque, 0);
    const totalVenda = formatadas.reduce((acc, p) => acc + p.total_venda_estoque, 0);
    const totalLucro = totalVenda - totalCusto;
    const pecasCriticas = formatadas.filter(
      (p) => p.quantidade_estoque <= p.estoque_minimo && p.estoque_minimo > 0
    ).length;

    return NextResponse.json({
      pecas: formatadas,
      resumo: {
        totalItens: formatadas.length,
        totalCusto,
        totalVenda,
        totalLucro,
        pecasCriticas,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao buscar estoque de peças", details: error.message },
      { status: 500 }
    );
  }
}
