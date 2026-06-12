import { DashboardShell } from "@/components/dashboard-shell";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";

const highlights = [
  {
    description: "Metadados fiscais, prestador, tomador e servico tributavel continuam versionados, protegidos por tenant e usados em snapshots imutaveis.",
    status: "Homologacao",
    title: "Base fiscal ativa",
  },
  {
    description: "Documentos transitam entre rascunho, pronto, fila, processamento, autorizado, cancelado e rejeitado sem protocolo ficticio.",
    status: "Autorizada",
    title: "Ciclo de vida fiscal",
  },
  {
    description: "XML, retornos, eventos oficiais e DANFSe ficam privados e disponiveis apenas para o tenant autorizado.",
    status: "Implementado",
    title: "Arquivos e eventos",
  },
  {
    description: "A sincronizacao do ciclo fiscal agora destaca divergencias entre documento, cobranca, pagamento e processo operacional.",
    status: "Conciliacao",
    title: "Consistencia transacional",
  },
] as const;

export default function FinanceiroNfsePage() {
  return (
    <DashboardShell current="NFS-e" eyebrow="Financeiro" activeNav="finance-nfse">
      <FinanceSectionNav />
      <PageToolbar
        title="Operacao fiscal NFS-e"
        description="A fase atual opera a API real em homologacao, sincroniza eventos oficiais, preserva imutabilidade da nota autorizada e evidencia conciliacao com financeiro e operacao."
        actions={[{ href: "/financeiro/nfse/emissao", label: "Abrir console fiscal" }]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard
            title="O que esta ativo nesta fase"
            description="Esta area resume o escopo da Fase 4: lifecycle, eventos oficiais consultaveis, imutabilidade e conciliacao."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-[20px] border border-[#E7EEF5] bg-[#FBFDFF] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-[#12263A]">{item.title}</p>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#64748B]">{item.description}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard
            title="Bloqueios intencionais"
            description="Guardrails desta entrega para nao antecipar risco fiscal ou operacional."
          >
            <div className="space-y-3 text-sm leading-7 text-[#64748B]">
              <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                Ambiente de producao segue bloqueado nesta fase mesmo que a configuracao exista.
              </div>
              <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                Cancelamento e substituicao so aparecem como acao ativa quando o leiaute especifico do evento estiver validado no adapter configurado.
              </div>
              <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                Nenhum segredo, certificado ou payload sensivel integral e exibido na interface.
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Proximo passo funcional" description="Use o console fiscal para operar o ciclo de homologacao.">
            <a
              className="inline-flex h-11 items-center rounded-[14px] bg-[#1E4F80] px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#173A5E]"
              href="/financeiro/nfse/emissao"
            >
              Abrir emissao e acompanhamento
            </a>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
