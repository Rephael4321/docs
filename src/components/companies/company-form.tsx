"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ALGS = ["HS256", "HS384", "HS512"] as const;
const DEFAULT_TTL = 1209600;

function isAbsoluteHttpUrl(u: string) {
  try {
    const url = new URL(u);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && !!url.host
    );
  } catch {
    return false;
  }
}

function getErrorMessage(e: unknown, fallback = "Something went wrong") {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return fallback;
}

export default function CompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [jwtAlg, setJwtAlg] = useState<(typeof ALGS)[number]>("HS256");
  const [ttl, setTtl] = useState<number | "">(DEFAULT_TTL);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErr("Company name is required");
      return;
    }
    if (trimmedName.length > 200) {
      setErr("Company name is too long (max 200 chars)");
      return;
    }

    const trimmedCb = callbackUrl.trim();
    if (trimmedCb && !isAbsoluteHttpUrl(trimmedCb)) {
      setErr(
        "Callback URL must be an absolute http(s) URL (e.g., https://app.example.com/management-menu)"
      );
      return;
    }

    const ttlNum = ttl === "" ? undefined : Number(ttl);
    if (ttlNum !== undefined && (!Number.isFinite(ttlNum) || ttlNum <= 0)) {
      setErr("Token TTL must be a positive number of seconds");
      return;
    }

    // Build payload with explicit typing instead of any
    const payload: {
      name: string;
      callback_url?: string;
      jwt_alg?: (typeof ALGS)[number];
      token_ttl_seconds?: number;
    } = { name: trimmedName };

    if (trimmedCb) payload.callback_url = trimmedCb;
    if (jwtAlg) payload.jwt_alg = jwtAlg;
    if (ttlNum !== undefined && ttlNum !== DEFAULT_TTL) {
      payload.token_ttl_seconds = ttlNum;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data?.error || `Failed with ${res.status}`);
      }

      router.push("/companies");
      router.refresh();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to create company"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New Company</h1>

      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium">
            Company name
          </label>
          <input
            id="name"
            name="name"
            placeholder="Acme Inc."
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        {/* Callback URL (optional) */}
        <div className="space-y-2">
          <label htmlFor="callback_url" className="block text-sm font-medium">
            Callback URL (optional)
          </label>
          <input
            id="callback_url"
            name="callback_url"
            placeholder="https://company-app/management-menu"
            className="w-full border rounded px-3 py-2"
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-gray-500">
            After verification, users are redirected here with{" "}
            <code>?token=…</code>
          </p>
        </div>

        {/* JWT settings (optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="jwt_alg" className="block text-sm font-medium">
              JWT Algorithm
            </label>
            <select
              id="jwt_alg"
              className="w-full border rounded px-3 py-2"
              value={jwtAlg}
              onChange={(e) =>
                setJwtAlg(e.target.value as (typeof ALGS)[number])
              }
              disabled={loading}
            >
              {ALGS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="ttl" className="block text-sm font-medium">
              Token TTL (seconds)
            </label>
            <div className="flex gap-2">
              <input
                id="ttl"
                type="number"
                min={1}
                className="w-full border rounded px-3 py-2"
                value={ttl}
                onChange={(e) =>
                  setTtl(e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={loading}
                placeholder={String(DEFAULT_TTL)}
              />
              <button
                type="button"
                className="px-3 py-2 rounded border"
                onClick={() => setTtl(DEFAULT_TTL)}
                disabled={loading}
                title="Reset to default (14 days)"
              >
                Reset
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Default is 14 days ({DEFAULT_TTL.toLocaleString()} seconds).
            </p>
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Company"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-2 rounded border"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>

      <Link href="/companies" className="text-sm text-blue-600 hover:underline">
        ← Back to companies
      </Link>
    </div>
  );
}
