import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import crypto from "crypto";

function generateRandomToken(length = 48) {
  return crypto.randomBytes(length).toString("base64url");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (Number.isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT id, jwt, created_at, updated_at FROM jwts WHERE company_id = $1`,
    [companyId]
  );
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (Number.isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
  }

  let provided: string | undefined;
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof raw.jwt === "string") {
    provided = raw.jwt.trim();
  }

  const newJwt =
    provided && provided.length > 0 ? provided : generateRandomToken();

  // (Optional) add basic size guard
  if (newJwt.length > 8192) {
    return NextResponse.json({ error: "Secret too large" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `
    INSERT INTO jwts (company_id, jwt)
    VALUES ($1, $2)
    ON CONFLICT (company_id)
    DO UPDATE SET jwt = EXCLUDED.jwt, updated_at = NOW()
    RETURNING id, jwt, created_at, updated_at
    `,
    [companyId, newJwt]
  );

  return NextResponse.json(rows[0]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (Number.isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
  }

  const { rowCount } = await pool.query(
    `DELETE FROM jwts WHERE company_id = $1`,
    [companyId]
  );
  if (rowCount === 0)
    return NextResponse.json({ error: "JWT not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
