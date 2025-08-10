"use client";

import useSWR from "swr";
import Link from "next/link";

type Company = {
  id: number;
  name: string;
  created_at: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CompaniesList() {
  const { data, error, isLoading } = useSWR<Company[]>(
    "/api/companies",
    fetcher
  );

  if (isLoading) return <p className="text-gray-600">Loading...</p>;
  if (error) return <p className="text-red-600">Failed to load companies</p>;

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Companies</h1>
        <Link
          href="/companies/new"
          className="px-3 py-2 rounded bg-black text-white hover:bg-gray-800"
        >
          New Company
        </Link>
      </div>

      {data?.length === 0 ? (
        <p className="text-gray-600">No companies yet.</p>
      ) : (
        <ul className="divide-y border rounded bg-white">
          {data?.map((c) => (
            <li
              key={c.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-500">
                  Created {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
              <Link
                href={`/companies/${c.id}`}
                className="text-blue-600 hover:underline"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
