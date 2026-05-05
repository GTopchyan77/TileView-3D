"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "3D Visualizer" },
  { href: "/floor-plan-to-3d-demo", label: "Floor Plan Demo" },
  { href: "/admin", label: "Admin" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-30">
      <nav className="panel mx-auto flex max-w-[1600px] items-center justify-between rounded-full px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <span className="glass-chip rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.16)]">
            Demo Mode
          </span>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-300">
            Tile Demo
          </p>
          <p className="text-sm font-semibold text-slate-50 md:text-base">3D Tile Room Visualizer</p>
        </div>

        <div className="glass-chip flex items-center gap-2 rounded-full p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-sky-400 text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)]"
                    : "text-slate-200 hover:bg-white/8 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
