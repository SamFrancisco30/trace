"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Journal" },
  { href: "/stats", label: "Stats" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-wide text-black"
        >
          Trace
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-black text-white"
                    : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}