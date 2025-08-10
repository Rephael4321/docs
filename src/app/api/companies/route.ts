import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const ALGS = new Set(["HS256", "HS384", "HS512"]);

function isAbsoluteUrl(u: unknown) {
  if (u == null || u === "") return true; // treat empty/omitted as ok
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return !!url.protocol && !!url.host;
  } catch {
    return false;
  }
}

export async function GET() {
  const { rows } = await pool.query(
    `SELECT id, name, callback_url, jwt_alg, token_ttl_seconds, created_at, updated_at
     FROM companies
     ORDER BY name`
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // name
    const name = String(body?.name ?? "").trim();
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

    // callback_url (optional)
    const callback_url = body?.callback_url ?? null;
    if (!isAbsoluteUrl(callback_url)) {
      return NextResponse.json(
        {
          error:
            "callback_url must be an absolute URL (e.g., https://app.example.com/path) or omitted",
        },
        { status: 400 }
      );
    }

    // jwt_alg (optional; defaults to DB default HS256)
    const jwt_alg = body?.jwt_alg ?? null;
    if (jwt_alg != null && !ALGS.has(String(jwt_alg))) {
      return NextResponse.json(
        { error: "jwt_alg must be HS256, HS384, or HS512" },
        { status: 400 }
      );
    }

    // token_ttl_seconds (optional; defaults to DB default 1209600)
    const token_ttl_seconds = body?.token_ttl_seconds ?? null;
    if (token_ttl_seconds != null) {
      const ttl = Number(token_ttl_seconds);
      if (!Number.isFinite(ttl) || ttl <= 0) {
        return NextResponse.json(
          { error: "token_ttl_seconds must be a positive number" },
          { status: 400 }
        );
      }
    }

    // Build INSERT with only provided optional fields (so DB defaults still apply)
    const cols = ["name"];
    const vals: any[] = [name];
    const params = ["$1"];
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
      vals.push(Number(token_ttl_seconds));
      params.push(`$${i++}`);
    }

    const { rows } = await pool.query(
      `INSERT INTO companies (${cols.join(", ")})
       VALUES (${params.join(", ")})
       RETURNING id, name, callback_url, jwt_alg, token_ttl_seconds, created_at, updated_at`,
      vals
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
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
