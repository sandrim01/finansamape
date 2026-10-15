// src/lib/fechamentoMensal.ts
// Automação de Balanço Mensal & Disparo de Relatórios por E-mail
// SAMAPE ÍNDIO MECÂNICA PESADA LTDA

import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { DADOS_EMPRESA, gerarHashAutenticacaoDocumento } from "./empresa";
import { CENTROS_DE_CUSTO, parseCentroCustoECategoria } from "./centrosCusto";
import { calcularQuilometragem, formatCurrency, formatDate } from "./utils";
import { construirWorkbookFinanceiro, gerarBufferExcel, DadosExportacaoFinanceira } from "./exportacaoFinanceira";

export interface DestinatarioFechamento {
  nome: string;
  email: string;
  cargo: string;
  selecionado: boolean;
}

export interface ConfiguracaoAutomacaoFechamento {
  ativa: boolean;
  diaDisparo: number; // ex: 1 = todo dia 1º de cada mês
  horaDisparo: string; // ex: "08:00"
  anexarPlanilhaExcel: boolean;
  destinatarios: DestinatarioFechamento[];
  emailsAdicionais: string[];
}

export interface DadosFechamentoMensal {
  mes: number;
  ano: number;
  periodoLabel: string;
  dataFechamento: string;
  hashAutenticacao: string;
  dre: {
    receitaMaoObra: number;
    receitaPecas: number;
    receitaDeslocamento: number;
    receitaBrutaTotal: number;
    custoPecas: number;
    custoFrota: number;
    custosDiretosTotal: number;
    margemContribuicao: number;
    margemContribuicaoPerc: number;
    despesasOperacionais: Record<string, number>;
    despesasTotais: number;
    lucroLiquido: number;
    margemLiquidaPerc: number;
    pontoEquilibrio: number;
  };
  operacional: {
    totalOrdensServico: number;
    osFechadas: number;
    osEmAberto: number;
    ticketMedio: number;
    kmRodadosFrota: number;
  };
  financeiro: {
    totalRecebidoMes: number;
    totalPagoMes: number;
    saldoOperacionalMes: number;
    titulosInadimplentesTotal: number;
    quantidadeInadimplentes: number;
  };
}

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Apura todos os dados operacionais e financeiros de um mês específico
 */
export async function apurarFechamentoMensal(ano: number, mes: number): Promise<DadosFechamentoMensal> {
  const mesIdx = mes - 1;
  const dataInicioMes = new Date(ano, mesIdx, 1);
  const dataFimMes = new Date(ano, mesIdx + 1, 0, 23, 59, 59, 999);
  const isoInicio = dataInicioMes.toISOString().split("T")[0];
  const isoFim = dataFimMes.toISOString().split("T")[0];

  // 1. Ordens de Serviço do período
  const todasOS = await prisma.ordens_servico.findMany({
    where: {
      data_abertura: {
        gte: dataInicioMes,
        lte: dataFimMes,
      },
    },
    include: {
      clientes: { select: { nome: true } },
    },
  });

  const osFechadas = todasOS.filter(
    (os) => os.status?.toUpperCase() === "FECHADA" || os.status?.toUpperCase() === "CONCLUIDA"
  );
  const osAbertas = todasOS.filter(
    (os) => os.status?.toUpperCase() !== "FECHADA" && os.status?.toUpperCase() !== "CONCLUIDA"
  );

  const receitaMaoObra = osFechadas.reduce((acc, os) => acc + Number(os.valor_mao_obra || 0), 0);
  const receitaPecas = osFechadas.reduce((acc, os) => acc + Number(os.valor_pecas || 0), 0);
  const receitaDeslocamento = osFechadas.reduce((acc, os) => {
    const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);
    return acc + kmInfo.valorDeslocamento;
  }, 0);
  const kmRodadosFrota = osFechadas.reduce((acc, os) => {
    const kmInfo = calcularQuilometragem(os.km_ida, os.km_volta, os.valor_por_km);
    return acc + kmInfo.kmRodados;
  }, 0);

  const receitaBrutaTotal = receitaMaoObra + receitaPecas + receitaDeslocamento;
  const ticketMedio = osFechadas.length > 0 ? receitaBrutaTotal / osFechadas.length : 0;

  const custoPecas = Number((receitaPecas * 0.45).toFixed(2));
  const custoFrota = Number((receitaDeslocamento * 0.35).toFixed(2));
  const custosDiretosTotal = custoPecas + custoFrota;
  const margemContribuicao = receitaBrutaTotal - custosDiretosTotal;
  const margemContribuicaoPerc = receitaBrutaTotal
    ? Number(((margemContribuicao / receitaBrutaTotal) * 100).toFixed(1))
    : 0;

  // 2. Contas a Pagar do Mês por Centro de Custo
  const contasPagar = await prisma.contas_pagar.findMany({
    where: {
      data_vencimento: {
        gte: dataInicioMes,
        lte: dataFimMes,
      },
    },
  });

  const despesasOperacionais: Record<string, number> = {
    OFICINA: 0,
    CAMPO: 0,
    PESSOAL: 0,
    ADMINISTRATIVO: 0,
    TRIBUTARIO: 0,
  };
  let despesasTotais = 0;
  let totalPagoMes = 0;

  for (const cp of contasPagar) {
    const val = Number(cp.valor);
    despesasTotais += val;
    if (cp.status === "PAGO") totalPagoMes += val;

    const parsed = parseCentroCustoECategoria(cp.categoria);
    despesasOperacionais[parsed.centroCustoId] =
      (despesasOperacionais[parsed.centroCustoId] || 0) + val;
  }

  const lucroLiquido = margemContribuicao - despesasTotais;
  const margemLiquidaPerc = receitaBrutaTotal
    ? Number(((lucroLiquido / receitaBrutaTotal) * 100).toFixed(1))
    : 0;

  const margemIndice = receitaBrutaTotal ? margemContribuicao / receitaBrutaTotal : 0.6;
  const pontoEquilibrio =
    margemIndice > 0 ? Number((despesasTotais / margemIndice).toFixed(2)) : despesasTotais;

  // 3. Contas a Receber e Inadimplência
  const contasReceber = await prisma.contas_receber.findMany({
    where: {
      data_vencimento: {
        gte: dataInicioMes,
        lte: dataFimMes,
      },
    },
  });

  let totalRecebidoMes = 0;
  let titulosInadimplentesTotal = 0;
  let quantidadeInadimplentes = 0;
  const hojeIso = new Date().toISOString().split("T")[0];

  for (const cr of contasReceber) {
    const val = Number(cr.valor);
    if (cr.status === "PAGO") {
      totalRecebidoMes += val;
    } else {
      const dtVenc = new Date(cr.data_vencimento).toISOString().split("T")[0];
      if (dtVenc < hojeIso) {
        titulosInadimplentesTotal += val;
        quantidadeInadimplentes++;
      }
    }
  }

  const periodoLabel = `${NOMES_MESES[mesIdx]} de ${ano}`;
  const protocolo = `BAL-MES-${ano}${String(mes).padStart(2, "0")}`;
  const hashAutenticacao = await gerarHashAutenticacaoDocumento({
    protocolo,
    data: isoFim,
    valor: receitaBrutaTotal,
    pagadorOuFavorecido: DADOS_EMPRESA.razaoSocial,
  });

  return {
    mes,
    ano,
    periodoLabel,
    dataFechamento: new Date().toLocaleDateString("pt-BR"),
    hashAutenticacao,
    dre: {
      receitaMaoObra,
      receitaPecas,
      receitaDeslocamento,
      receitaBrutaTotal,
      custoPecas,
      custoFrota,
      custosDiretosTotal,
      margemContribuicao,
      margemContribuicaoPerc,
      despesasOperacionais,
      despesasTotais,
      lucroLiquido,
      margemLiquidaPerc,
      pontoEquilibrio,
    },
    operacional: {
      totalOrdensServico: todasOS.length,
      osFechadas: osFechadas.length,
      osEmAberto: osAbertas.length,
      ticketMedio,
      kmRodadosFrota,
    },
    financeiro: {
      totalRecebidoMes,
      totalPagoMes,
      saldoOperacionalMes: totalRecebidoMes - totalPagoMes,
      titulosInadimplentesTotal,
      quantidadeInadimplentes,
    },
  };
}

/**
 * Gera o template de e-mail HTML executivo responsivo do Fechamento Mensal
 */
export function gerarHTMLFechamentoMensal(
  dados: DadosFechamentoMensal,
  destinatarioNome: string = "Diretoria"
): string {
  const isLucro = dados.dre.lucroLiquido >= 0;
  const statusColor = isLucro ? "#10B981" : "#EF4444";
  const statusText = isLucro ? "SUPERAVITÁRIO (LUCRO LÍQUIDO)" : "DEFICITÁRIO (ATENÇÃO)";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fechamento Mensal SAMAPE</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: #0b1329; color: #ffffff; padding: 28px; text-align: left; border-bottom: 3px solid #e11d48; }
    .title { font-size: 20px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
    .subtitle { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .badge { display: inline-block; background: #1e293b; color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid #334155; }
    .content { padding: 28px; }
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .kpi-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .kpi-value { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
    .kpi-sub { font-size: 11px; font-weight: 700; margin-top: 2px; }
    .table-container { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .table-title { background: #f1f5f9; padding: 10px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
    .row { display: flex; justify-content: space-between; padding: 9px 14px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
    .row-highlight { background: #f8fafc; font-weight: 800; color: #0f172a; }
    .row-total { background: #0b1329; color: #ffffff; font-weight: 900; font-size: 14px; }
    .footer { background: #f8fafc; padding: 20px 28px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
    .hash { font-family: monospace; font-size: 10px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Relatório Oficial de Fechamento Contábil</div>
      <h1 class="title">${DADOS_EMPRESA.nomeFantasia}</h1>
      <p class="subtitle">${DADOS_EMPRESA.razaoSocial} • CNPJ: ${DADOS_EMPRESA.cnpj}</p>
      <p class="subtitle">Período de Apuração: <strong>${dados.periodoLabel.toUpperCase()}</strong></p>
    </div>

    <div class="content">
      <p style="font-size: 13px; line-height: 1.5; margin-top: 0; color: #334155;">
        Olá, <strong>${destinatarioNome}</strong>! Segue o balanço consolidado e fechamento financeiro oficial referente ao exercício de <strong>${dados.periodoLabel}</strong> processado pelo sistema <strong>SAMAPEOP</strong>.
      </p>

      <!-- QUADRO DE KPIS -->
      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-label">Receita Operacional Bruta</div>
          <div class="kpi-value">${formatCurrency(dados.dre.receitaBrutaTotal)}</div>
          <div class="kpi-sub" style="color: #0284c7;">${dados.operacional.osFechadas} OS Concluídas</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-label">Margem de Contribuição</div>
          <div class="kpi-value">${formatCurrency(dados.dre.margemContribuicao)}</div>
          <div class="kpi-sub" style="color: #059669;">${dados.dre.margemContribuicaoPerc}% do Faturamento</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-label">Despesas Operacionais Fixas</div>
          <div class="kpi-value" style="color: #dc2626;">${formatCurrency(dados.dre.despesasTotais)}</div>
          <div class="kpi-sub" style="color: #64748b;">5 Centros de Custo</div>
        </div>

        <div class="kpi-box" style="border-left: 4px solid ${statusColor};">
          <div class="kpi-label">Lucro Operacional Líquido</div>
          <div class="kpi-value" style="color: ${statusColor};">${formatCurrency(dados.dre.lucroLiquido)}</div>
          <div class="kpi-sub" style="color: ${statusColor};">Margem Líquida: ${dados.dre.margemLiquidaPerc}%</div>
        </div>
      </div>

      <!-- TABELA DRE RESUMIDO -->
      <div class="table-container">
        <div class="table-title">DRE Gerencial Sintético do Mês</div>
        <div class="row">
          <span>(+) Faturamento Mão de Obra</span>
          <strong>${formatCurrency(dados.dre.receitaMaoObra)}</strong>
        </div>
        <div class="row">
          <span>(+) Venda de Peças e Insumos</span>
          <strong>${formatCurrency(dados.dre.receitaPecas)}</strong>
        </div>
        <div class="row">
          <span>(+) Deslocamento Técnico e Socorro</span>
          <strong>${formatCurrency(dados.dre.receitaDeslocamento)}</strong>
        </div>
        <div class="row row-highlight">
          <span>(=) Receita Bruta Total</span>
          <span>${formatCurrency(dados.dre.receitaBrutaTotal)}</span>
        </div>
        <div class="row">
          <span>(-) Custos Diretos Técnicos (CMV + Frota)</span>
          <span style="color: #dc2626;">-${formatCurrency(dados.dre.custosDiretosTotal)}</span>
        </div>
        <div class="row row-highlight" style="background: #e0f2fe; color: #0369a1;">
          <span>(=) Margem de Contribuição Bruta</span>
          <span>${formatCurrency(dados.dre.margemContribuicao)} (${dados.dre.margemContribuicaoPerc}%)</span>
        </div>
        <div class="row">
          <span>(-) Despesas dos Centros de Custo</span>
          <span style="color: #dc2626;">-${formatCurrency(dados.dre.despesasTotais)}</span>
        </div>
        <div class="row row-total">
          <span>(=) RESULTADO LÍQUIDO FINAL</span>
          <span style="color: #34d399;">${formatCurrency(dados.dre.lucroLiquido)}</span>
        </div>
      </div>

      <!-- DESPESAS POR CENTRO DE CUSTO -->
      <div class="table-container">
        <div class="table-title">Despesas por Centro de Custo</div>
        ${CENTROS_DE_CUSTO.map((cc) => {
          const val = dados.dre.despesasOperacionais[cc.id] || 0;
          const perc = dados.dre.despesasTotais ? ((val / dados.dre.despesasTotais) * 100).toFixed(1) : "0.0";
          return `
          <div class="row">
            <span>${cc.codigo} - ${cc.nome}</span>
            <span><strong>${formatCurrency(val)}</strong> (${perc}%)</span>
          </div>`;
        }).join("")}
      </div>

      <!-- INDICADORES ESTRATÉGICOS -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 24px; font-size: 12px;">
        <div style="font-weight: 800; color: #0f172a; margin-bottom: 6px;">💡 Indicadores de Eficiência:</div>
        <div>• <strong>Ponto de Equilíbrio Operacional:</strong> ${formatCurrency(dados.dre.pontoEquilibrio)}</div>
        <div>• <strong>Ticket Médio por OS Concluída:</strong> ${formatCurrency(dados.operacional.ticketMedio)}</div>
        <div>• <strong>Quilometragem Total Rodada Frota:</strong> ${dados.operacional.kmRodadosFrota.toFixed(0)} km</div>
        <div>• <strong>Inadimplência do Mês:</strong> ${dados.financeiro.quantidadeInadimplentes} títulos pendentes (${formatCurrency(dados.financeiro.titulosInadimplentesTotal)})</div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <span style="display: inline-block; padding: 8px 16px; background: #0b1329; color: #ffffff; font-size: 11px; font-weight: 800; border-radius: 8px;">
          SITUAÇÃO: ${statusText}
        </span>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>${DADOS_EMPRESA.razaoSocial}</strong> • ${DADOS_EMPRESA.nomeFantasia}</p>
      <p style="margin: 0 0 6px 0;">${DADOS_EMPRESA.enderecoCompleto} • Tel: ${DADOS_EMPRESA.telefone}</p>
      <p style="margin: 0;">Autenticação SHA-256: <span class="hash">${dados.hashAutenticacao}</span></p>
      <p style="font-size: 10px; color: #94a3b8; margin-top: 10px;">
        Este e-mail é emitido de forma automatizada pelo sistema SAMAPEOP Financeiro.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispara os e-mails do fechamento mensal para os destinatários selecionados
 */
export async function dispararEmailsFechamento(
  dados: DadosFechamentoMensal,
  destinatarios: Array<{ nome: string; email: string }>,
  anexarExcel: boolean = true
): Promise<{
  enviados: string[];
  falhas: Array<{ email: string; erro: string }>;
  modoSimulado: boolean;
}> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `SAMAPE Financeiro <${DADOS_EMPRESA.chavePix}>`;

  const enviados: string[] = [];
  const falhas: Array<{ email: string; erro: string }> = [];

  // Se não houver configuração de SMTP no ambiente, registrar envio em modo de simulação auditável
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("[Fechamento Mensal] SMTP não configurado no .env. Executando envio em modo simulado/auditável.");
    for (const d of destinatarios) {
      enviados.push(d.email);
    }
    return {
      enviados,
      falhas: [],
      modoSimulado: true,
    };
  }

  // Transporter oficial Nodemailer
  const cleanPass = smtpPass ? smtpPass.replace(/\s+/g, "") : "";
  const isGmail = Boolean(smtpHost && smtpHost.includes("gmail"));

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: isGmail ? 465 : smtpPort,
    secure: isGmail ? true : smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: cleanPass,
    },
  });

  // Anexo Excel opcional
  let attachments: any[] = [];
  if (anexarExcel) {
    try {
      const dadosExport: DadosExportacaoFinanceira = {
        periodoLabel: dados.periodoLabel,
        dre: dados.dre,
        contasReceber: [],
        contasPagar: [],
        fluxoCaixaProjetado: [],
        inadimplencia: [],
      };
      const wb = construirWorkbookFinanceiro(dadosExport);
      const buffer = gerarBufferExcel(wb);

      attachments.push({
        filename: `SAMAPE_Fechamento_${dados.ano}_${String(dados.mes).padStart(2, "0")}.xlsx`,
        content: buffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } catch (e) {
      console.error("Erro ao gerar anexo Excel:", e);
    }
  }

  // Disparo para cada destinatário
  for (const d of destinatarios) {
    try {
      const htmlContent = gerarHTMLFechamentoMensal(dados, d.nome);
      await transporter.sendMail({
        from: smtpFrom,
        to: d.email,
        subject: `📊 Balanço & Fechamento Mensal (${dados.periodoLabel}) - SAMAPE ÍNDIO`,
        html: htmlContent,
        attachments,
      });
      enviados.push(d.email);
    } catch (err: any) {
      console.error(`Falha ao enviar e-mail para ${d.email}:`, err);
      falhas.push({ email: d.email, erro: err.message || "Erro de envio SMTP" });
    }
  }

  return {
    enviados,
    falhas,
    modoSimulado: false,
  };
}

/**
 * Caminho do arquivo de configuração persistente
 */
const CONFIG_FILE_PATH = "./src/data/configFechamento.json";

/**
 * Obtém a configuração salva ou inicializa com os usuários reais cadastrados no banco
 */
export async function obterConfiguracaoFechamento(): Promise<ConfiguracaoAutomacaoFechamento> {
  const fs = await import("fs/promises");
  const path = await import("path");

  // Destinatários padrão da equipe SAMAPE
  let destinatariosPadrao: DestinatarioFechamento[] = [
    {
      nome: "Alessandro de Andrade",
      email: "samar.maquinas@gmail.com",
      cargo: "Proprietário / Sócio",
      selecionado: true,
    },
    {
      nome: "Samuel Soares ferreira de Andrade",
      email: "samuel@samapeop.com",
      cargo: "Financeiro / Administrativo",
      selecionado: true,
    },
    {
      nome: "Alessandro de Andrade Junior",
      email: "aless0791naval@gmail.com",
      cargo: "Gerência Operacional",
      selecionado: true,
    },
  ];

  // Tenta carregar usuários ativos do banco para enriquecer a lista
  try {
    const usuariosDb = await prisma.usuarios.findMany({
      where: { ativo: true },
      select: { nome: true, email: true, cargo: true },
    });

    if (usuariosDb && usuariosDb.length > 0) {
      destinatariosPadrao = usuariosDb.map((u) => ({
        nome: u.nome,
        email: u.email,
        cargo: u.cargo || "Equipe",
        selecionado: true,
      }));
    }
  } catch (e) {
    // Mantém o fallback padrão
  }

  const configPadrao: ConfiguracaoAutomacaoFechamento = {
    ativa: true,
    diaDisparo: 1, // Todo dia 1º de cada mês
    horaDisparo: "08:00",
    anexarPlanilhaExcel: true,
    destinatarios: destinatariosPadrao,
    emailsAdicionais: [],
  };

  try {
    const filePath = path.resolve(process.cwd(), CONFIG_FILE_PATH);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    return {
      ...configPadrao,
      ...parsed,
    };
  } catch (e) {
    return configPadrao;
  }
}

/**
 * Salva a configuração atualizada
 */
export async function salvarConfiguracaoFechamento(
  novaConfig: ConfiguracaoAutomacaoFechamento
): Promise<boolean> {
  const fs = await import("fs/promises");
  const path = await import("path");

  try {
    const filePath = path.resolve(process.cwd(), CONFIG_FILE_PATH);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(novaConfig, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Erro ao salvar configuração do fechamento:", e);
    return false;
  }
}

/**
 * Registra o disparo no histórico do banco (system_logs)
 */
export async function registrarLogFechamento(
  dados: DadosFechamentoMensal,
  resultado: { enviados: string[]; falhas: Array<{ email: string; erro: string }>; modoSimulado: boolean }
) {
  try {
    await prisma.system_logs.create({
      data: {
        usuario_nome: "Automação Fechamento Mensal",
        acao: "FECHAMENTO_MENSAL_DISPARO",
        detalhes: JSON.stringify({
          periodoLabel: dados.periodoLabel,
          ano: dados.ano,
          mes: dados.mes,
          receitaBruta: dados.dre.receitaBrutaTotal,
          lucroLiquido: dados.dre.lucroLiquido,
          hashAutenticacao: dados.hashAutenticacao,
          enviados: resultado.enviados,
          falhas: resultado.falhas,
          modoSimulado: resultado.modoSimulado,
          totalEnviados: resultado.enviados.length,
          dataHora: new Date().toISOString(),
        }),
        ip: "127.0.0.1",
      },
    });
  } catch (e) {
    console.error("Erro ao registrar log de fechamento:", e);
  }
}

/**
 * Obtém os últimos disparos realizados
 */
export async function obterHistoricoFechamentos() {
  try {
    const logs = await prisma.system_logs.findMany({
      where: { acao: "FECHAMENTO_MENSAL_DISPARO" },
      orderBy: { created_at: "desc" },
      take: 20,
    });

    return logs.map((log) => {
      let detalhesObj: any = {};
      try {
        detalhesObj = log.detalhes ? JSON.parse(log.detalhes) : {};
      } catch (e) {
        detalhesObj = { raw: log.detalhes };
      }

      return {
        id: log.id,
        data: log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "N/D",
        periodoLabel: detalhesObj.periodoLabel || "Período N/D",
        receitaBruta: detalhesObj.receitaBruta || 0,
        lucroLiquido: detalhesObj.lucroLiquido || 0,
        hashAutenticacao: detalhesObj.hashAutenticacao || "",
        enviados: detalhesObj.enviados || [],
        falhas: detalhesObj.falhas || [],
        modoSimulado: detalhesObj.modoSimulado ?? false,
      };
    });
  } catch (e) {
    console.error("Erro ao buscar histórico de fechamentos:", e);
    return [];
  }
}
