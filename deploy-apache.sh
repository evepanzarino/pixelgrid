#!/bin/bash

# Deployment script for Apache setup (without Docker)
# Run this after vps-install.sh

set -e

echo "========================================"
echo "PixelGrid Deployment (Apache + PM2)"
echo "========================================"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}Please edit .env file with your database credentials!${NC}"
    echo "Update these values in .env:"
    echo "  DB_HOST=localhost"
    echo "  DB_USER=pixelgrid_user"
    echo "  DB_PASSWORD=PixelGrid2026!DBPass"
    echo "  DB_NAME=pixelgrid_db"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Load environment
export $(cat .env | grep -v '^#' | xargs)

echo -e "${GREEN}✓ Environment loaded${NC}"

# Install frontend dependencies and build
echo -e "${YELLOW}Building frontend...${NC}"
cd client
npm install
npm run build
cd ..

echo -e "${GREEN}✓ Frontend built${NC}"

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd server
npm install --production
cd ..

echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Import database schema
echo -e "${YELLOW}Setting up database...${NC}"
if [ -f database/init.sql ]; then
    mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < database/init.sql 2>/dev/null || true
    echo -e "${GREEN}✓ Database schema imported${NC}"
fi

# Stop existing PM2 process
echo -e "${YELLOW}Stopping existing processes...${NC}"
pm2 delete pixelgrid 2>/dev/null || true

# Start with PM2
echo -e "${YELLOW}Starting application with PM2...${NC}"
cd server
pm2 start server.js --name pixelgrid --env production
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER

cd ..

echo -e "${GREEN}✓ Application started${NC}"

# Wait for app to start
sleep 3

# Health check
if curl -f http://localhost:5000/api/health &> /dev/null; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}Warning: Health check did not respond yet${NC}"
fi

# Restart Apache to ensure proxy is active
sudo systemctl restart apache2

echo ""
echo "========================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Application is running at:"
echo "  - http://74.208.250.31"
echo "  - http://74.208.250.31/pixelgrid"
echo ""
echo "Useful commands:"
echo "  - View logs:     pm2 logs pixelgrid"
echo "  - Status:        pm2 status"
echo "  - Restart:       pm2 restart pixelgrid"
echo "  - Stop:          pm2 stop pixelgrid"
echo "  - Apache logs:   sudo tail -f /var/log/apache2/pixelgrid_error.log"
echo ""
