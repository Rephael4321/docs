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

// Allowed JWT alg values + type guard
const ALG_VALUES = ["HS256", "HS384", "HS512"] as const;
type Alg = (typeof ALG_VALUES)[number];
function isAlg(v: unknown): v is Alg {
  return typeof v === "string" && (ALG_VALUES as readonly string[]).includes(v);
}

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

function hasCode(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const hasName = Object.prototype.hasOwnProperty.call(raw, "name");
  const hasCallback = Object.prototype.hasOwnProperty.call(raw, "callback_url");
  const hasAlg = Object.prototype.hasOwnProperty.call(raw, "jwt_alg");
  const hasTtl = Object.prototype.hasOwnProperty.call(raw, "token_ttl_seconds");

  if (!hasName && !hasCallback && !hasAlg && !hasTtl) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    );
  }

  // Validate + normalize into typed locals
  let nameVal: string | undefined;
  if (hasName) {
    if (typeof raw.name !== "string" || !raw.name.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }
    if (raw.name.trim().length > 200) {
      return NextResponse.json(
        { error: "Company name is too long (max 200 chars)" },
        { status: 400 }
      );
    }
    nameVal = raw.name.trim();
  }

  let callbackVal: string | null | undefined;
  if (hasCallback) {
    if (raw.callback_url === "") {
      callbackVal = null; // clear
    } else if (raw.callback_url === null) {
      callbackVal = null;
    } else if (typeof raw.callback_url === "string") {
      callbackVal = raw.callback_url.trim();
    } else {
      return NextResponse.json(
        { error: "callback_url must be an absolute http(s) URL or null" },
        { status: 400 }
      );
    }
    if (!isAbsoluteHttpUrl(callbackVal)) {
      return NextResponse.json(
        { error: "callback_url must be an absolute http(s) URL or null" },
        { status: 400 }
      );
    }
  }

  let ttlVal: number | undefined;
  if (hasTtl) {
    const ttl = Number(raw.token_ttl_seconds);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return NextResponse.json(
        { error: "token_ttl_seconds must be a positive number" },
        { status: 400 }
      );
    }
    ttlVal = ttl;
  }

  // Dynamic UPDATE
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  let i = 1;

  if (hasName) {
    sets.push(`name = $${i++}`);
    vals.push(nameVal!);
  }
  if (hasCallback) {
    sets.push(`callback_url = $${i++}`);
    vals.push(callbackVal === null ? null : callbackVal ?? null);
  }
  if (hasAlg) {
    if (!isAlg(raw.jwt_alg)) {
      return NextResponse.json(
        { error: "jwt_alg must be HS256, HS384, or HS512" },
        { status: 400 }
      );
    }
    sets.push(`jwt_alg = $${i++}`);
    vals.push(raw.jwt_alg); // Alg is a string, fits vals' type
  }
  if (hasTtl) {
    sets.push(`token_ttl_seconds = $${i++}`);
    vals.push(ttlVal!);
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
  } catch (err: unknown) {
    if (hasCode(err) && err.code === "23505") {
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
