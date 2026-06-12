import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { KpiCard } from "@/components/kpi-card";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { emissionChecklists, fxBoard, fxPolicies } from "@/lib/demo-data";

const fxMetrics = [
  { label: "USD oficial", value: "5,4721", helper: "Referencia do provider base para hoje." },
  { label: "EUR oficial", value: "6,1114", helper: "Base para cobrancas em euro e simulacoes." },
  { label: "Clientes com spread", value: "18", helper: "Tabelas personalizadas com contrato vigente." },
] as const;

export default function FinanceiroCambioPage() {
  return (
    <DashboardShell current="Cambio" eyebrow="Financeiro" activeNav="finance-cambio">
      <FinanceSectionNav />
      <PageToolbar
        title="Cambio"
        description="Taxas oficiais, spreads por cliente e governanca das cotacoes financeiras."
        actions={[{ href: "/financeiro/cambio/nova-cotacao", label: "Tela dedicada", tone: "secondary" }]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        {fxMetrics.map((metric) => (
          <div key={metric.label} className="xl:col-span-4">
            <KpiCard label={metric.label} value={metric.value} helper={metric.helper} />
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard title="Formulario de cotacao" description="Cadastre ou revise a taxa diretamente nesta tela.">
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
              <Field label="Spread">
                <Input placeholder="0,00" type="number" defaultValue="0.80" />
              </Field>
              <Field label="Taxa final">
                <Input placeholder="0,0000" type="number" defaultValue="5.5160" />
              </Field>
              <Field label="Validade">
                <Input placeholder="Selecione a data" type="date" />
              </Field>
              <Field label="Origem da taxa">
                <Select options={["BCB/PTAX", "Tabela comercial", "Aprovacao manual"]} />
              </Field>
              <Field label="Congelar na cobranca">
                <Select options={["Sim", "Nao"]} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Observacoes">
                  <TextArea placeholder="Contexto comercial, override ou observacoes de auditoria." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <SectionCard title="Checklist" description="Boas praticas para registrar a cotacao.">
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

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard
            title="Tabela cambial"
            description="Tela separada para visualizacao e governanca das taxas financeiras."
          >
            <div className="space-y-3">
              {fxBoard.map((rate) => (
                <div key={rate.currency} className="grid gap-3 rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 md:grid-cols-5 md:items-center">
                  <p className="font-semibold text-[#12263A]">{rate.currency}</p>
                  <p className="text-sm text-[#64748B]">Oficial {rate.officialRate}</p>
                  <p className="text-sm text-[#64748B]">Cliente {rate.clientRate}</p>
                  <p className="text-sm text-[#64748B]">Spread {rate.spread}</p>
                  <p className="text-sm font-semibold text-[#1E4F80]">{rate.source}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <SectionCard
            title="Politicas de cambio"
            description="Regras para previsibilidade financeira, auditoria e congelamento de taxa."
          >
            <div className="space-y-3">
              {fxPolicies.map((item) => (
                <div key={item} className="rounded-[20px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
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
