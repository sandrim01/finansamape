import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularQuilometragem } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filtroAno = searchParams.get("ano"); // "2026", "2025", "ALL"
    const filtroMes = searchParams.get("mes"); // "1" a "12", "ALL"
    const filtroMecanico = searchParams.get("mecanico"); // ID ou "ALL"
    const filtroCliente = searchParams.get("cliente"); // ID ou "ALL"

    // Parâmetros de margem (com padrões técnicos de oficina de pesados)
    const margemMoPct = Number(searchParams.get("margem_mo") || "85"); // Padrão: 85% lucro bruto
    const margemDeslocamentoPct = Number(searchParams.get("margem_km") || "65"); // Padrão: 65% lucro bruto (35% combustível/desgaste)
    const margemPecasPct = Number(searchParams.get("margem_pecas") || "40"); // Padrão: 40% lucro bruto (60% CMV)

    // Fatores de custo direto (1 - margem)
    const fatorCustoMo = (100 - margemMoPct) / 100;
    const fatorCustoKm = (100 - margemDeslocamentoPct) / 100;
    const fatorCustoPecas = (100 - margemPecasPct) / 100;

    // Buscar todas as ordens de serviço com relações
    const ordens = await prisma.ordens_servico.findMany({
      include: {
        clientes: { select: { id: true, nome: true, cidade: true, estado: true } },
        usuarios: { select: { id: true, nome: true, cargo: true } },
        maquinas: { select: { id: true, modelo: true, tipo: true } },
      },
      orderBy: { data_abertura: "desc" },
    });

    // Identificar anos disponíveis
    const anosSet = new Set<string>();
    ordens.forEach((os) => {
      const dataRef = os.data_fechamento || os.data_abertura;
      if (dataRef) {
        anosSet.add(new Date(dataRef).getFullYear().toString());
      }
    });
    const anosDisponiveis = Array.from(anosSet).sort().reverse();
    if (!anosDisponiveis.includes("2026")) anosDisponiveis.unshift("2026");

    // Filtrar ordens
    const ordensFiltradas = ordens.filter((os) => {
      const dataRef = os.data_fechamento || os.data_abertura;
      if (dataRef) {
        const d = new Date(dataRef);
        const anoOS = d.getFullYear().toString();
        const mesOS = (d.getMonth() + 1).toString();
        if (filtroAno && filtroAno !== "ALL" && anoOS !== filtroAno) return false;
        if (filtroMes && filtroMes !== "ALL" && mesOS !== filtroMes) return false;
      }
      if (filtroMecanico && filtroMecanico !== "ALL" && os.mecanico_id?.toString() !== filtroMecanico) {
        return false;
      }
      if (filtroCliente && filtroCliente !== "ALL" && os.cliente_id?.toString() !== filtroCliente) {
        return false;
      }
      return true;
    });

    // Totais consolidados
    let totalMaoObra = 0;
    let totalPecas = 0;
    let totalDeslocamento = 0;
    let totalKmRodados = 0;
    let osComKmZeradoMasDistanciaPercorrida = 0;
    let osComKmCobrado = 0;
    let osComPecas = 0;

    // Mecânicos agregados
    const mecanicosMap: Record<
      string,
      {
        id: number | null;
        nome: string;
        qtdOs: number;
        maoObra: number;
        pecas: number;
        deslocamento: number;
        kmRodados: number;
        total: number;
        custoTotal: number;
        lucroReal: number;
      }
    > = {};

    // Clientes agregados
    const clientesMap: Record<
      string,
      {
        id: number | null;
        nome: string;
        cidade: string;
        qtdOs: number;
        maoObra: number;
        pecas: number;
        deslocamento: number;
        kmRodados: number;
        total: number;
        custoTotal: number;
        lucroReal: number;
      }
    > = {};

    // Evolução Mensal agregada
    const mesesMap: Record<
      string,
      {
        mesChave: string; // "2026-06"
        rotulo: string; // "06/2026"
        maoObra: number;
        pecas: number;
        deslocamento: number;
        totalReceita: number;
        lucroMaoObra: number;
        lucroPecas: number;
        lucroDeslocamento: number;
        totalLucro: number;
        qtdOs: number;
      }
    > = {};

    // Lista processada de cada OS com rentabilidade detalhada
    const listaOsDetalhada = ordensFiltradas.map((os) => {
      const mo = Number(os.valor_mao_obra || 0);
      const pecas = Number(os.valor_pecas || 0);
      const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);
      const kmVal = kmInfo.valorDeslocamento;
      const kmDist = kmInfo.kmRodados;
      const totalOS = Number(os.valor_total || (mo + pecas + kmVal));

      // Custos diretos calculados
      const custoMo = mo * fatorCustoMo;
      const custoPecas = pecas * fatorCustoPecas;
      const custoKm = kmVal > 0 ? kmVal * fatorCustoKm : 0;
      const custoTotalOS = custoMo + custoPecas + custoKm;
      const lucroRealOS = totalOS - custoTotalOS;
      const margemOS = totalOS > 0 ? (lucroRealOS / totalOS) * 100 : 0;

      // Classificação de Rentabilidade
      let rentabilidade: "ALTA" | "MEDIA" | "BAIXA" = "MEDIA";
      if (margemOS >= 70) rentabilidade = "ALTA";
      else if (margemOS < 45) rentabilidade = "BAIXA";

      // Acumuladores globais
      totalMaoObra += mo;
      totalPecas += pecas;
      totalDeslocamento += kmVal;
      totalKmRodados += kmDist;

      if (kmDist > 0 && kmVal === 0) osComKmZeradoMasDistanciaPercorrida++;
      if (kmVal > 0) osComKmCobrado++;
      if (pecas > 0) osComPecas++;

      // Agregação por mecânico
      const mecNome = os.usuarios?.nome || "Não atribuído";
      const mecId = os.usuarios?.id || null;
      if (!mecanicosMap[mecNome]) {
        mecanicosMap[mecNome] = {
          id: mecId,
          nome: mecNome,
          qtdOs: 0,
          maoObra: 0,
          pecas: 0,
          deslocamento: 0,
          kmRodados: 0,
          total: 0,
          custoTotal: 0,
          lucroReal: 0,
        };
      }
      mecanicosMap[mecNome].qtdOs += 1;
      mecanicosMap[mecNome].maoObra += mo;
      mecanicosMap[mecNome].pecas += pecas;
      mecanicosMap[mecNome].deslocamento += kmVal;
      mecanicosMap[mecNome].kmRodados += kmDist;
      mecanicosMap[mecNome].total += totalOS;
      mecanicosMap[mecNome].custoTotal += custoTotalOS;
      mecanicosMap[mecNome].lucroReal += lucroRealOS;

      // Agregação por cliente
      const cliNome = os.clientes?.nome || "Cliente Não Informado";
      const cliId = os.clientes?.id || null;
      const cliCidade = os.clientes?.cidade || "";
      if (!clientesMap[cliNome]) {
        clientesMap[cliNome] = {
          id: cliId,
          nome: cliNome,
          cidade: cliCidade,
          qtdOs: 0,
          maoObra: 0,
          pecas: 0,
          deslocamento: 0,
          kmRodados: 0,
          total: 0,
          custoTotal: 0,
          lucroReal: 0,
        };
      }
      clientesMap[cliNome].qtdOs += 1;
      clientesMap[cliNome].maoObra += mo;
      clientesMap[cliNome].pecas += pecas;
      clientesMap[cliNome].deslocamento += kmVal;
      clientesMap[cliNome].kmRodados += kmDist;
      clientesMap[cliNome].total += totalOS;
      clientesMap[cliNome].custoTotal += custoTotalOS;
      clientesMap[cliNome].lucroReal += lucroRealOS;

      // Agregação mensal
      const dataRef = os.data_fechamento || os.data_abertura;
      if (dataRef) {
        const d = new Date(dataRef);
        const mesChave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const rotulo = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        if (!mesesMap[mesChave]) {
          mesesMap[mesChave] = {
            mesChave,
            rotulo,
            maoObra: 0,
            pecas: 0,
            deslocamento: 0,
            totalReceita: 0,
            lucroMaoObra: 0,
            lucroPecas: 0,
            lucroDeslocamento: 0,
            totalLucro: 0,
            qtdOs: 0,
          };
        }
        mesesMap[mesChave].maoObra += mo;
        mesesMap[mesChave].pecas += pecas;
        mesesMap[mesChave].deslocamento += kmVal;
        mesesMap[mesChave].totalReceita += totalOS;
        mesesMap[mesChave].lucroMaoObra += mo * (margemMoPct / 100);
        mesesMap[mesChave].lucroPecas += pecas * (margemPecasPct / 100);
        mesesMap[mesChave].lucroDeslocamento += kmVal * (margemDeslocamentoPct / 100);
        mesesMap[mesChave].totalLucro += lucroRealOS;
        mesesMap[mesChave].qtdOs += 1;
      }

      return {
        id: os.id,
        numero_os: os.numero_os,
        data: os.data_fechamento || os.data_abertura,
        status: os.status,
        cliente_nome: cliNome,
        mecanico_nome: mecNome,
        maquina: os.maquinas ? `${os.maquinas.tipo} - ${os.maquinas.modelo}` : "Máquina Geral",
        valor_mao_obra: mo,
        valor_pecas: pecas,
        km_rodados: kmDist,
        valor_deslocamento: kmVal,
        valor_total: totalOS,
        custo_total: Number(custoTotalOS.toFixed(2)),
        lucro_real: Number(lucroRealOS.toFixed(2)),
        margem_pct: Number(margemOS.toFixed(1)),
        rentabilidade,
      };
    });

    const receitaBrutaTotal = totalMaoObra + totalPecas + totalDeslocamento;

    // Cálculo das 3 Linhas
    const custoMaoObra = totalMaoObra * fatorCustoMo;
    const lucroMaoObra = totalMaoObra * (margemMoPct / 100);

    const custoDeslocamento = totalDeslocamento * fatorCustoKm;
    const lucroDeslocamento = totalDeslocamento * (margemDeslocamentoPct / 100);

    const custoPecas = totalPecas * fatorCustoPecas;
    const lucroPecas = totalPecas * (margemPecasPct / 100);

    const custoTotalReal = custoMaoObra + custoDeslocamento + custoPecas;
    const lucroTotalReal = lucroMaoObra + lucroDeslocamento + lucroPecas;
    const margemGeralPonderada = receitaBrutaTotal > 0 ? (lucroTotalReal / receitaBrutaTotal) * 100 : 0;

    // Linhas estruturadas
    const linhas = [
      {
        chave: "mao_obra",
        titulo: "Mão de Obra Mecânica",
        descricao: "Serviços especializados, diagnósticos e manutenções pesadas de campo e oficina",
        cor: "#3B82F6", // Blue
        corBg: "bg-blue-500/10",
        corBorder: "border-blue-500/30",
        corTexto: "text-blue-400",
        faturamento: totalMaoObra,
        participacaoReceita: receitaBrutaTotal > 0 ? (totalMaoObra / receitaBrutaTotal) * 100 : 0,
        custoEstimado: custoMaoObra,
        lucroReal: lucroMaoObra,
        margemPct: margemMoPct,
        participacaoLucro: lucroTotalReal > 0 ? (lucroMaoObra / lucroTotalReal) * 100 : 0,
        detalhes: {
          totalOsComMo: ordensFiltradas.filter((o) => Number(o.valor_mao_obra || 0) > 0).length,
          ticketMedioMo:
            ordensFiltradas.length > 0 ? totalMaoObra / ordensFiltradas.length : 0,
        },
      },
      {
        chave: "deslocamento",
        titulo: "Deslocamento & KM",
        descricao: "Cobrança por quilômetro rodado no atendimento em campo (hodômetro saída/retorno)",
        cor: "#F59E0B", // Amber
        corBg: "bg-amber-500/10",
        corBorder: "border-amber-500/30",
        corTexto: "text-amber-400",
        faturamento: totalDeslocamento,
        participacaoReceita: receitaBrutaTotal > 0 ? (totalDeslocamento / receitaBrutaTotal) * 100 : 0,
        custoEstimado: custoDeslocamento,
        lucroReal: lucroDeslocamento,
        margemPct: margemDeslocamentoPct,
        participacaoLucro: lucroTotalReal > 0 ? (lucroDeslocamento / lucroTotalReal) * 100 : 0,
        detalhes: {
          kmTotalRodados: totalKmRodados,
          osComKmCobrado,
          osComKmZeradoMasDistanciaPercorrida,
          taxaMediaPorKm: totalKmRodados > 0 ? totalDeslocamento / totalKmRodados : 0,
        },
      },
      {
        chave: "pecas",
        titulo: "Peças & Componentes",
        descricao: "Peças de reposição, reparos hidráulicos, filtros e componentes aplicados",
        cor: "#A855F7", // Purple
        corBg: "bg-purple-500/10",
        corBorder: "border-purple-500/30",
        corTexto: "text-purple-400",
        faturamento: totalPecas,
        participacaoReceita: receitaBrutaTotal > 0 ? (totalPecas / receitaBrutaTotal) * 100 : 0,
        custoEstimado: custoPecas,
        lucroReal: lucroPecas,
        margemPct: margemPecasPct,
        participacaoLucro: lucroTotalReal > 0 ? (lucroPecas / lucroTotalReal) * 100 : 0,
        detalhes: {
          osComPecas,
          ticketMedioPecas: osComPecas > 0 ? totalPecas / osComPecas : 0,
        },
      },
    ];

    // Array de mecânicos ordenado por lucro
    const mecanicos = Object.values(mecanicosMap)
      .map((m) => ({
        ...m,
        margemPct: m.total > 0 ? (m.lucroReal / m.total) * 100 : 0,
        ticketMedio: m.qtdOs > 0 ? m.total / m.qtdOs : 0,
      }))
      .sort((a, b) => b.lucroReal - a.lucroReal);

    // Array de top clientes por lucro real
    const topClientes = Object.values(clientesMap)
      .map((c) => ({
        ...c,
        margemPct: c.total > 0 ? (c.lucroReal / c.total) * 100 : 0,
        ticketMedio: c.qtdOs > 0 ? c.total / c.qtdOs : 0,
      }))
      .sort((a, b) => b.lucroReal - a.lucroReal);

    // Array histórico de meses ordenado cronologicamente
    const evolucaoMensal = Object.values(mesesMap).sort((a, b) =>
      a.mesChave.localeCompare(b.mesChave)
    );

    // Insights Executivos Automatizados
    const insights = [
      {
        tipo: "motor_principal",
        titulo: "Mão de Obra é o Motor Principal de Lucro",
        descricao: `A Mão de Obra responde por ${linhas[0].participacaoReceita.toFixed(
          1
        )}% da receita e expressivos ${linhas[0].participacaoLucro.toFixed(
          1
        )}% de todo o lucro real da empresa. Focar na valorização da hora técnica tem o maior impacto na rentabilidade líquida.`,
        nivel: "sucesso",
      },
      {
        tipo: "deslocamento_estrategico",
        titulo: "Deslocamento Gera Lucro Real e Cobre a Frota",
        descricao: `Com margem estimada de ${margemDeslocamentoPct}%, o deslocamento gerou R$ ${lucroDeslocamento.toLocaleString(
          "pt-BR",
          { minimumFractionDigits: 2 }
        )} de lucro limpo após cobrir combustível e manutenção dos veículos.`,
        nivel: "info",
      },
    ];

    if (osComKmZeradoMasDistanciaPercorrida > 0) {
      insights.push({
        tipo: "alerta_km",
        titulo: `${osComKmZeradoMasDistanciaPercorrida} Ordens de Serviço com KM não cobrado`,
        descricao: `Foram identificadas ${osComKmZeradoMasDistanciaPercorrida} O.S. que tiveram quilometragem registrada no hodômetro mas o valor do KM foi lançado como R$ 0,00. A cobrança do deslocamento nessas ordens geraria receita líquida imediata.`,
        nivel: "alerta",
      });
    }

    return NextResponse.json({
      resumo: {
        totalOs: ordensFiltradas.length,
        receitaBrutaTotal,
        custoTotalReal,
        lucroTotalReal,
        margemGeralPonderada,
        ticketMedioGeral: ordensFiltradas.length > 0 ? receitaBrutaTotal / ordensFiltradas.length : 0,
      },
      parametrosMargens: {
        margemMoPct,
        margemDeslocamentoPct,
        margemPecasPct,
      },
      linhas,
      mecanicos,
      topClientes: topClientes.slice(0, 10),
      evolucaoMensal,
      ordens: listaOsDetalhada,
      insights,
      filtrosDisponiveis: {
        anos: anosDisponiveis,
      },
    });
  } catch (error: any) {
    console.error("Erro na Análise de Lucro Real:", error);
    return NextResponse.json(
      { error: "Erro ao gerar análise de lucro real", details: error.message },
      { status: 500 }
    );
  }
}
