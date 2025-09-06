import { NextResponse } from "next/server";
import { db } from "../../../../../../backend/lib";

type AnyUser = {
  id: string;
  name: string;
  email: string;
  isMember?: boolean;
  member?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const member = Boolean(body?.member);

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    // If the store exposes listUsers, use it to check duplicates; else fall back to db.users
    const users: AnyUser[] =
      (typeof (db as any).listUsers === "function" ? (db as any).listUsers() : ((db as any).users ?? []));

    if (users.some(u => u.email === email)) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    // Let the store generate the id (do NOT pass id here)
    const created: AnyUser = (db as any).createUser
      ? (db as any).createUser({ name, email, isMember: member })
      : // fallback for very old store shape
        ((db as any).users = (db as any).users ?? [],
         (db as any).users.push({ id: email, name, email, isMember: member, member }),
         { id: email, name, email, isMember: member });

    return NextResponse.json(
      { id: created.id, name: created.name, email: created.email, member: Boolean(created.isMember ?? created.member) },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}
