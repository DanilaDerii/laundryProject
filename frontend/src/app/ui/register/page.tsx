// frontend/src/app/ui/register/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { setUser } from "../../../lib/session";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [member, setMember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, member }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      setUser({ id: data.id, name: data.name, email: data.email, member: data.member });
      router.push("/ui/orders");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-4">Register</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={member}
            onChange={e => setMember(e.target.checked)}
          />
          <span>Membership (30% off pricing)</span>
        </label>
        <button
          className="mt-2 px-4 py-2 rounded-md border hover:bg-gray-50"
          type="submit"
          disabled={loading}
        >
          {loading ? "Registering…" : "Create account"}
        </button>
      </form>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <p className="text-sm mt-3">
        Already have an account?{" "}
        <Link className="underline" href="/ui/login">
          Login
        </Link>
      </p>
    </div>
  );
}
