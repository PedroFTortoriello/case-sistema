import type { Env, Handler } from "./context";

export type CorsOptions = {
  origin: (origin: string | null) => string | undefined;
  allowMethods?: string[];
  allowHeaders?: string[];
};

/** Middleware CORS minimalista (sem dependencias externas). */
export function cors<E extends Env = Env>(options: CorsOptions): Handler<E> {
  return async (c, next) => {
    const requestOrigin = c.req.header("origin") ?? null;
    const allowOrigin = options.origin(requestOrigin);

    if (allowOrigin) {
      c.header("Access-Control-Allow-Origin", allowOrigin);
    }
    c.header("Vary", "Origin");

    if (c.req.method === "OPTIONS") {
      if (options.allowMethods) {
        c.header("Access-Control-Allow-Methods", options.allowMethods.join(","));
      }
      if (options.allowHeaders) {
        c.header("Access-Control-Allow-Headers", options.allowHeaders.join(","));
      }
      return c.body(null, 204);
    }

    return next();
  };
}
