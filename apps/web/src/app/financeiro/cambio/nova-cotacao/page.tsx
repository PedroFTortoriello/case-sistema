import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { emissionChecklists } from "@/lib/demo-data";

export default function NovaCotacaoPage() {
  return (
    <DashboardShell current="Nova cotacao" eyebrow="Financeiro" activeNav="finance-cambio">
      <FinanceSectionNav />
      <PageToolbar
        title="Nova cotacao cambial"
        description="Tela para registrar ou revisar a cotacao aplicada ao cliente antes da cobranca."
        actions={[
          { href: "/financeiro/cambio", label: "Voltar", tone: "secondary" },
          { href: "/financeiro/cambio", label: "Salvar cotacao" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard title="Parametros da cotacao" description="Configure origem, spread e validade da taxa financeira.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Cliente">
                <Select options={["Orion Components", "Blue Port Foods", "North Harbor Pharma"]} />
              </Field>
              <Field label="Moeda">
                <Select options={["USD", "EUR"]} />
              </Field>
              <Field label="Taxa oficial">
                <Input placeholder="0,0000" type="number" defaultValue="5.4721" />
              </Field>
              <Field label="Spread aplicado">
                <Input placeholder="0,00%" type="number" defaultValue="0.80" />
              </Field>
              <Field label="Taxa final do cliente">
                <Input placeholder="0,0000" type="number" defaultValue="5.5160" />
              </Field>
              <Field label="Validade">
                <Input placeholder="Selecione a data" type="date" />
              </Field>
              <Field label="Origem da taxa">
                <Select options={["BCB/PTAX", "Tabela comercial", "Aprovacao manual"]} />
              </Field>
              <Field label="Congelar para cobranca">
                <Select options={["Sim", "Nao"]} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Justificativa / observacoes">
                  <TextArea placeholder="Contexto da negociacao, override comercial ou observacoes para auditoria." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard title="Checklist" description="Validacoes cambiais para previsibilidade financeira.">
            <div className="space-y-3">
              {emissionChecklists.fx.map((item) => (
                <div key={item} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
