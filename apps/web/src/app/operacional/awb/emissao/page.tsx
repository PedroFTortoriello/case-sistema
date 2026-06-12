import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { OperationalSectionNav } from "@/components/operational-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { emissionChecklists } from "@/lib/demo-data";

export default function EmissaoAwbPage() {
  return (
    <DashboardShell current="Emissao de AWB" eyebrow="Operacional" activeNav="ops-awb">
      <OperationalSectionNav />
      <PageToolbar
        title="Emitir AWB"
        description="Tela operacional para gerar ou registrar um AWB vinculado ao processo e ao embarque."
        actions={[
          { href: "/operacional", label: "Voltar", tone: "secondary" },
          { href: "/operacional", label: "Salvar AWB" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard title="Dados do AWB" description="Preencha a identificacao e os dados principais da carga.">
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
              <Field label="Data de emissao">
                <Input placeholder="Selecione a data" type="date" />
              </Field>
              <Field label="Previsao de entrega">
                <Input placeholder="Selecione a data" type="date" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Observacoes">
                  <TextArea placeholder="Notas operacionais, referencias house/master, restricoes ou informacoes adicionais." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard title="Checklist" description="Garantias minimas para uma emissao sem retrabalho.">
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
    </DashboardShell>
  );
}
