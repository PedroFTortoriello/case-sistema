import { z } from "zod";

export const createAwbSchema = z.object({
  processId: z.string().min(3),
  awbNumber: z.string().min(8),
  airline: z.string().min(2),
  origin: z.string().length(3),
  destination: z.string().length(3),
  weightKg: z.number().positive(),
  volumeM3: z.number().positive(),
  cargoValue: z.number().positive(),
  incoterm: z.string().min(3),
});
