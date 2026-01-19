#!/bin/bash

# VPS Installation Script for PixelGrid
# Run this on your VPS after SSH connection

set -e  # Exit on error

echo "========================================"
echo "PixelGrid VPS Setup Script"
echo "Installing: Apache2, MySQL, Docker, Node.js"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt update
sudo apt upgrade -y

echo -e "${GREEN}✓ System updated${NC}"

# Install Apache2
echo -e "${YELLOW}Installing Apache2...${NC}"
sudo apt install apache2 -y
sudo systemctl enable apache2
sudo systemctl start apache2

echo -e "${GREEN}✓ Apache2 installed${NC}"

# Install MySQL
echo -e "${YELLOW}Installing MySQL Server...${NC}"
sudo apt install mysql-server -y
sudo systemctl enable mysql
sudo systemctl start mysql

echo -e "${GREEN}✓ MySQL installed${NC}"

# Secure MySQL installation
echo -e "${YELLOW}Securing MySQL...${NC}"
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'PixelGrid2026!Secure';"
sudo mysql -e "DELETE FROM mysql.user WHERE User='';"
sudo mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
sudo mysql -e "DROP DATABASE IF EXISTS test;"
sudo mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo -e "${GREEN}✓ MySQL secured${NC}"

# Create database and user for PixelGrid
echo -e "${YELLOW}Creating PixelGrid database...${NC}"
sudo mysql -u root -p'PixelGrid2026!Secure' <<MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS pixelgrid_db;
CREATE USER IF NOT EXISTS 'pixelgrid_user'@'localhost' IDENTIFIED BY 'PixelGrid2026!DBPass';
GRANT ALL PRIVILEGES ON pixelgrid_db.* TO 'pixelgrid_user'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

echo -e "${GREEN}✓ PixelGrid database created${NC}"

# Install Docker
echo -e "${YELLOW}Installing Docker...${NC}"
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
rm get-docker.sh

echo -e "${GREEN}✓ Docker installed${NC}"

# Install Docker Compose
echo -e "${YELLOW}Installing Docker Compose...${NC}"
sudo apt install docker-compose-plugin -y

echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Install Node.js 18.x
echo -e "${YELLOW}Installing Node.js 18.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

echo -e "${GREEN}✓ Node.js installed${NC}"

# Install build essentials
echo -e "${YELLOW}Installing build essentials...${NC}"
sudo apt install -y build-essential git curl wget

echo -e "${GREEN}✓ Build tools installed${NC}"

# Install PM2 for process management
echo -e "${YELLOW}Installing PM2...${NC}"
sudo npm install -g pm2

echo -e "${GREEN}✓ PM2 installed${NC}"

# Configure Apache for reverse proxy
echo -e "${YELLOW}Configuring Apache as reverse proxy...${NC}"

# Enable required Apache modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl

# Create Apache virtual host configuration
sudo tee /etc/apache2/sites-available/pixelgrid.conf > /dev/null <<'APACHE_CONF'
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    
    # Serve PixelGrid at /pixelgrid
    ProxyPreserveHost On
    ProxyPass /pixelgrid http://localhost:5000
    ProxyPassReverse /pixelgrid http://localhost:5000
    
    # Also serve at root
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    # Enable WebSocket support (if needed)
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:5000/$1" [P,L]
    
    ErrorLog ${APACHE_LOG_DIR}/pixelgrid_error.log
    CustomLog ${APACHE_LOG_DIR}/pixelgrid_access.log combined
</VirtualHost>
APACHE_CONF

# Enable the site and restart Apache
sudo a2ensite pixelgrid.conf
sudo systemctl restart apache2

echo -e "${GREEN}✓ Apache configured${NC}"

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw --force enable

echo -e "${GREEN}✓ Firewall configured${NC}"

# Create project directory
echo -e "${YELLOW}Creating project directory...${NC}"
sudo mkdir -p /var/www/pixelgrid
sudo chown -R $USER:$USER /var/www/pixelgrid

echo -e "${GREEN}✓ Project directory created${NC}"

# Display versions
echo ""
echo "========================================"
echo -e "${GREEN}Installation Complete!${NC}"
echo "========================================"
echo ""
echo "Installed versions:"
echo "  Apache:  $(apache2 -v | head -n 1)"
echo "  MySQL:   $(mysql --version)"
echo "  Docker:  $(docker --version)"
echo "  Node.js: $(node --version)"
echo "  npm:     $(npm --version)"
echo "  PM2:     $(pm2 --version)"
echo ""
echo "Database credentials:"
echo "  Root password:     PixelGrid2026!Secure"
echo "  Database:          pixelgrid_db"
echo "  User:              pixelgrid_user"
echo "  User password:     PixelGrid2026!DBPass"
echo ""
echo "Next steps:"
echo "  1. Exit and re-login to apply Docker group changes: exit"
echo "  2. Clone your repository:"
echo "     cd /var/www/pixelgrid"
echo "     git clone https://github.com/evepanzarino/pixelgrid.git ."
echo "  3. Run deployment:"
echo "     cp .env.example .env"
echo "     nano .env  # Update with database credentials above"
echo "     chmod +x deploy-apache.sh"
echo "     ./deploy-apache.sh"
echo ""
echo "Your app will be available at:"
echo "  http://74.208.250.31"
echo "  http://74.208.250.31/pixelgrid"
echo ""
