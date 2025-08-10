"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";

type JwtRow = {
  id: number;
  jwt: string;
  updated_at: string;
  created_at: string;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
  });

function maskToken(token: string) {
  if (!token) return "";
  if (token.length <= 12) return "********";
  return token.slice(0, 6) + "…" + token.slice(-6);
}

function getErrorMessage(e: unknown, fallback = "Something went wrong") {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return fallback;
}

export default function CompanyJwt() {
  const { id } = useParams();
  const companyId = String(id);

  const { data, error, isLoading, mutate } = useSWR<JwtRow | null>(
    `/api/companies/${companyId}/jwt`,
    fetcher
  );

  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  async function onPut() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/jwt`, {
        method: "PUT",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      setShow(false);
      await mutate();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to rotate/create JWT"));
    } finally {
      setBusy(false);
    }
  }

  async function onPutCustom() {
    const value = custom.trim();
    if (!value) {
      setErr("Please paste a non-empty secret");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/jwt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt: value }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      setCustom("");
      setShow(false);
      await mutate();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to set custom secret"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete company secret?")) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/jwt`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      setShow(false);
      await mutate();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to delete secret"));
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!data?.jwt) return;
    try {
      await navigator.clipboard.writeText(data.jwt);
      alert("Copied to clipboard");
    } catch {
      alert("Copy failed");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        Company Secret (JWT signing key)
      </h1>
      <p className="text-sm text-gray-600">Company ID: {companyId}</p>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {isLoading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-red-600">Failed to load secret</p>
      ) : !data ? (
        <div className="space-y-4 max-w-2xl bg-white border rounded p-4">
          <p className="text-gray-700">No secret set for this company.</p>
          <div className="flex gap-2">
            <button
              onClick={onPut}
              disabled={busy}
              className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
            >
              {busy ? "Creating..." : "Create random secret"}
            </button>
          </div>

          <div className="border rounded p-3 bg-white">
            <label className="block text-sm font-medium mb-2">
              Or set custom secret (paste your own)
            </label>
            <textarea
              className="w-full border rounded px-3 py-2 min-h-[88px]"
              placeholder="paste your secret here…"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              disabled={busy}
            />
            <div className="mt-2">
              <button
                onClick={onPutCustom}
                disabled={busy || !custom.trim()}
                className="px-3 py-2 rounded border disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save custom secret"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Tip: Prefer long, random secrets (32+ bytes). For HS256, a 256-bit
              secret is recommended.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl bg-white border rounded p-4">
          <div className="space-y-1">
            <div className="text-sm text-gray-500">
              Last updated: {new Date(data.updated_at).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <code className="block w-full overflow-x-auto break-all border rounded px-2 py-1 bg-gray-50">
                {show ? data.jwt : maskToken(data.jwt)}
              </code>
              <button
                onClick={() => setShow((s) => !s)}
                className="px-2 py-1 rounded border"
              >
                {show ? "Hide" : "Show"}
              </button>
              <button onClick={onCopy} className="px-2 py-1 rounded border">
                Copy
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={onPut}
                disabled={busy}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
              >
                {busy ? "Rotating..." : "Rotate (random secret)"}
              </button>
              <button
                onClick={onDelete}
                disabled={busy}
                className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-60"
              >
                Delete
              </button>
            </div>

            <div className="border rounded p-3 bg-white">
              <label className="block text-sm font-medium mb-2">
                Set custom secret (paste your own)
              </label>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[88px]"
                placeholder="paste your secret here…"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                disabled={busy}
              />
              <div className="mt-2">
                <button
                  onClick={onPutCustom}
                  disabled={busy || !custom.trim()}
                  className="px-3 py-2 rounded border disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save custom secret"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Prefer long, random secrets (32+ bytes). For HS256, a
                256-bit secret is recommended.
              </p>
            </div>
          </div>
        </div>
      )}

      <a
        href={`/companies/${companyId}`}
        className="text-blue-600 hover:underline"
      >
        ← Back to company
      </a>
    </div>
  );
}
