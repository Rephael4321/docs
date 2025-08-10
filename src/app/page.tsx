import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome to the Admin CMS</h1>
      <p className="text-gray-600">
        Use the sections below to manage companies, users, and related
        resources.
      </p>

      <ul className="list-disc list-inside space-y-2">
        <li>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Dashboard Overview
          </Link>
        </li>
        <li>
          <Link href="/companies" className="text-blue-600 hover:underline">
            Manage Companies
          </Link>
        </li>
        <li>
          <Link href="/users" className="text-blue-600 hover:underline">
            Manage Users
          </Link>
        </li>
      </ul>
    </main>
  );
}
