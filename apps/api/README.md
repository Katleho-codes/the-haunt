# apps/api (placeholder)

This folder holds a stand-in for the future API (the brief plans NestJS, PostgreSQL and a reminder worker here). **It has no features.** It exists so the Docker network layout can be built and tested first:

- The API container is on an internal-only Docker network. It publishes **no ports**, has no route to the internet, and cannot be reached from the host or your LAN.
- Only the web container is attached to both that internal network and the public one. The browser talks to the web container; the web container's server code talks to `http://api:4000`.
- Every request except `GET /health` needs `Authorization: Bearer $API_TOKEN`. The token is a server-side secret shared by the two containers through your `.env` file. It is never sent to the browser and must never be named `NEXT_PUBLIC_*`.

Run it (optional; the app does not use it yet):

```bash
cp .env.example .env            # then set API_TOKEN to a long random value
docker compose --profile backend up -d --build
```

Check the isolation:

```bash
docker compose ps                                           # the api service shows no published port
docker exec the-haunt wget -qO- http://api:4000/health      # works from the web container
curl http://localhost:4000/health                           # fails from the host
```

When the real API replaces this placeholder, keep these rules: validate every request body, enforce per-user ownership on every read and write, and never log commitment text or amounts (see `.kiro/steering/security.md`).
