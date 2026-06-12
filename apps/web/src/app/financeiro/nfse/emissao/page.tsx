import { DashboardShell } from "@/components/dashboard-shell";
import { FinanceSectionNav } from "@/components/finance-section-nav";
import { PageToolbar } from "@/components/page-toolbar";
import { NfsePreparationWorkbench } from "./nfse-preparation-workbench";

export default function EmissaoNfsePage() {
  return (
    <DashboardShell current="Emissao NFS-e em homologacao" eyebrow="Financeiro" activeNav="finance-nfse">
      <FinanceSectionNav />
      <PageToolbar
        title="Emitir e acompanhar NFS-e"
        description="Fase 3 da NFS-e: a tela usa a API real para preparar documentos, transmitir em homologacao/producao restrita, consultar processamento e baixar XML/PDF autorizados pelo tenant correto."
        actions={[{ href: "/financeiro/nfse", label: "Voltar", tone: "secondary" }]}
      />

      <NfsePreparationWorkbench />
    </DashboardShell>
  );
}
