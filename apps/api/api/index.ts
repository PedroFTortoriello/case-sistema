import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../src/app";

// Handler serverless da Vercel (runtime Node.js): recebe os objetos nativos
// `req`/`res` e delega para o listener do servidor http.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app.requestListener(req, res);
}
