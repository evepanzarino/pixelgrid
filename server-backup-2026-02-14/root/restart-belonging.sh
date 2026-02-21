#!/bin/bash

# Script to restart Belonging services on VPS
# Usage: ssh root@evepanzarino.com "bash -s" < restart-belonging.sh
# Or run directly on VPS: ./restart-belonging.sh

set -e

echo "=========================================="
echo "Restarting Belonging Services"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Find belonging directory
BELONGING_DIR=""
if [ -d "/root/belonging" ]; then
    BELONGING_DIR="/root/belonging"
elif [ -d "/home/$(whoami)/belonging" ]; then
    BELONGING_DIR="/home/$(whoami)/belonging"
elif [ -d "./belonging" ]; then
    BELONGING_DIR="./belonging"
else
    echo -e "${RED}✗ Cannot find belonging directory${NC}"
    echo "Please specify the path to belonging directory:"
    read -p "Path: " BELONGING_DIR
fi

if [ ! -d "$BELONGING_DIR" ]; then
    echo -e "${RED}✗ Directory $BELONGING_DIR does not exist${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found belonging directory: $BELONGING_DIR${NC}"
cd "$BELONGING_DIR"

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ docker-compose.yml not found in $BELONGING_DIR${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Using .env.example if available...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠ Please edit .env file with your actual values!${NC}"
    else
        echo -e "${RED}✗ No .env or .env.example file found${NC}"
        exit 1
    fi
fi

# Stop existing containers
echo ""
echo "Stopping existing containers..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

# Wait a moment
sleep 2

# Start containers
echo ""
echo "Starting containers..."
if docker compose up -d 2>/dev/null; then
    echo -e "${GREEN}✓ Containers started${NC}"
elif docker-compose up -d 2>/dev/null; then
    echo -e "${GREEN}✓ Containers started${NC}"
else
    echo -e "${RED}✗ Failed to start containers${NC}"
    exit 1
fi

# Wait for services to start
echo ""
echo "Waiting for services to start..."
sleep 5

# Check container status
echo ""
echo "Container status:"
docker ps --filter "name=belonging" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test connectivity
echo ""
echo "Testing connectivity..."
if command -v curl &> /dev/null; then
    echo -n "Testing Belonging server (localhost:5003)... "
    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:5003/api/health 2>/dev/null | grep -q "200\|404\|401"; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ Not responding${NC}"
        echo "Check logs with: docker logs belonging-server"
    fi
else
    echo "curl not available, skipping connectivity test"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Restart Complete"
echo "==========================================${NC}"
echo ""
echo "To view logs:"
echo "  docker logs -f belonging-server"
echo "  docker logs -f belonging-discord-bot"
echo ""
echo "To check status:"
echo "  docker ps --filter 'name=belonging'"
echo ""
