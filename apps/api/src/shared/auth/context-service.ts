import type { AppRole, AuthContext } from "../context/tenant";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors/app-error";
import { getSupabaseUserClient } from "../supabase/user-client";
import { resolvePermissions } from "./rbac";
import type { AuthContextService } from "../services/container";

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  is_default: boolean;
};

function pickMembership(
  memberships: MembershipRow[],
  requestedOrganizationId?: string | null,
) {
  if (memberships.length === 0) {
    throw new ForbiddenError("Usuario autenticado sem membership ativo em nenhuma organizacao.");
  }

  if (requestedOrganizationId) {
    const selectedMembership = memberships.find(
      (membership) => membership.organization_id === requestedOrganizationId,
    );

    if (!selectedMembership) {
      throw new ForbiddenError("Usuario nao possui membership na organizacao solicitada.");
    }

    return selectedMembership;
  }

  if (memberships.length === 1) {
    return memberships[0];
  }

  const defaultMemberships = memberships.filter((membership) => membership.is_default);

  if (defaultMemberships.length === 1) {
    return defaultMemberships[0];
  }

  if (defaultMemberships.length > 1) {
    throw new BadRequestError(
      "Usuario possui mais de um membership padrao; revise a configuracao antes de prosseguir.",
    );
  }

  throw new BadRequestError(
    "Usuario possui multiplas organizacoes. Informe x-organization-id com uma organizacao valida.",
  );
}

export class SupabaseAuthContextService implements AuthContextService {
  async resolveAuthContext({
    accessToken,
    requestedOrganizationId,
  }: {
    accessToken: string;
    requestedOrganizationId?: string | null;
  }): Promise<AuthContext> {
    const supabase = getSupabaseUserClient(accessToken);

    const { data: userResponse, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userResponse.user) {
      throw new UnauthorizedError("Token invalido ou expirado.");
    }

    const userId = userResponse.user.id;

    const { data: memberships, error: membershipError } = await supabase
      .from("user_memberships")
      .select("id, organization_id, user_id, role, is_default")
      .eq("user_id", userId);

    if (membershipError) {
      throw new NotFoundError("Nao foi possivel validar os memberships do usuario autenticado.");
    }

    const membership = pickMembership(memberships ?? [], requestedOrganizationId);

    return {
      userId,
      organizationId: membership.organization_id,
      role: membership.role,
      permissions: resolvePermissions(membership.role),
    };
  }
}
