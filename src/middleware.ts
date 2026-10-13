import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, AUTH_COOKIE_NAME } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não requerem autenticação
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname === "/logo.png" ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Se o usuário está na página de login
  if (pathname === "/login") {
    if (session) {
      // Se já está autenticado, redireciona para a home
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Se o usuário não está autenticado e tenta acessar qualquer outra rota
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autorizado. Faça login para continuar." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.png
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
