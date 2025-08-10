// src/app/api/companies/[companyId]/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (Number.isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, phone_number, role, created_at
     FROM users
     WHERE company_id = $1
     ORDER BY last_name, first_name`,
    [companyId]
  );

  return NextResponse.json(rows);
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const companyId = Number(params.id);
  if (Number.isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
  }

  const body = await _req.json().catch(() => ({}));
  const first_name = String(body?.first_name ?? "").trim();
  const last_name = String(body?.last_name ?? "").trim();
  const phone_number = String(body?.phone_number ?? "").trim();
  const role = String(body?.role ?? "").trim();

  if (!first_name || !last_name || !phone_number || !role) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  if (first_name.length > 100 || last_name.length > 100) {
    return NextResponse.json({ error: "Name too long" }, { status: 400 });
  }
  if (role.length > 50) {
    return NextResponse.json({ error: "Role too long" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (company_id, first_name, last_name, phone_number, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, phone_number, role, created_at`,
      [companyId, first_name, last_name, phone_number, role]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "A user with this phone already exists in this company" },
        { status: 409 }
      );
    }
    console.error("POST /api/companies/[companyId]/users error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
