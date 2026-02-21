# PixelGrid - VPS Deployment Files

This repository now includes production-ready deployment configurations for VPS hosting.

## Quick VPS Deployment

### 1. On your VPS, clone the repository:

```bash
git clone https://github.com/evepanzarino/pixelgrid.git
cd pixelgrid
```

### 2. Configure environment variables:

```bash
cp .env.example .env
nano .env  # Edit with your secure passwords and settings
```

### 3. Run the deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

## Deployment Files Included

- **`DEPLOYMENT.md`** - Complete deployment guide with Docker and manual setup options
- **`docker-compose.prod.yml`** - Production Docker Compose configuration
- **`.env.example`** - Environment variables template
- **`nginx.conf`** - Nginx reverse proxy configuration
- **`deploy.sh`** - Automated deployment script

## What You'll Need on Your VPS

- Ubuntu 20.04+ (or similar Linux distribution)
- Docker and Docker Compose
- Git
- (Optional) Nginx for reverse proxy
- (Optional) SSL certificate for HTTPS

## Next Steps

1. **Read `DEPLOYMENT.md`** for detailed instructions
2. **Configure `.env`** with your production settings
3. **Run `./deploy.sh`** to deploy automatically
4. **Setup Nginx** (optional) for domain routing and SSL

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
