import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { OperationalSectionNav } from "@/components/operational-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { emissionChecklists } from "@/lib/demo-data";

export default function NovoProcessoPage() {
  return (
    <DashboardShell current="Novo processo" eyebrow="Operacional" activeNav="ops-processos">
      <OperationalSectionNav />
      <PageToolbar
        title="Abrir novo processo"
        description="Tela para iniciar uma operacao de importacao ou exportacao com ownership, rota e dados iniciais."
        actions={[
          { href: "/operacional", label: "Voltar", tone: "secondary" },
          { href: "/operacional", label: "Criar processo" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard title="Dados operacionais" description="Preencha os campos basicos para abrir o processo.">
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
              <Field label="Responsavel comercial">
                <Select options={["Pedro Freitas", "Carla Moura", "Vitor Araujo"]} />
              </Field>
              <Field label="Responsavel operacional">
                <Select options={["Julia Costa", "Marcelo Alves", "Bianca Prado"]} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Observacoes iniciais">
                  <TextArea placeholder="Informacoes de kick-off, pendencias, particularidades do cliente ou alinhamentos do embarque." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard title="Checklist" description="Pontos minimos para uma abertura consistente.">
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
    </DashboardShell>
  );
}
