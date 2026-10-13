import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // List all OS with their billing status
    const ordens = await prisma.ordens_servico.findMany({
      include: {
        clientes: { select: { id: true, nome: true, cnpj: true, cpf: true } },
        usuarios: { select: { id: true, nome: true } },
        maquinas: { select: { id: true, modelo: true, tipo: true } },
        contas_receber: { select: { id: true, status: true, valor: true, data_vencimento: true } },
      },
      orderBy: { data_abertura: "desc" },
    });

    const formatadas = ordens.map((os) => {
      const temFaturamento = os.contas_receber && os.contas_receber.length > 0;
      return {
        id: os.id,
        numero_os: os.numero_os,
        cliente_id: os.cliente_id,
        cliente_nome: os.clientes?.nome || "Não informado",
        maquina: os.maquinas ? `${os.maquinas.tipo} - ${os.maquinas.modelo}` : "Geral",
        mecanico: os.usuarios?.nome || "Não atribuído",
        data_abertura: os.data_abertura,
        data_fechamento: os.data_fechamento,
        status: os.status,
        valor_mao_obra: Number(os.valor_mao_obra || 0),
        valor_pecas: Number(os.valor_pecas || 0),
        valor_total: Number(os.valor_total || 0),
        km_total: Number(os.km_ida || 0) + Number(os.km_volta || 0),
        valor_por_km: Number(os.valor_por_km || 0),
        faturado: temFaturamento,
        faturamento_info: temFaturamento ? os.contas_receber[0] : null,
      };
    });

    return NextResponse.json(formatadas);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao listar ordens de serviço para faturamento", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { os_id, data_vencimento, forma_pagamento, observacoes } = body;

    if (!os_id) {
      return NextResponse.json({ error: "os_id é obrigatório." }, { status: 400 });
    }

    const os = await prisma.ordens_servico.findUnique({
      where: { id: parseInt(os_id) },
      include: { clientes: true },
    });

    if (!os) {
      return NextResponse.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
    }

    // Default due date: 15 days from now if not specified
    const vencimento = data_vencimento
      ? new Date(data_vencimento)
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const novaConta = await prisma.contas_receber.create({
      data: {
        cliente_id: os.cliente_id,
        os_id: os.id,
        descricao: `Faturamento OS #${os.numero_os} - ${os.clientes?.nome || "Cliente"}`,
        valor: Number(os.valor_total || 0),
        data_vencimento: vencimento,
        status: "PENDENTE",
        forma_pagamento: forma_pagamento || "BOLETO",
        observacoes: observacoes || `Gerado automaticamente via FinanSamape a partir da OS ${os.numero_os}`,
      },
    });

    return NextResponse.json(novaConta, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao gerar conta a receber da OS", details: error.message },
      { status: 500 }
    );
  }
}
