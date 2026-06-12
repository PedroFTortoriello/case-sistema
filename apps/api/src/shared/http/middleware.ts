import { extractBearerToken } from "../auth/token";
import { UnauthorizedError } from "../errors/app-error";
import type { AppBindings } from "../context/tenant";
import type { AuthContextService } from "../services/container";
import type { Handler } from "./context";

export function createAuthMiddleware(authContextService: AuthContextService): Handler<AppBindings> {
  return async (c, next) => {
    const accessToken = extractBearerToken(c.req.header("authorization"));

    if (!accessToken) {
      throw new UnauthorizedError("Token de acesso ausente ou malformado.");
    }

    const requestedOrganizationId = c.req.header("x-organization-id")?.trim() || null;

    // Erros de autenticacao/autorizacao (AppError) sobem para o handler central,
    // que os converte para o status HTTP correspondente.
    const authContext = await authContextService.resolveAuthContext({
      accessToken,
      requestedOrganizationId,
    });

    c.set("accessToken", accessToken);
    c.set("auth", authContext);

    return next();
  };
}
