export type Env = { Variables: Record<string, any> };

export type ValidationTarget = "json" | "param" | "query";

export type RawRequest = {
  method: string;
  path: string;
  url: URL;
  headers: Record<string, string | undefined>;
  getBodyText: () => Promise<string>;
};

/**
 * Resposta interna do servidor. Substitui a Response do framework anterior por
 * um descritor simples que o runtime (servidor http nativo ou helper de teste)
 * converte para o destino apropriado.
 */
export class HttpResponse {
  constructor(
    public body: string | Buffer | Uint8Array | null,
    public status: number = 200,
    public headers: Headers = new Headers(),
  ) {}
}

export class HttpRequest {
  private readonly validated: Partial<Record<ValidationTarget, unknown>> = {};
  private bodyTextPromise?: Promise<string>;
  private jsonPromise?: Promise<unknown>;

  constructor(
    private readonly raw: RawRequest,
    private readonly params: Record<string, string>,
  ) {}

  get method(): string {
    return this.raw.method;
  }

  get path(): string {
    return this.raw.path;
  }

  get url(): string {
    return this.raw.url.href;
  }

  header(name: string): string | undefined {
    return this.raw.headers[name.toLowerCase()];
  }

  param(): Record<string, string>;
  param(name: string): string | undefined;
  param(name?: string): Record<string, string> | string | undefined {
    if (name === undefined) {
      return { ...this.params };
    }
    return this.params[name];
  }

  query(): Record<string, string>;
  query(name: string): string | undefined;
  query(name?: string): Record<string, string> | string | undefined {
    const search = this.raw.url.searchParams;
    if (name === undefined) {
      const out: Record<string, string> = {};
      search.forEach((value, key) => {
        out[key] = value;
      });
      return out;
    }
    return search.get(name) ?? undefined;
  }

  text(): Promise<string> {
    if (!this.bodyTextPromise) {
      this.bodyTextPromise = this.raw.getBodyText();
    }
    return this.bodyTextPromise;
  }

  json<T = unknown>(): Promise<T> {
    if (!this.jsonPromise) {
      this.jsonPromise = this.text().then((value) => {
        const trimmed = value?.trim();
        return trimmed && trimmed.length > 0 ? JSON.parse(trimmed) : {};
      });
    }
    return this.jsonPromise as Promise<T>;
  }

  addValidatedData(target: ValidationTarget, data: unknown): void {
    this.validated[target] = data;
  }

  valid(target: ValidationTarget): any {
    return this.validated[target];
  }
}

export class Context<E extends Env = Env> {
  readonly req: HttpRequest;
  private readonly vars = new Map<string, unknown>();
  private readonly responseHeaders = new Headers();

  constructor(raw: RawRequest, params: Record<string, string>) {
    this.req = new HttpRequest(raw, params);
  }

  get<K extends keyof E["Variables"]>(key: K): E["Variables"][K] {
    return this.vars.get(key as string) as E["Variables"][K];
  }

  set<K extends keyof E["Variables"]>(key: K, value: E["Variables"][K]): void {
    this.vars.set(key as string, value);
  }

  header(name: string, value: string): void {
    this.responseHeaders.set(name, value);
  }

  /** Espelha a forma `c.res.headers` usada para construir respostas binarias. */
  get res(): { headers: Headers } {
    return { headers: this.responseHeaders };
  }

  json(data: unknown, status: number = 200): HttpResponse {
    const headers = new Headers(this.responseHeaders);
    headers.set("content-type", "application/json; charset=UTF-8");
    return new HttpResponse(JSON.stringify(data), status, headers);
  }

  text(data: string, status: number = 200): HttpResponse {
    const headers = new Headers(this.responseHeaders);
    headers.set("content-type", "text/plain; charset=UTF-8");
    return new HttpResponse(data, status, headers);
  }

  body(
    data: string | Buffer | Uint8Array | null,
    status: number = 200,
    headers?: Record<string, string>,
  ): HttpResponse {
    const merged = new Headers(this.responseHeaders);
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        merged.set(key, value);
      }
    }
    return new HttpResponse(data, status, merged);
  }
}

export type Next = () => Promise<HttpResponse | Response>;

export type Handler<E extends Env = Env> = (
  c: Context<E>,
  next: Next,
) => HttpResponse | Response | Promise<HttpResponse | Response>;
