import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const contas = await prisma.contas_receber.findMany({
      where: {
        status: "PENDENTE",
      },
      include: {
        clientes: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
            cpf: true,
            telefone: true,
            email: true,
          },
        },
        ordens_servico: {
          select: {
            id: true,
            numero_os: true,
            status: true,
            valor_total: true,
            data_fechamento: true,
          },
        },
      },
      orderBy: { data_vencimento: "asc" },
    });

    let totalPendente = 0;
    let totalNoPrazo = 0;
    let totalVencido = 0;

    const faixas = {
      ate15: { label: "1 a 15 dias", count: 0, valor: 0, nivel: "Preventiva / Amigável", cor: "amber" },
      de16a30: { label: "16 a 30 dias", count: 0, valor: 0, nivel: "Cobrança Formal", cor: "orange" },
      de31a60: { label: "31 a 60 dias", count: 0, valor: 0, nivel: "Cobrança Crítica", cor: "rose" },
      maisDe60: { label: "Mais de 60 dias", count: 0, valor: 0, nivel: "Risco Jurídico / Protesto", cor: "red" },
    };

    const titulosVencidos: any[] = [];
    const titulosNoPrazo: any[] = [];
    const mapaClientesInadimplentes: Record<string, {
      cliente_id: number | null;
      nome: string;
      telefone: string | null;
      email: string | null;
      totalVencido: number;
      qtdTitulos: number;
      maiorAtraso: number;
    }> = {};

    for (const c of contas) {
      const valor = Number(c.valor);
      totalPendente += valor;

      const venc = new Date(c.data_vencimento);
      venc.setHours(0, 0, 0, 0);

      const diffTime = hoje.getTime() - venc.getTime();
      const diasAtraso = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const isVencido = diasAtraso > 0;

      if (!isVencido) {
        totalNoPrazo += valor;
        titulosNoPrazo.push({
          id: c.id,
          descricao: c.descricao,
          cliente_nome: c.clientes?.nome || "Cliente avulso",
          valor,
          data_vencimento: c.data_vencimento,
          diasAteVencimento: Math.abs(diasAtraso),
          forma_pagamento: c.forma_pagamento,
          numero_os: c.ordens_servico?.numero_os,
        });
      } else {
        totalVencido += valor;

        // Cálculos legais/comerciais de juros e multa
        const percentualMulta = 0.02; // 2% multa padrão
        const taxaJurosDiaria = 0.01 / 30; // 1% ao mês proporcional
        const valorMulta = valor * percentualMulta;
        const valorJuros = valor * (taxaJurosDiaria * diasAtraso);
        const valorAtualizado = valor + valorMulta + valorJuros;

        let faixaId = "ate15";
        if (diasAtraso > 60) faixaId = "maisDe60";
        else if (diasAtraso > 30) faixaId = "de31a60";
        else if (diasAtraso > 15) faixaId = "de16a30";

        (faixas as any)[faixaId].count += 1;
        (faixas as any)[faixaId].valor += valor;

        const clienteNome = c.clientes?.nome || "Cliente avulso";
        const clienteChave = c.cliente_id ? String(c.cliente_id) : clienteNome;

        if (!mapaClientesInadimplentes[clienteChave]) {
          mapaClientesInadimplentes[clienteChave] = {
            cliente_id: c.cliente_id,
            nome: clienteNome,
            telefone: c.clientes?.telefone || null,
            email: c.clientes?.email || null,
            totalVencido: 0,
            qtdTitulos: 0,
            maiorAtraso: 0,
          };
        }
        mapaClientesInadimplentes[clienteChave].totalVencido += valor;
        mapaClientesInadimplentes[clienteChave].qtdTitulos += 1;
        if (diasAtraso > mapaClientesInadimplentes[clienteChave].maiorAtraso) {
          mapaClientesInadimplentes[clienteChave].maiorAtraso = diasAtraso;
        }

        titulosVencidos.push({
          id: c.id,
          cliente_id: c.cliente_id,
          cliente_nome: clienteNome,
          cliente_telefone: c.clientes?.telefone || null,
          cliente_email: c.clientes?.email || null,
          cliente_documento: c.clientes?.cnpj || c.clientes?.cpf || null,
          os_id: c.os_id,
          numero_os: c.ordens_servico?.numero_os || null,
          descricao: c.descricao,
          valorOriginal: valor,
          valorMulta,
          valorJuros,
          valorAtualizado,
          data_vencimento: c.data_vencimento,
          diasAtraso,
          faixaId,
          faixaLabel: (faixas as any)[faixaId].label,
          nivelCobranca: (faixas as any)[faixaId].nivel,
          forma_pagamento: c.forma_pagamento,
          observacoes: c.observacoes,
        });
      }
    }

    // Ordena títulos vencidos pelo maior atraso primeiro
    titulosVencidos.sort((a, b) => b.diasAtraso - a.diasAtraso);

    // Top clientes inadimplentes ordenados por maior valor devido
    const topClientesInadimplentes = Object.values(mapaClientesInadimplentes).sort(
      (a, b) => b.totalVencido - a.totalVencido
    );

    const taxaInadimplencia = totalPendente > 0 ? (totalVencido / totalPendente) * 100 : 0;

    return NextResponse.json({
      resumo: {
        totalPendente,
        totalNoPrazo,
        totalVencido,
        taxaInadimplencia,
        qtdTitulosVencidos: titulosVencidos.length,
        qtdClientesInadimplentes: topClientesInadimplentes.length,
        faixas,
      },
      titulosVencidos,
      topClientesInadimplentes,
      titulosNoPrazoCount: titulosNoPrazo.length,
    });
  } catch (error: any) {
    console.error("Erro na apuração de inadimplência:", error);
    return NextResponse.json(
      { error: "Erro ao apurar indicadores de inadimplência", details: error.message },
      { status: 500 }
    );
  }
}
