import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = Number(params.id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  // This will also delete tokens and verification_keys if your FKs are ON DELETE CASCADE
  const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [
    userId,
  ]);

  if (rowCount === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
