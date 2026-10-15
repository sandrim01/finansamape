// src/lib/cobrancaAutomatica.ts
// Módulo de Automação de Cobrança & Notificação Financeira
// SAMAPE ÍNDIO MECÂNICA PESADA LTDA

import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { DADOS_EMPRESA, gerarHashAutenticacaoDocumento } from "./empresa";
import { formatCurrency, formatDate } from "./utils";

export interface ReguaCobranca {
  lembreteAntesVencimento: boolean; // D-2 (Lembrete prévio)
  avisoVencimentoHoje: boolean; // D-0 (Vence hoje)
  cobrancaVencidoD3: boolean; // D+3 (Atraso recente)
  cobrancaVencidoD7: boolean; // D+7 (Cobrança amigável)
  cobrancaVencidoD15: boolean; // D+15 (Aviso de suspensão de crédito)
  cobrancaVencidoD30: boolean; // D+30 (Notificação extrajudicial)
}

export interface DadosFinanceiroRemetente {
  nomeRemetente: string;
  emailRemetente: string;
  emailResposta: string;
  telefoneContato: string;
  chavePix: string;
  favorecidoPix: string;
}

export interface TemplatesEmailCobranca {
  assuntoPadrao: string;
  mensagemAbertura: string;
  mensagemCorpo: string;
  mensagemEncerramento: string;
}

export interface ConfiguracaoCobrancaAutomatica {
  ativa: boolean; // BOTÃO LIGA / DESLIGA DA COBRANÇA
  horaDisparo: string; // Ex: "09:00"
  diasSemana: number[]; // [1, 2, 3, 4, 5] (Seg a Sex)
  enviarCopiaFinanceiro: boolean;
  regua: ReguaCobranca;
  dadosFinanceiro: DadosFinanceiroRemetente;
  templates: TemplatesEmailCobranca;
}

export interface TituloCobrancaItem {
  id: number;
  descricao: string;
  numeroOS?: string | null;
  valor: number;
  dataVencimento: string;
  diasAtraso: number;
  statusFaixa: string; // "VENCENDO_HOJE" | "VENCIDO" | "A_VENCER"
}

export interface ClienteCobrancaPendente {
  clienteId: number;
  clienteNome: string;
  clienteEmail: string | null;
  clienteTelefone: string | null;
  clienteCnpjCpf: string | null;
  totalPendente: number;
  maiorAtrasoDias: number;
  titulos: TituloCobrancaItem[];
}

const CONFIG_COBRANCA_PATH = "./src/data/configCobranca.json";

export const CONFIG_COBRANCA_PADRAO: ConfiguracaoCobrancaAutomatica = {
  ativa: true, // LIGADO por padrão
  horaDisparo: "09:00",
  diasSemana: [1, 2, 3, 4, 5],
  enviarCopiaFinanceiro: true,
  regua: {
    lembreteAntesVencimento: true,
    avisoVencimentoHoje: true,
    cobrancaVencidoD3: true,
    cobrancaVencidoD7: true,
    cobrancaVencidoD15: true,
    cobrancaVencidoD30: true,
  },
  dadosFinanceiro: {
    nomeRemetente: `Financeiro - ${DADOS_EMPRESA.nomeFantasia}`,
    emailRemetente: "samapeindio.financeiro@gmail.com",
    emailResposta: "samapeindio.financeiro@gmail.com",
    telefoneContato: DADOS_EMPRESA.telefone,
    chavePix: DADOS_EMPRESA.chavePix,
    favorecidoPix: DADOS_EMPRESA.razaoSocial,
  },
  templates: {
    assuntoPadrao: `Aviso Financeiro de Regularização - ${DADOS_EMPRESA.nomeFantasia}`,
    mensagemAbertura: "Prezado(a) {cliente_nome}, esperamos que este comunicado o encontre bem.",
    mensagemCorpo:
      "Identificamos em nosso sistema financeiro a existência de título(s) pendente(s) de regularização referente(s) aos serviços e manutenções mecânicas prestadas pela SAMAPE ÍNDIO MECÂNICA PESADA. Solicitamos a gentileza de verificar os detalhes abaixo para quitação:",
    mensagemEncerramento:
      "Caso o pagamento já tenha sido realizado nas últimas horas, por favor desconsidere este aviso ou nos encaminhe o comprovante em resposta a este e-mail. Para maiores dúvidas ou propostas de negociação, entre em contato diretamente com nossa equipe financeira.",
  },
};

/**
 * Obtém as configurações da automação de cobrança (com persistência em JSON)
 */
export async function obterConfiguracaoCobranca(): Promise<ConfiguracaoCobrancaAutomatica> {
  const fs = await import("fs/promises");
  const path = await import("path");

  try {
    const filePath = path.resolve(process.cwd(), CONFIG_COBRANCA_PATH);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    return {
      ...CONFIG_COBRANCA_PADRAO,
      ...parsed,
      regua: { ...CONFIG_COBRANCA_PADRAO.regua, ...(parsed.regua || {}) },
      dadosFinanceiro: { ...CONFIG_COBRANCA_PADRAO.dadosFinanceiro, ...(parsed.dadosFinanceiro || {}) },
      templates: { ...CONFIG_COBRANCA_PADRAO.templates, ...(parsed.templates || {}) },
    };
  } catch (e) {
    return CONFIG_COBRANCA_PADRAO;
  }
}

/**
 * Salva as configurações de cobrança
 */
export async function salvarConfiguracaoCobranca(
  novaConfig: ConfiguracaoCobrancaAutomatica
): Promise<boolean> {
  const fs = await import("fs/promises");
  const path = await import("path");

  try {
    const filePath = path.resolve(process.cwd(), CONFIG_COBRANCA_PATH);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(novaConfig, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Erro ao salvar configuração de cobrança:", e);
    return false;
  }
}

/**
 * Liga ou desliga a automação de cobrança com 1 clique
 */
export async function alternarStatusCobranca(ativa: boolean): Promise<ConfiguracaoCobrancaAutomatica> {
  const config = await obterConfiguracaoCobranca();
  config.ativa = ativa;
  await salvarConfiguracaoCobranca(config);
  return config;
}

/**
 * Busca todos os clientes com títulos pendentes no banco e agrupa por cliente
 */
export async function buscarClientesParaCobranca(): Promise<ClienteCobrancaPendente[]> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Busca todas as contas a receber pendentes
  const contas = await prisma.contas_receber.findMany({
    where: {
      status: "PENDENTE",
    },
    include: {
      clientes: true,
      ordens_servico: {
        select: { numero_os: true },
      },
    },
    orderBy: {
      data_vencimento: "asc",
    },
  });

  const agrupadoPorCliente: Record<number, ClienteCobrancaPendente> = {};

  for (const c of contas) {
    const clienteId = c.cliente_id || 0;
    const clienteNome = c.clientes?.nome || "Cliente Avulso";
    const clienteEmail = c.clientes?.email || null;
    const clienteTelefone = c.clientes?.telefone || null;
    const clienteCnpjCpf = c.clientes?.cnpj || c.clientes?.cpf || null;

    const dataVenc = new Date(c.data_vencimento);
    dataVenc.setHours(0, 0, 0, 0);

    const diffMs = hoje.getTime() - dataVenc.getTime();
    const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let statusFaixa = "A_VENCER";
    if (diasAtraso === 0) {
      statusFaixa = "VENCENDO_HOJE";
    } else if (diasAtraso > 0) {
      statusFaixa = "VENCIDO";
    }

    const itemTitulo: TituloCobrancaItem = {
      id: c.id,
      descricao: c.descricao,
      numeroOS: c.ordens_servico?.numero_os || null,
      valor: Number(c.valor),
      dataVencimento: c.data_vencimento.toISOString().split("T")[0],
      diasAtraso: Math.max(0, diasAtraso),
      statusFaixa,
    };

    if (!agrupadoPorCliente[clienteId]) {
      agrupadoPorCliente[clienteId] = {
        clienteId,
        clienteNome,
        clienteEmail,
        clienteTelefone,
        clienteCnpjCpf,
        totalPendente: 0,
        maiorAtrasoDias: 0,
        titulos: [],
      };
    }

    agrupadoPorCliente[clienteId].titulos.push(itemTitulo);
    agrupadoPorCliente[clienteId].totalPendente += Number(c.valor);
    if (diasAtraso > agrupadoPorCliente[clienteId].maiorAtrasoDias) {
      agrupadoPorCliente[clienteId].maiorAtrasoDias = diasAtraso;
    }
  }

  return Object.values(agrupadoPorCliente).sort((a, b) => b.totalPendente - a.totalPendente);
}

/**
 * Gera o template HTML do e-mail de cobrança personalizado da SAMAPE
 */
export async function gerarHTMLEmailCobranca(
  cliente: {
    nome: string;
    cnpjCpf?: string | null;
    email?: string | null;
  },
  titulos: TituloCobrancaItem[],
  config: ConfiguracaoCobrancaAutomatica
): Promise<{ html: string; assunto: string; hashAutenticacao: string }> {
  const total = titulos.reduce((acc, t) => acc + t.valor, 0);
  const maiorAtraso = titulos.reduce((acc, t) => Math.max(acc, t.diasAtraso), 0);
  const temVencidos = titulos.some((t) => t.diasAtraso > 0);

  // Substituição de variáveis no texto
  const substituirVariaveis = (texto: string) => {
    return texto
      .replace(/{cliente_nome}/g, cliente.nome)
      .replace(/{valor_total}/g, formatCurrency(total))
      .replace(/{dias_atraso}/g, String(maiorAtraso))
      .replace(/{chave_pix}/g, config.dadosFinanceiro.chavePix)
      .replace(/{telefone}/g, config.dadosFinanceiro.telefoneContato)
      .replace(/{empresa_nome}/g, DADOS_EMPRESA.nomeFantasia);
  };

  const mensagemAberturaFormatada = substituirVariaveis(config.templates.mensagemAbertura);
  const mensagemCorpoFormatada = substituirVariaveis(config.templates.mensagemCorpo);
  const mensagemEncerramentoFormatada = substituirVariaveis(config.templates.mensagemEncerramento);
  const assunto = substituirVariaveis(config.templates.assuntoPadrao);

  const dataIso = new Date().toISOString().split("T")[0];
  const protocolo = `COB-${cliente.nome.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  const hashAutenticacao = await gerarHashAutenticacaoDocumento({
    protocolo,
    data: dataIso,
    valor: total,
    pagadorOuFavorecido: cliente.nome,
  });

  const corBadge = temVencidos ? "#E11D48" : "#0284C7";
  const statusGeralTexto = temVencidos ? "AVISO DE VENCIMENTO / REGULARIZAÇÃO" : "LEMBRETE DE PAGAMENTO";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${assunto}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: #0b1329; color: #ffffff; padding: 26px 28px; border-bottom: 4px solid #e11d48; text-align: left; }
    .badge { display: inline-block; background: #1e293b; color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 10px; border: 1px solid #334155; }
    .title { font-size: 20px; font-weight: 900; margin: 0; }
    .subtitle { font-size: 12px; color: #94a3b8; margin: 4px 0 0 0; }
    .content { padding: 28px; line-height: 1.6; font-size: 13px; color: #334155; }
    .greeting { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .paragraph { margin-bottom: 16px; }
    .table-container { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 20px 0; }
    .table-header { background: #f8fafc; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    .row:last-child { border-bottom: none; }
    .row-total { background: #0b1329; color: #ffffff; font-weight: 900; font-size: 14px; padding: 12px 14px; }
    .pix-box { background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: center; }
    .pix-title { font-size: 12px; font-weight: 800; color: #15803d; text-transform: uppercase; margin-bottom: 4px; }
    .pix-key { font-family: monospace; font-size: 15px; font-weight: 900; background: #ffffff; border: 1px solid #bbf7d0; padding: 8px 14px; border-radius: 8px; color: #0f172a; display: inline-block; margin: 6px 0; }
    .pix-beneficiary { font-size: 11px; color: #166534; font-weight: 600; }
    .footer { background: #f8fafc; padding: 20px 28px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; line-height: 1.5; }
    .hash { font-family: monospace; font-size: 10px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge" style="border-color: ${corBadge}; color: #38bdf8;">${statusGeralTexto}</div>
      <h1 class="title">${DADOS_EMPRESA.nomeFantasia}</h1>
      <p class="subtitle">${DADOS_EMPRESA.razaoSocial} • CNPJ: ${DADOS_EMPRESA.cnpj}</p>
      <p class="subtitle">Departamento Financeiro & Cobrança • Tel: ${config.dadosFinanceiro.telefoneContato}</p>
    </div>

    <div class="content">
      <div class="greeting">${mensagemAberturaFormatada}</div>
      <div class="paragraph">${mensagemCorpoFormatada}</div>

      <!-- TABELA DE TÍTULOS PENDENTES -->
      <div class="table-container">
        <div class="table-header">Demonstrativo de Título(s) Pendente(s)</div>
        ${titulos
          .map((t) => {
            const statusLabel =
              t.diasAtraso === 0
                ? "Vence Hoje"
                : t.diasAtraso > 0
                ? `${t.diasAtraso} dia(s) em atraso`
                : "A vencer";
            const corStatus = t.diasAtraso > 0 ? "#dc2626" : "#0284c7";

            return `
          <div class="row">
            <div>
              <div style="font-weight: 700; color: #0f172a;">${t.descricao}</div>
              <div style="font-size: 11px; color: #64748b;">
                Vencimento: <strong>${formatDate(t.dataVencimento)}</strong> • 
                <span style="color: ${corStatus}; font-weight: 700;">${statusLabel}</span>
                ${t.numeroOS ? ` • OS #${t.numeroOS}` : ""}
              </div>
            </div>
            <div style="font-weight: 800; font-size: 13px; color: #0f172a;">
              ${formatCurrency(t.valor)}
            </div>
          </div>
          `;
          })
          .join("")}
        <div class="row row-total">
          <span>VALOR TOTAL CONSOLIDADO</span>
          <span style="color: #4ade80;">${formatCurrency(total)}</span>
        </div>
      </div>

      <!-- QUADRO PIX PARA PAGAMENTO IMEDIATO -->
      <div class="pix-box">
        <div class="pix-title">Chave PIX Oficial para Quitação</div>
        <div class="pix-key">${config.dadosFinanceiro.chavePix}</div>
        <div class="pix-beneficiary">
          Favorecido: <strong>${config.dadosFinanceiro.favorecidoPix}</strong> (CNPJ: ${DADOS_EMPRESA.cnpj})
        </div>
        <div style="font-size: 11px; color: #166534; margin-top: 6px;">
          Após efetuar a transferência, envie o comprovante respondendo a este e-mail ou via WhatsApp: <strong>${config.dadosFinanceiro.telefoneContato}</strong>
        </div>
      </div>

      <div class="paragraph" style="font-size: 12px; color: #64748b;">
        ${mensagemEncerramentoFormatada}
      </div>

      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #475569;">
        Atenciosamente,<br>
        <strong>${config.dadosFinanceiro.nomeRemetente}</strong><br>
        ${DADOS_EMPRESA.razaoSocial}<br>
        Contato direto: ${config.dadosFinanceiro.telefoneContato} | ${config.dadosFinanceiro.emailResposta}
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0;"><strong>${DADOS_EMPRESA.razaoSocial}</strong> • ${DADOS_EMPRESA.enderecoCompleto}</p>
      <p style="margin: 0;">Autenticação Digital SHA-256: <span class="hash">${hashAutenticacao}</span></p>
      <p style="font-size: 10px; color: #94a3b8; margin-top: 8px;">
        Este e-mail é gerado automaticamente pelo Sistema de Cobrança e Gestão Financeira SAMAPEOP.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    html,
    assunto,
    hashAutenticacao,
  };
}

/**
 * Dispara e-mail de cobrança para um cliente específico
 */
export async function dispararCobrancaParaCliente(
  clienteId: number,
  config?: ConfiguracaoCobrancaAutomatica
): Promise<{
  sucesso: boolean;
  mensagem: string;
  emailEnviado: string | null;
  modoSimulado: boolean;
  totalCobrado: number;
  hashAutenticacao: string;
}> {
  const cfg = config || (await obterConfiguracaoCobranca());

  // Busca cliente no banco
  const cliente = await prisma.clientes.findUnique({
    where: { id: clienteId },
  });

  if (!cliente) {
    throw new Error(`Cliente ID ${clienteId} não encontrado no sistema.`);
  }

  if (!cliente.email || !cliente.email.includes("@")) {
    throw new Error(`O cliente ${cliente.nome} não possui um endereço de e-mail válido cadastrado.`);
  }

  // Busca contas a receber pendentes desse cliente
  const contas = await prisma.contas_receber.findMany({
    where: {
      cliente_id: clienteId,
      status: "PENDENTE",
    },
    include: {
      ordens_servico: { select: { numero_os: true } },
    },
    orderBy: {
      data_vencimento: "asc",
    },
  });

  if (contas.length === 0) {
    throw new Error(`O cliente ${cliente.nome} não possui títulos pendentes de cobrança no momento.`);
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const titulos: TituloCobrancaItem[] = contas.map((c) => {
    const dataVenc = new Date(c.data_vencimento);
    dataVenc.setHours(0, 0, 0, 0);
    const diffMs = hoje.getTime() - dataVenc.getTime();
    const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      id: c.id,
      descricao: c.descricao,
      numeroOS: c.ordens_servico?.numero_os || null,
      valor: Number(c.valor),
      dataVencimento: c.data_vencimento.toISOString().split("T")[0],
      diasAtraso: Math.max(0, diasAtraso),
      statusFaixa: diasAtraso > 0 ? "VENCIDO" : diasAtraso === 0 ? "VENCENDO_HOJE" : "A_VENCER",
    };
  });

  const totalCobrado = titulos.reduce((acc, t) => acc + t.valor, 0);
  const { html, assunto, hashAutenticacao } = await gerarHTMLEmailCobranca(cliente, titulos, cfg);

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const cleanPass = smtpPass ? smtpPass.replace(/\s+/g, "") : "";
  const isGmail = Boolean(smtpHost && smtpHost.includes("gmail"));
  const smtpFrom = process.env.SMTP_FROM || `${cfg.dadosFinanceiro.nomeRemetente} <${cfg.dadosFinanceiro.emailRemetente || "samapeindio.financeiro@gmail.com"}>`;

  let modoSimulado = true;

  if (smtpHost && smtpUser && smtpPass) {
    modoSimulado = false;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: isGmail ? 465 : smtpPort,
      secure: isGmail ? true : smtpPort === 465,
      auth: { user: smtpUser, pass: cleanPass },
    });

    const ccList: string[] = [];
    if (cfg.enviarCopiaFinanceiro && cfg.dadosFinanceiro.emailResposta) {
      ccList.push(cfg.dadosFinanceiro.emailResposta);
    }

    await transporter.sendMail({
      from: smtpFrom,
      to: cliente.email,
      cc: ccList.length > 0 ? ccList : undefined,
      subject: assunto,
      html,
    });
  } else {
    console.log(
      `[Cobrança Automática] SMTP não configurado. Disparo auditado para ${cliente.nome} (${cliente.email}). Total: ${totalCobrado}`
    );
  }

  // Registra auditoria no banco em system_logs
  try {
    await prisma.system_logs.create({
      data: {
        usuario_nome: "Automação de Cobrança",
        acao: "COBRANCA_DISPARO",
        detalhes: JSON.stringify({
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          clienteEmail: cliente.email,
          totalCobrado,
          titulosCount: titulos.length,
          hashAutenticacao,
          modoSimulado,
          assunto,
          dataHora: new Date().toISOString(),
        }),
        ip: "127.0.0.1",
      },
    });
  } catch (err) {
    console.error("Erro ao registrar log de cobrança:", err);
  }

  return {
    sucesso: true,
    mensagem: modoSimulado
      ? `Notificação para ${cliente.nome} gerada com sucesso! (Modo de teste/auditado registrado no sistema).`
      : `E-mail de cobrança enviado com sucesso para ${cliente.email}!`,
    emailEnviado: cliente.email,
    modoSimulado,
    totalCobrado,
    hashAutenticacao,
  };
}

/**
 * Obtém o histórico de cobranças disparadas
 */
export async function obterHistoricoCobrancas() {
  try {
    const logs = await prisma.system_logs.findMany({
      where: { acao: "COBRANCA_DISPARO" },
      orderBy: { created_at: "desc" },
      take: 30,
    });

    return logs.map((log) => {
      let detalhes: any = {};
      try {
        detalhes = log.detalhes ? JSON.parse(log.detalhes) : {};
      } catch (e) {
        detalhes = { raw: log.detalhes };
      }

      return {
        id: log.id,
        data: log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "N/D",
        clienteNome: detalhes.clienteNome || "Cliente N/D",
        clienteEmail: detalhes.clienteEmail || "-",
        totalCobrado: detalhes.totalCobrado || 0,
        titulosCount: detalhes.titulosCount || 0,
        hashAutenticacao: detalhes.hashAutenticacao || "",
        modoSimulado: detalhes.modoSimulado ?? false,
      };
    });
  } catch (err) {
    console.error("Erro ao obter histórico de cobranças:", err);
    return [];
  }
}
