import { z } from "zod";

export const updateMembershipRoleParamsSchema = z.object({
  membershipId: z.string().uuid(),
});

export const updateMembershipRoleSchema = z.object({
  role: z.enum(["administrator", "financeiro", "operacional", "comercial", "diretor"]),
});
