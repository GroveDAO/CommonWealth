"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/governance", label: "Governance" },
  { href: "/private-voting", label: "Private voting" },
  { href: "/impact", label: "Impact" },
  { href: "/savings", label: "Savings" },
  { href: "/depin", label: "DePIN" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-[89px] z-40 border-b border-border bg-bg-page/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
        <ul className="flex items-center gap-2 py-3 min-w-max">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className={`font-mono text-xs uppercase tracking-[0.18em] rounded-full px-3 py-1.5 transition-colors border ${
                  pathname === section.href
                    ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                    : "border-transparent text-text-muted hover:text-accent-green hover:border-border"
                }`}
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
