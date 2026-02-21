# Server Architecture — Eve Panzarino VPS

> **VPS IP:** `74.208.250.31` | **SSH:** `root@74.208.250.31` | **Password:** `qcSnLl1B`

## Domains & Routing

| Domain | Nginx Config | What It Serves |
|--------|-------------|----------------|
| `evepanzarino.com` | `/etc/nginx/sites-available/default` | Static portfolio site + proxied apps |
| `belonging.lgbt` | `/etc/nginx/sites-available/belonging.lgbt` | belonging.lgbt social app |
| `belonging.network` | `/etc/nginx/sites-available/belonging.network` | Mirror of belonging app |
| `hateregistry.org` | `/etc/nginx/sites-available/hateregistry.org` | Hate registry app (port 5006 client, 5005 API) |

## Docker Containers & Ports

There are **3 separate Docker Compose stacks**:

### Stack 1: Main (`/root/docker-compose.yml`)
| Container | Internal Port | External Port | Purpose |
|-----------|--------------|---------------|---------|
| `app_mysql` | 3306 | **3308** | Main MySQL (portfolio, pixelgrid) |
| `app_server` | 3000 | **3000** | Portfolio Express server |
| `apache_wordpress` | 80 | **8080** | WordPress (blog & dev-blog) |
| `pixelgrid_server` | 5050 | **4000** | PixelGrid backend |

### Stack 2: Belonging (`/root/belonging/docker-compose.yml`)
| Container | Internal Port | External Port | Purpose |
|-----------|--------------|---------------|---------|
| `belonging-mysql` | 3306 | **3307** | Belonging MySQL |
| `belonging-server` | 5000 | **5003** | Belonging API server |
| `belonging-client` | 80 | **5004** | Belonging React frontend (nginx) |
| `belonging-discord-bot` | 5005 | **5005** | Discord bot |

### Stack 3: Timeline (`/var/www/pixelgrid/timeline/docker-compose.yml`)
| Container | Internal Port | External Port | Purpose |
|-----------|--------------|---------------|---------|
| `timeline-mysql` | 3306 | — | Timeline MySQL |
| `timeline-server` | 5000 | **5007** | Timeline backend |
| `timeline-client` | 80 | **5008** | Timeline React frontend |

## Nginx Routing (evepanzarino.com)

| Path | Proxied To | Service |
|------|-----------|---------|
| `/` | Static files from `/var/www/evepanzarino/` | Portfolio homepage |
| `/pixelgrid` | `127.0.0.1:4000` | PixelGrid |
| `/blog` | `127.0.0.1:8080/blog` | WordPress blog |
| `/dev-blog` | `127.0.0.1:8080/dev-blog` | WordPress dev blog |
| `/belonging` | `127.0.0.1:5004` | Belonging app |
| `/belonging/api` | `127.0.0.1:5003/api` | Belonging API |
| `/timeline/` | `127.0.0.1:5008` | Timeline React client |
| `/timeline/api/` | `127.0.0.1:5007/api/` | Timeline API |
| `/timeline/YYYY-MM-DD/` | `127.0.0.1:5007` | Timeline SSR entry pages |

## Nginx Routing (belonging.lgbt / belonging.network)

| Path | Proxied To |
|------|-----------|
| `/` | `127.0.0.1:5004` (belonging-client) |
| `/api` | `127.0.0.1:5003/api` (belonging-server) |

## Critical File Paths — Server

| Path | What It Is |
|------|-----------|
| `/root/docker-compose.yml` | Main stack compose (portfolio, pixelgrid, wordpress, mysql) |
| `/root/belonging/docker-compose.yml` | Belonging stack compose |
| `/root/belonging/.env` | Belonging Discord & auth secrets |
| `/root/belonging/client/build/` | **Belonging frontend build files (served by Docker)** |
| `/root/belonging/client/nginx.conf` | Belonging client nginx config inside container |
| `/var/www/pixelgrid/timeline/docker-compose.yml` | Timeline stack compose |
| `/var/www/evepanzarino/` | **Static portfolio files served directly by nginx** |
| `/var/www/evepanzarino/homepage/` | Homepage CSS/HTML/JS |
| `/var/www/html/` | Older copy of portfolio (NOT actively served) |
| `/etc/nginx/sites-available/` | All nginx site configs |
| `/etc/nginx/sites-enabled/` | Symlinks to active sites |

## Critical File Paths — Local

| Path | What It Is |
|------|-----------|
| `~/Desktop/www/evepanzarino/` | Main workspace root |
| `~/Desktop/www/evepanzarino/homepage/` | Portfolio homepage (HTML, CSS, JS) |
| `~/Desktop/www/evepanzarino/belonging/` | Belonging app source |
| `~/Desktop/www/evepanzarino/belonging/client/` | Belonging React frontend |
| `~/Desktop/www/evepanzarino/belonging/server/` | Belonging Express backend |
| `~/Desktop/www/evepanzarino/belonging/discord-bot/` | Belonging Discord bot |
| `~/Desktop/www/evepanzarino/pixelgrid/` | PixelGrid source |
| `~/Desktop/www/evepanzarino/timeline/` | Timeline source |

## Deployment Procedures

### Deploy Belonging Frontend (React)
```bash
# 1. Build locally
cd ~/Desktop/www/evepanzarino/belonging/client && npm run build

# 2. Upload build to server
rsync -avz -e ssh build/ root@74.208.250.31:/root/belonging/client/build/

# 3. Rebuild Docker container on server
ssh root@74.208.250.31 "cd /root/belonging && docker compose up -d --build --no-deps client"
```

### Deploy Belonging Backend
```bash
# 1. Upload server files
rsync -avz --exclude=node_modules -e ssh server/ root@74.208.250.31:/root/belonging/server/

# 2. Rebuild and restart
ssh root@74.208.250.31 "cd /root/belonging && docker compose up -d --build --no-deps server"
```

### Deploy Belonging Discord Bot
```bash
# 1. Upload bot files
rsync -avz --exclude=node_modules -e ssh discord-bot/ root@74.208.250.31:/root/belonging/discord-bot/

# 2. Rebuild and restart
ssh root@74.208.250.31 "cd /root/belonging && docker compose up -d --build --no-deps discord-bot"
```

### Deploy Static Portfolio (homepage CSS/HTML)
```bash
# Upload directly to nginx-served directory
rsync -avz -e ssh homepage/ root@74.208.250.31:/var/www/evepanzarino/homepage/
```

### Restart All Belonging Services
```bash
ssh root@74.208.250.31 "cd /root/belonging && docker compose down && docker compose up -d --build"
```

### Restart Main Stack (pixelgrid, wordpress, etc.)
```bash
ssh root@74.208.250.31 "cd /root && docker compose down && docker compose up -d --build"
```

## Database Credentials

| Database | Host Container | Port | User | Password | DB Name |
|----------|---------------|------|------|----------|---------|
| Main (portfolio/pixelgrid) | `app_mysql` | 3308 | root | `TrueLove25320664!` | `app_database` |
| Belonging | `belonging-mysql` | 3307 | evepanzarino | `TrueLove25320664!` | `belonging` |

## ⚠️ Common Gotchas

1. **Portfolio homepage is served as STATIC FILES** from `/var/www/evepanzarino/homepage/` — NOT from Docker. Upload CSS/HTML changes directly via rsync, no Docker rebuild needed.

2. **belonging-client is in a SEPARATE compose file** at `/root/belonging/docker-compose.yml` — NOT `/root/docker-compose.yml`. Use `cd /root/belonging && docker compose ...`.

3. **Timeline compose is at** `/var/www/pixelgrid/timeline/` — NOT `/root/timeline/`.

4. **There are duplicate/stale file copies** at `/var/www/html/` and `/root/homepage/`. The ACTIVE paths are `/var/www/evepanzarino/` (nginx-served) and `/root/belonging/` (Docker-built).

5. **Port 5005 conflict**: Both `belonging-discord-bot` (5005) and `hateregistry.org` API (5005 in nginx) use this port. The hate registry may not be actively running.

6. **`sshpass` is NOT installed** on local Mac. Use `expect` for automated SSH/SCP commands.

7. **Daily backups** are configured via launchd to run at 4am → OneDrive `Server Backups/MM-DD-YYYY/`.
