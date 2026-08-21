const forbiddenTokens = /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC|CALL|BEGIN|DECLARE|COMMIT|ROLLBACK|SAVEPOINT|LOCK)\b/i;
const forbiddenPatterns = [
  /\bFOR\s+UPDATE\b/i,
  /\bDBMS_[A-Z0-9_$#]+\b/i,
  /\bUTL_[A-Z0-9_$#]+\b/i,
];

export function assertSelectOnly(sql: string): void {
  const normalized = sql.trim();

  if (!normalized) {
    throw new Error("SQL vazio não é permitido.");
  }

  if (!/^(SELECT|WITH)\b/i.test(normalized)) {
    throw new Error("Somente SELECT ou WITH ... SELECT são permitidos.");
  }

  if (forbiddenTokens.test(normalized)) {
    throw new Error("SQL contém uma operação proibida para o acesso Oracle.");
  }

  if (forbiddenPatterns.some((pattern) => pattern.test(normalized))) {
    throw new Error("SQL contém um recurso proibido para o acesso Oracle.");
  }

  if (/^WITH\b/i.test(normalized) && !/\bSELECT\b/i.test(normalized)) {
    throw new Error("A instrução WITH precisa terminar em SELECT.");
  }

  const withoutTrailingSemicolon = normalized.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    throw new Error("Múltiplas instruções SQL não são permitidas.");
  }
}
