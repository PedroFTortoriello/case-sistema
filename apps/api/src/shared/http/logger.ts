import type { Env, Handler } from "./context";

/** Logger de requisicoes simples baseado em `console.log`. */
export function logger<E extends Env = Env>(): Handler<E> {
  return async (c, next) => {
    const start = Date.now();
    const response = await next();
    const elapsed = Date.now() - start;
    console.log(`${c.req.method} ${c.req.path} ${response.status} ${elapsed}ms`);
    return response;
  };
}
