"use client";

import {
  Bell,
  BriefcaseBusiness,
  CircleHelp,
  FileText,
  Gauge,
  Globe2,
  Landmark,
  Mail,
  Plane,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type DashboardShellProps = {
  current: string;
  eyebrow: string;
  title?: string;
  description?: string;
  activeNav?: string;
  children: ReactNode;
};

type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navigation: NavSection[] = [
  {
    title: "Principal",
    items: [{ id: "dashboard", href: "/", label: "Dashboard", icon: Gauge }],
  },
  {
    title: "Financeiro",
    items: [
      { id: "finance-nfse", href: "/financeiro/nfse", label: "NFS-e", icon: FileText },
      { id: "finance-cobrancas", href: "/financeiro/cobrancas", label: "Cobrancas", icon: Landmark },
      { id: "finance-cambio", href: "/financeiro/cambio", label: "Cambio", icon: Globe2 },
      { id: "finance-emails", href: "/financeiro/emails", label: "E-mails", icon: Mail },
    ],
  },
  {
    title: "Operacional",
    items: [
      { id: "ops-processos", href: "/operacional", label: "Processos", icon: BriefcaseBusiness },
      { id: "ops-awb", href: "/operacional/awb", label: "AWB", icon: Plane },
      { id: "ops-documentos", href: "/operacional/documentos", label: "Documentos", icon: FileText },
    ],
  },
  {
    title: "Gestao",
    items: [
      { id: "cadastros", href: "/operacional", label: "Cadastros", icon: Globe2 },
      { id: "relatorios", href: "/admin/rbac", label: "Relatorios", icon: Gauge },
      { id: "configuracoes", href: "/admin/rbac", label: "Configuracoes", icon: Settings },
    ],
  },
];

function resolveActiveNav(current: string, activeNav?: string) {
  if (activeNav) {
    return activeNav;
  }

  const byLabel = navigation
    .flatMap((section) => section.items)
    .find((item) => item.label === current);

  return byLabel?.id;
}

export function DashboardShell({
  current,
  eyebrow,
  activeNav,
  children,
}: DashboardShellProps) {
  const selectedNav = resolveActiveNav(current, activeNav);

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#12263A]">
      <div className="lg:flex">
        <aside className="border-b border-[#E7EEF5] bg-[#0F2740] text-white lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[320px] lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-7">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/10 text-lg font-semibold tracking-[0.28em]">
                  CL
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Case Logistica</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Trade ERP</h1>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              {navigation.map((section) => (
                <div key={section.title} className="mb-6">
                  <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                    {section.title}
                  </p>
                  <div className="space-y-1.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = selectedNav === item.id;

                      return (
                        <Link
                          key={`${section.title}-${item.label}`}
                          href={item.href}
                          className={`group flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition-all duration-200 ${
                            active
                              ? "border-l-4 border-l-[#2E6AA8] bg-white/8 text-white"
                              : "border-l-4 border-l-transparent text-white/74 hover:bg-white/4 hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>


          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:ml-[320px]">
          <header className="sticky top-0 z-30 flex h-[88px] items-center justify-between border-b border-[#E7EEF5] bg-white/88 px-5 backdrop-blur-xl lg:px-10">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#64748B]">{eyebrow}</p>
              <h2 className="mt-2 truncate text-[28px] font-semibold tracking-tight text-[#12263A]">{current}</h2>
            </div>

            <div className="flex items-center gap-3">
              <label className="hidden h-[52px] w-[480px] items-center gap-3 rounded-[14px] border border-[#E7EEF5] bg-[#FAFBFC] px-4 xl:flex">
                <Search className="h-4 w-4 text-[#5F7D95]" />
                <input
                  aria-label="Busca global"
                  className="w-full bg-transparent text-sm text-[#12263A] outline-none placeholder:text-[#8AA0B5]"
                  placeholder="Buscar processos, AWB, clientes e cobrancas"
                />
              </label>

              <button
                aria-label="Notificacoes"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E7EEF5] bg-white text-[#5F7D95] transition-colors duration-200 hover:border-[#D5E3F0] hover:text-[#1E4F80]"
                type="button"
              >
                <Bell className="h-4 w-4" />
              </button>

              <button
                aria-label="Ajuda"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E7EEF5] bg-white text-[#5F7D95] transition-colors duration-200 hover:border-[#D5E3F0] hover:text-[#1E4F80]"
                type="button"
              >
                <CircleHelp className="h-4 w-4" />
              </button>

              <div className="flex h-12 items-center gap-3 rounded-2xl border border-[#E7EEF5] bg-white px-3 shadow-[0_8px_24px_rgba(15,39,64,0.06)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF5FC] text-sm font-semibold text-[#1E4F80]">
                  PF
                </div>
                <div className="hidden text-sm lg:block">
                  <p className="font-semibold text-[#12263A]">Pedro Freitas</p>
                  <p className="text-[#64748B]">Diretor</p>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 px-5 py-6 lg:h-[calc(100vh-88px)] lg:overflow-y-auto lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
