import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { KpiCard } from "@/components/kpi-card";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { financeMetrics, financeOverviewCards } from "@/lib/demo-data";

export default function FinanceiroPage() {
  return (
    <DashboardShell current="Financeiro" eyebrow="Modulo financeiro">
      <FinanceSectionNav />
      <PageToolbar
        title="Centro financeiro"
        description="Visao executiva do modulo e atalhos para abrir emissoes especificas sem concentrar tudo em uma unica tela."
        actions={[
          { href: "/financeiro/cobrancas/emissao", label: "Emitir cobranca" },
          { href: "/financeiro/nfse/emissao", label: "Emitir NFS-e", tone: "secondary" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        {financeMetrics.map((metric) => (
          <div key={metric.label} className="xl:col-span-3">
            <KpiCard label={metric.label} value={metric.value} helper={metric.meta} />
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <SectionCard
            title="Areas do financeiro"
            description="Cada frente do modulo financeiro agora fica em sua propria tela para evitar excesso de informacao concentrada em um unico lugar."
          >
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {financeOverviewCards.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-5 transition-all duration-200 hover:border-[#D2E1EF] hover:shadow-[0_12px_30px_rgba(15,39,64,0.08)]"
                >
                  <p className="text-lg font-semibold text-[#12263A]">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-[#64748B]">{item.description}</p>
                  <span className="mt-5 inline-flex text-sm font-medium text-[#1E4F80]">Abrir tela</span>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
