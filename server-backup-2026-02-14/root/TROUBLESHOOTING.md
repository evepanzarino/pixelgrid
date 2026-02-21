# Troubleshooting Guide - 502 Error Fix

## Problem
You're getting a 502 Bad Gateway error from nginx. This means nginx can't connect to your backend server at `localhost:5003`.

## Quick Fix

### Step 1: Check VPS Status
Run the diagnostic script to see what's wrong:

```bash
# From your local machine
ssh root@evepanzarino.com "bash -s" < check-vps-status.sh

# Or if you're already on the VPS
./check-vps-status.sh
```

This will show you:
- If Docker is running
- If containers are running
- If ports are listening
- If services are responding

### Step 2: Restart Belonging Services
If containers aren't running, restart them:

```bash
# From your local machine
ssh root@evepanzarino.com "bash -s" < restart-belonging.sh

# Or if you're already on the VPS
cd /path/to/belonging
./restart-belonging.sh
```

### Step 3: Update Nginx Config
The nginx.conf has been updated with:
- Correct domain names (evepanzarino.com, belonging.lgbt)
- Better error handling
- Improved timeout settings

To apply the new nginx config:

```bash
# Copy nginx.conf to VPS
scp nginx.conf root@evepanzarino.com:/etc/nginx/sites-available/evepanzarino

# Or edit directly on VPS
ssh root@evepanzarino.com
nano /etc/nginx/sites-available/evepanzarino
# Paste the updated nginx.conf content

# Test nginx config
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## Common Issues and Solutions

### Issue 1: Docker containers not running
**Symptoms:** `check-vps-status.sh` shows containers as stopped or not found

**Solution:**
```bash
cd /path/to/belonging
docker compose down
docker compose up -d
```

### Issue 2: Port 5003 not listening
**Symptoms:** Port check shows port 5003 is not listening

**Solution:**
- Check if the container is running: `docker ps`
- Check container logs: `docker logs belonging-server`
- Verify port mapping in docker-compose.yml (should be `5003:5000`)

### Issue 3: Container keeps crashing
**Symptoms:** Container starts but immediately stops

**Solution:**
```bash
# Check logs for errors
docker logs belonging-server

# Common issues:
# - Database connection failed (check MySQL container)
# - Missing .env file or wrong environment variables
# - Port already in use
```

### Issue 4: Nginx can't connect to localhost:5003
**Symptoms:** 502 error persists even though container is running

**Solution:**
- Verify container is binding to 0.0.0.0 (check server.js - it should)
- Check if port mapping is correct: `docker ps | grep belonging-server`
- Test direct connection: `curl http://localhost:5003/api/health`
- Check firewall: `sudo ufw status`

### Issue 5: Database connection errors
**Symptoms:** Container logs show MySQL connection errors

**Solution:**
```bash
# Check MySQL container
docker ps | grep mysql

# Check MySQL logs
docker logs belonging-mysql

# Restart MySQL container
docker restart belonging-mysql

# Wait for MySQL to be ready, then restart server
docker restart belonging-server
```

## Manual Steps

If the scripts don't work, here are manual steps:

### 1. Check Docker Status
```bash
sudo systemctl status docker
sudo systemctl start docker  # if not running
```

### 2. Check Container Status
```bash
docker ps -a | grep belonging
```

### 3. View Container Logs
```bash
docker logs belonging-server
docker logs belonging-mysql
docker logs belonging-discord-bot
```

### 4. Restart Containers
```bash
cd /path/to/belonging
docker compose down
docker compose up -d
```

### 5. Check Ports
```bash
netstat -tuln | grep -E "5003|4000|8080"
# or
ss -tuln | grep -E "5003|4000|8080"
```

### 6. Test Service Directly
```bash
curl http://localhost:5003/api/health
curl http://localhost:4000/api/health
```

### 7. Restart Nginx
```bash
sudo nginx -t  # Test config first
sudo systemctl restart nginx
```

## Prevention

To prevent this in the future:

1. **Set up auto-restart for Docker containers:**
   ```yaml
   # In docker-compose.yml, add to each service:
   restart: unless-stopped
   ```

2. **Monitor container health:**
   ```bash
   # Add to crontab (crontab -e):
   */5 * * * * docker ps | grep belonging-server || cd /path/to/belonging && docker compose up -d
   ```

3. **Set up log rotation:**
   ```bash
   # Configure Docker log rotation in /etc/docker/daemon.json
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "10m",
       "max-file": "3"
     }
   }
   ```

## Getting Help

If none of these solutions work:

1. Check all logs: `docker logs belonging-server --tail 100`
2. Check nginx error log: `sudo tail -f /var/log/nginx/pixelgrid_error.log`
3. Check system logs: `sudo journalctl -u docker -n 50`
4. Verify environment variables in `.env` file
5. Check disk space: `df -h`
6. Check memory: `free -h`
