"use client";

import { Globe2, Landmark, Mail, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/financeiro", label: "Visao geral", icon: Landmark },
  { href: "/financeiro/cobrancas", label: "Cobrancas", icon: Landmark },
  { href: "/financeiro/nfse", label: "NFS-e", icon: FileText },
  { href: "/financeiro/cambio", label: "Cambio", icon: Globe2 },
  { href: "/financeiro/emails", label: "E-mails", icon: Mail },
] as const;

export function FinanceSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 grid gap-3 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-14 items-center gap-3 rounded-[18px] border px-4 text-sm font-medium transition-all duration-200 ${
              active
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
