"use client";

import useSWR from "swr";
import Link from "next/link";

type Row = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  company_id: number;
  company_name: string;
  created_at: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function UsersList() {
  const { data, error, isLoading } = useSWR<Row[]>("/api/users", fetcher);

  if (isLoading) return <p className="text-gray-600">Loading…</p>;
  if (error) return <p className="text-red-600">Failed to load users</p>;
  if (!data?.length) return <p className="text-gray-600">No users yet.</p>;

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">All Users</h1>
      <ul className="divide-y border rounded bg-white">
        {data.map((u) => (
          <li
            key={u.id}
            className="p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div>
              <div className="font-medium">
                {u.first_name} {u.last_name}{" "}
                <span className="text-xs text-gray-500">· {u.role}</span>
              </div>
              <div className="text-sm text-gray-500">
                {u.phone_number} · Company:{" "}
                <Link
                  href={`/companies/${u.company_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {u.company_name}
                </Link>
              </div>
            </div>
            <div className="text-sm">
              <Link
                href={`/users/${u.id}/key`}
                className="text-blue-600 hover:underline mr-3"
              >
                Key
              </Link>
              <Link
                href={`/users/${u.id}/tokens`}
                className="text-blue-600 hover:underline"
              >
                Tokens
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
