import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  if (!v || v.trim() === "") return undefined;
  return v;
}

function toBool(v: string | undefined, def = false): boolean {
  if (v == null) return def;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1";
}

function toInt(v: string | undefined, def: number): number {
  const n = v ? Number(v) : def;
  if (Number.isNaN(n))
    throw new Error(`Invalid integer for env var value: ${v}`);
  return n;
}

export const env = {
  // DB (required)
  PG_HOST: required("PG_HOST"),
  PG_PORT: toInt(process.env.PG_PORT, 5432),
  PG_USER: required("PG_USER"),
  PG_PASSWORD: required("PG_PASSWORD"),
  PG_DATABASE: required("PG_DATABASE"),
  PG_USE_SSL: toBool(process.env.PG_USE_SSL, false),
  DB_CONNECTION_LIMIT: toInt(process.env.DB_CONNECTION_LIMIT, 10),

  // Optional — your app doesn’t currently use it for auth
  JWT_SECRET: optional("JWT_SECRET"),
} as const;
