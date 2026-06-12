import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { OperationalSectionNav } from "@/components/operational-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { emissionChecklists } from "@/lib/demo-data";

export default function NovoDocumentoPage() {
  return (
    <DashboardShell current="Novo documento" eyebrow="Operacional" activeNav="ops-documentos">
      <OperationalSectionNav />
      <PageToolbar
        title="Registrar documento"
        description="Tela para subir ou registrar documentos versionados vinculados ao processo."
        actions={[
          { href: "/operacional", label: "Voltar", tone: "secondary" },
          { href: "/operacional", label: "Salvar documento" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard title="Metadados do documento" description="Preencha os campos para classificar e rastrear o documento corretamente.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Processo">
                <Select options={["IMP-2026-0048", "EXP-2026-0019", "IMP-2026-0039"]} />
              </Field>
              <Field label="Tipo documental">
                <Select options={["AWB", "Invoice", "Packing List", "DI", "BL", "Contrato"]} />
              </Field>
              <Field label="Titulo do documento">
                <Input placeholder="Ex.: Invoice fornecedor maio/2026" />
              </Field>
              <Field label="Owner do documento">
                <Select options={["Operacional", "Cliente", "Fornecedor", "Comercial"]} />
              </Field>
              <Field label="Versao">
                <Input placeholder="v1" defaultValue="v1" />
              </Field>
              <Field label="Assinatura / validacao">
                <Select options={["Nao iniciado", "Em revisao", "Assinado", "Aprovado"]} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Upload planejado">
                  <Input placeholder="Nome do arquivo ou bucket/path previsto" defaultValue="documents/imp-2026-0048/invoice-v1.pdf" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Observacoes">
                  <TextArea placeholder="Anotacoes de compliance, OCR, assinatura ou aprovacao interna." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard title="Checklist" description="Preparacao para upload, versionamento e auditoria.">
            <div className="space-y-3">
              {emissionChecklists.document.map((item) => (
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
