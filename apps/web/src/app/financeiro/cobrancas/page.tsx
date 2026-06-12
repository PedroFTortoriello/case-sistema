import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { KpiCard } from "@/components/kpi-card";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { chargeQueue, emissionChecklists, financeMetrics } from "@/lib/demo-data";

export default function FinanceiroCobrancasPage() {
  return (
    <DashboardShell current="Cobrancas" eyebrow="Financeiro" activeNav="finance-cobrancas">
      <FinanceSectionNav />
      <PageToolbar
        title="Cobrancas"
        description="Gestao de titulos, vencimentos e status financeiros por cliente e processo."
        actions={[{ href: "/financeiro/cobrancas/emissao", label: "Tela dedicada", tone: "secondary" }]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        {financeMetrics.slice(0, 3).map((metric) => (
          <div key={metric.label} className="xl:col-span-4">
            <KpiCard label={metric.label} value={metric.value} helper={metric.meta} />
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard
            title="Formulario de emissao"
            description="A emissao agora aparece diretamente na tela de cobrancas."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Cliente">
                <Select options={["Orion Components", "Blue Port Foods", "North Harbor Pharma"]} />
              </Field>
              <Field label="Processo">
                <Select options={["IMP-2026-0048", "EXP-2026-0019", "IMP-2026-0039"]} />
              </Field>
              <Field label="Metodo">
                <Select options={["PIX", "Boleto", "Link de pagamento", "Internacional"]} />
              </Field>
              <Field label="Centro de custo">
                <Select options={["Importacao aerea", "Exportacao aerea", "Servicos aduaneiros"]} />
              </Field>
              <Field label="Moeda">
                <Select options={["BRL", "USD", "EUR"]} />
              </Field>
              <Field label="Valor">
                <Input placeholder="0,00" type="number" defaultValue="18450" />
              </Field>
              <Field label="Vencimento">
                <Input placeholder="Selecione a data" type="date" />
              </Field>
              <Field label="Parcelamento">
                <Select options={["1 parcela", "2 parcelas", "3 parcelas", "4 parcelas"]} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Observacoes">
                  <TextArea placeholder="Instrucoes para cliente, link de pagamento ou observacoes internas." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <SectionCard title="Checklist" description="Validacoes antes da emissao.">
            <div className="space-y-3">
              {emissionChecklists.charge.map((item) => (
                <div key={item} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <SectionCard
            title="Fila de cobrancas"
            description="Titulos separados em tela propria para leitura mais limpa e gestao direta do contas a receber."
            aside={<span>Metodo: boleto, PIX, link e internacional</span>}
          >
            <div className="overflow-hidden rounded-[20px] border border-[#E7EEF5]">
              <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-[#F9FBFD]">
                    <tr className="text-left text-sm text-[#5F7D95]">
                      {["Cliente", "Processo", "Status", "Metodo", "Valor", "Acoes"].map((column) => (
                        <th key={column} className="border-b border-[#E7EEF5] px-5 py-4 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chargeQueue.map((charge, index) => (
                      <tr key={`${charge.client}-${charge.process}`} className="bg-white text-sm text-[#12263A]">
                        <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          <div>
                            <p className="font-semibold text-[#12263A]">{charge.client}</p>
                            <p className="mt-1 text-sm text-[#64748B]">{charge.dueDate}</p>
                          </div>
                        </td>
                        <td className={`px-5 py-4 font-semibold ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {charge.process}
                        </td>
                        <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          <StatusPill status={charge.status} />
                        </td>
                        <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {charge.method}
                        </td>
                        <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {charge.amount}
                        </td>
                        <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          <button
                            className="inline-flex h-10 items-center rounded-[14px] bg-[#1E4F80] px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#173A5E]"
                            type="button"
                          >
                            Gerir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
