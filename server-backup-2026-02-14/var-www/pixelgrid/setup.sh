#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Full Stack Application Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}\n"

# Setup backend
echo -e "${BLUE}Setting up backend server...${NC}"
cd server
echo "Installing dependencies..."
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}\n"

# Go back to root
cd ..

# Setup frontend
echo -e "${BLUE}Setting up frontend client...${NC}"
cd client
echo "Installing dependencies..."
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}\n"

# Go back to root
cd ..

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. ${GREEN}Set up your MySQL database:${NC}"
echo "   mysql -u root -p < database/init.sql"
echo ""
echo -e "2. ${GREEN}Update database credentials in server/.env if needed${NC}"
echo ""
echo -e "3. ${GREEN}Start the backend server:${NC}"
echo "   cd server && npm run dev"
echo ""
echo -e "4. ${GREEN}In a new terminal, start the frontend:${NC}"
echo "   cd client && npm start"
echo ""
echo -e "${YELLOW}The app will be available at:${NC}"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
