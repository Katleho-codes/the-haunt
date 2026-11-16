# Deploying THE HAUNT on the homelab

Matches the existing stack: Caddy on the `homelab` network, `auto_https off`, Cloudflare tunnel in front. Cloudflare provides HTTPS.

| Service | Container | Port | Networks | Reachable from |
|---|---|---|---|---|
| `haunt-web` | `haunt_web` | 3009 | `homelab`, `haunt_internal` | Caddy (so the tunnel and the internet, via `haunt.lsquared.org.za`) |
| `haunt-api` | `haunt_api` | 8009 | `haunt_internal` only | `haunt-web` only |

Neither port is published on the host. `haunt_internal` is `internal: true`, so `haunt-api` has no route out. Caddy, the tunnel, the other apps and your LAN cannot reach it.

## Steps

1. Clone the repo next to the other apps:
   ```bash
   cd ~/homelab/apps && git clone https://github.com/Katleho-codes/the-haunt.git
   ```
2. Create `~/homelab/apps/the-haunt/.env` with a random token. The API refuses to start without one.
   ```bash
   echo "API_TOKEN=$(openssl rand -hex 32)" > ~/homelab/apps/the-haunt/.env && chmod 600 ~/homelab/apps/the-haunt/.env
   ```
3. Paste the two services and the `haunt_internal` network from `docker-compose.haunt.yml` into `~/homelab/docker-compose.yml`.
4. Paste `Caddyfile.haunt` inside the `:80 { }` block of `~/homelab/Caddyfile`.
5. In Cloudflare Zero Trust, open the tunnel, go to **Public hostnames** and add `haunt.lsquared.org.za`. Point it at the same service as your other hostnames, for example `http://localhost:80`, or `http://caddy:80` if cloudflared runs in Docker on the `homelab` network. The tunnel creates the DNS record.
6. Start it and reload Caddy:
   ```bash
   cd ~/homelab
   docker compose up -d --build haunt-web haunt-api
   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

## Check that the backend is hidden

```bash
docker compose ps haunt-web haunt-api                                   # PORTS column empty for both
docker inspect haunt_api --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'   # homelab_haunt_internal only
docker exec haunt_web wget -qO- http://haunt-api:8009/health            # {"status":"ok",...}
docker exec caddy wget -T 3 -qO- http://haunt-api:8009/health           # fails: bad address
docker exec haunt_api wget -T 3 -qO- http://1.1.1.1                      # fails: no internet
curl -s -o /dev/null -w '%{http_code}\n' https://haunt.lsquared.org.za/            # 200
curl -s -o /dev/null -w '%{http_code}\n' https://haunt.lsquared.org.za/api/health  # 404 (served by the frontend)
```

On Linux, root on the host itself can still reach container IPs on a bridge network. That is normal Docker behaviour, and it doesn't expose the API to the LAN or the internet.

## Updating

```bash
cd ~/homelab/apps/the-haunt && git pull
cd ~/homelab && docker compose up -d --build haunt-web haunt-api
```
