import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyStatePanel } from "@/components/empty-state-panel";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { KpiCard } from "@/components/kpi-card";
import { OperationalSectionNav } from "@/components/operational-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { documentStack, emissionChecklists, operationalStages, operationalTimeline, processRows } from "@/lib/demo-data";

export default function OperacionalPage() {
  return (
    <DashboardShell
      current="Operacional"
      eyebrow="Modulo operacional"
      title="Gestao de processos, AWB, documentos e prazos com timeline clara."
      description="O modulo operacional foi desenhado para controlar importacao, exportacao, agenda, follow-up, versionamento documental e status do processo sem contaminar a area financeira com regras de execucao."
      activeNav="ops-processos"
    >
      <OperationalSectionNav />
      <PageToolbar
        title="Operacional"
        description="Acompanhamento dos processos com atalhos dedicados para abertura, emissao de AWB e registro documental."
        actions={[
          { href: "/operacional/processos/novo", label: "Tela dedicada", tone: "secondary" },
          { href: "/operacional/awb/emissao", label: "Emitir AWB", tone: "secondary" },
          { href: "/operacional/documentos/novo", label: "Novo documento", tone: "secondary" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        {operationalStages.map((stage) => (
          <div key={stage.label} className="xl:col-span-3">
            <KpiCard label={stage.label} value={stage.value} helper={stage.helper} />
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard title="Formulario de abertura" description="Abertura de processo visivel diretamente na tela operacional.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Cliente">
                <Select options={["Orion Components", "Blue Port Foods", "North Harbor Pharma"]} />
              </Field>
              <Field label="Direcao da operacao">
                <Select options={["Importacao", "Exportacao"]} />
              </Field>
              <Field label="Modal">
                <Select options={["Aereo", "Maritimo", "Rodoviario", "Multimodal"]} />
              </Field>
              <Field label="Incoterm">
                <Select options={["CIP", "FCA", "FOB", "EXW"]} />
              </Field>
              <Field label="Origem">
                <Input placeholder="FRA" defaultValue="FRA" />
              </Field>
              <Field label="Destino">
                <Input placeholder="VCP" defaultValue="VCP" />
              </Field>
              <Field label="Previsao de embarque">
                <Input placeholder="Selecione a data" type="date" />
              </Field>
              <Field label="Previsao de chegada">
                <Input placeholder="Selecione a data" type="date" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Observacoes iniciais">
                  <TextArea placeholder="Kick-off, pendencias e observacoes do processo." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <SectionCard title="Checklist" description="Pontos minimos antes da abertura.">
            <div className="space-y-3">
              {emissionChecklists.process.map((item) => (
                <div key={item} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard
          title="Lista de processos"
          description="Painel responsivo para acompanhar cliente, modal, status, AWB e previsao de chegada."
          aside={<span>Importacao e exportacao</span>}
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
          title="Timeline do dia"
          description="Eventos operacionais que pedem atencao imediata do time."
        >
          <div className="space-y-3">
            {operationalTimeline.map((event) => (
              <div key={`${event.time}-${event.title}`} className="rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#12263A]">{event.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[#64748B]">{event.detail}</p>
                  </div>
                  <span className="rounded-[14px] bg-[#EEF5FC] px-3 py-2 font-mono text-sm font-semibold text-[#1E4F80]">
                    {event.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
          </SectionCard>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <SectionCard
          title="Pilha documental"
          description="Upload, OCR futuro, versionamento e ownership por documento."
        >
          <div className="space-y-3">
            {documentStack.map((document) => (
              <div key={`${document.type}-${document.version}`} className="grid gap-3 rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 md:grid-cols-4 md:items-center">
                <p className="font-semibold text-[#12263A]">{document.type}</p>
                <p className="text-sm text-[#64748B]">{document.version}</p>
                <p className="text-sm text-[#64748B]">{document.status}</p>
                <p className="text-sm text-[#64748B]">{document.owner}</p>
              </div>
            ))}
          </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-7">
          <SectionCard
          title="Guardrails operacionais"
          description="Pontos que reduzem retrabalho e ajudam a dar previsibilidade para cliente e diretoria."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              "Timeline imutavel de eventos relevantes por processo.",
              "Alertas de SLA e pendencias documentais em destaque.",
              "Vinculo direto entre AWB, invoice, packing list e follow-up.",
              "Separacao de ownership entre comercial, operacional e financeiro.",
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
                {item}
              </div>
            ))}
          </div>
          </SectionCard>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <EmptyStatePanel
            title="Nenhuma pendencia extraordinaria de follow-up"
            description="Todos os processos em destaque possuem responsavel definido, agenda sincronizada e trilha documental sem bloqueios novos."
          />
        </div>
      </section>
    </DashboardShell>
  );
}
