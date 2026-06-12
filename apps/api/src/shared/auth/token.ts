import type { Context } from "../http/context";
import type { AppBindings } from "../context/tenant";

export function extractBearerToken(authorizationHeader?: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function getRequestAccessToken(c: Context<AppBindings>) {
  return c.get("accessToken");
}
