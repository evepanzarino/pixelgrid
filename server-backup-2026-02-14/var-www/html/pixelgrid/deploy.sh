#!/bin/bash

# Production Deployment Script for VPS
# This script automates the deployment process

set -e  # Exit on error

echo "========================================"
echo "PixelGrid Production Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${RED}Please edit .env file with your production values before continuing!${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo -e "${GREEN}✓ Environment variables loaded${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Run: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose plugin.${NC}"
    echo "Run: sudo apt install docker-compose-plugin"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Stop existing containers
echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build frontend
echo "Building frontend..."
cd client
npm install --production=false
npm run build
cd ..

echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Build and start containers
echo "Building and starting Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Waiting for services to start..."
sleep 10

# Check if containers are running
if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Containers are running${NC}"
else
    echo -e "${RED}✗ Containers failed to start${NC}"
    docker compose -f docker-compose.prod.yml logs
    exit 1
fi

# Health check
echo "Performing health check..."
sleep 5

if curl -f http://localhost:5050/api/health &> /dev/null; then
    echo -e "${GREEN}✓ Server health check passed${NC}"
else
    echo -e "${YELLOW}Warning: Health check failed, but containers are running${NC}"
    echo "Check logs with: docker compose -f docker-compose.prod.yml logs"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "========================================"
echo ""
echo "Your application is running at:"
echo "  - http://localhost:5050"
echo ""
echo "Useful commands:"
echo "  - View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "  - Stop:         docker compose -f docker-compose.prod.yml down"
echo "  - Restart:      docker compose -f docker-compose.prod.yml restart"
echo "  - Status:       docker compose -f docker-compose.prod.yml ps"
echo ""
