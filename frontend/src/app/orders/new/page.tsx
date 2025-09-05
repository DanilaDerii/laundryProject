// frontend/src/app/orders/new/page.tsx
"use client";

import { useState } from "react";
import { getUser } from "../../../lib/session";
import { useRouter } from "next/navigation";

// Simple helper: weight → tier
function tierForWeight(w: number): "SMALL" | "MEDIUM" | "LARGE" {
  if (w <= 2) return "SMALL";
  if (w <= 5) return "MEDIUM";
  return "LARGE";
}

export default function NewOrderPage() {
  const [weight, setWeight] = useState<number>(0);
  const [pickup, setPickup] = useState("");
  const router = useRouter();
  const user = getUser();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      alert("Please login first.");
      return;
    }
    const tier = tierForWeight(weight);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.email,
        weight,
        tier,
        pickupSlot: pickup,
        paid: true, // until we add payment
      }),
    });
    if (res.ok) {
      router.push("/orders");
      router.refresh();
    } else {
      alert("Failed to create order");
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-4">Create Order</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Weight (kg)</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="number"
            value={weight}
            onChange={e => setWeight(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Pickup Slot</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="datetime-local"
            value={pickup}
            onChange={e => setPickup(e.target.value)}
          />
        </div>
        <button
          className="mt-2 px-4 py-2 rounded-md border hover:bg-gray-50"
          type="submit"
        >
          Place Order
        </button>
      </form>
    </div>
  );
}
