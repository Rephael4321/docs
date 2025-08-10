// src/app/api/users/[id]/tokens/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import crypto from "crypto";

// helper to generate a secure random token string
function generateRandomToken(length = 48) {
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
    `SELECT id, token, created_at, updated_at
     FROM tokens
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return NextResponse.json(rows);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = Number(params.id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const newToken = generateRandomToken();

  const { rows } = await pool.query(
    `INSERT INTO tokens (user_id, token)
     VALUES ($1, $2)
     RETURNING id, token, created_at, updated_at`,
    [userId, newToken]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
