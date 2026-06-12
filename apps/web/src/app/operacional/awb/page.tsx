import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { OperationalSectionNav } from "@/components/operational-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { emissionChecklists, processRows } from "@/lib/demo-data";

export default function OperacionalAwbPage() {
  return (
    <DashboardShell current="AWB" eyebrow="Operacional" activeNav="ops-awb">
      <OperationalSectionNav />
      <PageToolbar
        title="AWB"
        description="Emissao e consulta de AWB em uma tela propria, sem depender do detalhe do processo."
        actions={[{ href: "/operacional/awb/emissao", label: "Tela dedicada", tone: "secondary" }]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard title="Formulario de emissao" description="Preencha os dados principais do AWB diretamente nesta tela.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Processo">
                <Select options={["IMP-2026-0048", "EXP-2026-0019", "IMP-2026-0039"]} />
              </Field>
              <Field label="Numero AWB">
                <Input placeholder="057-12345675" defaultValue="057-12345675" />
              </Field>
              <Field label="Companhia aerea">
                <Select options={["LATAM Cargo", "American Airlines Cargo", "Lufthansa Cargo"]} />
              </Field>
              <Field label="Origem">
                <Input placeholder="FRA" defaultValue="FRA" />
              </Field>
              <Field label="Destino">
                <Input placeholder="VCP" defaultValue="VCP" />
              </Field>
              <Field label="Peso (kg)">
                <Input placeholder="0,000" type="number" defaultValue="830.5" />
              </Field>
              <Field label="Volume (m3)">
                <Input placeholder="0,000" type="number" defaultValue="4.2" />
              </Field>
              <Field label="Valor da carga">
                <Input placeholder="0,00" type="number" defaultValue="126000" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Observacoes">
                  <TextArea placeholder="Notas operacionais, restricoes e house/master references." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <SectionCard title="Checklist" description="Conferencias minimas para emissao.">
            <div className="space-y-3">
              {emissionChecklists.awb.map((item) => (
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
          <SectionCard title="AWBs recentes" description="Consulta rapida dos embarques recentes vinculados aos processos ativos.">
            <div className="space-y-3">
              {processRows.map((process) => (
                <div key={process.id} className="grid gap-3 rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 md:grid-cols-5 md:items-center">
                  <p className="font-semibold text-[#12263A]">{process.id}</p>
                  <p className="text-sm text-[#64748B]">{process.client}</p>
                  <p className="font-mono text-sm text-[#1E4F80]">{process.awb}</p>
                  <p className="text-sm text-[#64748B]">{process.status}</p>
                  <p className="text-sm text-[#64748B]">{process.eta}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
