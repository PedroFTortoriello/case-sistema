import { DashboardShell } from "@/components/dashboard-shell";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { emissionChecklists } from "@/lib/demo-data";

export default function EmissaoCobrancaPage() {
  return (
    <DashboardShell current="Emissao de cobranca" eyebrow="Financeiro" activeNav="finance-cobrancas">
      <FinanceSectionNav />
      <PageToolbar
        title="Emitir cobranca"
        description="Tela dedicada para gerar um novo titulo financeiro com metodo, vencimento, moeda e amarracao ao processo."
        actions={[
          { href: "/financeiro/cobrancas", label: "Voltar", tone: "secondary" },
          { href: "/financeiro/cobrancas", label: "Salvar emissao" },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard title="Dados da cobranca" description="Preencha os campos principais antes de emitir o titulo.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Cliente">
                <Select options={["Orion Components", "Blue Port Foods", "North Harbor Pharma"]} />
              </Field>
              <Field label="Processo">
                <Select options={["IMP-2026-0048", "EXP-2026-0019", "IMP-2026-0039"]} />
              </Field>
              <Field label="Metodo de cobranca">
                <Select options={["PIX", "Boleto", "Link de pagamento", "Internacional"]} />
              </Field>
              <Field label="Centro de custo">
                <Select options={["Importacao aerea", "Exportacao aerea", "Servicos aduaneiros"]} />
              </Field>
              <Field label="Moeda">
                <Select options={["BRL", "USD", "EUR"]} />
              </Field>
              <Field label="Valor bruto">
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
                  <TextArea placeholder="Instrucao para cliente, regra interna, link de pagamento ou detalhes adicionais." />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard title="Checklist" description="Validacoes recomendadas para emissao segura.">
            <div className="space-y-3">
              {emissionChecklists.charge.map((item) => (
                <div key={item} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Resumo previsto" description="Pre-visualizacao dos dados principais do titulo.">
            <div className="space-y-3 text-sm text-[#64748B]">
              <div className="flex items-center justify-between rounded-[18px] bg-[#FBFDFF] px-4 py-3">
                <span>Cliente</span>
                <strong className="text-[#12263A]">Orion Components</strong>
              </div>
              <div className="flex items-center justify-between rounded-[18px] bg-[#FBFDFF] px-4 py-3">
                <span>Processo</span>
                <strong className="text-[#12263A]">IMP-2026-0048</strong>
              </div>
              <div className="flex items-center justify-between rounded-[18px] bg-[#FBFDFF] px-4 py-3">
                <span>Total</span>
                <strong className="text-[#12263A]">R$ 18.450,00</strong>
              </div>
            </div>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
