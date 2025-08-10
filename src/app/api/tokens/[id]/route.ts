import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tokenId = Number(params.id);
  if (Number.isNaN(tokenId)) {
    return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
  }

  const { rowCount } = await pool.query(`DELETE FROM tokens WHERE id = $1`, [
    tokenId,
  ]);

  if (rowCount === 0) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
