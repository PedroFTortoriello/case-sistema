import { createHash } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { gunzipSync, gzipSync } from "node:zlib";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { XMLParser } from "fast-xml-parser";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import type {
  ClientFiscalProfileInput,
  NfseDocumentFileRole,
  NfseFiscalSettingsInput,
  ProviderFiscalProfileInput,
  TaxableServiceInput,
} from "@case-sistema/contracts";
import { env } from "../../shared/config/env";
import { BadRequestError, ConfigurationError } from "../../shared/errors/app-error";

type CertificateStoreEntry = {
  pfxBase64?: string;
  passphrase?: string;
  certificatePem?: string;
  privateKeyPem?: string;
  caPem?: string;
};

type CredentialStoreEntry = {
  headers?: Record<string, string>;
};

type RequestOptions = {
  url: string;
  method: "GET" | "HEAD" | "POST";
  body?: string;
  headers?: Record<string, string>;
  certificate: ResolvedCertificateMaterials;
};

type HttpResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  bodyText: string;
  bodyBuffer: Buffer;
};

export type NfseIssueAdapterInput = {
  environment: NfseFiscalSettingsInput["environment"];
  municipalityCode: string;
  documentSeries: string;
  documentationReference: string;
  layoutVersion: string;
  providerProfile: ProviderFiscalProfileInput;
  clientProfile: ClientFiscalProfileInput;
  taxableService: TaxableServiceInput;
  document: {
    description: string;
    competenceDate: string;
    intendedIssueDate: string;
    serviceDate: string;
    dpsNumber: string;
    dpsIdentifier: string;
    amounts: {
      serviceAmount: string;
      discountAmount: string;
      conditionalDiscountAmount: string;
      deductionAmount: string;
      taxableAmount: string;
    };
    taxes: {
      issAmount: string;
      issRate: string;
      issRetained: boolean;
      pisAmount: string;
      cofinsAmount: string;
      irrfAmount: string;
      csllAmount: string;
      cppAmount: string;
      inssAmount: string;
    };
  };
  certificateReference: string;
  credentialReference?: string | null;
};

export type NfseIssueAdapterResult =
  | {
      kind: "authorized";
      accessKey: string;
      verificationCode: string | null;
      nfseNumber: string | null;
      authorizedXml: string;
      responsePayload: string;
      requestXml: string;
      danfsePdfBase64?: string | null;
      fileRoleSequence: NfseDocumentFileRole[];
    }
  | {
      kind: "rejected";
      code: string;
      message: string;
      field: string | null;
      requestXml: string;
      responsePayload: string;
    }
  | {
      kind: "processing";
      requestXml: string;
      responsePayload: string;
      needsStatusQuery: boolean;
    }
  | {
      kind: "timeout_pending_query";
      requestXml: string;
      message: string;
    };

export type NfseStatusQueryResult =
  | {
      kind: "authorized";
      accessKey: string;
      verificationCode: string | null;
      nfseNumber: string | null;
      authorizedXml: string;
      responsePayload: string;
      danfsePdfBase64?: string | null;
    }
  | {
      kind: "processing";
      responsePayload: string;
    }
  | {
      kind: "not_found";
      responsePayload: string;
    }
  | {
      kind: "rejected";
      code: string;
      message: string;
      field: string | null;
      responsePayload: string;
    };

export type NfseLifecycleEventQueryResult = {
  events: Array<{
    effect: "none" | "cancelled";
    eventName: string | null;
    eventSequence: number | null;
    eventTypeCode: number | null;
    eventXml: string | null;
    occurredAt: string | null;
    summary: Record<string, unknown>;
  }>;
  responsePayload: string;
};

type ResolvedCertificateMaterials = {
  pfxBuffer?: Buffer;
  passphrase?: string;
  certificatePem: string;
  privateKeyPem: string;
  caPem?: string;
  headers: Record<string, string>;
};

function parseJsonMap<T extends object>(raw: string | undefined, name: string) {
  if (!raw) {
    return {} as Record<string, T>;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, T>;
    return parsed ?? {};
  } catch {
    throw new ConfigurationError(`${name} precisa conter um JSON valido.`);
  }
}

function getCertificateStore() {
  return parseJsonMap<CertificateStoreEntry>(env.NFSE_CERTIFICATE_STORE_JSON, "NFSE_CERTIFICATE_STORE_JSON");
}

function getCredentialStore() {
  return parseJsonMap<CredentialStoreEntry>(env.NFSE_CREDENTIAL_STORE_JSON, "NFSE_CREDENTIAL_STORE_JSON");
}

function resolveCertificateMaterials(
  certificateReference: string,
  credentialReference?: string | null,
): ResolvedCertificateMaterials {
  const certificateEntry = getCertificateStore()[certificateReference];

  if (!certificateEntry) {
    throw new ConfigurationError(
      `Referencia de certificado fiscal nao encontrada no store protegido: ${certificateReference}.`,
    );
  }

  let certificatePem = certificateEntry.certificatePem ?? "";
  let privateKeyPem = certificateEntry.privateKeyPem ?? "";
  let pfxBuffer: Buffer | undefined;

  if (certificateEntry.pfxBase64) {
    pfxBuffer = Buffer.from(certificateEntry.pfxBase64, "base64");
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer.toString("binary")));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, certificateEntry.passphrase ?? "");
    const keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];

    if (!keyBag?.key || !certBag?.cert) {
      throw new ConfigurationError("Nao foi possivel extrair chave privada e certificado do PFX informado.");
    }

    certificatePem = forge.pki.certificateToPem(certBag.cert);
    privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
  }

  if (!certificatePem || !privateKeyPem) {
    throw new ConfigurationError("O certificado fiscal precisa fornecer certificado PEM e chave privada PEM.");
  }

  const credentialEntry = credentialReference ? getCredentialStore()[credentialReference] : undefined;

  return {
    caPem: certificateEntry.caPem,
    certificatePem,
    headers: credentialEntry?.headers ?? {},
    passphrase: certificateEntry.passphrase,
    pfxBuffer,
    privateKeyPem,
  };
}

function getEnvironmentConfig(environment: NfseFiscalSettingsInput["environment"]) {
  if (environment === "production") {
    throw new BadRequestError("O ambiente de producao permanece bloqueado nesta fase.");
  }

  return {
    adnBaseUrl: env.NFSE_NATIONAL_HOMOLOGATION_ADN_BASE_URL ?? "https://adn.producaorestrita.nfse.gov.br/contribuintes",
    danfseBaseUrl: env.NFSE_NATIONAL_HOMOLOGATION_DANFSE_BASE_URL ?? null,
    paramsBaseUrl:
      env.NFSE_NATIONAL_HOMOLOGATION_PARAMS_BASE_URL ?? "https://adn.producaorestrita.nfse.gov.br/parametrizacao",
    sefinBaseUrl:
      env.NFSE_NATIONAL_HOMOLOGATION_SEFIN_BASE_URL ?? "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional",
    timeoutMs: env.NFSE_NATIONAL_HTTP_TIMEOUT_MS,
  };
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripNonDigits(value: string) {
  return value.replace(/\D/g, "");
}

function padNumber(value: string, length: number) {
  return value.padStart(length, "0").slice(-length);
}

function buildUnsignedDpsXml(input: NfseIssueAdapterInput) {
  const rawProviderDocument = stripNonDigits(input.providerProfile.documentNumber);
  const providerDocument = padNumber(rawProviderDocument, 14);
  const providerType = rawProviderDocument.length === 11 ? "1" : "2";
  const issueTimestamp = `${input.document.intendedIssueDate}T12:00:00-03:00`;
  const infId = `DPS${input.document.dpsIdentifier}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infDPS Id="${xmlEscape(infId)}">
    <ide>
      <tpAmb>${input.environment === "homologation" ? "2" : "1"}</tpAmb>
      <cLocEmi>${xmlEscape(input.municipalityCode)}</cLocEmi>
      <dhEmi>${xmlEscape(issueTimestamp)}</dhEmi>
      <verAplic>${xmlEscape(input.layoutVersion)}</verAplic>
      <serieDPS>${xmlEscape(input.documentSeries)}</serieDPS>
      <nDPS>${xmlEscape(input.document.dpsNumber)}</nDPS>
      <idDPS>${xmlEscape(input.document.dpsIdentifier)}</idDPS>
      <dCompet>${xmlEscape(input.document.competenceDate)}</dCompet>
      <dPrest>${xmlEscape(input.document.serviceDate)}</dPrest>
      <natOp>${xmlEscape(input.taxableService.taxationNature)}</natOp>
      <exig>${xmlEscape(input.taxableService.issExigibility)}</exig>
    </ide>
    <prest>
      <tpInsc>${providerType}</tpInsc>
      <nInsc>${xmlEscape(providerDocument)}</nInsc>
      <xNome>${xmlEscape(input.providerProfile.legalName)}</xNome>
      <xFant>${xmlEscape(input.providerProfile.tradeName)}</xFant>
      <IM>${xmlEscape(input.providerProfile.municipalRegistration)}</IM>
      <CNAE>${xmlEscape(input.providerProfile.cnaeCode)}</CNAE>
      <xLgr>${xmlEscape(input.providerProfile.street)}</xLgr>
      <nro>${xmlEscape(input.providerProfile.number)}</nro>
      <xBairro>${xmlEscape(input.providerProfile.neighborhood)}</xBairro>
      <CEP>${xmlEscape(stripNonDigits(input.providerProfile.postalCode))}</CEP>
      <cMun>${xmlEscape(input.providerProfile.municipalityCode)}</cMun>
      <xMun>${xmlEscape(input.providerProfile.municipalityName)}</xMun>
      <UF>${xmlEscape(input.providerProfile.stateCode)}</UF>
      <xEmail>${xmlEscape(input.providerProfile.email)}</xEmail>
      <fone>${xmlEscape(stripNonDigits(input.providerProfile.phone))}</fone>
    </prest>
    <tom>
      <tpTom>${input.clientProfile.personType === "individual" ? "1" : input.clientProfile.personType === "foreign" ? "3" : "2"}</tpTom>
      <xNome>${xmlEscape(input.clientProfile.legalName)}</xNome>
      <nDoc>${xmlEscape(stripNonDigits(input.clientProfile.documentNumber))}</nDoc>
      <xEmail>${xmlEscape(input.clientProfile.email)}</xEmail>
      <fone>${xmlEscape(stripNonDigits(input.clientProfile.phone))}</fone>
      <ender>
        <xLgr>${xmlEscape(input.clientProfile.street ?? "")}</xLgr>
        <nro>${xmlEscape(input.clientProfile.number ?? "")}</nro>
        <xBairro>${xmlEscape(input.clientProfile.neighborhood ?? "")}</xBairro>
        <CEP>${xmlEscape(stripNonDigits(input.clientProfile.postalCode ?? ""))}</CEP>
        <cMun>${xmlEscape(input.clientProfile.municipalityCode ?? "")}</cMun>
        <xMun>${xmlEscape(input.clientProfile.municipalityName)}</xMun>
        <UF>${xmlEscape(input.clientProfile.stateCode ?? "")}</UF>
        <cPais>${xmlEscape(input.clientProfile.countryCode)}</cPais>
      </ender>
    </tom>
    <serv>
      <cTribNac>${xmlEscape(input.taxableService.nationalTaxationCode)}</cTribNac>
      <cTribMun>${xmlEscape(input.taxableService.municipalServiceCode)}</cTribMun>
      <cListServ>${xmlEscape(input.taxableService.listServiceItem)}</cListServ>
      <xDescServ>${xmlEscape(input.document.description)}</xDescServ>
      <vServ>${xmlEscape(input.document.amounts.serviceAmount)}</vServ>
      <vDescIncond>${xmlEscape(input.document.amounts.discountAmount)}</vDescIncond>
      <vDescCond>${xmlEscape(input.document.amounts.conditionalDiscountAmount)}</vDescCond>
      <vDeducao>${xmlEscape(input.document.amounts.deductionAmount)}</vDeducao>
      <vBC>${xmlEscape(input.document.amounts.taxableAmount)}</vBC>
      <ISSRetido>${input.document.taxes.issRetained ? "1" : "2"}</ISSRetido>
      <vISS>${xmlEscape(input.document.taxes.issAmount)}</vISS>
      <pAliq>${xmlEscape(input.document.taxes.issRate)}</pAliq>
      <vPIS>${xmlEscape(input.document.taxes.pisAmount)}</vPIS>
      <vCOFINS>${xmlEscape(input.document.taxes.cofinsAmount)}</vCOFINS>
      <vIRRF>${xmlEscape(input.document.taxes.irrfAmount)}</vIRRF>
      <vCSLL>${xmlEscape(input.document.taxes.csllAmount)}</vCSLL>
      <vCPP>${xmlEscape(input.document.taxes.cppAmount)}</vCPP>
      <vINSS>${xmlEscape(input.document.taxes.inssAmount)}</vINSS>
    </serv>
  </infDPS>
</DPS>`;
}

function signDpsXml(xml: string, referenceId: string, materials: ResolvedCertificateMaterials) {
  const signature = new SignedXml();
  signature.privateKey = materials.privateKeyPem;
  signature.publicCert = materials.certificatePem;
  signature.addReference({
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    xpath: `//*[@Id='${referenceId}']`,
  });
  signature.computeSignature(xml, {
    location: {
      action: "after",
      reference: "//*[local-name()='infDPS']",
    },
  });

  return signature.getSignedXml();
}

function parseResponseXml(bodyText: string) {
  const parser = new XMLParser({
    attributeNamePrefix: "",
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true,
  });

  return parser.parse(bodyText) as Record<string, unknown>;
}

function findFirstString(input: unknown, matcher: (key: string) => boolean): string | null {
  if (input == null) {
    return null;
  }

  if (typeof input === "string") {
    return null;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findFirstString(item, matcher);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const normalizedKey = key.includes(":") ? key.split(":").at(-1) ?? key : key;
      if (matcher(normalizedKey) && typeof value === "string" && value.trim()) {
        return value.trim();
      }

      const found = findFirstString(value, matcher);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function extractAccessKey(bodyText: string) {
  const jsonOrXml = parseJsonOrXml(bodyText);
  const fromStructure =
    findFirstString(jsonOrXml, (key) => ["chNFSe", "chaveAcesso", "chave", "accessKey"].includes(key)) ??
    bodyText.match(/\b\d{44}\b/)?.[0] ??
    null;

  return fromStructure;
}

function extractVerificationCode(bodyText: string) {
  const parsed = parseJsonOrXml(bodyText);
  return (
    findFirstString(parsed, (key) => ["codVerif", "codigoVerificacao", "verificationCode"].includes(key)) ?? null
  );
}

function extractNfseNumber(bodyText: string) {
  const parsed = parseJsonOrXml(bodyText);
  return findFirstString(parsed, (key) => ["nNFSe", "numero", "numeroNfse"].includes(key)) ?? null;
}

function extractRejection(bodyText: string) {
  const parsed = parseJsonOrXml(bodyText);
  const message =
    findFirstString(parsed, (key) => ["mensagem", "message", "xMotivo", "motivo", "descricao"].includes(key)) ??
    "A Sefin Nacional rejeitou a transmissao da DPS.";
  const code =
    findFirstString(parsed, (key) => ["codigo", "code", "cStat", "statusCode"].includes(key)) ?? "NFSE_REJECTED";
  const field =
    findFirstString(parsed, (key) => ["campo", "field", "path"].includes(key)) ?? null;

  return {
    code,
    field,
    message,
  };
}

function parseJsonOrXml(bodyText: string): Record<string, unknown> {
  const normalized = bodyText.trim();

  if (!normalized) {
    return {};
  }

  if (normalized.startsWith("{") || normalized.startsWith("[")) {
    try {
      return JSON.parse(normalized) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (normalized.startsWith("<")) {
    try {
      return parseResponseXml(normalized);
    } catch {
      return {};
    }
  }

  return {};
}

function tryParseJson(bodyText: string) {
  const normalized = bodyText.trim();

  if (!normalized.startsWith("{") && !normalized.startsWith("[")) {
    return null;
  }

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodeGzipBase64Utf8(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return gunzipSync(Buffer.from(value, "base64")).toString("utf8");
  } catch {
    return null;
  }
}

function encodeGzipBase64Utf8(value: string) {
  return gzipSync(Buffer.from(value, "utf8")).toString("base64");
}

function extractWrappedXml(bodyText: string, fieldNames: string[]) {
  const parsed = tryParseJson(bodyText);

  if (parsed) {
    for (const fieldName of fieldNames) {
      const wrapped = findFirstString(parsed, (key) => key === fieldName);
      const decoded = decodeGzipBase64Utf8(wrapped);

      if (decoded) {
        return decoded;
      }
    }
  }

  return bodyText.trim().startsWith("<") ? bodyText : null;
}

function toInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function collectMatchingStrings(
  input: unknown,
  matcher: (key: string) => boolean,
  values: string[] = [],
): string[] {
  if (input == null) {
    return values;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectMatchingStrings(item, matcher, values);
    }
    return values;
  }

  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const normalizedKey = key.includes(":") ? key.split(":").at(-1) ?? key : key;

      if (matcher(normalizedKey) && typeof value === "string" && value.trim()) {
        values.push(value.trim());
      }

      collectMatchingStrings(value, matcher, values);
    }
  }

  return values;
}

function summarizeEventXml(xml: string) {
  const parsed = parseJsonOrXml(xml);
  const eventName =
    findFirstString(parsed, (key) => ["descEvento", "descricaoEvento", "xEvento", "eventoNome"].includes(key)) ??
    null;
  const reasonText =
    findFirstString(parsed, (key) => ["xJust", "xMotivo", "justificativa", "motivo", "descricao"].includes(key)) ??
    null;
  const eventTypeCode = toInteger(
    findFirstString(parsed, (key) => ["tpEvento", "tipoEvento", "codigoEvento", "codEvento"].includes(key)),
  );
  const eventSequence = toInteger(
    findFirstString(parsed, (key) => ["nSeqEvento", "numSeqEvento", "sequenciaEvento"].includes(key)),
  );
  const occurredAt =
    findFirstString(parsed, (key) => ["dhEvento", "dhRegEvento", "dhProc", "dataHoraEvento"].includes(key)) ?? null;
  const effect: "none" | "cancelled" = /cancelamento/i.test(`${eventName ?? ""} ${reasonText ?? ""} ${xml}`)
    ? "cancelled"
    : "none";

  return {
    effect,
    eventName,
    eventSequence,
    eventTypeCode,
    occurredAt,
    summary: {
      eventName,
      eventSequence,
      eventTypeCode,
      occurredAt,
      reasonText,
    },
  };
}

function parseDpsAccessKey(bodyText: string) {
  const parsed = parseJsonOrXml(bodyText);
  return (
    findFirstString(parsed, (key) => ["chNFSe", "chaveAcesso", "accessKey"].includes(key)) ??
    bodyText.match(/\b\d{44}\b/)?.[0] ??
    null
  );
}

function sha256(content: string | Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

function buildRequestHeaders(materials: ResolvedCertificateMaterials, headers?: Record<string, string>) {
  return {
    Accept: "application/json, application/xml;q=0.9, text/plain;q=0.8",
    ...materials.headers,
    ...headers,
  };
}

function doRequest(options: RequestOptions, timeoutMs: number): Promise<HttpResponse> {
  return new Promise<HttpResponse>((resolve, reject) => {
    const url = new URL(options.url);
    const request = httpsRequest(
      url,
      {
        ca: options.certificate.caPem,
        cert: options.certificate.pfxBuffer ? undefined : options.certificate.certificatePem,
        headers: options.headers,
        key: options.certificate.pfxBuffer ? undefined : options.certificate.privateKeyPem,
        method: options.method,
        passphrase: options.certificate.passphrase,
        pfx: options.certificate.pfxBuffer,
        timeout: timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on("end", () => {
          const bodyBuffer = Buffer.concat(chunks);
          resolve({
            bodyBuffer,
            bodyText: bodyBuffer.toString("utf8"),
            headers: response.headers,
            status: response.statusCode ?? 0,
          });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("NFSE_HTTP_TIMEOUT"));
    });
    request.on("error", reject);

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

async function requestMunicipalParameters(
  baseUrl: string,
  municipalityCode: string,
  serviceCode: string,
  providerDocument: string,
  certificate: ResolvedCertificateMaterials,
  timeoutMs: number,
) {
  const convenioUrl = `${baseUrl}/parametros_municipais/${municipalityCode}/convenio`;
  const serviceUrl = `${baseUrl}/parametros_municipais/${municipalityCode}/${serviceCode}`;
  const retentionUrl = `${baseUrl}/parametros_municipais/${municipalityCode}/${providerDocument}`;

  const headers = buildRequestHeaders(certificate);
  await doRequest({ certificate, headers, method: "GET", url: convenioUrl }, timeoutMs);
  await doRequest({ certificate, headers, method: "GET", url: serviceUrl }, timeoutMs);
  await doRequest({ certificate, headers, method: "GET", url: retentionUrl }, timeoutMs);
}

async function fetchAuthorizedXml(
  sefinBaseUrl: string,
  accessKey: string,
  certificate: ResolvedCertificateMaterials,
  timeoutMs: number,
) {
  const response = await doRequest(
    {
      certificate,
      headers: buildRequestHeaders(certificate),
      method: "GET",
      url: `${sefinBaseUrl}/nfse/${accessKey}`,
    },
    timeoutMs,
  );

  return {
    responsePayload: response.bodyText,
    xml: extractWrappedXml(response.bodyText, ["nfseXmlGZipB64"]) ?? response.bodyText,
  };
}

async function fetchLifecycleEvents(
  adnBaseUrl: string,
  accessKey: string,
  certificate: ResolvedCertificateMaterials,
  timeoutMs: number,
): Promise<NfseLifecycleEventQueryResult> {
  const urls = [`${adnBaseUrl}/NFSe/${accessKey}/Eventos`, `${adnBaseUrl}/nfse/${accessKey}/eventos`];
  let lastResponse: HttpResponse | null = null;

  for (const url of urls) {
    const response = await doRequest(
      {
        certificate,
        headers: buildRequestHeaders(certificate),
        method: "GET",
        url,
      },
      timeoutMs,
    );

    lastResponse = response;

    if (response.status === 404) {
      continue;
    }

    const parsed = tryParseJson(response.bodyText);
    const eventXmlPayloads = parsed
      ? collectMatchingStrings(parsed, (key) => ["eventoXmlGZipB64", "eventoXml", "xmlEvento"].includes(key))
      : [];
    const eventDocuments = eventXmlPayloads
      .map((item) => decodeGzipBase64Utf8(item) ?? item)
      .filter((item) => item.trim().startsWith("<"));

    if (eventDocuments.length > 0) {
      return {
        events: eventDocuments.map((eventXml) => ({
          ...summarizeEventXml(eventXml),
          eventXml,
        })),
        responsePayload: response.bodyText,
      };
    }

    if (response.bodyText.trim().startsWith("<")) {
      return {
        events: [
          {
            ...summarizeEventXml(response.bodyText),
            eventXml: response.bodyText,
          },
        ],
        responsePayload: response.bodyText,
      };
    }

    return {
      events: [],
      responsePayload: response.bodyText,
    };
  }

  return {
    events: [],
    responsePayload: lastResponse?.bodyText ?? "",
  };
}

async function fetchDanfsePdfBase64(
  danfseBaseUrl: string | null,
  accessKey: string,
  certificate: ResolvedCertificateMaterials,
  timeoutMs: number,
) {
  if (!danfseBaseUrl) {
    return null;
  }

  const template = env.NFSE_NATIONAL_HOMOLOGATION_DANFSE_PATH_TEMPLATE ?? "/nfse/{accessKey}";
  const response = await doRequest(
    {
      certificate,
      headers: buildRequestHeaders(certificate, {
        Accept: "application/pdf, application/octet-stream;q=0.9",
      }),
      method: "GET",
      url: `${danfseBaseUrl}${template.replace("{accessKey}", accessKey)}`,
    },
    timeoutMs,
  );

  if (response.status >= 200 && response.status < 300 && response.bodyBuffer.length > 0) {
    return response.bodyBuffer.toString("base64");
  }

  return null;
}

export class NfseNationalAdapter {
  async issue(input: NfseIssueAdapterInput): Promise<NfseIssueAdapterResult> {
    const config = getEnvironmentConfig(input.environment);
    const certificate = resolveCertificateMaterials(input.certificateReference, input.credentialReference);
    const unsignedXml = buildUnsignedDpsXml(input);
    const requestXml = signDpsXml(unsignedXml, `DPS${input.document.dpsIdentifier}`, certificate);

    try {
      await requestMunicipalParameters(
        config.paramsBaseUrl,
        input.municipalityCode,
        input.taxableService.municipalServiceCode,
        stripNonDigits(input.providerProfile.documentNumber),
        certificate,
        config.timeoutMs,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao consultar parametros municipais.";
      return {
        code: "MUNICIPAL_PARAMETERS_UNAVAILABLE",
        field: "municipalityCode",
        kind: "rejected",
        message,
        requestXml,
        responsePayload: message,
      };
    }

    try {
      const response = await doRequest(
        {
          body: JSON.stringify({
            dpsXmlGZipB64: encodeGzipBase64Utf8(requestXml),
          }),
          certificate,
          headers: buildRequestHeaders(certificate, {
            "Content-Type": "application/json; charset=utf-8",
          }),
          method: "POST",
          url: `${config.sefinBaseUrl}/nfse`,
        },
        config.timeoutMs,
      );

      if (response.status >= 200 && response.status < 300) {
        const accessKey = extractAccessKey(response.bodyText);
        const authorizedXml = extractWrappedXml(response.bodyText, ["nfseXmlGZipB64"]);

        if (accessKey && authorizedXml) {
          const danfsePdfBase64 = await fetchDanfsePdfBase64(
            config.danfseBaseUrl,
            accessKey,
            certificate,
            config.timeoutMs,
          ).catch(() => null);

          return {
            accessKey,
            authorizedXml,
            danfsePdfBase64,
            fileRoleSequence: danfsePdfBase64
              ? ["request_xml", "authorized_xml", "danfse_pdf"]
              : ["request_xml", "authorized_xml"],
            kind: "authorized",
            nfseNumber: extractNfseNumber(response.bodyText),
            requestXml,
            responsePayload: response.bodyText,
            verificationCode: extractVerificationCode(response.bodyText),
          };
        }

        return {
          kind: "processing",
          needsStatusQuery: true,
          requestXml,
          responsePayload: response.bodyText,
        };
      }

      if (response.status === 202) {
        return {
          kind: "processing",
          needsStatusQuery: true,
          requestXml,
          responsePayload: response.bodyText,
        };
      }

      const rejection = extractRejection(response.bodyText);
      return {
        ...rejection,
        kind: "rejected",
        requestXml,
        responsePayload: response.bodyText,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha de rede desconhecida.";

      if (message.includes("NFSE_HTTP_TIMEOUT")) {
        return {
          kind: "timeout_pending_query",
          message: "A transmissao excedeu o tempo limite; consulte o status antes de retransmitir.",
          requestXml,
        };
      }

      return {
        code: "NETWORK_ERROR",
        field: null,
        kind: "rejected",
        message,
        requestXml,
        responsePayload: message,
      };
    }
  }

  async queryStatus(params: {
    environment: NfseFiscalSettingsInput["environment"];
    dpsIdentifier: string;
    certificateReference: string;
    credentialReference?: string | null;
  }): Promise<NfseStatusQueryResult> {
    const config = getEnvironmentConfig(params.environment);
    const certificate = resolveCertificateMaterials(params.certificateReference, params.credentialReference);
    const headers = buildRequestHeaders(certificate);

    try {
      const headResponse = await doRequest(
        {
          certificate,
          headers,
          method: "HEAD",
          url: `${config.sefinBaseUrl}/dps/${params.dpsIdentifier}`,
        },
        config.timeoutMs,
      );

      if (headResponse.status === 404) {
        return {
          kind: "not_found",
          responsePayload: headResponse.bodyText,
        };
      }

      if (headResponse.status >= 500) {
        return {
          kind: "processing",
          responsePayload: headResponse.bodyText,
        };
      }

      const dpsResponse = await doRequest(
        {
          certificate,
          headers,
          method: "GET",
          url: `${config.sefinBaseUrl}/dps/${params.dpsIdentifier}`,
        },
        config.timeoutMs,
      );

      const accessKey = parseDpsAccessKey(dpsResponse.bodyText);

      if (!accessKey) {
        if (dpsResponse.status === 404) {
          return {
            kind: "not_found",
            responsePayload: dpsResponse.bodyText,
          };
        }

        return {
          kind: "processing",
          responsePayload: dpsResponse.bodyText,
        };
      }

      const authorizedDocument = await fetchAuthorizedXml(
        config.sefinBaseUrl,
        accessKey,
        certificate,
        config.timeoutMs,
      );
      const danfsePdfBase64 = await fetchDanfsePdfBase64(
        config.danfseBaseUrl,
        accessKey,
        certificate,
        config.timeoutMs,
      ).catch(() => null);

      return {
        accessKey,
        authorizedXml: authorizedDocument.xml,
        danfsePdfBase64,
        kind: "authorized",
        nfseNumber: extractNfseNumber(authorizedDocument.xml),
        responsePayload: `${dpsResponse.bodyText}\n${authorizedDocument.responsePayload}`,
        verificationCode: extractVerificationCode(authorizedDocument.xml),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao consultar a NFS-e.";

      if (message.includes("NFSE_HTTP_TIMEOUT")) {
        return {
          kind: "processing",
          responsePayload: message,
        };
      }

      const rejection = extractRejection(message);
      return {
        ...rejection,
        kind: "rejected",
        responsePayload: message,
      };
    }
  }

  async listEvents(params: {
    accessKey: string;
    certificateReference: string;
    credentialReference?: string | null;
    environment: NfseFiscalSettingsInput["environment"];
  }): Promise<NfseLifecycleEventQueryResult> {
    const config = getEnvironmentConfig(params.environment);
    const certificate = resolveCertificateMaterials(params.certificateReference, params.credentialReference);

    return fetchLifecycleEvents(config.adnBaseUrl, params.accessKey, certificate, config.timeoutMs);
  }
}

export function buildDpsIdentifier(input: {
  municipalityCode: string;
  providerDocumentNumber: string;
  documentSeries: string;
  dpsNumber: string;
}) {
  const rawProviderDocument = stripNonDigits(input.providerDocumentNumber);
  const providerDocument = padNumber(rawProviderDocument, 14);
  const providerType = rawProviderDocument.length === 11 ? "1" : "2";

  return [
    padNumber(stripNonDigits(input.municipalityCode), 7),
    providerType,
    providerDocument,
    padNumber(input.documentSeries.replace(/\s+/g, ""), 5),
    padNumber(input.dpsNumber, 15),
  ].join("");
}

export function computeNfseFileHash(content: string | Buffer) {
  return sha256(content);
}

export function parseAuthorizedXmlSummary(xml: string) {
  return {
    accessKey: extractAccessKey(xml),
    nfseNumber: extractNfseNumber(xml),
    verificationCode: extractVerificationCode(xml),
  };
}

export function sanitizeXmlPreview(xml: string) {
  const dom = new DOMParser().parseFromString(xml, "application/xml");
  const signatureNodes = dom.getElementsByTagName("Signature");

  for (let index = signatureNodes.length - 1; index >= 0; index -= 1) {
    const node = signatureNodes[index];
    node.parentNode?.removeChild(node);
  }

  return new XMLSerializer().serializeToString(dom);
}
