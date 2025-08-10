import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="text-gray-600">
        Quick links to manage companies, users, JWTs, verification keys, and
        tokens.
      </p>

      <ul className="list-disc list-inside space-y-2">
        <li>
          <Link href="/companies" className="text-blue-600 hover:underline">
            Manage Companies
          </Link>
        </li>
        <li>
          <Link href="/users" className="text-blue-600 hover:underline">
            View All Users
          </Link>
        </li>
      </ul>
    </main>
  );
}
