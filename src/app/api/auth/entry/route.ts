import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import crypto from "crypto";

type CompanyRow = {
  id: number;
  name: string;
  callback_url: string | null;
  jwt_alg: string;
  token_ttl_seconds: number;
};

type SecretRow = { jwt: string; is_active: boolean };

type UserRow = {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  is_active?: boolean;
};

type KeyRow = {
  key_value: string | null;
};

function buildRedirect(urlBase: string, token: string) {
  const url = new URL(urlBase);
  url.searchParams.set("token", token);
  return url.toString();
}

function normalizeStr(s: string | null) {
  return (s ?? "").trim();
}

function normalizePhone(s: string | null) {
  return normalizeStr(s);
}

async function getCompanyByIdOrName(
  company_id?: string | null,
  company_name?: string | null
) {
  if (company_id) {
    const { rows } = await pool.query<CompanyRow>(
      `SELECT id, name, callback_url, jwt_alg, token_ttl_seconds
       FROM companies WHERE id = $1`,
      [Number(company_id)]
    );
    return rows[0];
  }
  if (company_name) {
    const { rows } = await pool.query<CompanyRow>(
      `SELECT id, name, callback_url, jwt_alg, token_ttl_seconds
       FROM companies WHERE name = $1`,
      [company_name]
    );
    return rows[0];
  }
  return undefined;
}

async function getActiveSecret(companyId: number) {
  const { rows } = await pool.query<SecretRow>(
    `SELECT jwt, is_active
     FROM jwts
     WHERE company_id = $1 AND is_active = true
     ORDER BY created_at DESC
     LIMIT 1`,
    [companyId]
  );
  return rows[0]?.jwt || null;
}

async function findUser(
  companyId: number,
  phone?: string | null,
  first?: string | null,
  last?: string | null
) {
  if (phone) {
    const { rows } = await pool.query<UserRow>(
      `SELECT id, company_id, first_name, last_name, phone_number, role,
              true AS is_active
       FROM users
       WHERE company_id = $1 AND phone_number = $2
       LIMIT 1`,
      [companyId, phone]
    );
    return rows[0];
  }
  if (first && last) {
    const { rows } = await pool.query<UserRow>(
      `SELECT id, company_id, first_name, last_name, phone_number, role,
              true AS is_active
       FROM users
       WHERE company_id = $1 AND first_name = $2 AND last_name = $3
       LIMIT 1`,
      [companyId, first, last]
    );
    return rows[0];
  }
  return undefined;
}

async function getUserKey(userId: number) {
  const { rows } = await pool.query<KeyRow>(
    `SELECT key_value
     FROM verification_keys
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return rows[0];
}

function timingSafeEqualStr(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

async function verifyPersonalKey(provided: string, keyRow?: KeyRow) {
  if (!keyRow) return false;
  if (keyRow.key_value) {
    return timingSafeEqualStr(provided, keyRow.key_value);
  }
  return false;
}

function issueJwt(user: UserRow, company: CompanyRow, secret: string) {
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + (company.token_ttl_seconds || 1209600); // 14d default
  const jti = crypto.randomBytes(16).toString("hex");

  const payload = {
    sub: String(user.id),
    cid: String(company.id),
    role: user.role,
    // keep legacy shape if you relied on id:"admin"
    id: user.role === "admin" ? "admin" : String(user.id),
    iat: nowSec,
    exp,
    jti,
  };

  const algorithm = (company.jwt_alg || "HS256") as jwt.Algorithm;
  const token = jwt.sign(payload, secret, { algorithm });
  return { token };
}

async function persistIssuedToken(opts: { userId: number; token: string }) {
  // Your tokens table only has (user_id, token, created_at, updated_at)
  await pool.query(`INSERT INTO tokens (user_id, token) VALUES ($1, $2)`, [
    opts.userId,
    opts.token,
  ]);
}

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Universal link params
    const companyIdParam = normalizeStr(searchParams.get("company_id"));
    const companyNameParam = normalizeStr(searchParams.get("company_name"));
    const phone = normalizePhone(searchParams.get("phone"));
    const first = normalizeStr(searchParams.get("first_name"));
    const last = normalizeStr(searchParams.get("last_name"));
    const providedKey = normalizeStr(searchParams.get("key"));
    const providedTokenRaw = normalizeStr(searchParams.get("token"));
    const providedToken = providedTokenRaw || undefined; // treat empty as absent

    // 1) Load company + active secret
    const company = await getCompanyByIdOrName(
      companyIdParam || undefined,
      companyNameParam || undefined
    );
    if (!company) return jsonError("Company not found", 404);
    if (!company.callback_url)
      return jsonError("Company callback_url not set", 500);

    const secret = await getActiveSecret(company.id);
    if (!secret)
      return jsonError("Active signing secret not found for company", 500);

    // 2) If token provided: verify and redirect if valid
    if (providedToken) {
      try {
        jwt.verify(providedToken, secret, {
          algorithms: [company.jwt_alg as jwt.Algorithm],
        });
        const redirectTo = buildRedirect(company.callback_url, providedToken);
        return NextResponse.redirect(redirectTo);
      } catch {
        // invalid/expired token → continue to key-based verification
      }
    }

    // 3) Key-based verification (needs identifiers + key)
    if (!phone && !(first && last)) {
      return jsonError(
        "Missing user identifier (phone or first_name+last_name)",
        400
      );
    }
    if (!providedKey) {
      return jsonError("Missing personal key", 400);
    }

    const user = await findUser(
      company.id,
      phone || undefined,
      first || undefined,
      last || undefined
    );
    if (!user) return jsonError("User not found", 404);

    const keyRow = await getUserKey(user.id);
    const ok = await verifyPersonalKey(providedKey, keyRow);
    if (!ok) return jsonError("Invalid personal key", 401);

    const { token } = issueJwt(user, company, secret);
    await persistIssuedToken({ userId: user.id, token });

    const redirectTo = buildRedirect(company.callback_url, token);
    return NextResponse.redirect(redirectTo);
  } catch (e: unknown) {
    let message = "Server error";
    if (e instanceof Error) {
      message = e.message;
    }
    return jsonError(message, 500);
  }
}
