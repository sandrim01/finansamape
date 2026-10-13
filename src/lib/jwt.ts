import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "finansamape_secret_key_super_segura_2026";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export const AUTH_COOKIE_NAME = "samape_auth_token";

export interface UserSession {
  id: number;
  nome: string;
  email: string;
  cargo: string;
}

export async function createSessionToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: Number(payload.id),
      nome: String(payload.nome),
      email: String(payload.email),
      cargo: String(payload.cargo),
    };
  } catch {
    return null;
  }
}
