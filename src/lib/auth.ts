import crypto from "crypto";
import bcrypt from "bcryptjs";
export * from "./jwt";

/**
 * Verifica a senha informada contra o hash armazenado no banco PostgreSQL.
 * Suporta hashes do tipo:
 * 1. Bcrypt ($2a$, $2b$, $2y$)
 * 2. Werkzeug Scrypt (scrypt:32768:8:1$salt$hash)
 * 3. Texto puro (fallback de compatibilidade)
 */
export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (!storedHash || !plainPassword) return false;

  const trimmedPlain = plainPassword.trim();
  const trimmedHash = storedHash.trim();

  // 1. Bcrypt ($2a$, $2b$, $2y$)
  if (
    trimmedHash.startsWith("$2a$") ||
    trimmedHash.startsWith("$2b$") ||
    trimmedHash.startsWith("$2y$")
  ) {
    try {
      return bcrypt.compareSync(trimmedPlain, trimmedHash);
    } catch (err) {
      console.error("Erro ao verificar bcrypt:", err);
      return false;
    }
  }

  // 2. Python Werkzeug scrypt (scrypt:N:r:p$salt$hash)
  if (trimmedHash.startsWith("scrypt:")) {
    try {
      const parts = trimmedHash.split("$");
      if (parts.length === 3) {
        const configParts = parts[0].split(":");
        const N = parseInt(configParts[1], 10) || 32768;
        const r = parseInt(configParts[2], 10) || 8;
        const p = parseInt(configParts[3], 10) || 1;
        const salt = parts[1];
        const hash = parts[2];
        const keyLen = Buffer.from(hash, "hex").length || 64;

        const derivedKey = crypto.scryptSync(trimmedPlain, salt, keyLen, {
          N,
          r,
          p,
          maxmem: 128 * 1024 * 1024,
        });

        const derivedHex = derivedKey.toString("hex");
        return (
          derivedHex.length === hash.length &&
          crypto.timingSafeEqual(Buffer.from(derivedHex), Buffer.from(hash))
        );
      }
    } catch (err) {
      console.error("Erro ao verificar scrypt:", err);
      return false;
    }
  }

  // 3. Fallback texto puro
  return trimmedPlain === trimmedHash;
}
