import { NextResponse } from "next/server";
import { db } from "../../../../../../backend/lib";

type AnyUser = {
  id: string;
  name: string;
  email: string;
  isMember?: boolean;
  member?: boolean;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? ""); // demo

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Prefer official user list if available
    const users: AnyUser[] =
      (typeof (db as any).listUsers === "function" ? (db as any).listUsers() : ((db as any).users ?? []));

    let user = users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Demo password rule: only enforce if a password was stored
    if ((user.password ?? "").length > 0 && user.password !== password) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, member: Boolean(user.isMember ?? user.member) },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}
