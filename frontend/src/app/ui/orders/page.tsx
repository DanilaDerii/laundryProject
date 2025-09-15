// frontend/src/app/ui/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getUser } from "../../../lib/session";
import Link from "next/link";

type Order = {
  id: string;
  customerId: string;
  customerName: string;
  tier: "SMALL" | "MEDIUM" | "LARGE";
  price: number;
  paid: boolean;
  status:
    | "PLACED"
    | "PICKED_UP"
    | "WASHING"
    | "OUT_FOR_DELIVERY"
    | "COMPLETED"
    | "FAILED_PICKUP";
  pickupSlot: string;
  deliverySlot?: string;
  createdAt: string;
  weightKg?: number;
};

export default function OrdersPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getUser> | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getUser()); // read localStorage only on client
  }, []);

  async function load() {
    if (!user) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/orders?customerId=${encodeURIComponent(user.id)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  function fmt(dt: string) {
    try {
      const d = new Date(dt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${day} ${hh}:${mm}`;
    } catch {
      return dt;
    }
  }

  // Avoid SSR/client mismatch
  if (!mounted) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">My Orders</h1>
          <div className="h-9 w-28 rounded-md border" />
        </div>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">My Orders</h1>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-md border hover:bg-gray-50"
          >
            Refresh
          </button>
          <Link
            href="/ui/orders/new"
            className="px-3 py-1.5 rounded-md border hover:bg-gray-50"
          >
            New Order
          </Link>
        </div>
      </div>

      {!user && (
        <div className="mb-4 rounded-md border p-3">
          <p className="text-sm">
            You’re not logged in.{" "}
            <Link href="/ui/login" className="underline">
              Login
            </Link>{" "}
            or{" "}
            <Link href="/ui/register" className="underline">
              Register
            </Link>{" "}
            to create an order.
          </p>
        </div>
      )}

      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600">Error: {err}</p>}

      {user && !loading && !err && orders.length === 0 && (
        <p>No orders yet.</p>
      )}

      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Order #{o.id.slice(0, 6)}</div>
              <span className="text-xs rounded-full border px-2 py-0.5">
                {o.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
              <div>
                Tier: <strong>{o.tier}</strong>
              </div>
              <div>
                Pickup: <strong>{fmt(o.pickupSlot)}</strong>
              </div>
              <div>
                Created: <strong>{fmt(o.createdAt)}</strong>
              </div>
              {typeof o.weightKg === "number" && (
                <div>
                  Weight: <strong>{o.weightKg} kg</strong>
                </div>
              )}
              <div>
                Price: <strong>{o.price.toFixed(2)}</strong>
              </div>
              <div>
                Paid: <strong>{o.paid ? "Yes" : "No"}</strong>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
