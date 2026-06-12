import { AppError, NotFoundError } from "../errors/app-error";
import type { AppRole } from "../context/tenant";
import { getSupabaseUserClient } from "../supabase/user-client";
import type {
  AdminMembershipService,
  MembershipRecord,
} from "../services/container";

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  is_default: boolean;
};

function normalizeMembership(membership: MembershipRow): MembershipRecord {
  return {
    id: membership.id,
    isDefault: membership.is_default,
    organizationId: membership.organization_id,
    role: membership.role,
    userId: membership.user_id,
  };
}

function handleMembershipError(code?: string): never {
  if (code === "PGRST116") {
    throw new NotFoundError("Membership nao encontrado ou inacessivel.");
  }

  throw new AppError(500, "Falha ao atualizar membership.", "DATABASE_ERROR");
}

export class SupabaseAdminMembershipService implements AdminMembershipService {
  async updateRole({
    accessToken,
    membershipId,
    role,
  }: {
    accessToken: string;
    membershipId: string;
    role: AppRole;
  }) {
    const supabase = getSupabaseUserClient(accessToken);

    const currentMembershipResponse = await supabase
      .from("user_memberships")
      .select("id, organization_id, user_id, role, is_default")
      .eq("id", membershipId)
      .single();

    if (currentMembershipResponse.error || !currentMembershipResponse.data) {
      handleMembershipError(currentMembershipResponse.error?.code);
    }

    const currentMembership = currentMembershipResponse.data;

    const updateResponse = await supabase
      .from("user_memberships")
      .update({ role })
      .eq("id", membershipId)
      .select("id, organization_id, user_id, role, is_default")
      .single();

    if (updateResponse.error || !updateResponse.data) {
      handleMembershipError(updateResponse.error?.code);
    }

    const updatedMembership = updateResponse.data;

    return {
      after: normalizeMembership(updatedMembership),
      before: normalizeMembership(currentMembership),
    };
  }
}
