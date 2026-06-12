import { DashboardShell } from "@/components/dashboard-shell";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { chargeQueue, documentStack, processDetail } from "@/lib/demo-data";

type ProcessDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProcessDetailPage({ params }: ProcessDetailPageProps) {
  const { id } = await params;

  return (
    <DashboardShell
      current="Processo"
      eyebrow="Rastreabilidade ponta a ponta"
      title={`${id} com visao operacional e financeira no mesmo contexto.`}
      description="Esta tela representa o detalhe do processo internacional, concentrando timeline, documentos, AWB, follow-up, cobrancas e status de faturamento sem misturar ownership."
      activeNav="ops-awb"
    >
      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard
          title={processDetail.title}
          description={`${processDetail.client} • ${processDetail.route} • Incoterm ${processDetail.incoterm}`}
          aside={<span>Status operacional: {processDetail.status}</span>}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#64748B]">Faturamento</p>
              <p className="mt-3 text-xl font-semibold text-[#12263A]">{processDetail.financialStatus}</p>
              <p className="mt-3 text-sm leading-7 text-[#64748B]">
                Assim que os documentos estiverem consolidados, a cobranca e a NFS-e podem ser disparadas.
              </p>
            </div>
            <div className="rounded-[22px] border border-[#E7EEF5] bg-[#FBFDFF] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#64748B]">Ownership</p>
              <p className="mt-3 text-xl font-semibold text-[#12263A]">Operacional + Financeiro</p>
              <p className="mt-3 text-sm leading-7 text-[#64748B]">
                Areas separadas, conectadas por eventos, documentos e historico do processo.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {processDetail.timeline.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-[20px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF5FC] text-sm font-semibold text-[#1E4F80]">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-[#64748B]">{step}</p>
              </div>
            ))}
          </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <SectionCard
          title="Documentos e versoes"
          description="Versionamento, ownership e governanca documental por processo."
        >
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

      <section className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <SectionCard
        title="Financeiro vinculado"
        description="Exemplo de titulos gerados a partir do proprio processo operacional."
      >
          <div className="overflow-hidden rounded-[20px] border border-[#E7EEF5]">
            <div className="overflow-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 bg-[#F9FBFD]">
                  <tr className="text-left text-sm text-[#5F7D95]">
                    {["Cliente", "Processo", "Status", "AWB", "Valor", "Acoes"].map((column) => (
                      <th key={column} className="border-b border-[#E7EEF5] px-5 py-4 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chargeQueue.map((charge, index) => (
                    <tr key={`${charge.client}-${charge.process}`} className="bg-white text-sm text-[#12263A]">
                      <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                        {charge.client}
                      </td>
                      <td className={`px-5 py-4 font-semibold ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                        {charge.process}
                      </td>
                      <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                        <StatusPill status={charge.status} />
                      </td>
                      <td className={`px-5 py-4 font-mono text-[#1E4F80] ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                        {index === 0 ? "057-12345675" : index === 1 ? "957-55667788" : "074-90887766"}
                      </td>
                      <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                        {charge.amount}
                      </td>
                      <td className={`px-5 py-4 ${index !== chargeQueue.length - 1 ? "border-b border-[#EEF3F8]" : ""}`}>
                        <button
                          className="inline-flex h-10 items-center rounded-[14px] bg-[#1E4F80] px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#173A5E]"
                          type="button"
                        >
                          Emitir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </SectionCard>
        </div>
      </section>
    </DashboardShell>
  );
}
