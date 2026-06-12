import { createServer } from "node:http";
import app from "./app";
import { env } from "./shared/config/env";

const server = createServer(app.requestListener);

server.listen(env.PORT, () => {
  console.log(`API online em http://localhost:${env.PORT}`);
});
