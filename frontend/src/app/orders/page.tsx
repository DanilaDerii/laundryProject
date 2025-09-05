// frontend/src/app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getUser } from "../../lib/session";
import Link from "next/link";

type Order = {
  id: string;
  userId: string;
  weight: number;
  tier: "SMALL" | "MEDIUM" | "LARGE";
  price: number;
  memberDiscount: number; // e.g., 0.3 for 30%
  paid: boolean;
  status: "PLACED" | "PICKED_UP" | "WASHING" | "OUT_FOR_DELIVERY" | "COMPLETED" | "FAILED_PICKUP";
  pickupSlot: string; // ISO datetime
  createdAt: string;  // ISO datetime
};

export default function OrdersPage() {
  const user = getUser();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Order[];
      // If logged in, show user's orders first
      const mine = user ? data.filter(o => o.userId === user.email) : [];
      const others = user ? data.filter(o => o.userId !== user.email) : data;
      setOrders([...mine, ...others]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function fmt(dt: string) {
    try {
      const d = new Date(dt);
      // yyyy-mm-dd hh:mm (24h)
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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">My Orders</h1>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1.5 rounded-md border hover:bg-gray-50">Refresh</button>
          <Link href="/orders/new" className="px-3 py-1.5 rounded-md border hover:bg-gray-50">New Order</Link>
        </div>
      </div>

      {!user && (
        <div className="mb-4 rounded-md border p-3">
          <p className="text-sm">
            You’re not logged in. <Link href="/login" className="underline">Login</Link> or{" "}
            <Link href="/register" className="underline">Register</Link> to create an order.
          </p>
        </div>
      )}

      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600">Error: {err}</p>}

      {orders && orders.length === 0 && !loading && !err && (
        <p>No orders yet.</p>
      )}

      <ul className="space-y-3">
        {orders?.map(o => (
          <li key={o.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Order #{o.id.slice(0, 6)}</div>
              <span className="text-xs rounded-full border px-2 py-0.5">{o.status}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
              <div>Tier: <strong>{o.tier}</strong></div>
              <div>Weight: <strong>{o.weight} kg</strong></div>
              <div>Pickup: <strong>{fmt(o.pickupSlot)}</strong></div>
              <div>Created: <strong>{fmt(o.createdAt)}</strong></div>
              <div>
                Price: <strong>{o.price.toFixed(2)}</strong>
                {o.memberDiscount ? <span className="ml-1 text-xs">(−{Math.round(o.memberDiscount * 100)}% member)</span> : null}
              </div>
              <div>Paid: <strong>{o.paid ? "Yes" : "No"}</strong></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
