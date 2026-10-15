// src/app/api/cobranca-automatica/route.ts
import { NextResponse } from "next/server";
import {
  obterConfiguracaoCobranca,
  salvarConfiguracaoCobranca,
  alternarStatusCobranca,
  buscarClientesParaCobranca,
  dispararCobrancaParaCliente,
  obterHistoricoCobrancas,
  gerarHTMLEmailCobranca,
} from "@/lib/cobrancaAutomatica";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: Retorna status da automação, lista de clientes com cobranças pendentes e histórico
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");

    const config = await obterConfiguracaoCobranca();
    const clientes = await buscarClientesParaCobranca();
    const historico = await obterHistoricoCobrancas();

    // Se for requisição de prévia em HTML
    if (tipo === "preview_html") {
      const clienteDemo = clientes.length > 0 ? {
        nome: clientes[0].clienteNome,
        cnpjCpf: clientes[0].clienteCnpjCpf,
        email: clientes[0].clienteEmail,
      } : {
        nome: "R&M Mineração FRANCISCÓPOLIS",
        cnpjCpf: "12.345.678/0001-90",
        email: "financeiro@mineracao.com.br",
      };

      const titulosDemo = clientes.length > 0 && clientes[0].titulos.length > 0 ? clientes[0].titulos : [
        {
          id: 991,
          descricao: "Manutenção Mecânica de Escavadeira CAT 320 - Substituição de Mangueiras e Filtros",
          numeroOS: "OS-38",
          valor: 8450.0,
          dataVencimento: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          diasAtraso: 5,
          statusFaixa: "VENCIDO",
        },
        {
          id: 992,
          descricao: "Deslocamento Técnico e Socorro de Campo - Pedreira Franciscópolis",
          numeroOS: "OS-38",
          valor: 1200.0,
          dataVencimento: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          diasAtraso: 5,
          statusFaixa: "VENCIDO",
        },
      ];

      const { html } = await gerarHTMLEmailCobranca(clienteDemo, titulosDemo, config);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const totalPendente = clientes.reduce((acc, c) => acc + c.totalPendente, 0);
    const totalTitulos = clientes.reduce((acc, c) => acc + c.titulos.length, 0);

    return NextResponse.json({
      sucesso: true,
      config,
      clientes,
      historico,
      estatisticas: {
        totalPendente,
        totalClientes: clientes.length,
        totalTitulos,
        cobrancaAtiva: config.ativa,
      },
    });
  } catch (error: any) {
    console.error("Erro na rota GET /api/cobranca-automatica:", error);
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro ao consultar automação de cobrança." },
      { status: 500 }
    );
  }
}

/**
 * POST: Liga/Desliga, atualiza configurações de e-mail ou dispara cobranças
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const acao = body.acao || "toggle";

    // 1. LIGA / DESLIGA DA COBRANÇA AUTOMÁTICA
    if (acao === "toggle") {
      const novoStatus = typeof body.ativa === "boolean" ? body.ativa : false;
      const configAtualizada = await alternarStatusCobranca(novoStatus);
      return NextResponse.json({
        sucesso: true,
        mensagem: novoStatus
          ? "Cobrança Automática ATIVADA com sucesso! O sistema enviará notificações conforme a régua programada."
          : "Cobrança Automática DESATIVADA. Nenhum e-mail automático será enviado.",
        config: configAtualizada,
      });
    }

    // 2. SALVAR MODELO PERSONALIZADO DO FINANCEIRO & REGRAS
    if (acao === "salvar_config") {
      if (!body.config) {
        return NextResponse.json(
          { sucesso: false, erro: "Configuração não informada." },
          { status: 400 }
        );
      }
      const ok = await salvarConfiguracaoCobranca(body.config);
      return NextResponse.json({
        sucesso: ok,
        mensagem: ok
          ? "Modelo de e-mail e configurações de cobrança salvos com sucesso!"
          : "Falha ao gravar arquivo de configuração.",
      });
    }

    // 3. DISPARO MANUAL PARA UM CLIENTE ESPECÍFICO
    if (acao === "disparar_cliente") {
      const clienteId = parseInt(body.clienteId);
      if (!clienteId) {
        return NextResponse.json(
          { sucesso: false, erro: "ID do cliente é obrigatório." },
          { status: 400 }
        );
      }

      const resultado = await dispararCobrancaParaCliente(clienteId);
      return NextResponse.json({
        sucesso: true,
        mensagem: resultado.mensagem,
        resultado,
      });
    }

    // 4. DISPARO EM LOTE PARA TODOS OS CLIENTES INADIMPLENTES
    if (acao === "disparar_todos") {
      const clientes = await buscarClientesParaCobranca();
      const config = await obterConfiguracaoCobranca();

      if (clientes.length === 0) {
        return NextResponse.json({
          sucesso: true,
          mensagem: "Nenhum cliente inadimplente encontrado para disparo no momento.",
          enviados: 0,
        });
      }

      const resultados: any[] = [];
      let sucessos = 0;
      let falhas = 0;

      for (const c of clientes) {
        if (!c.clienteEmail || !c.clienteEmail.includes("@")) {
          falhas++;
          resultados.push({
            cliente: c.clienteNome,
            sucesso: false,
            erro: "Cliente sem e-mail cadastrado",
          });
          continue;
        }

        try {
          const res = await dispararCobrancaParaCliente(c.clienteId, config);
          sucessos++;
          resultados.push({ cliente: c.clienteNome, sucesso: true, res });
        } catch (err: any) {
          falhas++;
          resultados.push({ cliente: c.clienteNome, sucesso: false, erro: err.message });
        }
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: `Disparo em lote concluído! ${sucessos} e-mail(s) processado(s) com sucesso${falhas > 0 ? `, ${falhas} cliente(s) com pendência de e-mail` : ""}.`,
        sucessos,
        falhas,
        resultados,
      });
    }

    // 5. HELPER PARA CRIAR TÍTULO DE TESTE (caso o usuário queira testar agora mesmo)
    if (acao === "gerar_titulo_teste") {
      const cliente = await prisma.clientes.findFirst({
        where: { email: { not: null } },
      });

      if (!cliente) {
        return NextResponse.json({ sucesso: false, erro: "Nenhum cliente com e-mail cadastrado encontrado." }, { status: 400 });
      }

      const vencimentoPassado = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás
      const novoTitulo = await prisma.contas_receber.create({
        data: {
          cliente_id: cliente.id,
          descricao: `Serviço Mecânico de Manutenção Preventiva - ${cliente.nome}`,
          valor: 3850.0,
          data_vencimento: vencimentoPassado,
          status: "PENDENTE",
          forma_pagamento: "PIX",
          observacoes: "Título demonstrativo gerado para teste da automação de cobrança",
        },
      });

      return NextResponse.json({
        sucesso: true,
        mensagem: `Título de teste de ${cliente.nome} (R$ 3.850,00 - Vencido há 7 dias) gerado com sucesso!`,
        titulo: novoTitulo,
      });
    }

    return NextResponse.json(
      { sucesso: false, erro: "Ação não reconhecida." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Erro na rota POST /api/cobranca-automatica:", error);
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro ao processar solicitação de cobrança." },
      { status: 500 }
    );
  }
}
