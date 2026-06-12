import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyStatePanel } from "@/components/empty-state-panel";
import { KpiCard } from "@/components/kpi-card";
import { LoadingSkeletonPanel } from "@/components/loading-skeleton-panel";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { deliverables, executiveMetrics, moduleCards, operationalTimeline, processRows } from "@/lib/demo-data";

export default function Home() {
  return (
    <DashboardShell
      current="Dashboard"
      eyebrow="Control tower"
      title="Sistema web de Comercio Exterior com operacao rastreavel e financeiro governado."
      description="Esta base centraliza processos, documentos, AWB, cobrancas, NFS-e, cambio e auditoria em uma arquitetura preparada para crescimento, multiempresa e integracoes via APIs."
      activeNav="dashboard"
    >
      <section className="grid gap-6 xl:grid-cols-12">
        {executiveMetrics.map((metric) => (
          <div key={metric.label} className="xl:col-span-3">
            <KpiCard
              label={metric.label}
              value={metric.value}
              helper={metric.description}
              badge={metric.delta}
            />
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard
            title="Mapa do produto"
            description="Modulos principais desenhados para lidar com alta densidade operacional sem poluir a leitura."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {moduleCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-5 transition-all duration-200 hover:border-[#D2E1EF] hover:shadow-[0_12px_30px_rgba(15,39,64,0.08)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-[#EEF5FC] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#1E4F80]">
                      {card.accent}
                    </span>
                    <span className="text-sm font-medium text-[#1E4F80]">Abrir</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[#12263A]">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#64748B]">{card.description}</p>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <LoadingSkeletonPanel />
          <EmptyStatePanel
            title="Nenhuma excecao critica no momento"
            description="A control tower esta operando dentro do SLA configurado, com follow-up e faturamento sob controle."
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard
            title="Processos prioritarios"
            description="Tabela principal de operacoes em acompanhamento com leitura rapida e acoes claras."
            aside={<span>Header fixo e foco em desktop</span>}
          >
            <div className="overflow-hidden rounded-[20px] border border-[#E7EEF5]">
              <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-[#F9FBFD]">
                    <tr className="text-left text-sm text-[#5F7D95]">
                      {["Cliente", "Processo", "Status", "AWB", "Valor", "Acoes"].map((column) => (
                        <th key={column} className="border-b border-[#E7EEF5] px-5 py-4 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processRows.map((process, index) => (
                      <tr key={process.id} className="bg-white text-sm text-[#12263A]">
                        <td className={`px-5 py-4 ${index !== processRows.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {process.client}
                        </td>
                        <td className={`px-5 py-4 font-semibold ${index !== processRows.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {process.id}
                        </td>
                        <td className={`px-5 py-4 ${index !== processRows.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          <StatusPill status={process.status === "Em transito" ? "Em transito" : process.status} />
                        </td>
                        <td className={`px-5 py-4 font-mono text-[#1E4F80] ${index !== processRows.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {process.awb}
                        </td>
                        <td className={`px-5 py-4 ${index !== processRows.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {index === 0 ? "R$ 18.450,00" : index === 1 ? "USD 3.280,00" : "R$ 42.900,00"}
                        </td>
                        <td className={`px-5 py-4 ${index !== processRows.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          <Link
                            href={`/processos/${process.id}`}
                            className="inline-flex h-10 items-center rounded-[14px] border border-[#D8E2EC] bg-white px-4 text-sm font-medium text-[#1E4F80] transition-colors duration-200 hover:bg-[#F5F9FD]"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-4">
          <SectionCard
            title="Entregaveis ja amarrados"
            description="O trabalho ja foi organizado em base tecnica, modelagem e roadmap."
          >
            <div className="space-y-3">
              {deliverables.map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-[#E7EEF5] bg-[#FBFDFF] px-4 py-3 text-sm leading-7 text-[#64748B]"
                >
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <SectionCard
            title="Separacao de responsabilidades"
            description="Regras visuais e operacionais preservam ownership entre times."
          >
            <div className="space-y-4">
              <div className="rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5F7D95]">Financeiro</p>
                <p className="mt-3 text-lg font-semibold text-[#12263A]">Cobrancas, NFS-e, fluxo de caixa e cambio</p>
                <p className="mt-3 text-sm leading-7 text-[#64748B]">
                  Opera com aging, aprovacao fiscal, historico de envio e controle consolidado de receita.
                </p>
              </div>
              <div className="rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5F7D95]">Operacional</p>
                <p className="mt-3 text-lg font-semibold text-[#12263A]">Processos, AWB, documentos e SLA</p>
                <p className="mt-3 text-sm leading-7 text-[#64748B]">
                  Mantem timeline, agenda e conformidade documental sem manipular cobrancas e faturamento.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-7">
          <SectionCard
            title="Eventos recentes"
            description="Timeline executiva para diretoria e operacao acompanharem o ritmo do dia."
            aside={<span>Ultimas 6 horas</span>}
          >
            <div className="space-y-3">
              {operationalTimeline.map((event) => (
                <div
                  key={`${event.time}-${event.title}`}
                  className="grid gap-4 rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 md:grid-cols-[96px_1fr]"
                >
                  <div className="rounded-[16px] bg-[#EEF5FC] px-4 py-3 text-center font-mono text-sm font-semibold text-[#1E4F80]">
                    {event.time}
                  </div>
                  <div>
                    <p className="font-semibold text-[#12263A]">{event.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[#64748B]">{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
