"use client";

import { useState } from "react";
import { getUser } from "../../../../lib/session";
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
  const [delivery, setDelivery] = useState("");
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
        customerId: user.id,                  
        customerName: user.name || "Anon",
        phone: "1",
        address: "A",
        pickupSlot: pickup,               // expect "YYYY-MM-DDTHH:mm"
        deliverySlot: delivery || pickup, // placeholder
        tier,
        weightKg: weight,
        paid: true,
      }),
    });

    if (res.ok) {
      router.push("/ui/orders");
      router.refresh();
      return;
    }

    // Show reason and, if provided, auto-apply server suggestion
    const data = await res.json().catch(() => ({}));
    const reason = data?.reason || data?.error || `HTTP ${res.status}`;
    if (data?.suggestion) {
      const apply = confirm(`Failed to create order: ${reason}\nUse suggested slot: ${data.suggestion}?`);
      if (apply) {
        setPickup(data.suggestion);
        // You can also mirror delivery if you want:
        // setDelivery(data.suggestion);
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
          <label className="block text-sm mb-1">Weight (kg)</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="number"
            min={0}
            value={weight}
            onChange={e => setWeight(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Pickup Slot</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="datetime-local"
            step={60 * 15}                 // ← 15-minute increments
            value={pickup}
            onChange={e => setPickup(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            15-minute slots, 09:00–16:00. Wednesdays closed.
          </p>
        </div>
        <div>
          <label className="block text-sm mb-1">Delivery Slot (placeholder)</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="datetime-local"
            step={60 * 15}                 // ← same here
            value={delivery}
            onChange={e => setDelivery(e.target.value)}
          />
        </div>
        <button className="mt-2 px-4 py-2 rounded-md border hover:bg-gray-50" type="submit">
          Place Order
        </button>
      </form>
    </div>
  );
}
