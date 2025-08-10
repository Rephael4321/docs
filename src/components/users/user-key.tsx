"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";

type KeyRow = {
  id: number;
  key_value: string; // matches DB column in verification_keys
  created_at: string;
  updated_at: string;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
  });

function maskKey(k: string) {
  if (!k) return "";
  if (k.length <= 12) return "********";
  return k.slice(0, 6) + "…" + k.slice(-6);
}

export default function UserKey() {
  const { id } = useParams(); // user id
  const userId = String(id);

  const { data, error, isLoading, mutate } = useSWR<KeyRow | null>(
    `/api/users/${userId}/key`,
    fetcher
  );

  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Custom key state
  const [editingCustom, setEditingCustom] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customShow, setCustomShow] = useState(false);

  async function onPutRandom() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/key`, { method: "PUT" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      setShow(false);
      await mutate();
    } catch (e: any) {
      setErr(e.message || "Failed to create/rotate key");
    } finally {
      setBusy(false);
    }
  }

  async function onPutCustom() {
    setErr(null);
    setBusy(true);
    try {
      const trimmed = customKey.trim();
      if (!trimmed) throw new Error("Key cannot be empty");
      const res = await fetch(`/api/users/${userId}/key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_value: trimmed }), // <-- adjust if your API uses another field name
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      setEditingCustom(false);
      setCustomKey("");
      setCustomShow(false);
      setShow(false);
      await mutate();
    } catch (e: any) {
      setErr(e.message || "Failed to set custom key");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete verification key for this user?")) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/key`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      setShow(false);
      await mutate();
    } catch (e: any) {
      setErr(e.message || "Failed to delete key");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!data?.key_value) return;
    try {
      await navigator.clipboard.writeText(data.key_value);
      alert("Copied to clipboard");
    } catch {
      alert("Copy failed");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">User Verification Key</h1>
      <p className="text-sm text-gray-600">User ID: {userId}</p>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {isLoading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-red-600">Failed to load key</p>
      ) : !data ? (
        <div className="space-y-4">
          <p className="text-gray-700">No key set for this user.</p>

          {editingCustom ? (
            <div className="space-y-2 max-w-xl">
              <label className="text-sm text-gray-700">Enter custom key</label>
              <div className="flex gap-2">
                <input
                  type={customShow ? "text" : "password"}
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Paste or type the key…"
                  autoFocus
                />
                <button
                  onClick={() => setCustomShow((s) => !s)}
                  className="px-3 py-2 rounded border"
                >
                  {customShow ? "Hide" : "Show"}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onPutCustom}
                  disabled={busy}
                  className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save Key"}
                </button>
                <button
                  onClick={() => {
                    setEditingCustom(false);
                    setCustomKey("");
                    setCustomShow(false);
                  }}
                  disabled={busy}
                  className="px-3 py-2 rounded border"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onPutRandom}
                disabled={busy}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create Random Key"}
              </button>
              <button
                onClick={() => setEditingCustom(true)}
                disabled={busy}
                className="px-3 py-2 rounded border"
              >
                Set Custom Key
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl bg-white border rounded p-4">
          <div className="space-y-1">
            <div className="text-sm text-gray-500">
              Last updated: {new Date(data.updated_at).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <code className="block w-full overflow-x-auto break-all border rounded px-2 py-1 bg-gray-50">
                {show ? data.key_value : maskKey(data.key_value)}
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

          {editingCustom ? (
            <div className="space-y-2">
              <label className="text-sm text-gray-700">
                Replace with custom key
              </label>
              <div className="flex gap-2">
                <input
                  type={customShow ? "text" : "password"}
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Paste or type the key…"
                  autoFocus
                />
                <button
                  onClick={() => setCustomShow((s) => !s)}
                  className="px-3 py-2 rounded border"
                >
                  {customShow ? "Hide" : "Show"}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onPutCustom}
                  disabled={busy}
                  className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save Custom Key"}
                </button>
                <button
                  onClick={() => {
                    setEditingCustom(false);
                    setCustomKey("");
                    setCustomShow(false);
                  }}
                  disabled={busy}
                  className="px-3 py-2 rounded border"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onPutRandom}
                disabled={busy}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
              >
                {busy ? "Rotating…" : "Rotate (Random)"}
              </button>
              <button
                onClick={() => setEditingCustom(true)}
                disabled={busy}
                className="px-3 py-2 rounded border"
              >
                Set Custom Key
              </button>
              <button
                onClick={onDelete}
                disabled={busy}
                className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Tip: store only a hash of this key in production if it’s used as a
            bearer secret.
          </p>
        </div>
      )}

      <a href={`/users/${userId}`} className="text-blue-600 hover:underline">
        ← Back to user
      </a>
    </div>
  );
}
