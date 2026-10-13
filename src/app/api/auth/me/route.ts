import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
  }

  // Opcional: busca dados atualizados no banco
  const user = await prisma.usuarios.findUnique({
    where: { id: session.id },
    select: { id: true, nome: true, email: true, cargo: true, ativo: true },
  });

  if (!user || user.ativo === false) {
    return NextResponse.json({ error: "Usuário inativo ou inexistente" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
