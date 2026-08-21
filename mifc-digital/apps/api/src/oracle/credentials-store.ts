import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface StoredOracleCredentials {
  user: string;
  password: string;
  savedAt: string;
}

const storePath = resolve(process.cwd(), "apps/api/.data/oracle-credentials.json");

function validCredentials(value: unknown): value is Pick<StoredOracleCredentials, "user" | "password"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.user === "string"
    && candidate.user.trim().length > 0
    && typeof candidate.password === "string"
    && candidate.password.length > 0;
}

export function getOracleCredentialsStorePath(): string {
  return storePath;
}

export function readStoredOracleCredentials(): StoredOracleCredentials | null {
  if (!existsSync(storePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(storePath, "utf8")) as unknown;
    if (!validCredentials(parsed)) return null;
    const candidate = parsed as Partial<StoredOracleCredentials>;
    return {
      user: candidate.user!.trim(),
      password: candidate.password!,
      savedAt: typeof candidate.savedAt === "string" ? candidate.savedAt : "",
    };
  } catch {
    return null;
  }
}

export function saveStoredOracleCredentials(credentials: { user: string; password: string }): void {
  if (!validCredentials(credentials)) throw new Error("Usuário e senha Oracle são obrigatórios para salvar a conexão.");
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(
    storePath,
    JSON.stringify({ user: credentials.user.trim(), password: credentials.password, savedAt: new Date().toISOString() }, null, 2),
    { encoding: "utf8", mode: 0o600 },
  );
}

export function forgetStoredOracleCredentials(): void {
  if (existsSync(storePath)) unlinkSync(storePath);
}
