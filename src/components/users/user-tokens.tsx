"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";

type TokenRow = {
  id: number;
  token: string;
  created_at: string;
  updated_at: string;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
  });

function mask(t: string) {
  if (!t) return "";
  if (t.length <= 10) return "********";
  return t.slice(0, 6) + "…" + t.slice(-6);
}

function getErrorMessage(e: unknown, fallback = "Something went wrong") {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return fallback;
}

export default function UserTokens() {
  const { id } = useParams();
  const userId = String(id);

  const { data, error, isLoading, mutate } = useSWR<TokenRow[]>(
    `/api/users/${userId}/tokens`,
    fetcher
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showMap, setShowMap] = useState<Record<number, boolean>>({});

  async function createToken() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/tokens`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      await mutate();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to create token"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteToken(tokenId: number) {
    if (!confirm("Delete this token?")) return;
    setErr(null);
    try {
      const res = await fetch(`/api/tokens/${tokenId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      await mutate();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to delete token"));
    }
  }

  async function copyToken(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      alert("Copied");
    } catch {
      alert("Copy failed");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">User Tokens</h1>
      <p className="text-sm text-gray-600">User ID: {userId}</p>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2">
        <button
          onClick={createToken}
          disabled={busy}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create Token"}
        </button>
        <a href={`/users/${userId}`} className="px-3 py-2 rounded border">
          Back
        </a>
      </div>

      {isLoading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-red-600">Failed to load tokens</p>
      ) : !data || data.length === 0 ? (
        <p className="text-gray-600">No tokens yet.</p>
      ) : (
        <ul className="divide-y border rounded bg-white">
          {data.map((t) => {
            const show = !!showMap[t.id];
            return (
              <li
                key={t.id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="text-sm text-gray-500">
                    Created: {new Date(t.created_at).toLocaleString()}
                  </div>
                  <code className="block overflow-x-auto break-all border rounded px-2 py-1 bg-gray-50 mt-1">
                    {show ? t.token : mask(t.token)}
                  </code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setShowMap((m) => ({ ...m, [t.id]: !m[t.id] }))
                    }
                    className="px-2 py-1 rounded border"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => copyToken(t.token)}
                    className="px-2 py-1 rounded border"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => deleteToken(t.id)}
                    className="px-3 py-2 rounded bg-red-600 text-white"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
