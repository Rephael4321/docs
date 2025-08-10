"use client";

import { useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";

type User = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  created_at: string;
};

type KeyRow = {
  id: number;
  key_value: string | null;
  created_at: string;
  updated_at: string;
} | null;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
  });

function enc(v: string | number) {
  return encodeURIComponent(String(v));
}

function getAppOrigin() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_ORIGIN) {
    return process.env.NEXT_PUBLIC_APP_ORIGIN!;
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function getErrorMessage(e: unknown, fallback = "Something went wrong") {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return fallback;
}

export default function CompanyUsers() {
  const { id } = useParams(); // companyId
  const companyId = String(id);

  const { data, error, isLoading, mutate } = useSWR<User[]>(
    `/api/companies/${companyId}/users`,
    fetcher
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phone.trim(),
      role: role.trim(),
    };

    if (
      !payload.first_name ||
      !payload.last_name ||
      !payload.phone_number ||
      !payload.role
    ) {
      setErr("All fields are required.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      setFirstName("");
      setLastName("");
      setPhone("");
      setRole("member");
      mutate();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to create user"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(userId: number) {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || `Failed with ${res.status}`);
      }
      mutate();
    } catch (e: unknown) {
      alert(getErrorMessage(e, "Delete failed"));
    }
  }

  async function onCopyAuthLink(u: User) {
    try {
      setBusyUserId(u.id);

      const res = await fetch(`/api/users/${u.id}/key`);
      if (!res.ok) {
        throw new Error("Failed to fetch user key");
      }
      const keyRow: KeyRow = await res.json();
      const key = keyRow?.key_value ?? null;

      if (!key) {
        alert("This user has no verification key. Create or set a key first.");
        return;
      }

      const origin = getAppOrigin();
      const url =
        `${origin}/api/auth/entry` +
        `?company_id=${enc(companyId)}` +
        `&first_name=${enc(u.first_name)}` +
        `&last_name=${enc(u.last_name)}` +
        `&phone=${enc(u.phone_number)}` +
        `&key=${enc(key)}`;

      await navigator.clipboard.writeText(url);
      alert("Auth link copied to clipboard");
    } catch (e: unknown) {
      alert(getErrorMessage(e, "Failed to prepare auth link"));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-gray-600">Company ID: {companyId}</p>
      </div>

      {/* Create form */}
      <form
        onSubmit={onCreate}
        className="space-y-4 max-w-2xl bg-white p-4 border rounded"
      >
        <h2 className="font-semibold">Add User</h2>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={busy}
              placeholder="Jane"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={busy}
              placeholder="Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone number
            </label>
            <input
              className="w-full border rounded px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
              placeholder="+972501234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={busy}
            >
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="member">member</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create user"}
          </button>
          <a
            href={`/companies/${companyId}`}
            className="px-3 py-2 rounded border"
          >
            Back
          </a>
        </div>
      </form>

      {/* List */}
      <section className="space-y-3">
        <h2 className="font-semibold">Existing Users</h2>
        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : error ? (
          <p className="text-red-600">Failed to load users</p>
        ) : !data || data.length === 0 ? (
          <p className="text-gray-600">No users yet.</p>
        ) : (
          <ul className="divide-y border rounded bg-white">
            {data.map((u) => (
              <li
                key={u.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium">
                    {u.first_name} {u.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {u.phone_number} · {u.role}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onCopyAuthLink(u)}
                    disabled={busyUserId === u.id}
                    className="px-3 py-2 rounded border disabled:opacity-60"
                    title="Copies a universal auth link that works with or without a token"
                  >
                    {busyUserId === u.id ? "Preparing…" : "Copy Auth Link"}
                  </button>
                  <button
                    onClick={() => onDelete(u.id)}
                    className="px-3 py-2 rounded bg-red-600 text-white"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-gray-500">
        The link includes first/last name, phone, and the user’s personal key.
        It works even if a token is missing. You can also add{" "}
        <code>&token=...</code> later.
      </p>
    </div>
  );
}
