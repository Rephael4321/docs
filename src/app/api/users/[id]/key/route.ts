import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import crypto from "crypto";

function generateRandomKey(length = 48) {
  return crypto.randomBytes(length).toString("base64url");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = Number(params.id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT id, key_value, created_at, updated_at
     FROM verification_keys
     WHERE user_id = $1`,
    [userId]
  );

  if (!rows.length) {
    return NextResponse.json(null);
  }
  return NextResponse.json(rows[0]);
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = Number(params.id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const newKey = generateRandomKey();

  const { rows } = await pool.query(
    `
    INSERT INTO verification_keys (user_id, key_value)
    VALUES ($1, $2)
    ON CONFLICT (user_id)
    DO UPDATE SET key_value = EXCLUDED.key_value, updated_at = NOW()
    RETURNING id, key_value, created_at, updated_at
    `,
    [userId, newKey]
  );

  return NextResponse.json(rows[0]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = Number(params.id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { rowCount } = await pool.query(
    `DELETE FROM verification_keys WHERE user_id = $1`,
    [userId]
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
