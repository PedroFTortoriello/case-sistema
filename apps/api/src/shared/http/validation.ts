import { HttpResponse, type Context, type Env, type Handler, type ValidationTarget } from "./context";

type SafeParseResult =
  | { success: true; data: unknown }
  | { success: false; error: { flatten: () => unknown } };

type Schema = {
  safeParse: (data: unknown) => SafeParseResult;
};

export type ValidatorHook = (
  result: { success: boolean; data?: unknown; error?: { flatten: () => unknown } },
  c: Context<any>,
) => unknown;

/**
 * Substituto, baseado apenas em Zod, para o validador do framework anterior.
 * Valida corpo (`json`), parametros de rota (`param`) ou query (`query`),
 * armazena o resultado para `c.req.valid(...)` e suporta um hook opcional para
 * customizar a resposta de erro.
 */
export function zValidator<E extends Env = Env>(
  target: ValidationTarget,
  schema: Schema,
  hook?: ValidatorHook,
): Handler<E> {
  return async (c, next) => {
    let data: unknown;
    if (target === "json") {
      try {
        data = await c.req.json();
      } catch {
        data = undefined;
      }
    } else if (target === "param") {
      data = c.req.param();
    } else {
      data = c.req.query();
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      if (hook) {
        const handled = hook({ success: false, error: result.error }, c as Context<any>);
        if (handled !== undefined && handled !== null) {
          return handled as HttpResponse | Response;
        }
      }
      return c.json(
        {
          details: result.error.flatten(),
          message: "Requisicao invalida.",
        },
        400,
      );
    }

    c.req.addValidatedData(target, result.data);

    if (hook) {
      const handled = hook({ success: true, data: result.data }, c as Context<any>);
      if (handled !== undefined && handled !== null) {
        return handled as HttpResponse | Response;
      }
    }

    return next();
  };
}
