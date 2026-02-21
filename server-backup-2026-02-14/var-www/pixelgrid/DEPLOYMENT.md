# VPS Deployment Guide

## Prerequisites

Your VPS should have:
- **Ubuntu 20.04+** (or similar Linux distribution)
- **Node.js 18+** and **npm**
- **MySQL 8.0+** or **Docker** and **Docker Compose**
- **Git** (to clone the repository)
- **Nginx** (for reverse proxy - optional but recommended)

## Option 1: Docker Deployment (Recommended)

### 1. Install Docker and Docker Compose on VPS

```bash
# Update package list
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone Repository

```bash
cd /home/your-username
git clone https://github.com/evepanzarino/pixelgrid.git
cd pixelgrid
```

### 3. Configure Environment

Create `.env` file in the root directory:

```bash
# Database Configuration
MYSQL_ROOT_PASSWORD=your_secure_password_here
MYSQL_DATABASE=pixelgrid_db

# Server Configuration
DB_HOST=mysql
DB_USER=root
DB_PASSWORD=your_secure_password_here
DB_NAME=pixelgrid_db
DB_PORT=3306
SERVER_PORT=5000

# Production mode
NODE_ENV=production
```

### 4. Update Docker Compose for Production

The `docker-compose.prod.yml` file is already configured. Review and adjust ports if needed.

### 5. Build and Deploy

```bash
# Build the frontend
cd client
npm install
npm run build
cd ..

# Start services
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### 6. Verify Deployment

```bash
# Check running containers
docker ps

# Test the API
curl http://localhost:5000/api/health

# View logs
docker compose -f docker-compose.prod.yml logs
```

## Option 2: Manual Deployment (Without Docker)

### 1. Install MySQL

```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

### 2. Create Database

```bash
sudo mysql -u root -p

# In MySQL prompt:
CREATE DATABASE pixelgrid_db;
CREATE USER 'pixelgrid_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON pixelgrid_db.* TO 'pixelgrid_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import initial schema
mysql -u pixelgrid_user -p pixelgrid_db < database/init.sql
```

### 3. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 4. Clone and Setup Application

```bash
# Clone repository
cd /home/your-username
git clone https://github.com/evepanzarino/pixelgrid.git
cd pixelgrid

# Install and build frontend
cd client
npm install
npm run build
cd ..

# Install backend dependencies
cd server
npm install
```

### 5. Configure Backend

Create `server/.env`:

```env
DB_HOST=localhost
DB_USER=pixelgrid_user
DB_PASSWORD=your_secure_password
DB_NAME=pixelgrid_db
DB_PORT=3306
SERVER_PORT=5000
NODE_ENV=production
```

### 6. Setup PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
cd server
pm2 start server.js --name pixelgrid-server

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command it outputs

# Check status
pm2 status
pm2 logs pixelgrid-server
```

## Nginx Reverse Proxy Setup (Recommended)

### 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 2. Configure Nginx

Create `/etc/nginx/sites-available/pixelgrid`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Increase upload size limit if needed
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pixelgrid /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 4. Setup SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically
# Test renewal
sudo certbot renew --dry-run
```

## Firewall Configuration

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# If using Docker without Nginx, allow port 5000
sudo ufw allow 5000

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Monitoring and Maintenance

### Check Application Status

```bash
# Docker deployment
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f

# Manual deployment with PM2
pm2 status
pm2 logs pixelgrid-server
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Docker deployment
cd client && npm install && npm run build && cd ..
docker compose -f docker-compose.prod.yml up -d --build

# Manual deployment
cd client && npm install && npm run build && cd ..
cd server && npm install && cd ..
pm2 restart pixelgrid-server
```

### Backup Database

```bash
# Docker deployment
docker exec app_mysql mysqldump -u root -p pixelgrid_db > backup_$(date +%Y%m%d).sql

# Manual deployment
mysqldump -u pixelgrid_user -p pixelgrid_db > backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Check Logs

```bash
# Docker
docker compose -f docker-compose.prod.yml logs app_server
docker compose -f docker-compose.prod.yml logs mysql

# PM2
pm2 logs pixelgrid-server

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart Services

```bash
# Docker
docker compose -f docker-compose.prod.yml restart

# PM2
pm2 restart pixelgrid-server

# Nginx
sudo systemctl restart nginx
```

### Check Port Availability

```bash
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :3306
```

## Security Recommendations

1. **Change default passwords** in `.env` and database
2. **Use SSL/TLS** with Let's Encrypt
3. **Setup firewall** with UFW or iptables
4. **Regular updates**: `sudo apt update && sudo apt upgrade`
5. **Use environment variables** for sensitive data
6. **Regular database backups**
7. **Monitor logs** for suspicious activity
8. **Limit SSH access** - use key-based authentication
9. **Keep Node.js and dependencies updated**

## Quick Start Commands

```bash
# Docker deployment (quick start)
git clone https://github.com/evepanzarino/pixelgrid.git
cd pixelgrid
cp .env.example .env
# Edit .env with your values
cd client && npm install && npm run build && cd ..
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps
curl http://localhost:5000/api/health
```

Your application should now be accessible at `http://your-vps-ip:5000` or `http://your-domain.com` if you configured Nginx.
