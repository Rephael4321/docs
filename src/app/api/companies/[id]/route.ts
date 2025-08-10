import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

function isAbsoluteHttpUrl(u: unknown) {
  if (u === null) return true; // allow explicit null for callback_url
  if (typeof u !== "string") return false;
  const s = u.trim();
  if (!s) return false;
  try {
    const url = new URL(s);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && !!url.host
    );
  } catch {
    return false;
  }
}

const ALGS = new Set(["HS256", "HS384", "HS512"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT id, name, callback_url, jwt_alg, token_ttl_seconds, created_at, updated_at
     FROM companies
     WHERE id = $1`,
    [companyId]
  );

  if (!rows.length) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));

  const hasName = Object.prototype.hasOwnProperty.call(body, "name");
  const hasCallback = Object.prototype.hasOwnProperty.call(
    body,
    "callback_url"
  );
  const hasAlg = Object.prototype.hasOwnProperty.call(body, "jwt_alg");
  const hasTtl = Object.prototype.hasOwnProperty.call(
    body,
    "token_ttl_seconds"
  );

  if (!hasName && !hasCallback && !hasAlg && !hasTtl) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    );
  }

  // Validate
  if (hasName) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }
    if (body.name.trim().length > 200) {
      return NextResponse.json(
        { error: "Company name is too long (max 200 chars)" },
        { status: 400 }
      );
    }
  }

  if (hasCallback) {
    // allow "", treat as null (clear)
    if (body.callback_url === "") body.callback_url = null;
    if (!isAbsoluteHttpUrl(body.callback_url)) {
      return NextResponse.json(
        { error: "callback_url must be an absolute http(s) URL or null" },
        { status: 400 }
      );
    }
  }

  if (hasAlg) {
    // jwt_alg is NOT NULL in DB; disallow null and validate value
    if (body.jwt_alg == null || !ALGS.has(String(body.jwt_alg))) {
      return NextResponse.json(
        { error: "jwt_alg must be HS256, HS384, or HS512" },
        { status: 400 }
      );
    }
  }

  if (hasTtl) {
    // token_ttl_seconds is NOT NULL in DB; disallow null and ensure positive
    const ttl = Number(body.token_ttl_seconds);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return NextResponse.json(
        { error: "token_ttl_seconds must be a positive number" },
        { status: 400 }
      );
    }
  }

  // Dynamic UPDATE
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;

  if (hasName) {
    sets.push(`name = $${i++}`);
    vals.push(String(body.name).trim());
  }
  if (hasCallback) {
    sets.push(`callback_url = $${i++}`);
    vals.push(
      body.callback_url === null ? null : String(body.callback_url).trim()
    );
  }
  if (hasAlg) {
    sets.push(`jwt_alg = $${i++}`);
    vals.push(String(body.jwt_alg));
  }
  if (hasTtl) {
    sets.push(`token_ttl_seconds = $${i++}`);
    vals.push(Number(body.token_ttl_seconds));
  }

  sets.push(`updated_at = NOW()`);

  try {
    const { rows } = await pool.query(
      `
      UPDATE companies
         SET ${sets.join(", ")}
       WHERE id = $${i}
       RETURNING id, name, callback_url, jwt_alg, token_ttl_seconds, created_at, updated_at
      `,
      [...vals, companyId]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "Company name already exists" },
        { status: 409 }
      );
    }
    console.error("PATCH /api/companies/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { rowCount } = await pool.query(`DELETE FROM companies WHERE id = $1`, [
    companyId,
  ]);

  if (rowCount === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
