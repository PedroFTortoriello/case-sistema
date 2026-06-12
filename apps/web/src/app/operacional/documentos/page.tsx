import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { OperationalSectionNav } from "@/components/operational-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { documentStack, emissionChecklists } from "@/lib/demo-data";

export default function OperacionalDocumentosPage() {
  return (
    <DashboardShell current="Documentos" eyebrow="Operacional" activeNav="ops-documentos">
      <OperationalSectionNav />
      <PageToolbar
        title="Documentos"
        description="Cadastro documental com ownership, versionamento e trilha operacional."
        actions={[{ href: "/operacional/documentos/novo", label: "Tela dedicada", tone: "secondary" }]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard title="Formulario de registro" description="Cadastre um novo documento sem sair da tela principal do modulo.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Processo">
                <Select options={["IMP-2026-0048", "EXP-2026-0019", "IMP-2026-0039"]} />
              </Field>
              <Field label="Tipo documental">
                <Select options={["AWB", "Invoice", "Packing List", "DI", "BL", "Contrato"]} />
              </Field>
              <Field label="Titulo">
                <Input placeholder="Invoice fornecedor maio/2026" />
              </Field>
              <Field label="Owner">
                <Select options={["Operacional", "Cliente", "Fornecedor", "Comercial"]} />
              </Field>
              <Field label="Versao">
                <Input placeholder="v1" defaultValue="v1" />
              </Field>
              <Field label="Status de validacao">
                <Select options={["Nao iniciado", "Em revisao", "Assinado", "Aprovado"]} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Upload planejado">
                  <Input placeholder="documents/imp-2026-0048/invoice-v1.pdf" defaultValue="documents/imp-2026-0048/invoice-v1.pdf" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Observacoes">
                  <TextArea placeholder="Notas de compliance, OCR, aprovacao interna ou validade documental." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <SectionCard title="Checklist" description="Conferencias para upload e trilha de auditoria.">
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

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <SectionCard title="Pilha documental atual" description="Documentos e versoes mais recentes ja vinculados aos processos.">
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
      </section>
    </DashboardShell>
  );
}
