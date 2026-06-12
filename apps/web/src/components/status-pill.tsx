"use client";

type StatusPillProps = {
  status: string;
};

const paletteByStatus: Record<string, string> = {
  Aberto: "border-[#D7E6F5] bg-[#EEF5FC] text-[#1E4F80]",
  Pago: "border-[#CFEFDD] bg-[#ECF9F1] text-[#1F8D53]",
  Atrasado: "border-[#F9D5D5] bg-[#FDF1F1] text-[#E44F4F]",
  "Fila de emissao": "border-[#F8E4B7] bg-[#FFF8EB] text-[#B97A13]",
  Autorizada: "border-[#CFEFDD] bg-[#ECF9F1] text-[#1F8D53]",
  Draft: "border-[#D7E6F5] bg-[#EEF5FC] text-[#1E4F80]",
  "Rascunho bloqueado": "border-[#F9D5D5] bg-[#FDF1F1] text-[#D14343]",
  "Pronto para emissao": "border-[#CFEFDD] bg-[#ECF9F1] text-[#1F8D53]",
  Homologacao: "border-[#D7E6F5] bg-[#EEF5FC] text-[#1E4F80]",
  "Homologacao conectada": "border-[#CFEFDD] bg-[#ECF9F1] text-[#1F8D53]",
  "Sessao pendente": "border-[#F8E4B7] bg-[#FFF8EB] text-[#B97A13]",
  "Sem documento": "border-[#E1EAF2] bg-[#F7FAFC] text-[#64748B]",
  "Producao bloqueada": "border-[#F9D5D5] bg-[#FDF1F1] text-[#D14343]",
  "Em processamento": "border-[#D7E6F5] bg-[#EEF5FC] text-[#1E4F80]",
  Rejeitada: "border-[#F9D5D5] bg-[#FDF1F1] text-[#D14343]",
  "Aguardando consulta": "border-[#F8E4B7] bg-[#FFF8EB] text-[#B97A13]",
  "Base configuravel": "border-[#D7E6F5] bg-[#EEF5FC] text-[#1E4F80]",
  "Validacao obrigatoria": "border-[#F8E4B7] bg-[#FFF8EB] text-[#B97A13]",
  "Snapshots imutaveis": "border-[#E6D9FB] bg-[#F7F0FF] text-[#6E3FB4]",
  "Sem transmissao externa": "border-[#E1EAF2] bg-[#F7FAFC] text-[#64748B]",
  "Em transito": "border-[#D7E6F5] bg-[#EEF5FC] text-[#1E4F80]",
  Finalizado: "border-[#CFEFDD] bg-[#ECF9F1] text-[#1F8D53]",
  Desembaraco: "border-[#F8E4B7] bg-[#FFF8EB] text-[#B97A13]",
  Documentacao: "border-[#E1EAF2] bg-[#F7FAFC] text-[#64748B]",
};

export function StatusPill({ status }: StatusPillProps) {
  const palette = paletteByStatus[status] ?? "border-[#E1EAF2] bg-[#F7FAFC] text-[#64748B]";

  return (
    <span className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold ${palette}`}>
      {status}
    </span>
  );
}
