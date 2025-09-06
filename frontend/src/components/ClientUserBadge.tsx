// frontend/src/components/ClientUserBadge.tsx
"use client";

import { useEffect, useState } from "react";
import { getUser, clearUser, onSessionChange, type DemoUser } from "../lib/session";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ClientUserBadge() {
  const router = useRouter();
  const [user, setUserState] = useState<DemoUser | null>(null);

  useEffect(() => {
    setUserState(getUser());
    const unsub = onSessionChange((u) => {
      setUserState(u);
      // router.refresh(); // not needed for client-only pages
    });
    return unsub;
  }, [router]);

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/ui/login" className="px-3 py-1.5 rounded-md border hover:bg-gray-50 text-black">Login</Link>
        <Link href="/ui/register" className="px-3 py-1.5 rounded-md border hover:bg-gray-50 text-black">Register</Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">
        Signed in as <strong>{user.name}</strong>
        <span className="ml-2 px-2 py-0.5 rounded-full text-xs border">
          {user.member ? "Member" : "Standard"}
        </span>
      </span>
      <button
        onClick={() => {
          clearUser();
          // Optional: kick to login after logout
          // router.push("/ui/login");
        }}
        className="px-3 py-1.5 rounded-md border hover:bg-gray-50 text-black"
      >
        Logout
      </button>
    </div>
  );
}
