import { z } from "zod";

export const nfseEnvironmentValues = ["homologation", "production"] as const;
export const nfseValidationStatusValues = ["pending", "valid", "invalid"] as const;
export const nfseProviderTypeValues = ["national"] as const;
export const nfseAdapterTypeValues = ["nfse_national_api"] as const;
export const nfseDocumentStatusValues = [
  "draft",
  "ready_for_issue",
  "queued",
  "authorized",
  "cancelled",
  "failed",
] as const;
export const nfseTransmissionStateValues = [
  "idle",
  "requested",
  "processing",
  "authorized",
  "cancel_requested",
  "cancelled",
  "rejected",
  "timeout_pending_query",
] as const;
export const nfseDocumentFileRoleValues = [
  "request_xml",
  "response_xml",
  "authorized_xml",
  "danfse_pdf",
  "event_xml",
] as const;
export const nfseReconciliationStatusValues = ["pending", "aligned", "attention", "divergent"] as const;
export const fiscalPersonTypeValues = ["legal_entity", "individual", "foreign"] as const;
export const taxRuleOriginValues = ["catalog", "manual", "pending"] as const;

const decimalPattern = /^\d{1,12}(\.\d{1,4})?$/;
const moneyPattern = /^\d{1,12}(\.\d{1,2})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const postalCodePattern = /^\d{8}$/;
const municipalityCodePattern = /^\d{7}$/;
const digitsPattern = /^\d+$/;

export const documentNumberSchema = z.string().min(3).max(32);
export const municipalityCodeSchema = z.string().regex(municipalityCodePattern, "Codigo IBGE invalido.");
export const stateCodeSchema = z.string().trim().length(2).transform((value) => value.toUpperCase());
export const moneyStringSchema = z.string().regex(moneyPattern, "Valor monetario invalido.");
export const decimalRateSchema = z.string().regex(decimalPattern, "Valor decimal invalido.");
export const isoDateSchema = z.string().regex(datePattern, "Data invalida.");

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function validateCpf(value: string) {
  const digits = digitsOnly(value);

  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calc = (slice: number) => {
    const total = digits
      .slice(0, slice)
      .split("")
      .reduce((accumulator, item, index) => accumulator + Number(item) * (slice + 1 - index), 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

function validateCnpj(value: string) {
  const digits = digitsOnly(value);

  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calc = (baseLength: number) => {
    const base = digits.slice(0, baseLength).split("").map(Number);
    const weights =
      baseLength === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const total = base.reduce((accumulator, item, index) => accumulator + item * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

export type ReadinessIssue = {
  code: string;
  field: string;
  message: string;
  source: "settings" | "provider" | "client" | "service" | "document";
};

export const readinessIssueSchema = z.object({
  code: z.string().min(2),
  field: z.string().min(2),
  message: z.string().min(5),
  source: z.enum(["settings", "provider", "client", "service", "document"]),
});

export const nfseFiscalSettingsInputSchema = z.object({
  municipalityCode: municipalityCodeSchema,
  municipalityName: z.string().min(2),
  stateCode: stateCodeSchema,
  providerType: z.enum(nfseProviderTypeValues),
  adapterType: z.enum(nfseAdapterTypeValues),
  environment: z.enum(nfseEnvironmentValues),
  layoutVersion: z.string().min(2),
  documentationReference: z.string().min(5),
  documentSeries: z.string().min(1).max(20),
  nextNumberPreview: z.string().min(1).max(30),
  isActive: z.boolean(),
  validationStatus: z.enum(nfseValidationStatusValues),
  credentialReference: z.string().min(3).max(120).nullable().optional(),
  certificateReference: z.string().min(3).max(120).nullable().optional(),
});

export type NfseFiscalSettingsInput = z.infer<typeof nfseFiscalSettingsInputSchema>;

export const providerFiscalProfileInputSchema = z
  .object({
    legalName: z.string().min(3),
    tradeName: z.string().min(2),
    documentNumber: documentNumberSchema,
    municipalRegistration: z.string().min(2),
    taxRegime: z.string().min(2),
    simpleNationalOptIn: z.boolean(),
    cnaeCode: z.string().min(4).max(16),
    taxIncentiveCode: z.string().max(32).nullable().optional(),
    email: z.string().email(),
    phone: z.string().min(8),
    postalCode: z.string().regex(postalCodePattern, "CEP invalido."),
    street: z.string().min(3),
    number: z.string().min(1),
    neighborhood: z.string().min(2),
    complement: z.string().max(120).nullable().optional(),
    municipalityCode: municipalityCodeSchema,
    municipalityName: z.string().min(2),
    stateCode: stateCodeSchema,
    countryCode: z.string().length(2).transform((value) => value.toUpperCase()).default("BR"),
  })
  .superRefine((value, context) => {
    if (!validateCnpj(value.documentNumber)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CNPJ do prestador invalido.",
        path: ["documentNumber"],
      });
    }

    if (value.countryCode !== "BR") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prestador da NFS-e deve estar configurado no Brasil.",
        path: ["countryCode"],
      });
    }
  });

export type ProviderFiscalProfileInput = z.infer<typeof providerFiscalProfileInputSchema>;

export const clientFiscalProfileInputSchema = z
  .object({
    clientId: z.string().uuid().or(z.string().min(3)),
    personType: z.enum(fiscalPersonTypeValues),
    legalName: z.string().min(3),
    tradeName: z.string().max(160).nullable().optional(),
    documentNumber: documentNumberSchema,
    municipalRegistration: z.string().max(40).nullable().optional(),
    stateRegistration: z.string().max(40).nullable().optional(),
    email: z.string().email(),
    phone: z.string().min(8),
    postalCode: z.string().max(16).nullable().optional(),
    street: z.string().max(160).nullable().optional(),
    number: z.string().max(20).nullable().optional(),
    neighborhood: z.string().max(120).nullable().optional(),
    complement: z.string().max(120).nullable().optional(),
    municipalityCode: z.string().max(7).nullable().optional(),
    municipalityName: z.string().min(2),
    stateCode: z.string().max(2).nullable().optional(),
    countryCode: z.string().length(2).transform((value) => value.toUpperCase()),
  })
  .superRefine((value, context) => {
    if (value.personType === "legal_entity" && !validateCnpj(value.documentNumber)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CNPJ do tomador invalido.",
        path: ["documentNumber"],
      });
    }

    if (value.personType === "individual" && !validateCpf(value.documentNumber)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF do tomador invalido.",
        path: ["documentNumber"],
      });
    }

    if (value.personType !== "foreign") {
      if (!value.postalCode || !postalCodePattern.test(digitsOnly(value.postalCode))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CEP do tomador invalido.",
          path: ["postalCode"],
        });
      }

      if (!value.street || !value.number || !value.neighborhood) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Endereco fiscal do tomador esta incompleto.",
          path: ["street"],
        });
      }

      if (!value.municipalityCode || !municipalityCodePattern.test(value.municipalityCode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Codigo IBGE do tomador invalido.",
          path: ["municipalityCode"],
        });
      }

      if (!value.stateCode || value.stateCode.trim().length !== 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "UF do tomador invalida.",
          path: ["stateCode"],
        });
      }

      if (value.countryCode !== "BR") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tomador nacional deve usar pais BR.",
          path: ["countryCode"],
        });
      }
    }

    if (value.personType === "foreign" && value.countryCode === "BR") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tomador estrangeiro deve possuir pais diferente de BR.",
        path: ["countryCode"],
      });
    }
  });

export type ClientFiscalProfileInput = z.infer<typeof clientFiscalProfileInputSchema>;

export const taxableServiceInputSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(3).max(160),
  description: z.string().max(500).nullable().optional(),
  defaultDescription: z.string().min(5).max(1000),
  listServiceItem: z.string().min(2).max(20),
  municipalServiceCode: z.string().min(2).max(20),
  nationalTaxationCode: z.string().min(2).max(20),
  cnaeCode: z.string().max(16).nullable().optional(),
  incidenceMunicipalityCode: municipalityCodeSchema,
  incidenceMunicipalityName: z.string().min(2),
  incidenceStateCode: stateCodeSchema,
  issRate: decimalRateSchema,
  issRateOrigin: z.enum(taxRuleOriginValues),
  taxationNature: z.string().min(2).max(60),
  issExigibility: z.string().min(2).max(60),
  isIssWithheldByDefault: z.boolean(),
  allowsDeductions: z.boolean(),
  isActive: z.boolean(),
});

export type TaxableServiceInput = z.infer<typeof taxableServiceInputSchema>;

export const nfseDraftInputSchema = z.object({
  processId: z.string().uuid().or(z.string().min(3)).nullable().optional(),
  chargeId: z.string().uuid().or(z.string().min(3)).nullable().optional(),
  clientId: z.string().uuid().or(z.string().min(3)),
  taxableServiceId: z.string().uuid().or(z.string().min(3)),
  competenceDate: isoDateSchema,
  intendedIssueDate: isoDateSchema,
  serviceDate: isoDateSchema,
  description: z.string().min(5).max(1000),
  notes: z.string().max(2000).nullable().optional(),
  currencyCode: z.literal("BRL").default("BRL"),
  amounts: z.object({
    serviceAmount: moneyStringSchema,
    discountAmount: moneyStringSchema,
    conditionalDiscountAmount: moneyStringSchema,
    deductionAmount: moneyStringSchema,
  }),
  taxes: z.object({
    calculationOrigin: z.enum(taxRuleOriginValues),
    issRetained: z.boolean(),
    issRate: decimalRateSchema,
    issAmount: moneyStringSchema,
    pisAmount: moneyStringSchema,
    cofinsAmount: moneyStringSchema,
    irrfAmount: moneyStringSchema,
    csllAmount: moneyStringSchema,
    cppAmount: moneyStringSchema,
    inssAmount: moneyStringSchema,
  }),
});

export const nfseDraftUpdateSchema = nfseDraftInputSchema.partial().extend({
  description: z.string().min(5).max(1000).optional(),
});

export type NfseDraftInput = z.infer<typeof nfseDraftInputSchema>;
export type NfseDraftUpdateInput = z.infer<typeof nfseDraftUpdateSchema>;

export type NfseReadiness = {
  issues: ReadinessIssue[];
  isReady: boolean;
  status: (typeof nfseDocumentStatusValues)[number];
};

export type NfseDocumentStatus = (typeof nfseDocumentStatusValues)[number];
export type NfseTransmissionState = (typeof nfseTransmissionStateValues)[number];
export type NfseDocumentFileRole = (typeof nfseDocumentFileRoleValues)[number];
export type NfseReconciliationStatus = (typeof nfseReconciliationStatusValues)[number];

type CompletenessSource = {
  settings?: NfseFiscalSettingsInput | null;
  providerProfile?: ProviderFiscalProfileInput | null;
  clientProfile?: ClientFiscalProfileInput | null;
  taxableService?: TaxableServiceInput | null;
  draft?: NfseDraftInput | null;
};

function pushIssue(
  issues: ReadinessIssue[],
  source: ReadinessIssue["source"],
  field: string,
  code: string,
  message: string,
) {
  issues.push({ code, field, message, source });
}

export function formatMoneyInput(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");

  if (!normalized) {
    return "0.00";
  }

  const [integer, decimal = ""] = normalized.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "") || "0";
  const normalizedDecimal = `${decimal}00`.slice(0, 2);
  return `${normalizedInteger}.${normalizedDecimal}`;
}

export function normalizeNfseDraftPayload(input: NfseDraftInput): NfseDraftInput {
  return nfseDraftInputSchema.parse({
    ...input,
    amounts: {
      conditionalDiscountAmount: formatMoneyInput(input.amounts.conditionalDiscountAmount),
      deductionAmount: formatMoneyInput(input.amounts.deductionAmount),
      discountAmount: formatMoneyInput(input.amounts.discountAmount),
      serviceAmount: formatMoneyInput(input.amounts.serviceAmount),
    },
    taxes: {
      ...input.taxes,
      cofinsAmount: formatMoneyInput(input.taxes.cofinsAmount),
      cppAmount: formatMoneyInput(input.taxes.cppAmount),
      csllAmount: formatMoneyInput(input.taxes.csllAmount),
      inssAmount: formatMoneyInput(input.taxes.inssAmount),
      irrfAmount: formatMoneyInput(input.taxes.irrfAmount),
      issAmount: formatMoneyInput(input.taxes.issAmount),
      pisAmount: formatMoneyInput(input.taxes.pisAmount),
    },
  });
}

export function validateProviderProfileCompleteness(profile?: ProviderFiscalProfileInput | null) {
  const issues: ReadinessIssue[] = [];

  if (!profile) {
    pushIssue(issues, "provider", "providerProfile", "provider_missing", "Cadastro fiscal do prestador nao foi informado.");
    return issues;
  }

  if (!validateCnpj(profile.documentNumber)) {
    pushIssue(issues, "provider", "documentNumber", "provider_invalid_document", "CNPJ do prestador invalido.");
  }

  if (!profile.municipalRegistration?.trim()) {
    pushIssue(
      issues,
      "provider",
      "municipalRegistration",
      "provider_missing_municipal_registration",
      "Inscricao municipal do prestador e obrigatoria para preparar a NFS-e.",
    );
  }

  if (!profile.taxRegime?.trim()) {
    pushIssue(
      issues,
      "provider",
      "taxRegime",
      "provider_missing_tax_regime",
      "Regime tributario do prestador nao foi informado.",
    );
  }

  if (!profile.cnaeCode?.trim()) {
    pushIssue(issues, "provider", "cnaeCode", "provider_missing_cnae", "CNAE do prestador nao foi informado.");
  }

  if (!profile.postalCode || !postalCodePattern.test(digitsOnly(profile.postalCode))) {
    pushIssue(issues, "provider", "postalCode", "provider_invalid_postal_code", "CEP do prestador invalido.");
  }

  if (!profile.street?.trim() || !profile.number?.trim() || !profile.neighborhood?.trim()) {
    pushIssue(
      issues,
      "provider",
      "street",
      "provider_incomplete_address",
      "Endereco fiscal do prestador esta incompleto.",
    );
  }

  if (profile.countryCode !== "BR") {
    pushIssue(issues, "provider", "countryCode", "provider_invalid_country", "Prestador deve estar configurado como Brasil para NFS-e municipal.");
  }

  return issues;
}

export function validateClientFiscalProfile(profile?: ClientFiscalProfileInput | null) {
  const issues: ReadinessIssue[] = [];

  if (!profile) {
    pushIssue(issues, "client", "clientProfile", "client_missing", "Tomador fiscal nao foi informado.");
    return issues;
  }

  if (profile.personType === "legal_entity" && !validateCnpj(profile.documentNumber)) {
    pushIssue(issues, "client", "documentNumber", "client_invalid_cnpj", "CNPJ do tomador invalido.");
  }

  if (profile.personType === "individual" && !validateCpf(profile.documentNumber)) {
    pushIssue(issues, "client", "documentNumber", "client_invalid_cpf", "CPF do tomador invalido.");
  }

  if (profile.personType !== "foreign") {
    if (profile.countryCode !== "BR") {
      pushIssue(issues, "client", "countryCode", "client_invalid_country", "Tomador nacional deve usar pais BR.");
    }

    if (!profile.postalCode || !postalCodePattern.test(digitsOnly(profile.postalCode))) {
      pushIssue(issues, "client", "postalCode", "client_invalid_postal_code", "CEP do tomador invalido.");
    }

    if (!profile.street || !profile.number || !profile.neighborhood) {
      pushIssue(issues, "client", "street", "client_incomplete_address", "Endereco fiscal do tomador esta incompleto.");
    }

    if (!profile.municipalityCode || !municipalityCodePattern.test(profile.municipalityCode)) {
      pushIssue(issues, "client", "municipalityCode", "client_invalid_city_code", "Codigo IBGE do tomador invalido.");
    }

    if (!profile.stateCode || profile.stateCode.trim().length !== 2) {
      pushIssue(issues, "client", "stateCode", "client_invalid_state", "UF do tomador invalida.");
    }
  } else {
    if (profile.countryCode === "BR") {
      pushIssue(issues, "client", "countryCode", "client_foreign_country", "Tomador estrangeiro deve possuir pais diferente de BR.");
    }
  }

  return issues;
}

export function validateTaxableServiceConfig(service?: TaxableServiceInput | null) {
  const issues: ReadinessIssue[] = [];

  if (!service) {
    pushIssue(issues, "service", "taxableService", "service_missing", "Servico tributavel nao foi informado.");
    return issues;
  }

  if (!digitsPattern.test(service.nationalTaxationCode)) {
    pushIssue(
      issues,
      "service",
      "nationalTaxationCode",
      "service_invalid_tax_code",
      "Codigo nacional de tributacao do servico deve conter apenas numeros.",
    );
  }

  if (!service.listServiceItem?.trim()) {
    pushIssue(
      issues,
      "service",
      "listServiceItem",
      "service_missing_list_item",
      "Servico tributavel ainda nao possui item da lista de servicos.",
    );
  }

  if (!service.municipalServiceCode?.trim()) {
    pushIssue(
      issues,
      "service",
      "municipalServiceCode",
      "service_missing_municipal_code",
      "Servico tributavel ainda nao possui codigo municipal configurado.",
    );
  }

  if (service.issRateOrigin === "pending") {
    pushIssue(
      issues,
      "service",
      "issRateOrigin",
      "service_pending_iss_rate",
      "Servico ainda nao possui aliquota de ISS configurada com origem valida.",
    );
  }

  return issues;
}

export function validateDraftInput(draft?: NfseDraftInput | null) {
  const issues: ReadinessIssue[] = [];

  if (!draft) {
    pushIssue(issues, "document", "draft", "draft_missing", "Documento fiscal rascunho ainda nao foi preparado.");
    return issues;
  }

  if (Number(formatMoneyInput(draft.amounts.serviceAmount)) <= 0) {
    pushIssue(issues, "document", "amounts.serviceAmount", "draft_invalid_amount", "Valor do servico deve ser maior que zero.");
  }

  if (draft.taxes.calculationOrigin === "pending") {
    pushIssue(
      issues,
      "document",
      "taxes.calculationOrigin",
      "draft_pending_tax_origin",
      "Origem do calculo tributario ainda esta pendente.",
    );
  }

  return issues;
}

export function validateFiscalSettings(settings?: NfseFiscalSettingsInput | null) {
  const issues: ReadinessIssue[] = [];

  if (!settings) {
    pushIssue(issues, "settings", "settings", "settings_missing", "Configuracao fiscal da NFS-e ainda nao foi cadastrada.");
    return issues;
  }

  if (!settings.isActive) {
    pushIssue(issues, "settings", "isActive", "settings_inactive", "Configuracao fiscal precisa estar ativa.");
  }

  if (settings.validationStatus !== "valid") {
    pushIssue(
      issues,
      "settings",
      "validationStatus",
      "settings_not_validated",
      "Configuracao fiscal ainda nao esta validada para preparacao segura do documento.",
    );
  }

  return issues;
}

export function buildNfseDraftReadiness(source: CompletenessSource): NfseReadiness {
  const issues = [
    ...validateFiscalSettings(source.settings),
    ...validateProviderProfileCompleteness(source.providerProfile),
    ...validateClientFiscalProfile(source.clientProfile),
    ...validateTaxableServiceConfig(source.taxableService),
    ...validateDraftInput(source.draft),
  ];

  return {
    issues,
    isReady: issues.length === 0,
    status: issues.length === 0 ? "ready_for_issue" : "draft",
  };
}
