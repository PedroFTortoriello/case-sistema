"use client";

import {
  buildNfseDraftReadiness,
  clientFiscalProfileInputSchema,
  fiscalPersonTypeValues,
  normalizeNfseDraftPayload,
  nfseAdapterTypeValues,
  nfseEnvironmentValues,
  nfseFiscalSettingsInputSchema,
  nfseProviderTypeValues,
  nfseValidationStatusValues,
  providerFiscalProfileInputSchema,
  taxRuleOriginValues,
  taxableServiceInputSchema,
  type ClientFiscalProfileInput,
  type NfseDraftInput,
  type NfseFiscalSettingsInput,
  type ProviderFiscalProfileInput,
  type ReadinessIssue,
  type TaxableServiceInput,
} from "@case-sistema/contracts";

export const fiscalSettingsDefault: NfseFiscalSettingsInput = {
  adapterType: nfseAdapterTypeValues[0],
  certificateReference: "vault://certificates/case-logistica-a1",
  credentialReference: "vault://credentials/nfse-nacional/case-logistica",
  documentationReference: "Portal Nacional NFS-e / layout vigente",
  documentSeries: "A1",
  environment: nfseEnvironmentValues[0],
  isActive: true,
  layoutVersion: "nacional-v2026.07",
  municipalityCode: "3520506",
  municipalityName: "Indaiatuba",
  nextNumberPreview: "000000000000001",
  providerType: nfseProviderTypeValues[0],
  stateCode: "SP",
  validationStatus: nfseValidationStatusValues[0],
};

export const providerProfileDefault: ProviderFiscalProfileInput = {
  cnaeCode: "5250801",
  complement: null,
  countryCode: "BR",
  documentNumber: "17166707000175",
  email: "fiscal@caselogistica.com.br",
  legalName: "Case Logistica de Cargas Ltda",
  municipalRegistration: "",
  municipalityCode: "3520506",
  municipalityName: "Indaiatuba",
  neighborhood: "Cidade Nova",
  number: "240",
  phone: "19998882211",
  postalCode: "13339210",
  simpleNationalOptIn: true,
  stateCode: "SP",
  street: "Alameda dos Bandeirantes",
  taxIncentiveCode: null,
  taxRegime: "Simples Nacional",
  tradeName: "Case Logistica de Cargas",
};

export const clientProfileDefault: ClientFiscalProfileInput = {
  clientId: "client-demo-orion",
  complement: "Bloco B",
  countryCode: "BR",
  documentNumber: "17166707000175",
  email: "fiscal@orioncomponents.com",
  legalName: "Orion Components Brasil Ltda",
  municipalRegistration: null,
  municipalityCode: "",
  municipalityName: "Indaiatuba",
  neighborhood: "",
  number: "",
  personType: fiscalPersonTypeValues[0],
  phone: "19998882211",
  postalCode: "",
  stateCode: "SP",
  stateRegistration: null,
  street: "",
  tradeName: "Orion Components",
};

export const taxableServiceDefault: TaxableServiceInput = {
  allowsDeductions: false,
  cnaeCode: "5250801",
  code: "despacho-aduaneiro",
  defaultDescription: "Despacho aduaneiro e coordenacao operacional do embarque.",
  description: "Servico fiscal vinculado a despacho aduaneiro.",
  incidenceMunicipalityCode: "3520506",
  incidenceMunicipalityName: "Indaiatuba",
  incidenceStateCode: "SP",
  isActive: true,
  isIssWithheldByDefault: false,
  issExigibility: "exigivel",
  issRate: "0.0000",
  issRateOrigin: taxRuleOriginValues[2],
  listServiceItem: "",
  municipalServiceCode: "",
  name: "Despacho aduaneiro",
  nationalTaxationCode: "",
  taxationNature: "tributavel_municipio",
};

export const draftDefault: NfseDraftInput = {
  amounts: {
    conditionalDiscountAmount: "0.00",
    deductionAmount: "0.00",
    discountAmount: "0.00",
    serviceAmount: "18450.00",
  },
  chargeId: null,
  clientId: clientProfileDefault.clientId,
  competenceDate: "2026-05-01",
  currencyCode: "BRL",
  description: "Despacho aduaneiro e coordenacao operacional do embarque IMP-2026-0048.",
  intendedIssueDate: "2026-05-25",
  notes: "Documento rascunho preparado apenas para validacao interna; sem transmissao externa nesta fase.",
  processId: "IMP-2026-0048",
  serviceDate: "2026-05-25",
  taxableServiceId: "service-demo-despacho",
  taxes: {
    calculationOrigin: taxRuleOriginValues[2],
    cofinsAmount: "0.00",
    cppAmount: "0.00",
    csllAmount: "0.00",
    inssAmount: "0.00",
    irrfAmount: "0.00",
    issAmount: "0.00",
    issRate: "0.0000",
    issRetained: false,
    pisAmount: "0.00",
  },
};

export function collectFieldErrors<T>(schema: { safeParse: (value: unknown) => { success: boolean; error?: { flatten: () => { fieldErrors: Record<string, string[]> } } } }, value: T) {
  const result = schema.safeParse(value);

  if (result.success) {
    return {} as Record<string, string>;
  }

  return Object.entries(result.error?.flatten().fieldErrors ?? {}).reduce<Record<string, string>>(
    (accumulator, [field, issues]) => {
      if (issues && issues.length > 0) {
        accumulator[field] = issues[0];
      }

      return accumulator;
    },
    {},
  );
}

export function normalizeDraftPayload(input: NfseDraftInput): NfseDraftInput {
  return normalizeNfseDraftPayload(input);
}

export function buildUiReadiness(args: {
  clientProfile: ClientFiscalProfileInput;
  draft: NfseDraftInput;
  providerProfile: ProviderFiscalProfileInput;
  settings: NfseFiscalSettingsInput;
  taxableService: TaxableServiceInput;
}) {
  const settings = nfseFiscalSettingsInputSchema.parse(args.settings);
  const providerProfile = providerFiscalProfileInputSchema.parse(args.providerProfile);
  const clientProfile = clientFiscalProfileInputSchema.parse(args.clientProfile);
  const taxableService = taxableServiceInputSchema.parse(args.taxableService);
  const draft = normalizeDraftPayload(args.draft);

  return buildNfseDraftReadiness({
    clientProfile,
    draft,
    providerProfile,
    settings,
    taxableService,
  });
}

export function groupIssuesBySource(issues: ReadinessIssue[]) {
  return issues.reduce<Record<ReadinessIssue["source"], ReadinessIssue[]>>(
    (accumulator, issue) => {
      accumulator[issue.source] = [...(accumulator[issue.source] ?? []), issue];
      return accumulator;
    },
    {
      client: [],
      document: [],
      provider: [],
      service: [],
      settings: [],
    },
  );
}
