// PLACEHOLDER for the future API. It has no features.
//
// Purpose: prove the Docker network layout (the API is reachable only by the web container, never published to the host or
// the internet) before the real NestJS API exists. It answers /health and refuses everything else without the shared token.
//
// Do not describe this as a backend in the UI, README, demo or write-up. The app does not call it today.
import { timingSafeEqual } from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.PORT ?? 4000);
const TOKEN = process.env.API_TOKEN ?? "";

if (TOKEN.length < 16) {
  console.error("API_TOKEN must be set to a random value of at least 16 characters. Refusing to start.");
  process.exit(1);
}

function sameSecret(supplied, expected) {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://internal");

  // Health is for the container runtime and the web container. It reveals nothing.
  if (req.method === "GET" && pathname === "/health") {
    send(res, 200, { status: "ok", service: "the-haunt-api-placeholder" });
    return;
  }

  // Everything else needs the shared secret that only the web container holds.
  const supplied = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!sameSecret(supplied, TOKEN)) {
    send(res, 401, { error: "unauthorized" });
    return;
  }
  send(res, 404, { error: "not_found" }); // no endpoints exist yet
});

server.listen(PORT, "0.0.0.0", () => console.log(`placeholder api listening on ${PORT} (internal network only)`));

for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));
