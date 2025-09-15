// frontend/src/app/ui/orders/new/page.tsx
"use client";

import { useState } from "react";
import { getUser } from "../../../../lib/session";
import { useRouter } from "next/navigation";

// Match backend: ≤5 → SMALL, ≤15 → MEDIUM, >15 → LARGE
function tierForWeight(w: number): "SMALL" | "MEDIUM" | "LARGE" {
  if (w <= 5) return "SMALL";
  if (w <= 15) return "MEDIUM";
  return "LARGE";
}

// Client-side price mirror (rough estimate; server recomputes anyway)
function computeClientPrice(
  tier: "SMALL" | "MEDIUM" | "LARGE",
  isMember: boolean
): number {
  const base =
    tier === "SMALL" ? 200 : tier === "MEDIUM" ? 300 : 400;
  return isMember ? Math.round(base * 0.7) : base;
}

export default function NewOrderPage() {
  const [weight, setWeight] = useState<number>(0);
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const router = useRouter();
  const user = getUser();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      alert("Please login first.");
      return;
    }

    const tier = tierForWeight(weight);
    const isMember = Boolean(user.member);
    const amount = computeClientPrice(tier, isMember);

    // 1) Pay → get one-time token
    const payHttp = await fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        amount,
      }),
    });

    const payData = await payHttp.json().catch(() => ({}));
    if (!payHttp.ok || !payData?.ok || !payData?.token) {
      const msg =
        payData?.error || `Payment failed (HTTP ${payHttp.status})`;
      alert(msg);
      return;
    }

    // 2) Place the order with the token
    const orderHttp = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id,
        phone,
        address,
        pickupSlot: pickup,
        deliverySlot: delivery,
        tier,
        weightKg: weight,
        paymentToken: payData.token,
      }),
    });

    const data = await orderHttp.json().catch(() => ({}));

    if (orderHttp.ok && data?.ok) {
      router.push("/ui/orders");
      router.refresh();
      return;
    }

    const reason =
      data?.reason || data?.error || `HTTP ${orderHttp.status}`;
    if (data?.suggestion) {
      const apply = confirm(
        `Failed to create order: ${reason}\nUse suggested slot: ${data.suggestion}?`
      );
      if (apply) {
        setPickup(data.suggestion);
        return;
      }
    }
    alert(`Failed to create order: ${reason}`);
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-4">Create Order</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Address</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Weight (kg)</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="number"
            min={0}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Pickup Slot</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="datetime-local"
            step={60 * 15}
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            15-minute slots, 09:00–16:00. Wednesdays closed.
          </p>
        </div>
        <div>
          <label className="block text-sm mb-1">Delivery Slot</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="datetime-local"
            step={60 * 15}
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            required
          />
        </div>
        <button
          className="mt-2 px-4 py-2 rounded-md border hover:bg-gray-50"
          type="submit"
        >
          Pay & Place Order
        </button>
      </form>
    </div>
  );
}
