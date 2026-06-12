"use client";

import { BriefcaseBusiness, FileText, Plane } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/operacional", label: "Processos", icon: BriefcaseBusiness },
  { href: "/operacional/awb", label: "AWB", icon: Plane },
  { href: "/operacional/documentos", label: "Documentos", icon: FileText },
] as const;

export function OperationalSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 grid gap-3 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const rootActive = item.href === "/operacional" && pathname.startsWith("/operacional/processos/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-14 items-center gap-3 rounded-[18px] border px-4 text-sm font-medium transition-all duration-200 ${
              active || rootActive
                ? "border-[#CFE0F0] bg-[#EEF5FC] text-[#1E4F80]"
                : "border-[#E7EEF5] bg-white text-[#64748B] hover:border-[#D7E6F5] hover:bg-[#F9FBFD] hover:text-[#12263A]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
