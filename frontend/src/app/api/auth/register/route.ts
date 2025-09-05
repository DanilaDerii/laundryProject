// frontend/src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";

// IMPORTANT: match exactly how you import db in /api/orders/route.ts
// If your orders route does: import { db } from "../../../../../backend/lib"
// then use the same here.
import { db } from "../../../../../../backend/lib";

type User = {
  id: string;
  name: string;
  email: string;
  member: boolean;
  password?: string;
  createdAt: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const member = Boolean(body?.member);
    const password = String(body?.password ?? ""); // demo only

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    // Ensure users array exists
    // @ts-ignore
    db.users = db.users ?? [];

    // @ts-ignore
    const exists: User | undefined = db.users.find((u: User) => u.email === email);
    if (exists) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const user: User = {
      id: email, // keep simple
      name,
      email,
      member,
      password, // plain text, demo only
      createdAt: now,
    };

    // @ts-ignore
    db.users.push(user);

    const { password: _pw, ...safe } = user;
    return NextResponse.json(safe, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}
