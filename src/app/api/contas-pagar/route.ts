import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseCentroCustoECategoria,
  formatarCategoriaParaSalvar,
} from "@/lib/centrosCusto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoria = searchParams.get("categoria");
    const centroCusto = searchParams.get("centro_custo");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (categoria && categoria !== "ALL") {
      where.categoria = categoria;
    }

    const contas = await prisma.contas_pagar.findMany({
      where,
      orderBy: { data_vencimento: "asc" },
    });

    let formatadas = contas.map((c) => {
      const parsed = parseCentroCustoECategoria(c.categoria);
      return {
        id: c.id,
        fornecedor: c.fornecedor,
        descricao: c.descricao,
        categoria: c.categoria || "Geral",
        centro_custo_id: parsed.centroCustoId,
        centro_custo_nome: parsed.centroCustoNome,
        subcategoria: parsed.categoriaNome,
        cor: parsed.cor,
        corBg: parsed.corBg,
        corTexto: parsed.corTexto,
        valor: Number(c.valor),
        data_vencimento: c.data_vencimento,
        data_pagamento: c.data_pagamento,
        status: c.status || "PENDENTE",
        forma_pagamento: c.forma_pagamento,
        observacoes: c.observacoes,
        created_at: c.created_at,
      };
    });

    if (centroCusto && centroCusto !== "ALL") {
      formatadas = formatadas.filter((c) => c.centro_custo_id === centroCusto);
    }

    return NextResponse.json(formatadas);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao listar contas a pagar", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    const parsed = parseCentroCustoECategoria(novaConta.categoria);

    return NextResponse.json(
      {
        ...novaConta,
        centro_custo_id: parsed.centroCustoId,
        centro_custo_nome: parsed.centroCustoNome,
        subcategoria: parsed.categoriaNome,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao criar conta a pagar", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, data_pagamento, forma_pagamento, observacoes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    const atualizada = await prisma.contas_pagar.update({
      where: { id: parseInt(id) },
      data: {
        status: status !== undefined ? status : undefined,
        data_pagamento: data_pagamento ? new Date(data_pagamento) : null,
        forma_pagamento: forma_pagamento !== undefined ? forma_pagamento : undefined,
        observacoes: observacoes !== undefined ? observacoes : undefined,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(atualizada);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao atualizar conta a pagar", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    await prisma.contas_pagar.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao excluir conta a pagar", details: error.message },
      { status: 500 }
    );
  }
}
