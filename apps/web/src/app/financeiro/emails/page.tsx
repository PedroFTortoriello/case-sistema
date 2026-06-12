import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyStatePanel } from "@/components/empty-state-panel";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { emissionChecklists, financeEmailTemplates, financeEmailVariables } from "@/lib/demo-data";

export default function FinanceiroEmailsPage() {
  return (
    <DashboardShell current="E-mails" eyebrow="Financeiro" activeNav="finance-emails">
      <FinanceSectionNav />
      <PageToolbar
        title="E-mails financeiros"
        description="Templates, gatilhos e trilha de comunicacao para cobranca, faturamento e follow-up."
        actions={[{ href: "/financeiro/emails/novo", label: "Tela dedicada", tone: "secondary" }]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard title="Formulario de envio" description="O envio agora aparece diretamente na tela de e-mails.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Template">
                <Select options={["Aviso de vencimento", "Confirmacao de pagamento", "Pendencia documental para faturar"]} />
              </Field>
              <Field label="Processo">
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
                  <Input placeholder="Assunto do envio" defaultValue="Aviso de vencimento - Processo IMP-2026-0048" />
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

        <div className="xl:col-span-5">
          <SectionCard title="Checklist" description="Conferencias antes do disparo.">
            <div className="space-y-3">
              {emissionChecklists.email.map((item) => (
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
            title="Templates e historico"
            description="Tela dedicada para comunicacao financeira com modelos, gatilhos e rastreabilidade."
          >
            <div className="overflow-hidden rounded-[20px] border border-[#E7EEF5]">
              <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-[#F9FBFD]">
                    <tr className="text-left text-sm text-[#5F7D95]">
                      {["Template", "Destinatario", "Gatilho", "Ultimo envio", "Status"].map((column) => (
                        <th key={column} className="border-b border-[#E7EEF5] px-5 py-4 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financeEmailTemplates.map((template, index) => (
                      <tr key={template.name} className="bg-white text-sm text-[#12263A]">
                        <td className={`px-5 py-4 font-semibold ${index !== financeEmailTemplates.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {template.name}
                        </td>
                        <td className={`px-5 py-4 ${index !== financeEmailTemplates.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {template.audience}
                        </td>
                        <td className={`px-5 py-4 ${index !== financeEmailTemplates.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {template.trigger}
                        </td>
                        <td className={`px-5 py-4 ${index !== financeEmailTemplates.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          {template.lastSent}
                        </td>
                        <td className={`px-5 py-4 ${index !== financeEmailTemplates.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                          <StatusPill status={template.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard
            title="Variaveis dinamicas"
            description="Placeholders prontos para compor mensagens por cliente, processo e cobranca."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {financeEmailVariables.map((variable) => (
                <div
                  key={variable}
                  className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] px-4 py-3 font-mono text-sm text-[#1E4F80]"
                >
                  {variable}
                </div>
              ))}
            </div>
          </SectionCard>

          <EmptyStatePanel
            title="Nenhum envio em lote pendente"
            description="A fila de comunicacao financeira esta vazia neste momento, sem reenvios ou excecoes abertas."
          />
        </div>
      </section>
    </DashboardShell>
  );
}
