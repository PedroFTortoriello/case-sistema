import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Context, HttpResponse, type Env, type Handler, type RawRequest } from "./context";

type Segment = { type: "literal"; value: string } | { type: "param"; name: string };

type RouteDef<E extends Env> = {
  method: string;
  path: string;
  segments: Segment[];
  handlers: Handler<E>[];
};

type MiddlewareDef<E extends Env> = {
  pattern: string;
  handler: Handler<E>;
};

type ErrorHandler<E extends Env> = (
  error: unknown,
  c: Context<E>,
) => HttpResponse | Response | Promise<HttpResponse | Response>;

type NormalizedResponse = {
  status: number;
  headers: Headers;
  body: Buffer;
};

function parsePath(path: string): Segment[] {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map<Segment>((segment) =>
      segment.startsWith(":")
        ? { type: "param", name: segment.slice(1) }
        : { type: "literal", value: segment },
    );
}

function splitPath(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

function matchSegments(segments: Segment[], pathSegments: string[]): Record<string, string> | null {
  if (segments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const value = pathSegments[index]!;
    if (segment.type === "param") {
      params[segment.name] = decodeURIComponent(value);
    } else if (segment.value !== value) {
      return null;
    }
  }

  return params;
}

function matchPattern(pattern: string, path: string): boolean {
  if (pattern === "*" || pattern === "/*") {
    return true;
  }
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  if (pattern.endsWith("*")) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path === pattern;
}

function joinPattern(prefix: string, pattern: string): string {
  if (pattern === "*" || pattern === "/*") {
    return `${prefix}/*`;
  }
  return prefix + pattern;
}

function compose<E extends Env>(handlers: Handler<E>[]): (c: Context<E>) => Promise<HttpResponse | Response> {
  return (c) => {
    let lastIndex = -1;
    const dispatch = (index: number): Promise<HttpResponse | Response> => {
      if (index <= lastIndex) {
        return Promise.reject(new Error("next() chamado mais de uma vez."));
      }
      lastIndex = index;
      const handler = handlers[index];
      if (!handler) {
        return Promise.resolve(new HttpResponse(null, 404));
      }
      try {
        return Promise.resolve(handler(c, () => dispatch(index + 1)));
      } catch (error) {
        return Promise.reject(error);
      }
    };
    return dispatch(0);
  };
}

function toBuffer(body: string | Buffer | Uint8Array | null): Buffer {
  if (body === null || body === undefined) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  return Buffer.from(String(body));
}

async function normalize<E extends Env>(
  result: HttpResponse | Response | undefined,
  c: Context<E>,
): Promise<NormalizedResponse> {
  if (result instanceof HttpResponse) {
    return { status: result.status, headers: result.headers, body: toBuffer(result.body) };
  }
  if (typeof Response !== "undefined" && result instanceof Response) {
    const buffer = Buffer.from(await result.arrayBuffer());
    return { status: result.status, headers: result.headers, body: buffer };
  }
  const fallback = c.json({ code: "NOT_FOUND", message: "Recurso nao encontrado." }, 404);
  return { status: fallback.status, headers: fallback.headers, body: toBuffer(fallback.body) };
}

function rawFromFetch(input: string | Request, init: RequestInit = {}): RawRequest {
  const urlString = typeof input === "string" ? input : input.url;
  const url = new URL(urlString);
  const method = (init.method ?? (typeof input === "string" ? "GET" : input.method) ?? "GET").toUpperCase();

  const headers: Record<string, string | undefined> = {};
  const rawHeaders = init.headers;
  if (rawHeaders) {
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    } else if (Array.isArray(rawHeaders)) {
      for (const [key, value] of rawHeaders) {
        headers[key.toLowerCase()] = value;
      }
    } else {
      for (const [key, value] of Object.entries(rawHeaders)) {
        headers[key.toLowerCase()] = value as string;
      }
    }
  }

  const bodyText =
    typeof init.body === "string"
      ? init.body
      : init.body === undefined || init.body === null
        ? ""
        : String(init.body);

  return {
    method,
    path: url.pathname,
    url,
    headers,
    getBodyText: async () => bodyText,
  };
}

function rawFromNode(req: IncomingMessage): RawRequest {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);

  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
  }

  let bodyPromise: Promise<string> | undefined;
  const getBodyText = (): Promise<string> => {
    if (!bodyPromise) {
      bodyPromise = new Promise<string>((resolve, reject) => {
        let data = "";
        req.setEncoding("utf8");
        req.on("data", (chunk: string) => {
          data += chunk;
        });
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
    }
    return bodyPromise;
  };

  return {
    method: (req.method ?? "GET").toUpperCase(),
    path: url.pathname,
    url,
    headers,
    getBodyText,
  };
}

/**
 * Roteador HTTP minimalista construido sobre o modulo `node:http`. Cobre o que o
 * sistema precisa (rotas com parametros, middlewares encadeados, CORS, validacao
 * e tratamento central de erros) sem depender de nenhum framework web externo.
 */
export class Router<E extends Env = Env> {
  readonly middlewares: MiddlewareDef<E>[] = [];
  readonly routes: RouteDef<E>[] = [];

  private errorHandler: ErrorHandler<E> = (error, c) => {
    if (error instanceof Error) {
      return c.json({ code: "INTERNAL_ERROR", message: error.message }, 500);
    }
    return c.json({ code: "INTERNAL_ERROR", message: "Falha inesperada ao processar a requisicao." }, 500);
  };

  private notFoundHandler: Handler<E> = (c) =>
    c.json({ code: "NOT_FOUND", message: "Recurso nao encontrado." }, 404);

  use(handler: Handler<E>): this;
  use(pattern: string, handler: Handler<E>): this;
  use(patternOrHandler: string | Handler<E>, handler?: Handler<E>): this {
    if (typeof patternOrHandler === "string") {
      this.middlewares.push({ pattern: patternOrHandler, handler: handler! });
    } else {
      this.middlewares.push({ pattern: "*", handler: patternOrHandler });
    }
    return this;
  }

  private add(method: string, path: string, handlers: Handler<E>[]): this {
    this.routes.push({ method, path, segments: parsePath(path), handlers });
    return this;
  }

  get(path: string, ...handlers: Handler<E>[]): this {
    return this.add("GET", path, handlers);
  }

  post(path: string, ...handlers: Handler<E>[]): this {
    return this.add("POST", path, handlers);
  }

  put(path: string, ...handlers: Handler<E>[]): this {
    return this.add("PUT", path, handlers);
  }

  patch(path: string, ...handlers: Handler<E>[]): this {
    return this.add("PATCH", path, handlers);
  }

  delete(path: string, ...handlers: Handler<E>[]): this {
    return this.add("DELETE", path, handlers);
  }

  /** Monta um sub-roteador sob um prefixo, copiando rotas e middlewares. */
  route(prefix: string, sub: Router<E>): this {
    for (const def of sub.routes) {
      const fullPath = prefix + def.path;
      this.routes.push({
        method: def.method,
        path: fullPath,
        segments: parsePath(fullPath),
        handlers: def.handlers,
      });
    }
    for (const middleware of sub.middlewares) {
      this.middlewares.push({
        pattern: joinPattern(prefix, middleware.pattern),
        handler: middleware.handler,
      });
    }
    return this;
  }

  onError(handler: ErrorHandler<E>): this {
    this.errorHandler = handler;
    return this;
  }

  notFound(handler: Handler<E>): this {
    this.notFoundHandler = handler;
    return this;
  }

  private async dispatch(raw: RawRequest): Promise<NormalizedResponse> {
    const pathSegments = splitPath(raw.path);

    let matchedRoute: RouteDef<E> | null = null;
    let matchedParams: Record<string, string> | null = null;
    for (const route of this.routes) {
      const params = matchSegments(route.segments, pathSegments);
      if (params && route.method === raw.method) {
        matchedRoute = route;
        matchedParams = params;
        break;
      }
    }

    const context = new Context<E>(raw, matchedParams ?? {});
    const middlewares = this.middlewares
      .filter((middleware) => matchPattern(middleware.pattern, raw.path))
      .map((middleware) => middleware.handler);
    const finalHandlers = matchedRoute ? matchedRoute.handlers : [this.notFoundHandler];
    const chain = [...middlewares, ...finalHandlers];

    let result: HttpResponse | Response;
    try {
      result = await compose<E>(chain)(context);
    } catch (error) {
      result = await this.errorHandler(error, context);
    }

    return normalize(result, context);
  }

  /** Entrada estilo Fetch usada pela suite de testes e por consumidores in-memory. */
  async request(input: string | Request, init?: RequestInit): Promise<Response> {
    const normalized = await this.dispatch(rawFromFetch(input, init));
    const body = normalized.body.length === 0 ? null : normalized.body;
    return new Response(body, { status: normalized.status, headers: normalized.headers });
  }

  /** Listener para `http.createServer` e para o handler serverless da Vercel. */
  requestListener = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const normalized = await this.dispatch(rawFromNode(req));
    res.statusCode = normalized.status;
    normalized.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(normalized.body);
  };

  listen(port: number, callback?: () => void) {
    const server = createServer(this.requestListener);
    server.listen(port, callback);
    return server;
  }
}
