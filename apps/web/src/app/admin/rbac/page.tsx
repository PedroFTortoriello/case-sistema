import { DashboardShell } from "@/components/dashboard-shell";
import { SectionCard } from "@/components/section-card";
import { permissionMatrix } from "@/lib/demo-data";

const columns = ["Administrador", "Financeiro", "Operacional", "Comercial", "Diretor"] as const;

export default function RbacPage() {
  return (
    <DashboardShell
      current="RBAC"
      eyebrow="Governanca e seguranca"
      title="Controle de acesso por perfil com base em capacidade e auditoria."
      description="O sistema foi preparado para RBAC real, em que permissao e modelada por acao de negocio e nao apenas por tela. Isso facilita multiempresa, auditoria e expansao futura."
      activeNav="relatorios"
    >
      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard
        title="Matriz de permissao"
        description="Exemplo inicial de como o acesso deve ser distribuido entre os perfis principais do produto."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3 text-left">
            <thead>
              <tr className="text-sm text-[#64748B]">
                <th className="px-4 py-2 font-medium">Capacidade</th>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) => (
                <tr key={row.capability} className="rounded-[20px] bg-[#FBFDFF] text-sm text-[#64748B]">
                  <td className="rounded-l-[18px] border border-[#E7EEF5] px-4 py-4 font-medium text-[#12263A]">
                    {row.capability}
                  </td>
                  <td className="border-y border-[#E7EEF5] px-4 py-4">{row.administrator}</td>
                  <td className="border-y border-[#E7EEF5] px-4 py-4">{row.financeiro}</td>
                  <td className="border-y border-[#E7EEF5] px-4 py-4">{row.operacional}</td>
                  <td className="border-y border-[#E7EEF5] px-4 py-4">{row.comercial}</td>
                  <td className="rounded-r-[18px] border border-[#E7EEF5] px-4 py-4">{row.diretor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard
          title="Regras importantes"
          description="Esses principios mantem a separacao Financeiro x Operacional sem perder a visao da diretoria."
        >
          <div className="grid gap-3">
            {[
              "Financeiro nao acessa manutencao operacional sensivel.",
              "Operacional nao altera cobrancas, NFS-e ou conciliacao.",
              "Diretor enxerga os dois mundos com leitura e comando transversal.",
              "Administrador governa usuarios, perfis, politicas e auditoria.",
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
                {item}
              </div>
            ))}
          </div>
          </SectionCard>

          <SectionCard
          title="Auditoria obrigatoria"
          description="Toda acao sensivel deve registrar quem fez, quando fez e em qual tenant."
        >
          <div className="grid gap-3">
            {[
              "Emissao, cancelamento e reenvio de NFS-e.",
              "Criacao ou cancelamento de cobrancas.",
              "Mudanca de status operacional e upload de documento.",
              "Exportacao de relatorios, troca de perfil e alteracao de permissao.",
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
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
