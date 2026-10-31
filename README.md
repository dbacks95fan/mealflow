# MealFlow

A self-hosted recipe / meal-planning app for the household: browse recipes, add new ones, and see a
combined grocery list. Runs as a single Docker container (Express serves both the API and the built
React client) backed by SQLite on a mounted volume — designed to run on a Synology DiskStation.

## Structure

- `client/` — React frontend (Vite)
- `server/` — Express API, serves the built client and persists data to SQLite (`node:sqlite`)
- `e2e/` — Playwright end-to-end tests
- `Dockerfile` / `docker-compose.yml` — single-container deployment

## Local development

```
npm install
npm run dev:server   # API on http://localhost:4000
npm run dev:client   # client on http://localhost:5173 (proxies /api and /health to :4000)
```

Server config (see `server/.env.example`): `PORT` (default 4000), `SQLITE_PATH` (default `./data/mealflow.db`).

## Testing

```
npm run test:server   # server unit tests (vitest)
npm run test:e2e      # Playwright e2e tests (builds client+server, runs the real server)
```

## Running with Docker

```
cp server/.env.example .runtime.env   # first time only; compose reads it as env_file
docker compose up -d --build
```

- `.runtime.env` (git-ignored) holds runtime config and secrets. All values are optional except
  the Fry's ones — see the "Connecting Fry's" section below.
- App is served at `http://localhost:4000` (override with `HTTP_PORT=8080 docker compose up -d`).
- Data persists in `./data` on the host, mounted into the container at `/app/data`.
- No authentication — intended for a trusted home network.
- Health check: `GET /health`.

### Deploying to a Synology DiskStation

Copy this repo (or just `Dockerfile`, `docker-compose.yml`, and the source) onto the NAS, then from
that directory run `docker compose up -d --build` (via SSH, or Container Manager's compose project
import). Set `HTTP_PORT` to whatever port you want exposed on the DiskStation's LAN IP.

On older DSM with the legacy **Docker** package (compose **v1**, Docker Engine 20.10), use the v1
CLI and pin the project name:

```
HTTP_PORT=4000 sudo docker-compose -p mealflow up -d --build
```

The mounted `data/` directory must be writable by uid 1000 (the container runs as the non-root
`node` user):

```
sudo docker run --rm -v "$PWD/data":/data alpine chown -R 1000:1000 /data
```

If `npm ci` stalls during the build with `EAI_AGAIN` (DNS), build with host networking:
`sudo docker build --network=host -t mealflow:latest . && sudo docker-compose -p mealflow up -d`.

If a running container has **no outbound network** (DNS and pings fail from inside, but work
on the host), DSM has flushed Docker's bridge NAT rules. Fix it by restarting the Docker
package (Package Center → Docker → Stop, then Start) or rebooting the NAS. As a stopgap, add
`network_mode: host` to the `app` service (and drop the `ports:` block — host mode ignores it;
the app binds `PORT` directly on the host).

### Connecting Fry's (Kroger)

Fry's/Kroger cart integration is inert until `MEALFLOW_SECRET_KEY`, `KROGER_CLIENT_ID`, and
`KROGER_CLIENT_SECRET` are set in `.runtime.env`. Then:

1. Register the redirect URI **exactly** in your Kroger developer app — e.g.
   `http://<NAS-LAN-IP>:4000/api/frys/callback` — and set `KROGER_REDIRECT_URI` to the same string.
2. `MEALFLOW_SECRET_KEY` must be a stable 32+ byte value (e.g.
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). It encrypts the
   stored Fry's refresh token; if it changes, you must reconnect.
3. From a browser **on the same network as the NAS**, open `http://<NAS-LAN-IP>:4000/settings` →
   **Connect Fry's** → log in at Kroger and approve. The OAuth redirect is a browser-side hop over
   the LAN, so the app never needs to be internet-facing. After this one approval the server
   refreshes tokens and adds to the cart on its own.

## CI

GitHub Actions (`.github/workflows/ci.yml`) builds and runs server + e2e tests on every push and pull request.
