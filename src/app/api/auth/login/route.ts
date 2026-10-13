import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Informe o e-mail e a senha de acesso." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanSenha = String(senha);

    // Busca usuário no banco pelo e-mail (case-insensitive)
    const user = await prisma.usuarios.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Verifica se o usuário está ativo
    if (user.ativo === false) {
      return NextResponse.json(
        { error: "Usuário inativo no sistema. Entre em contato com a administração." },
        { status: 403 }
      );
    }

    // Valida a senha contra o hash armazenado
    const isPasswordValid = verifyPassword(cleanSenha, user.senha);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Cria token JWT com validade de 7 dias
    const token = await createSessionToken({
      id: user.id,
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
    });

    // Registra auditoria no system_logs se a tabela estiver disponível
    try {
      await prisma.system_logs.create({
        data: {
          usuario_id: user.id,
          usuario_nome: user.nome,
          acao: "LOGIN_SUCESSO",
          detalhes: `Acesso autenticado ao sistema financeiro (Cargo: ${user.cargo})`,
        },
      });
    } catch {
      // Ignora erro de log de sistema para não travar o login
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error: any) {
    console.error("Erro no processamento de login:", error);
    return NextResponse.json(
      {
        error: error?.message || "Erro interno no servidor ao processar o login.",
        details: String(error?.stack || error),
      },
      { status: 500 }
    );
  }
}
