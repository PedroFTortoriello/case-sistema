import { z } from "zod";
import {
  clientFiscalProfileInputSchema,
  nfseDraftInputSchema,
  nfseDraftUpdateSchema,
  nfseFiscalSettingsInputSchema,
  providerFiscalProfileInputSchema,
  taxableServiceInputSchema,
} from "@case-sistema/contracts";

export const createChargeSchema = z.object({
  processId: z.string().min(3),
  clientId: z.string().min(3),
  paymentMethod: z.enum(["boleto", "pix", "payment_link", "international"]),
  currency: z.enum(["BRL", "USD", "EUR"]),
  amount: z.number().positive(),
  dueDate: z.string().date(),
  installments: z.number().int().min(1).max(24).default(1),
});

export const fiscalClientParamsSchema = z.object({
  clientId: z.string().min(3),
});

export const taxableServiceParamsSchema = z.object({
  serviceId: z.string().min(3),
});

export const documentParamsSchema = z.object({
  documentId: z.string().min(3),
});

export const documentFileParamsSchema = z.object({
  documentId: z.string().min(3),
  fileId: z.string().min(3),
});

export const emptyPayloadSchema = z.object({}).passthrough();

export const fiscalSettingsSchema = nfseFiscalSettingsInputSchema;
export const providerProfileSchema = providerFiscalProfileInputSchema;
export const clientFiscalProfileSchema = clientFiscalProfileInputSchema;
export const taxableServiceSchema = taxableServiceInputSchema;
export const createNfseDraftSchema = nfseDraftInputSchema;
export const updateNfseDraftSchema = nfseDraftUpdateSchema;
