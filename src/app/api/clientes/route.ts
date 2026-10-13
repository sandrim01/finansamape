import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientes = await prisma.clientes.findMany({
      include: {
        ordens_servico: {
          select: { id: true, valor_total: true, status: true },
        },
        contas_receber: {
          select: { id: true, valor: true, status: true },
        },
        maquinas: {
          select: { id: true },
        },
      },
      orderBy: { nome: "asc" },
    });

    const formatados = clientes.map((c) => {
      const osFechadas = c.ordens_servico.filter(
        (os) => os.status?.toUpperCase() === "FECHADA" || os.status?.toUpperCase() === "CONCLUIDA"
      );
      const totalFaturado = osFechadas.reduce((acc, os) => acc + Number(os.valor_total || 0), 0);
      const pendenteReceber = c.contas_receber
        .filter((cr) => cr.status?.toUpperCase() !== "PAGO")
        .reduce((acc, cr) => acc + Number(cr.valor || 0), 0);

      return {
        id: c.id,
        nome: c.nome,
        cnpj: c.cnpj,
        cpf: c.cpf,
        telefone: c.telefone,
        email: c.email,
        cidade: c.cidade,
        estado: c.estado,
        total_maquinas: c.maquinas.length,
        total_os: c.ordens_servico.length,
        total_faturado: totalFaturado,
        pendente_receber: pendenteReceber,
      };
    });

    return NextResponse.json(formatados);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao buscar clientes", details: error.message },
      { status: 500 }
    );
  }
}
