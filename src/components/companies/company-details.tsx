"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type Company = {
  id: number;
  name: string;
  callback_url: string | null;
  jwt_alg: "HS256" | "HS384" | "HS512";
  token_ttl_seconds: number;
  created_at: string;
  updated_at: string;
};

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

function isAlg(v: string): v is (typeof ALGS)[number] {
  return (ALGS as readonly string[]).includes(v);
}

function getErrorMessage(e: unknown, fallback = "Something went wrong") {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return fallback;
}

export default function CompanyDetails() {
  const { id } = useParams();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // form fields
  const [name, setName] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [jwtAlg, setJwtAlg] = useState<(typeof ALGS)[number]>("HS256");
  const [ttl, setTtl] = useState<number | "">(DEFAULT_TTL);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/companies/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data: Company) => {
        setCompany(data);
        setName(data.name || "");
        setCallbackUrl(data.callback_url ?? "");
        setJwtAlg(isAlg(data.jwt_alg) ? data.jwt_alg : "HS256");
        setTtl(data.token_ttl_seconds ?? DEFAULT_TTL);
      })
      .catch(() => setError("Failed to load company"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setError(null);
    setOk(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Company name is required");
      return;
    }
    if (trimmedName.length > 200) {
      setError("Company name is too long (max 200 chars)");
      return;
    }

    const trimmedCb = callbackUrl.trim();
    if (trimmedCb && !isAbsoluteHttpUrl(trimmedCb)) {
      setError("Callback URL must be an absolute http(s) URL");
      return;
    }

    const ttlNum = ttl === "" ? null : Number(ttl);
    if (ttlNum !== null && (!Number.isFinite(ttlNum) || ttlNum <= 0)) {
      setError("Token TTL must be a positive number (in seconds)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          callback_url: trimmedCb || null,
          jwt_alg: jwtAlg,
          token_ttl_seconds: ttlNum ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error || "Failed to update"
        );
      }
      const updated: Company = await res.json();
      setCompany(updated);
      setOk("Saved!");
      router.refresh();
      setTimeout(() => setOk(null), 1800);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to update"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this company?")) return;
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error || "Failed to delete"
        );
      }
      router.push("/companies");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Delete failed"));
    }
  }

  if (loading) return <p className="text-gray-600">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!company) return <p className="text-gray-600">Not found</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit Company</h1>

      <div className="space-y-4 max-w-2xl bg-white border rounded p-4">
        {ok && <p className="text-sm text-green-600">{ok}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
        </div>

        {/* Callback URL */}
        <div>
          <label className="block text-sm font-medium">Callback URL</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
            placeholder="https://company-app/management-menu"
            disabled={saving}
          />
          <p className="text-xs text-gray-500">
            Users will be redirected here with <code>?token=…</code>
          </p>
        </div>

        {/* JWT settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">JWT Algorithm</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={jwtAlg}
              onChange={(e) =>
                setJwtAlg(e.target.value as (typeof ALGS)[number])
              }
              disabled={saving}
            >
              {ALGS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Token TTL (seconds)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                className="mt-1 w-full border rounded px-3 py-2"
                value={ttl}
                onChange={(e) =>
                  setTtl(e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={saving}
                placeholder={String(DEFAULT_TTL)}
              />
              <button
                type="button"
                className="mt-1 px-3 py-2 rounded border"
                onClick={() => setTtl(DEFAULT_TTL)}
                disabled={saving}
                title="Reset to 14 days"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded bg-red-600 text-white"
            disabled={saving}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <a
          href={`/companies/${company.id}/users`}
          className="text-blue-600 hover:underline"
        >
          Manage Users
        </a>
        <br />
        <a
          href={`/companies/${company.id}/jwt`}
          className="text-blue-600 hover:underline"
        >
          Manage JWT
        </a>
      </div>
    </div>
  );
}
