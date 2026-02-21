#!/bin/bash

# Diagnostic script to check VPS status
# Run this on your VPS: ssh root@evepanzarino.com "bash -s" < check-vps-status.sh

echo "=========================================="
echo "VPS Status Check"
echo "=========================================="
echo ""

# Check if Docker is running
echo "1. Checking Docker..."
if command -v docker &> /dev/null; then
    echo "   ✓ Docker is installed"
    docker --version
    if docker ps &> /dev/null; then
        echo "   ✓ Docker daemon is running"
    else
        echo "   ✗ Docker daemon is NOT running"
        echo "   Try: sudo systemctl start docker"
    fi
else
    echo "   ✗ Docker is not installed"
fi
echo ""

# Check Docker containers
echo "2. Checking Docker containers..."
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo "   Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "   All containers (including stopped):"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    # Check specific containers
    echo "   Checking Belonging containers..."
    if docker ps | grep -q "belonging-server"; then
        echo "   ✓ belonging-server is running"
        docker ps | grep "belonging-server" | awk '{print "      Ports: " $NF}'
    else
        echo "   ✗ belonging-server is NOT running"
        if docker ps -a | grep -q "belonging-server"; then
            echo "      Container exists but is stopped"
            docker ps -a | grep "belonging-server" | awk '{print "      Status: " $NF}'
        else
            echo "      Container does not exist"
        fi
    fi
    
    if docker ps | grep -q "belonging-mysql"; then
        echo "   ✓ belonging-mysql is running"
    else
        echo "   ✗ belonging-mysql is NOT running"
    fi
    
    if docker ps | grep -q "belonging-discord-bot"; then
        echo "   ✓ belonging-discord-bot is running"
    else
        echo "   ✗ belonging-discord-bot is NOT running"
    fi
else
    echo "   Cannot check containers (Docker not available)"
fi
echo ""

# Check ports
echo "3. Checking ports..."
if command -v netstat &> /dev/null; then
    echo "   Port 5003 (Belonging server):"
    if netstat -tuln 2>/dev/null | grep -q ":5003"; then
        echo "   ✓ Port 5003 is listening"
        netstat -tuln 2>/dev/null | grep ":5003"
    else
        echo "   ✗ Port 5003 is NOT listening"
    fi
    
    echo "   Port 4000 (Pixelgrid server):"
    if netstat -tuln 2>/dev/null | grep -q ":4000"; then
        echo "   ✓ Port 4000 is listening"
        netstat -tuln 2>/dev/null | grep ":4000"
    else
        echo "   ✗ Port 4000 is NOT listening"
    fi
    
    echo "   Port 8080 (WordPress):"
    if netstat -tuln 2>/dev/null | grep -q ":8080"; then
        echo "   ✓ Port 8080 is listening"
        netstat -tuln 2>/dev/null | grep ":8080"
    else
        echo "   ✗ Port 8080 is NOT listening"
    fi
elif command -v ss &> /dev/null; then
    echo "   Port 5003 (Belonging server):"
    if ss -tuln 2>/dev/null | grep -q ":5003"; then
        echo "   ✓ Port 5003 is listening"
        ss -tuln 2>/dev/null | grep ":5003"
    else
        echo "   ✗ Port 5003 is NOT listening"
    fi
    
    echo "   Port 4000 (Pixelgrid server):"
    if ss -tuln 2>/dev/null | grep -q ":4000"; then
        echo "   ✓ Port 4000 is listening"
        ss -tuln 2>/dev/null | grep ":4000"
    else
        echo "   ✗ Port 4000 is NOT listening"
    fi
    
    echo "   Port 8080 (WordPress):"
    if ss -tuln 2>/dev/null | grep -q ":8080"; then
        echo "   ✓ Port 8080 is listening"
        ss -tuln 2>/dev/null | grep ":8080"
    else
        echo "   ✗ Port 8080 is NOT listening"
    fi
else
    echo "   Cannot check ports (netstat/ss not available)"
fi
echo ""

# Check nginx
echo "4. Checking Nginx..."
if command -v nginx &> /dev/null; then
    echo "   ✓ Nginx is installed"
    nginx -v 2>&1
    
    if systemctl is-active --quiet nginx; then
        echo "   ✓ Nginx is running"
    else
        echo "   ✗ Nginx is NOT running"
        echo "   Try: sudo systemctl start nginx"
    fi
    
    echo "   Testing nginx configuration..."
    if nginx -t 2>&1 | grep -q "successful"; then
        echo "   ✓ Nginx configuration is valid"
    else
        echo "   ✗ Nginx configuration has errors:"
        nginx -t
    fi
else
    echo "   ✗ Nginx is not installed"
fi
echo ""

# Check if we can connect to the services
echo "5. Testing service connectivity..."
if command -v curl &> /dev/null; then
    echo "   Testing Belonging server (localhost:5003)..."
    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:5003/api/health 2>/dev/null | grep -q "200\|404\|401"; then
        echo "   ✓ Belonging server is responding"
        curl -s --max-time 5 http://localhost:5003/api/health | head -c 100
        echo ""
    else
        echo "   ✗ Belonging server is NOT responding"
    fi
    
    echo "   Testing Pixelgrid server (localhost:4000)..."
    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:4000/api/health 2>/dev/null | grep -q "200\|404"; then
        echo "   ✓ Pixelgrid server is responding"
    else
        echo "   ✗ Pixelgrid server is NOT responding"
    fi
else
    echo "   Cannot test connectivity (curl not available)"
fi
echo ""

# Check Docker logs for errors
echo "6. Recent Docker logs (last 20 lines)..."
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    if docker ps | grep -q "belonging-server"; then
        echo "   Belonging server logs:"
        docker logs --tail 20 belonging-server 2>&1 | sed 's/^/      /'
    fi
else
    echo "   Cannot check logs (Docker not available)"
fi
echo ""

echo "=========================================="
echo "Summary"
echo "=========================================="
echo "If you see ✗ marks above, those services need attention."
echo ""
echo "To restart Belonging services:"
echo "  cd /path/to/belonging"
echo "  docker compose down"
echo "  docker compose up -d"
echo ""
echo "To restart Nginx:"
echo "  sudo systemctl restart nginx"
echo ""
