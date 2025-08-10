import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const ALG_VALUES = ["HS256", "HS384", "HS512"] as const;
type Alg = (typeof ALG_VALUES)[number];

function isAbsoluteUrl(u: unknown) {
  if (u == null || u === "") return true;
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return !!url.protocol && !!url.host;
  } catch {
    return false;
  }
}

function isAlg(v: unknown): v is Alg {
  return typeof v === "string" && (ALG_VALUES as readonly string[]).includes(v);
}

export async function GET() {
  const { rows } = await pool.query(
    `SELECT id, name, callback_url, jwt_alg, token_ttl_seconds, created_at, updated_at
     FROM companies
     ORDER BY name`
  );
  return NextResponse.json(rows);
}

function hasCode(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }
    if (name.length > 200) {
      return NextResponse.json(
        { error: "Company name is too long (max 200 chars)" },
        { status: 400 }
      );
    }

    const callback_url =
      typeof raw.callback_url === "string" ? raw.callback_url : null;
    if (!isAbsoluteUrl(callback_url)) {
      return NextResponse.json(
        {
          error:
            "callback_url must be an absolute URL (e.g., https://app.example.com/path) or omitted",
        },
        { status: 400 }
      );
    }

    const jwt_alg = isAlg(raw.jwt_alg) ? raw.jwt_alg : null;
    if (raw.jwt_alg != null && jwt_alg === null) {
      return NextResponse.json(
        { error: "jwt_alg must be HS256, HS384, or HS512" },
        { status: 400 }
      );
    }

    const token_ttl_seconds =
      raw.token_ttl_seconds == null
        ? null
        : Number(raw.token_ttl_seconds as unknown);
    if (token_ttl_seconds !== null) {
      if (!Number.isFinite(token_ttl_seconds) || token_ttl_seconds <= 0) {
        return NextResponse.json(
          { error: "token_ttl_seconds must be a positive number" },
          { status: 400 }
        );
      }
    }

    const cols: string[] = ["name"];
    const vals: (string | number)[] = [name];
    const params: string[] = ["$1"];
    let i = 2;

    if (callback_url !== null && callback_url !== "") {
      cols.push("callback_url");
      vals.push(callback_url);
      params.push(`$${i++}`);
    }
    if (jwt_alg !== null) {
      cols.push("jwt_alg");
      vals.push(jwt_alg);
      params.push(`$${i++}`);
    }
    if (token_ttl_seconds !== null) {
      cols.push("token_ttl_seconds");
      vals.push(token_ttl_seconds);
      params.push(`$${i++}`);
    }

    const { rows } = await pool.query(
      `INSERT INTO companies (${cols.join(", ")})
       VALUES (${params.join(", ")})
       RETURNING id, name, callback_url, jwt_alg, token_ttl_seconds, created_at, updated_at`,
      vals
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    if (hasCode(err) && err.code === "23505") {
      return NextResponse.json(
        { error: "Company name already exists" },
        { status: 409 }
      );
    }
    console.error("POST /api/companies error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
