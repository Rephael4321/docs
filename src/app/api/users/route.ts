import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(
    `SELECT u.id,
            u.first_name,
            u.last_name,
            u.phone_number,
            u.role,
            u.company_id,
            c.name AS company_name,
            u.created_at
     FROM users u
     JOIN companies c ON c.id = u.company_id
     ORDER BY c.name, u.last_name, u.first_name`
  );
  return NextResponse.json(rows);
}
