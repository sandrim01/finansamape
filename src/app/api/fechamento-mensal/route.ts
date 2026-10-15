// src/app/api/fechamento-mensal/route.ts
import { NextResponse } from "next/server";
import {
  apurarFechamentoMensal,
  gerarHTMLFechamentoMensal,
  dispararEmailsFechamento,
  obterConfiguracaoFechamento,
  salvarConfiguracaoFechamento,
  obterHistoricoFechamentos,
  registrarLogFechamento,
} from "@/lib/fechamentoMensal";

export const dynamic = "force-dynamic";

/**
 * GET: Retorna a configuração, histórico e apuração para visualização
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const hoje = new Date();
    const ano = parseInt(searchParams.get("ano") || String(hoje.getFullYear()));
    const mes = parseInt(searchParams.get("mes") || String(hoje.getMonth() + 1));

    if (tipo === "preview_html") {
      const dados = await apurarFechamentoMensal(ano, mes);
      const html = gerarHTMLFechamentoMensal(dados, "Visualização de Teste");
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const config = await obterConfiguracaoFechamento();
    const historico = await obterHistoricoFechamentos();
    const dadosFechamento = await apurarFechamentoMensal(ano, mes);

    return NextResponse.json({
      sucesso: true,
      config,
      historico,
      dadosFechamento,
    });
  } catch (error: any) {
    console.error("Erro na rota GET /api/fechamento-mensal:", error);
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro ao consultar dados de fechamento." },
      { status: 500 }
    );
  }
}

/**
 * POST: Salva configuração ou dispara o fechamento mensal
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const acao = body.acao || "disparar";

    // 1. Salvar Configurações
    if (acao === "salvar_config") {
      if (!body.config) {
        return NextResponse.json(
          { sucesso: false, erro: "Configuração não informada." },
          { status: 400 }
        );
      }
      const ok = await salvarConfiguracaoFechamento(body.config);
      return NextResponse.json({
        sucesso: ok,
        mensagem: ok ? "Configuração da automação atualizada com sucesso!" : "Falha ao gravar arquivo de configuração.",
      });
    }

    // 2. Disparo Manual ou Agendado
    const config = await obterConfiguracaoFechamento();
    const hoje = new Date();

    // Mês de apuração: se especificado usa o do body, senão usa o mês anterior (fechamento padrão) ou atual
    let ano = body.ano ? parseInt(body.ano) : hoje.getFullYear();
    let mes = body.mes ? parseInt(body.mes) : hoje.getMonth() === 0 ? 12 : hoje.getMonth();
    if (body.mes === undefined && hoje.getMonth() === 0) {
      ano -= 1;
    }

    // Apuração dos dados consolidados
    const dados = await apurarFechamentoMensal(ano, mes);

    // Lista de destinatários a receber
    let destinatarios: Array<{ nome: string; email: string }> = [];

    if (body.destinatarios && Array.isArray(body.destinatarios) && body.destinatarios.length > 0) {
      destinatarios = body.destinatarios;
    } else {
      // Destinatários configurados ativos
      const selecionados = config.destinatarios.filter((d) => d.selecionado);
      destinatarios = selecionados.map((d) => ({ nome: d.nome, email: d.email }));

      // Inclui e-mails adicionais
      if (config.emailsAdicionais && config.emailsAdicionais.length > 0) {
        for (const email of config.emailsAdicionais) {
          if (email && email.includes("@")) {
            destinatarios.push({ nome: "Gestão Samape", email: email.trim() });
          }
        }
      }
    }

    if (destinatarios.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: "Nenhum destinatário válido selecionado para o disparo." },
        { status: 400 }
      );
    }

    const anexarExcel = body.anexarExcel !== undefined ? Boolean(body.anexarExcel) : config.anexarPlanilhaExcel;

    // Executa disparo
    const resultadoEnvio = await dispararEmailsFechamento(dados, destinatarios, anexarExcel);

    // Registra auditoria no banco
    await registrarLogFechamento(dados, resultadoEnvio);

    return NextResponse.json({
      sucesso: true,
      mensagem: resultadoEnvio.modoSimulado
        ? `Balanço apurado com sucesso! (${resultadoEnvio.enviados.length} destinatários auditados em modo de teste).`
        : `Fechamento mensal enviado com sucesso via e-mail para ${resultadoEnvio.enviados.length} destinatários!`,
      resultado: resultadoEnvio,
      dadosFechamento: dados,
    });
  } catch (error: any) {
    console.error("Erro na rota POST /api/fechamento-mensal:", error);
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro ao processar fechamento mensal." },
      { status: 500 }
    );
  }
}
