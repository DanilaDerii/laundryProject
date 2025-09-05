// frontend/src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import ClientUserBadge from "../components/ClientUserBadge";

export const metadata = {
  title: "Laundry App",
  description: "Demo laundry ordering UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-semibold text-black">Laundry</Link>
              <Link href="/orders/new" className="hover:underline text-black">Create Order</Link>
              <Link href="/orders" className="hover:underline text-black">My Orders</Link>
            </div>
            <div className="flex items-center gap-3">
              <ClientUserBadge />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
