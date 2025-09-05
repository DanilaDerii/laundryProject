// frontend/src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";

// IMPORTANT: path depth must match your register route.
// Your register used "../../../../../../backend/lib"
import { db } from "../../../../../../backend/lib";

type User = {
  id: string;
  name: string;
  email: string;
  member: boolean;
  password?: string;   // demo only
  createdAt: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? ""); // demo only

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Ensure users array exists
    // @ts-ignore
    db.users = db.users ?? [];

    // @ts-ignore
    const user: User | undefined = db.users.find((u: User) => u.email === email);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Super-dumb password check (demo)
    // - If the stored password is empty/undefined, allow login without a password (seeded or old users)
    // - If stored password exists, require exact match
    const stored = user.password ?? "";
    const needsPassword = stored.length > 0;
    if (needsPassword && stored !== password) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const { password: _pw, ...safe } = user;
    return NextResponse.json(safe, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}
