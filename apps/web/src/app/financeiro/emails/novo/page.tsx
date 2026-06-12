import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { emissionChecklists, financeEmailVariables } from "@/lib/demo-data";

export default function NovoEmailFinanceiroPage() {
  return (
    <DashboardShell current="Novo e-mail" eyebrow="Financeiro" activeNav="finance-emails">
      <FinanceSectionNav />
      <PageToolbar
        title="Novo e-mail financeiro"
        description="Componha uma comunicacao financeira usando templates, variaveis dinamicas e destinatarios por processo."
        actions={[
          { href: "/financeiro/emails", label: "Voltar", tone: "secondary" },
          { href: "/financeiro/emails", label: "Agendar envio" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard title="Composicao da mensagem" description="Monte o envio sem sair do contexto financeiro.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Template">
                <Select options={["Aviso de vencimento", "Confirmacao de pagamento", "Pendencia documental para faturar"]} />
              </Field>
              <Field label="Processo relacionado">
                <Select options={["IMP-2026-0048", "EXP-2026-0019", "IMP-2026-0039"]} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Destinatarios">
                  <Input placeholder="cliente@empresa.com; financeiro@empresa.com" type="email" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="CC">
                  <Input placeholder="operacional@case.com; diretor@case.com" type="email" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Assunto">
                  <Input placeholder="Assunto do envio financeiro" defaultValue="Aviso de vencimento - Processo IMP-2026-0048" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Mensagem">
                  <TextArea
                    rows={8}
                    placeholder="Corpo do e-mail"
                    defaultValue="Prezado(a), segue o aviso referente ao processo {{processo}} e ao valor {{valor}}."
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard title="Checklist" description="Boas praticas antes do disparo da comunicacao.">
            <div className="space-y-3">
              {emissionChecklists.email.map((item) => (
                <div key={item} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Variaveis disponiveis" description="Use placeholders para preencher conteudo dinamico.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {financeEmailVariables.map((variable) => (
                <div key={variable} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] px-4 py-3 font-mono text-sm text-[#1E4F80]">
                  {variable}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
