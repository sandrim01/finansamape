import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clienteId = searchParams.get("clienteId");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (clienteId) {
      where.cliente_id = parseInt(clienteId);
    }

    const contas = await prisma.contas_receber.findMany({
      where,
      include: {
        clientes: {
          select: { id: true, nome: true, cnpj: true, cpf: true, telefone: true },
        },
        ordens_servico: {
          select: { id: true, numero_os: true, status: true, valor_total: true },
        },
      },
      orderBy: { data_vencimento: "asc" },
    });

    const formatadas = contas.map((c) => ({
      id: c.id,
      cliente_id: c.cliente_id,
      cliente_nome: c.clientes?.nome || "Cliente avulso",
      os_id: c.os_id,
      numero_os: c.ordens_servico?.numero_os || null,
      descricao: c.descricao,
      valor: Number(c.valor),
      data_vencimento: c.data_vencimento,
      data_pagamento: c.data_pagamento,
      status: c.status || "PENDENTE",
      forma_pagamento: c.forma_pagamento,
      observacoes: c.observacoes,
      created_at: c.created_at,
    }));

    return NextResponse.json(formatadas);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao listar contas a receber", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cliente_id, os_id, descricao, valor, data_vencimento, forma_pagamento, observacoes } = body;

    if (!descricao || !valor || !data_vencimento) {
      return NextResponse.json(
        { error: "Descrição, valor e data de vencimento são obrigatórios." },
        { status: 400 }
      );
    }

    const novaConta = await prisma.contas_receber.create({
      data: {
        cliente_id: cliente_id ? parseInt(cliente_id) : null,
        os_id: os_id ? parseInt(os_id) : null,
        descricao,
        valor: parseFloat(valor),
        data_vencimento: new Date(data_vencimento),
        status: "PENDENTE",
        forma_pagamento: forma_pagamento || "PIX",
        observacoes,
      },
    });

    return NextResponse.json(novaConta, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao criar conta a receber", details: error.message },
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

    const atualizada = await prisma.contas_receber.update({
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
      { error: "Erro ao atualizar conta a receber", details: error.message },
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

    await prisma.contas_receber.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao excluir conta a receber", details: error.message },
      { status: 500 }
    );
  }
}
