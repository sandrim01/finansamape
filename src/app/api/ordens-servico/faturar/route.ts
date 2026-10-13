import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularQuilometragem } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ordens = await prisma.ordens_servico.findMany({
      include: {
        clientes: true,
        usuarios: { select: { id: true, nome: true, cargo: true } },
        maquinas: true,
        contas_receber: {
          select: {
            id: true,
            status: true,
            valor: true,
            data_vencimento: true,
            data_pagamento: true,
            forma_pagamento: true,
            observacoes: true,
            created_at: true,
          },
        },
      },
      orderBy: { data_abertura: "desc" },
    });

    const formatadas = ordens.map((os) => {
      const temFaturamento = os.contas_receber && os.contas_receber.length > 0;
      const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);

      return {
        id: os.id,
        numero_os: os.numero_os,
        cliente_id: os.cliente_id,
        cliente_nome: os.clientes?.nome || "Não informado",
        cliente: os.clientes
          ? {
              nome: os.clientes.nome,
              cnpj: os.clientes.cnpj,
              cpf: os.clientes.cpf,
              telefone: os.clientes.telefone,
              email: os.clientes.email,
              endereco: os.clientes.endereco,
              cidade: os.clientes.cidade,
              estado: os.clientes.estado,
              cep: os.clientes.cep,
            }
          : null,
        maquina: os.maquinas ? `${os.maquinas.tipo} - ${os.maquinas.modelo}` : "Geral",
        maquina_detalhes: os.maquinas
          ? {
              tipo: os.maquinas.tipo,
              modelo: os.maquinas.modelo,
              numero_serie: os.maquinas.numero_serie,
              ano: os.maquinas.ano_fabricacao,
            }
          : null,
        mecanico: os.usuarios?.nome || "Não atribuído",
        data_abertura: os.data_abertura,
        data_fechamento: os.data_fechamento,
        descricao_problema: os.descricao_problema,
        servicos_realizados: os.servicos_realizados,
        status: os.status,
        valor_mao_obra: Number(os.valor_mao_obra || 0),
        valor_pecas: Number(os.valor_pecas || 0),
        km_ida: kmInfo.kmIda,
        km_volta: kmInfo.kmVolta,
        km_total: kmInfo.kmRodados,
        valor_por_km: kmInfo.valorPorKm,
        valor_deslocamento: kmInfo.valorDeslocamento,
        valor_total: Number(os.valor_total || 0),
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
      include: {
        clientes: true,
        maquinas: true,
        usuarios: true,
      },
    });

    if (!os) {
      return NextResponse.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
    }

    // Default due date: 15 days from now if not specified
    const vencimento = data_vencimento
      ? new Date(data_vencimento)
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const forma = forma_pagamento || "BOLETO";
    const obs = observacoes || `Faturamento gerado via FinanSamape a partir da OS ${os.numero_os}`;

    const novaConta = await prisma.contas_receber.create({
      data: {
        cliente_id: os.cliente_id,
        os_id: os.id,
        descricao: `Faturamento OS #${os.numero_os} - ${os.clientes?.nome || "Cliente"}`,
        valor: Number(os.valor_total || 0),
        data_vencimento: vencimento,
        status: "PENDENTE",
        forma_pagamento: forma,
        observacoes: obs,
      },
    });

    const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);

    const notaFaturamento = {
      fatura_id: novaConta.id,
      numero_os: os.numero_os,
      data_abertura: os.data_abertura,
      data_fechamento: os.data_fechamento,
      data_emissao: novaConta.created_at,
      data_vencimento: novaConta.data_vencimento,
      forma_pagamento: novaConta.forma_pagamento,
      observacoes: novaConta.observacoes,
      status_pagamento: novaConta.status,
      valor_mao_obra: Number(os.valor_mao_obra || 0),
      valor_pecas: Number(os.valor_pecas || 0),
      km_ida: kmInfo.kmIda,
      km_volta: kmInfo.kmVolta,
      km_total: kmInfo.kmRodados,
      valor_por_km: kmInfo.valorPorKm,
      valor_deslocamento: kmInfo.valorDeslocamento,
      valor_total: Number(os.valor_total || 0),
      cliente: os.clientes
        ? {
            nome: os.clientes.nome,
            cnpj: os.clientes.cnpj,
            cpf: os.clientes.cpf,
            telefone: os.clientes.telefone,
            email: os.clientes.email,
            endereco: os.clientes.endereco,
            cidade: os.clientes.cidade,
            estado: os.clientes.estado,
            cep: os.clientes.cep,
          }
        : null,
      maquina: os.maquinas
        ? {
            tipo: os.maquinas.tipo,
            modelo: os.maquinas.modelo,
            numero_serie: os.maquinas.numero_serie,
            ano: os.maquinas.ano_fabricacao,
          }
        : null,
      mecanico: os.usuarios?.nome || "Não atribuído",
      servicos_realizados: os.servicos_realizados,
      descricao_problema: os.descricao_problema,
    };

    return NextResponse.json({
      success: true,
      conta_receber: novaConta,
      nota_faturamento: notaFaturamento,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao gerar conta a receber da OS", details: error.message },
      { status: 500 }
    );
  }
}
