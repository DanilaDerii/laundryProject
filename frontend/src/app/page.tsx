// frontend/src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/ui/orders");
  return null; // never rendered, but keeps TS happy
}
