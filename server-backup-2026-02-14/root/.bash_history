exit
chmod +x vps-install.sh deploy-apache.sh
# Download and run the installation script
wget https://raw.githubusercontent.com/evepanzarino/pixelgrid/main/vps-install.sh
chmod +x vps-install.sh
./vps-install.sh
Clone and deploy
cd /var/www/pixelgrid
git clone https://github.com/evepanzarino/pixelgrid.git .
cp .env.example .env
nano .env  # Update with the database credentials from installation
chmod +x deploy-apache.sh
./deploy-apache.sh
git add -A && git commit -m "Configure app for /pixelgrid subdirectory deployment" && git push origin main
pm2 status
ssh root@74.208.250.31
cd /var/www/pixelgrid && git pull origin main && cd client && npm run build && cd .. && pm2 restart pixelgrid
git add client/src/pixelgrid.js && git commit -m "Remove border from View button" && git push origin main
sudo lsof -i :5000
sudo systemctl status apache2
# Install PM2
npm install -g pm2
# Navigate to web directory and clone
cd /var/www
mkdir -p pixelgrid
cd pixelgrid
git clone https://github.com/evepanzarino/pixelgrid.git .
# Setup environment
cp .env.example .env
nano .env
# Build frontend
cd client
npm install
npm run build
cd ..
# Install backend dependencies
cd server
npm install
cd ..
# Start with PM2
cd server
pm2 start server.js --name pixelgrid
pm2 save
cd ..
# Build frontend
cd client
npm install
npm run build
cd ..
# Install backend dependencies
cd server
npm install
cd ..
# Start with PM2
cd server
pm2 start server.js --name pixelgrid
pm2 save
cd ..
# Build frontend
cd client
npm install
npm run build
cd ..
# Install backend
cd server
npm install
# Start app
pm2 start server.js --name pixelgrid
pm2 save
pm2 startup
# Check status
pm2 status
curl http://localhost:5000/api/health
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs
node --version
npm --version
node --version
npm --version
node --version
npm --version
# Install PM2
npm install -g pm2
# Go to project directory
cd /var/www/pixelgrid
# Setup environment
cp .env.example .env
nano .env
# Build frontend
cd client
npm install
npm run build
cd ..
# Install backend
cd server
npm install
# Start app
pm2 start server.js --name pixelgrid
pm2 save
pm2 startup
# Verify
pm2 status
curl http://localhost:5000/api/health
# Enable required Apache modules
a2enmod proxy
a2enmod proxy_http
a2enmod rewrite
# Create Apache configuration
cat > /etc/apache2/sites-available/pixelgrid.conf << 'EOF'
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    
    # Proxy to Node.js app
    ProxyPreserveHost On
    ProxyPass /pixelgrid http://localhost:5000
    ProxyPassReverse /pixelgrid http://localhost:5000
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    ErrorLog ${APACHE_LOG_DIR}/pixelgrid_error.log
    CustomLog ${APACHE_LOG_DIR}/pixelgrid_access.log combined
</VirtualHost>
EOF

# Disable default site and enable pixelgrid
a2dissite 000-default.conf
a2ensite pixelgrid.conf
# Restart Apache
systemctl restart apache2
# Verify
systemctl status apache2
cd /var/www/pixelgrid/server
pm2 start server.js --name pixelgrid
pm2 save
curl http://localhost:5000/api/health
# Check if app is responding
curl http://localhost:5000/api/health
# Check PM2 status
pm2 status
# Check Apache error logs
tail -50 /var/log/apache2/error.log
# Test the proxy
curl http://localhost/pixelgrid
curl http://localhost:5000
curl http://localhost/pixelgrid
curl http://localhost:5000
curl http://localhost/pixelgrid
curl http://localhost:5000
# Check firewall status
ufw status
# If firewall is active and blocking, allow HTTP
ufw allow 80/tcp
ufw allow 443/tcp
# Test the proxy endpoints
curl http://localhost/pixelgrid
curl http://localhost:5000
cd /var/www/pixelgrid
cat server/server.js | grep -A 5 -B 5 "redirect"
curl -L http://localhost:5000/pixelgrid]
curl -L http://localhost:5000/pixelgrid
curl -I http://74.208.250.31/pixelgrid
# Check if Apache is listening on the right interface
netstat -tulpn | grep :80
# Test direct access bypassing Apache
curl http://127.0.0.1:5000/pixelgrid | head -20
# Edit the server.js file
nano /var/www/pixelgrid/server/server.js
pm2 restart pixelgrid
# Check if PM2 restarted
pm2 status
# Verify the change was made
grep -A 3 "Handle /pixelgrid without" /var/www/pixelgrid/server/server.js
# Test locally
curl -L http://localhost:5000/pixelgrid | head -30
# Test from outside
curl -IL http://74.208.250.31/pixelgrid
# Update Apache config to prevent redirect loop
cat > /etc/apache2/sites-available/pixelgrid.conf << 'EOF'
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    
    ProxyPreserveHost On
    ProxyPass /pixelgrid http://localhost:5000/pixelgrid nocanon
    ProxyPassReverse /pixelgrid http://localhost:5000/pixelgrid
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    ErrorLog ${APACHE_LOG_DIR}/pixelgrid_error.log
    CustomLog ${APACHE_LOG_DIR}/pixelgrid_access.log combined
</VirtualHost>
EOF

# Restart Apache
systemctl restart apache2
# Test
curl -IL http://localhost/pixelgrid 2>&1 | head -20
cd /var/www/pixelgrid
git pull origin main
cd client
npm run build
cd ../server
pm2 restart pixelgrid
ssh root@74.208.250.31 "cd /var/www/pixelgrid && git pull origin main && cd client && npm run build && pm2 restart pixelgrid"
# Enable required Apache modules
a2enmod proxy
a2enmod proxy_http
a2enmod rewrite
# Create Apache configuration
cat > /etc/apache2/sites-available/pixelgrid.conf << 'EOF'
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    
    # Proxy to Node.js app
    ProxyPreserveHost On
    ProxyPass /pixelgrid http://localhost:5000
    ProxyPassReverse /pixelgrid http://localhost:5000
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    ErrorLog ${APACHE_LOG_DIR}/pixelgrid_error.log
    CustomLog ${APACHE_LOG_DIR}/pixelgrid_access.log combined
</VirtualHost>
EOF

# Disable default site and enable pixelgrid
a2dissite 000-default.conf
a2ensite pixelgrid.conf
# Restart Apache
systemctl restart apache2
# Verify
systemctl status apache2
ssh root@74.208.250.31 "ls -la /etc/nginx/sites-available/ /etc/httpd/conf.d/ /etc/apache2/ 2>&1 | grep -v 'No such file'"
ssh root@74.208.250.31 "cat /var/www/html/index.html" > /tmp/index.html && cat /tmp/index.html
# Edit the Nginx config
nano /etc/nginx/sites-available/default
# Edit the Nginx config
nano /etc/nginx/sites-available/default
cd /var/www/html
chown -R www-data:www-data Blog
find Blog -type d -exec chmod 755 {} \;
find Blog -type f -exec chmod 644 {} \;
ssh root@74.208.250.31 "cd /var/www/html && chown -R www-data:www-data blog && find blog -type d -exec chmod 755 {} \; && find blog -type f -exec chmod 644 {} \;"
cd /var/www/html
chown -R www-data:www-data dev-blog
find dev-blog -type d -exec chmod 755 {} \;
find dev-blog -type f -exec chmod 644 {} \;
ssh root@74.208.250.31
cd /var/www/html
ls -la
mv Blog blog
chown -R www-data:www-data blog
find blog -type d -exec chmod 755 {} \;
find blog -type f -exec chmod 644 {} \;
chown -R www-data:www-data dev-blog
find dev-blog -type d -exec chmod 755 {} \;
find dev-blog -type f -exec chmod 644 {} \;
cd /var/www/html
chown -R www-data:www-data Blog dev-blog
find Blog -type d -exec chmod 755 {} \;
find Blog -type f -exec chmod 644 {} \;
find dev-blog -type d -exec chmod 755 {} \;
find dev-blog -type f -exec chmod 644 {} \;
cd /var/www/html
chown -R www-data:www-data blog dev-blog
find blog -type d -exec chmod 755 {} \;
find blog -type f -exec chmod 644 {} \;
find dev-blog -type d -exec chmod 755 {} \;
find dev-blog -type f -exec chmod 644 {} \;
sudo mysql
mysql -u debian-sys-maint -p
mysql -u blog_user -p
sudo systemctl stop mysql
sudo mysqld_safe --skip-grant-tables &
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables &
mysql -u root
sudo killall mysqld
sudo systemctl start mysql
mysql -u root -p
mysql -u root
ps aux | grep mysql
sudo killall mysqld
sudo mysqld_safe --skip-grant-tables &
mysql -u root
root@ubuntu:/var/www/html# ^C
root@ubuntu:/var/www/html# mysql -u root -p
Enter password: 
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)
root@ubuntu:/var/www/html# ^C
root@ubuntu:/var/www/html# mysql -u root -p
Enter password: 
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: NO)
root@ubuntu:/var/www/html# ^C
root@ubuntu:/var/www/html# mysql -u root -p
Enter password: 
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)
root@ubuntu:/var/www/html# ^C
root@ubuntu:/var/www/html# mysql -u root -p
Enter password: 
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using passwo
mysql -u root
sudo killall mysqld
sudo systemctl start mysql
mysql -u devblog_user -p
cat /etc/mysql/debian.cnf
mysql -u root
mysql -u devblog_user -p
cat /etc/mysql/debian.cnf
mysql -u root
sudo killall mysqld
sudo mysqld_safe --skip-grant-tables &
mysql -u root
mysql -u devblog_user -p
USER IF EXISTS 'devblog_user'@'localhost';
DROP DATABASE IF EXISTS blog_db;
DROP DATABASE IF EXISTS devblog_db;
CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE devblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'BlogPass123!';
CREATE USER 'devblog_user'@'localhost' IDENTIFIED BY 'DevBlogPass123!';
GRANT ALL PRIVILEGES ON blog_db.* TO 'blog_user'@'localhost';
GRANT ALL PRIVILEGES ON devblog_db.* TO 'devblog_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
mysql -u devblog_user -p
sudo systemctl start mysql
mysql -u debian-sys-maint -p
CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE devblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'BlogPass123!';
CREATE USER 'devblog_user'@'localhost' IDENTIFIED BY 'DevBlogPass123!';
GRANT ALL PRIVILEGES ON blog_db.* TO 'blog_user'@'localhost';
GRANT ALL PRIVILEGES ON devblog_db.* TO 'devblog_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
mysql -u debian-sys-maint -p
php -v
sudo systemctl restart apache2
sudo apt update
sudo apt install php php-mysql libapache2-mod-php php-cli php-curl php-gd php-mbstring php-xml php-xmlrpc php-soap php-intl php-zip -y
sudo systemctl restart apache2
php -v
sudo a2enmod php8.3
sudo systemctl restart apache2
sudo tail -f /var/log/apache2/error.log
echo "<?php phpinfo(); ?>" | sudo tee /var/www/html/info.php
sudo tail -50 /var/log/apache2/error.log
cd /var/www/html
ls -la Blog dev-blog
sudo chown -R www-data:www-data /var/www/html/Blog /var/www/html/dev-blog
sudo nano /var/www/html/dev-blog/wp-config.php
ls -la /var/www/html/dev-blog/ | head -20
sudo tail -30 /var/log/apache2/error.log
echo "<?php error_reporting(E_ALL); ini_set('display_errors', 1); echo 'PHP is working'; ?>" | sudo tee /var/www/html/dev-blog/test.php
sudo tail -50 /var/log/apache2/error.log | grep -i "fatal\|error\|warning"
ls -la /var/www/html/dev-blog/ | grep "index.php\|wp-config"
cd /var/www/html/dev-blog
sudo cp wp-config-sample.php wp-config.php
sudo nano wp-config.php
cd /var/www/html/dev-blog
sudo cp wp-config-sample.php wp-config.php
sudo nano wp-config.php
sudo chown www-data:www-data wp-config.php
sudo chmod 644 wp-config.php
cd /var/www/html/dev-blog
sudo cp wp-config-sample.php wp-config.php
sudo nano wp-config.php
ssh root@74.208.250.31 "ls -la /var/www/html/dev-blog/ && echo '---ERROR LOG---' && tail -50 /var/log/apache2/error.log"
CREATE DATABASE devblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'devblog_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON devblog_db.* TO 'devblog_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
mysql -u root -p
sudo mysql
sudo mysql -u root
sudo cat /etc/mysql/debian.cnf
sudo mysql -u debian-sys-maint -p
sudo cat /etc/mysql/debian.cnf
sudo mysql -u debian-sys-maint -p
sudo mysql
CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_1';
GRANT ALL PRIVILEGES ON blog_db.* TO 'blog_user'@'localhost';
CREATE DATABASE devblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'devblog_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_2';
GRANT ALL PRIVILEGES ON devblog_db.* TO 'devblog_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
cd /var/www/html
chown -R www-data:www-data Blog Dev-Blog
chmod -R 755 Blog Dev-Blog
CREATE DATABASE devblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'devblog_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON devblog_db.* TO 'devblog_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
cd /path/to/pixelgrid
cd /path/to/www
./deploy.sh
ls
ssh root@evepanzarino.com
ls
vps-install.sh
cd vps-install.sh
git pull
ls
./deploy.sh
cd /path/to/pixelgrid
cd /path/to/homepage
cd evepanzarino.com/pixelgrid
ssh root@evepanzarino.com
ls
cd pixelgrid
ssh root@74.208.250.31
deploy
ls ~
find / -type d -name "homepage" 2>/dev/null
find / -type d -name "pixelgrid" 2>/dev/null
cd /var/www/
./deploy.sh
ls
cd html
ls
./deploy.sh
git pull
./deploy.sh
./vps-install.sh
cd ~
ls
./vps-install.sh
sudo mysql
sudo mysql puggy0
sudo systemctl stop mysql
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
sudo killall mysqld
sudo systemctl start mysql
mysql -u root -p
./vps-install.sh
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
mysql -u root puggy0
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
./vps-install.sh
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo systemctl stop mysql
sudo mysqld_safe --skip-grant-tables --skip-networking &
sudo systemctl stop mysql
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
sudo killall mysqld
sudo systemctl start mysql
mysql -u root -p
sudo systemctl stop mysql
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
sudo killall mysqld
sudo systemctl start mysql
mysql -u root -p
sudo systemctl stop mysql
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
sudo systemctl stop mysql
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
sudo systemctl stop mysql
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
sudo systemctl stop mysql
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld_safe --skip-grant-tables --skip-networking &
mysql -u root
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_new_password';
EXIT;
sudo killall mysqld
sudo systemctl stop mysql
sudo systemctl start mysql
mysql -u root -p
./vps-install.sh
mysql -u root -e "YOUR_SQL_COMMAND"
mysql -u root -p'puggy0' -e "YOUR_SQL_COMMAND"
mysql -u root -p'puggy0' -e "SHOW DATABASES;"
mysql -u root -p'puggy0' -e "ACTUAL_SQL_COMMAND"
mysql -u root -p'puggy0' -e "SHOW DATABASES;"
mysql -u root -p'puggy0' -e "CREATE DATABASE mydb;"
mysql -u root -p'puggy0' -e "SHOW DATABASES;"
./vps-install.sh
mysql -u root -e "..."Synchronizing state of mysql.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.
Executing: /usr/lib/systemd/systemd-sysv-install enable mysql
✓ MySQL installed
Securing MySQL...
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: NO)
root@ubuntu:~# 
mysql -u root -e "..."
mysql -u root -p'puggy0' -e "..."
./vps-install.sh
nano ~/vps-install.sh
./vps-install.sh
nano ~/vps-install.sh
./vps-install.sh
nano ~/vps-install.sh
./vps-install.sh
mysql -u root -p
mysql -u root -p'puggy0' -e "SHOW DATABASES;"
./vps-install.sh
nano ~/vps-install.sh
./vps-install.sh
nano ~/vps-install.sh
./vps-install.sh
nano ~/vps-install.sh
./vps-install.sh
cd var/www/html
/var/www
cd var/
ls
ls -
-ls
cd /var/www/html && pwd && ls -l
cd /var/www/html
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
cd /var/www/html
./deploy.sh
sudo cp -r /path/to/your/website/* /var/www/html/
sudo cp -r /pixelgrid/* /var/www/html/
./deploy.sh
sudo cp -r ~/pixelgrid/* /var/www/html/
find / -type d -name "pixelgrid" 2>/dev/null
ls
sudo cp -r /path/to/pixelgrid/* /var/www/html/
sudo cp -r /var/www/html/pixelgrid/* /var/www/html/
cd ~
./deploy.sh
cd var/www/html
ls
~/vps-install.sh
cd /var/www/html
nano package.json
ls
deploy.sh
~/pixelgrid/deploy.sh
cd
cd var
ls
cd pixelgrid
ls
cd ~/pixelgrid/client
npm install
npm run build
sudo cp -r ~/pixelgrid/client/build/* /var/www/html/
~/vps-install.sh
sudo systemctl status mysql.service
sudo systemctl start mysql
sudo lsof -i :3306
docker ps
docker stop <container_id>
docker stop <8f8ba4349750>
docker stop 8f8ba4349750
sudo systemctl start mysql
sudo systemctl status mysql
cd ~/pixelgrid
docker-compose -f docker-compose.prod.yml up --build -d
sudo apt install -y docker-compose
docker-compose -f docker-compose.prod.yml up --build -d
which docker && docker --version
which docker
docker compose -f docker-compose.prod.yml up --build -d
cd var/www/html
cd/pixelgrid
cd /pixelgrid
ls
cd pixelgrid
ls
deploy.sh
docker --version
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
bash deploy.sh
cd pixelgrid
bash deploy.sh
sudo lsof -i :5000
sudo kill -9 22645
cd pixelgrid
sudo apt update && sudo apt install docker.io docker-compose-plugin
sudo systemctl start docker && sudo systemctl enable docker
docker --version
docker compose -f docker-compose.prod.yml up --build -d
cd pixelgrid
docker compose -f docker-compose.prod.yml up --build -d
sudo lsof -i :5000
sudo kill -9 230540
docker compose -f docker-compose.prod.yml up --build -d
sudo lsof -i :5000
sudo kill -9 235086
docker compose -f docker-compose.prod.yml up --build -d
cd pixelgrid
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml down -v
docker system prune -af
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml down -v && docker system prune -af && docker compose -f docker-compose.prod.yml up --build -d
docker ps -a --format '{{.ID}} {{.Names}} {{.Ports}}'
cd pixelgrid
docker ps -a --format '{{.ID}} {{.Names}} {{.Ports}}'
docker compose -f docker-compose.prod.yml down -v
docker system prune -af
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml down -v
docker system prune -af
ports:
docker compose -f [docker-compose.prod.yml](http://_vscodecontentref_/0) up --build -d
docker ps -a
cat [docker-compose.prod.yml](http://_vscodecontentref_/1)
cat [.env](http://_vscodecontentref_/2)
docker compose -f [docker-compose.prod.yml](http://_vscodecontentref_/0) up --build -d
keep going
cd ~/pixelgrid
docker compose -f docker-compose.prod.yml down -v
docker system prune -af
docker compose -f docker-compose.prod.yml up --build -d
cd client
npm run build
cd client && npm run build
ls -l ../
cd ~/pixelgrid
git pull origin main
git add .
git commit -m "Update code and client build"
git push origin main
cd ~/pixelgrid
git pull origin main
cd ~/pixelgrid
git pull origin main
chmod +x deploy-automated.sh
cd ~/pixelgrid
docker compose -f docker-compose.prod.yml down -v
docker system prune -af
docker compose -f docker-compose.prod.yml up --build -d
docker ps -a --format '{{.ID}} {{.Names}} {{.Ports}}'
cd ~/pixelgrid
docker ps -a --format '{{.ID}} {{.Names}} {{.Ports}}'
bash deploy-static.sh
npm run build
sudo systemctl status mysql.service
sudo journalctl -xeu mysql.service
sudo cp -r ~/pixelgrid/client/build/* /var/www/html/
sudo lsof -i :3306
sudo systemctl stop mysql
# or, for Docker:
docker ps  # find the container using 3306
docker stop <container_id>
sudo lsof -i :3306
sudo systemctl stop mysql
# or, for Docker:
docker ps  # find the container using 3306
docker stop <container_id>
sudo kill -9 <PID>
sudo systemctl start mysql
cd ~/pixelgrid
docker-compose -f docker-compose.prod.yml up --build -d
docker ps -a  # Find the container ID for mysql (e.g., pixelgrid_mysql)
docker stop pixelgrid_mysql
docker rm pixelgrid_mysql
docker rmi mysql:8.0
docker system prune -af
docker volume prune -f
cd ~/pixelgrid
docker-compose -f docker-compose.prod.yml up --build -d
sudo systemctl stop mysql
sudo lsof -i :3306
cd ~/pixelgrid
docker-compose -f docker-compose.prod.yml up --build -d
sudo lsof -i :5000
sudo kill -9 188898
sudo kill -9 212513
cd ~/pixelgrid
docker-compose -f docker-compose.prod.yml up --build -d
sudo lsof -i :5000
sudo kill -9 <PID>
sudo lsof -i :5000
sudo kill -9 188926
sudo lsof -i :5000
sudo kill -9 189722
sudo lsof -i :5000
sudo kill -9 207999
sudo lsof -i :5000
sudo kill -9 207999
sudo lsof -i :5000
sudo kill -9 208000
sudo lsof -i :5000
sudo kill -9 208214
sudo lsof -i :5000
sudo kill -9 208214
sudo lsof -i :5000
sudo kill -9 214158
sudo lsof -i :5000
sudo kill -9 214159
sudo lsof -i :5000
sudo kill -9 215086
sudo lsof -i :5000
sudo kill -9 215086
sudo lsof -i :5000
sudo kill -9 215087
ports:
docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans
docker system prune -af
docker volume prune -f
cd ~/pixelgrid
docker-compose -f docker-compose.prod.yml up --build -d
sudo lsof -i :5000
sudo kill -9 <PID>
sudo lsof -i :5000
sudo kill -9 228039
docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans
docker-compose -f docker-compose.prod.yml up --build -d
sudo lsof -i :5000
sudo kill -9 <PID>
sudo kill -9 229464
sudo lsof -i :5000
sudo kill -9 229464
sudo kill -9 230192
docker-compose -f docker-compose.prod.yml up --build -d
docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans
docker system prune -af
docker volume prune -f
sudo lsof -i :5000
sudo kill -9 230265
cd ~/pixelgrid
docker-compose -f docker-compose.prod.yml up --build -d
ls
bash deploy-automated.sh
ls
nano deploy-automated.sh
bash deploy-automated.sh
nano deploy-automated.sh
bash deploy-automated.sh
ssh-keygen -t ed25519 -C "eveldapanzarino@icloud.com"
nano /root/.ssh/id_ed25519.pub
cat ~/.ssh/id_ed25519.pub
ssh -T git@github.com
cd ~/pixelgrid
git pull origin main
docker compose -f docker-compose.prod.yml down -v
docker system prune -af
docker compose -f docker-compose.prod.yml up --build -d
git clone https://github.com/yourusername/pixelgrid.git
sudo cp -r pixelgrid/* /var/www/html/
git clone https://github.com/evepanzarino/pixelgrid.git
sudo cp -r pixelgrid/* /var/www/html/
sudo cp -r /path/to/your/project/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
qcSnLl1B
cd /var/www/html
cd /path/to/your/react-app
npm install
npm run build
cd ~/pixelgrid/client
npm install
npm run build
sudo cp -r build/* /var/www/html/
cd ~/pixelgrid/server
npm install
# Start your server (use pm2 for production)
npx pm2 start server.js
npx pm2 save
npx pm2 startup
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
cd ~/pixelgrid/client
npm install
npm run build
sudo cp -r ~/pixelgrid/client/build/* /var/www/html/
cd ~/pixelgrid/server
npm install
# Start the server (use pm2 for production)
npx pm2 start server.js
npx pm2 save
npx pm2 startup
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo cp -r ~/pixelgrid/client/build/* /var/www/html/
cd ~/pixelgrid/client
npm install
npm run build
cd ~/pixelgrid/client
npm install
npm run build
sudo cp -r ~/pixelgrid/client/build/* /var/www/html/
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
});
cp .env .env.example
cd ~/pixelgrid
./deploy.sh
cp .env .env.example
cd ~/pixelgrid
./deploy.sh
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
./deploy.sh
sudo systemctl stop mysql
./deploy.sh
sudo lsof -i :5000
sudo kill -9 PID
./deploy.sh
sudo lsof -i :5000
sudo kill -9 PID
node /  14224  root   20u  IPv6   83110      0t0  TCP *:5000 (LISTEN)
sudo lsof -i :5000
sudo kill -9 apache2
sudo kill -9 14224
./deploy.sh
sudo kill -9 14224
sudo lsof -i :5000
sudo kill all
./deploy.sh
cd /home/root/pixelgrid
ls
bash deploy-static.sh
cd pixelgrid
bash deploy-static.sh
ls
cd /
cd ~/pixelgrid
scp /Users/evepanzarino/Documents/GitHub/pixelgrid/homepage/index.html root@evepanzarino.com:/var/www/html/index.html
cd pixelgrid
cd /var/www/evepanzarino
bash deploy.sh
docker ps -a
docker rm -f pixelgrid_mysql
bash deploy.sh
docker rm -f pixelgrid_server
bash deploy.sh
docker logs pixelgrid_mysql
docker logs pixelgrid_server
docker exec -it pixelgrid_server ping mysql
# Remove old files
rm -rf /var/www/evepanzarino/blog/*
rm -rf /var/www/evepanzarino/dev-blog/*
# Reset databases (enter MySQL root password if prompted)
docker exec -i pixelgrid_mysql mysql -u root -p <<EOF
DROP DATABASE IF EXISTS blog;
CREATE DATABASE blog;
DROP DATABASE IF EXISTS \`dev-blog\`;
CREATE DATABASE \`dev-blog\`;
EOF

# Download and extract fresh WordPress for blog
cd /var/www/evepanzarino/blog
wget https://wordpress.org/latest.tar.gz
tar -xzf latest.tar.gz --strip-components=1
rm latest.tar.gz
# Download and extract fresh WordPress for dev-blog
cd /var/www/evepanzarino/dev-blog
wget https://wordpress.org/latest.tar.gz
tar -xzf latest.tar.gz --strip-components=1
rm latest.tar.gz
# Set permissions
chown -R www-data:www-data /var/www/evepanzarino/blog
chown -R www-data:www-data /var/www/evepanzarino/dev-blog
ls
nano wp-config.php
ls
nano wp-config.php
rm wp-config.php
ls
nano wp-config.php
rm -rf /var/www/evepanzarino/blog/*
rm -rf /var/www/evepanzarino/dev-blog/*
cd
docker exec -i pixelgrid_mysql mysql -u root -p <<EOF
DROP DATABASE IF EXISTS blog;
CREATE DATABASE blog;
DROP DATABASE IF EXISTS \`dev-blog\`;
CREATE DATABASE \`dev-blog\`;
DROP USER IF EXISTS 'evepanzarino'@'%';
CREATE USER 'evepanzarino'@'%' IDENTIFIED BY 'TrueLove25320664!';
GRANT ALL PRIVILEGES ON blog.* TO 'evepanzarino'@'%';
GRANT ALL PRIVILEGES ON \`dev-blog\`.* TO 'evepanzarino'@'%';
FLUSH PRIVILEGES;
EOF

docker exec -it pixelgrid_mysql mysql -u root
cd /var/www/
ls
cd evepanzarino
ls
nano docker-compose.prod.yml
docker exec -it pixelgrid_mysql mysql -u root
nano docker-compose.prod.yml
docker exec -it pixelgrid_mysql mysql -u root
docker exec -i pixelgrid_mysql mysql -u root -p <<EOF
DROP DATABASE IF EXISTS blog;
CREATE DATABASE blog;
DROP DATABASE IF EXISTS \`dev-blog\`;
CREATE DATABASE \`dev-blog\`;
DROP USER IF EXISTS 'evepanzarino'@'%';
CREATE USER 'evepanzarino'@'%' IDENTIFIED BY 'TrueLove25320664!';
GRANT ALL PRIVILEGES ON blog.* TO 'evepanzarino'@'%';
GRANT ALL PRIVILEGES ON \`dev-blog\`.* TO 'evepanzarino'@'%';
FLUSH PRIVILEGES;
EOF

nano docker-compose.prod.yml
docker exec -i pixelgrid_mysql mysql -u root -p <<EOF
DROP DATABASE IF EXISTS blog;
CREATE DATABASE blog;
DROP DATABASE IF EXISTS \`dev-blog\`;
CREATE DATABASE \`dev-blog\`;
DROP USER IF EXISTS 'evepanzarino'@'%';
CREATE USER 'evepanzarino'@'%' IDENTIFIED BY 'TrueLove25320664!';
GRANT ALL PRIVILEGES ON blog.* TO 'evepanzarino'@'%';
GRANT ALL PRIVILEGES ON \`dev-blog\`.* TO 'evepanzarino'@'%';
FLUSH PRIVILEGES;
EOF

docker exec -it pixelgrid_mysql mysql -u root -p
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
docker exec -it pixelgrid_mysql mysql -u root -p
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
docker ps
docker exec -it pixelgrid_server bash
apt-get update && apt-get install -y mysql-client
mysql -h mysql -u evepanzarino -p
scp /Users/evepanzarino/Documents/GitHub/pixelgrid/blog/wp-config.php root@evepanzarino.com:/var/www/evepanzarino/blog/wp-config.php
scp /Users/evepanzarino/Documents/GitHub/pixelgrid/dev-blog/wp-config.php root@evepanzarino.com:/var/www/evepanzarino/dev-blog/wp-config.php
ssh root@evepanzarino.com
docker ps
docker exec -it pixelgrid_server sh
ls
cd pixelgrid
ls
docker exec -it pixelgrid_server sh
cd /var/www/evepanzarino
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
docker exec -it pixelgrid_mysql mysql -u root -p
cd /var/www/evepanzarino
docker compose -f docker-compose.prod.yml up -d
SHOW GRANTS FOR 'evepanzarino'@'%';
cd blog
ls
nano wp-config.php
docker exec -it pixelgrid_server sh
mysql -h mysql -u evepanzarino -p --ssl=0
mysql -h mysql -u evepanzarino -p --ssl-mode=DISABLED
mysql -h 127.0.0.1 -P 3306 -u evepanzarino -p --ssl-mode=DISABLED
docker exec -it pixelgrid_mysql mysql -u root -p
docker exec -it pixelgrid_mysql mysql -u root -p
mysql -h mysql -u evepanzarino -p --ssl=0
docker exec -it pixelgrid_server sh
mysql -h mysql -u evepanzarino -p --ssl-mode=DISABLED
docker exec -it pixelgrid_server sh
mysql -h mysql -u evepanzarino -p --ssl-mode=DISABLED
docker ps
docker-compose ps
docker-compose logs --tail=50
cd /var/www/evepanzarino/
docker-compose ps
docker-compose logs --tail=50
docker-compose up -d --build
docker-compose down -v
docker system prune -af
docker-compose up -d --build
ssh root@evepanzarino.com 'cd /var/www/evepanzarino && docker-compose down -v && docker system prune -af && docker-compose up -d --build'
ls
cd /var
cd /var/www/html
ls
sudo systemctl reload nginx
# or
sudo systemctl restart nginx
sudo apt update
sudo apt install nginx
sudo systemctl enable nginx
sudo systemctl start nginx
systemctl restart systemd-logind.service
No containers need to be restarted.
User sessions running outdated binaries:
No VM guests are running outdated hypervisor (qemu) binaries on this host.
Synchronizing state of nginx.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.
Executing: /usr/lib/systemd/systemd-sysv-install enable nginx
Job for nginx.service failed because the control process exited with error code.
See "systemctl status nginx.service" and "journalctl -xeu nginx.service" for details.
sudo lsof -i :80
sudo systemctl stop apache2
# or stop the relevant Docker container:
docker ps  # find the container using port 80
docker stop <container_id>
sudo systemctl stop apache2
sudo systemctl status apache2
docker ps
docker-compose up -d apache
cd var/www/evepanzarino
ls
cd pixelgrid
ls
cd /var/www/html
sudo systemctl stop apache2
sudo systemctl disable apache2
sudo systemctl stop apache2
sudo systemctl status apache2
sudo lsof -i :3000
sudo lsof -i :4000
sudo lsof -i :8080
sudo ufw status
docker-compose up -d --build
cd /var/www/html
ls /var/www/html
docker-compose up -d --build
docker stop app_mysql
docker rm app_mysql
docker-compose up -d --build
r name "/app_server" is already in use by container "07dc391e255a7869fbdc2c153373a59e5650cd9cd81644576030879c11b1b983". You have to remove (or rename) that container to be able to reuse that name.
Creating apache_wordpress ... error
ERROR: for apache_wordpress  Cannot start service apache: failed to set up container networking: driver failed programming external connectivity on endpoint apache_wordpress (d9bb58ee2a1b6405036bf190f64d813b1ef8568d4bd99c52312b6561e8374f2f): failed to bind host port 0.0.0.0:80/tcp: address already in use
ERROR: for app_server  Cannot create container for service app_server: Conflict. The container name "/app_server" is already in use by container "07dc391e255a7869fbdc2c153373a59e5650cd9cd81644576030879c11b1b983". You have to remove (or rename) that container to be able to reuse that name.
ERROR: for apache  Cannot start service apache: failed to set up container networking: driver failed programming external connectivity on endpoint apache_wordpress (d9bb58ee2a1b6405036bf190f64d813b1ef8568d4bd99c52312b6561e8374f2f): failed to bind host port 0.0.0.0:80/tcp: address already in use
ERROR: Encountered errors while bringing up the project.
root@ubuntu:/var/www/html# 
docker stop app_server apache_wordpress
docker rm app_server apache_wordpress
docker-compose up -d --build
docker-compose down -v
docker network prune -f
docker-compose up -d --build
nano docker-compose.yml
docker-compose up -d --build
docker-compose down -v
docker system prune -af
docker volume prune -f
docker system prune -af
docker volume prune -f
sudo systemctl restart docker
docker-compose down -v
docker network prune -f
docker-compose up -d --build
docker ps
sudo systemctl status nginx
sudo lsof -i :80
sudo systemctl start nginx
sudo systemctl status nginx
cd /var/www/html
sudo apt update
sudo apt install docker-compose
cd /var/www/html
docker-compose down -v
docker system prune -af
docker volume prune -f
sudo systemctl restart docker
docker-compose up -d --build
docker ps
sudo lsof -i :3000
sudo lsof -i :4000
sudo lsof -i :8080
sudo systemctl status nginx
curl -I http://localhost:3000/
curl -I http://localhost:4000/
curl -I http://localhost:8080/blog/
curl -I http://localhost:8080/dev-blo
docker ps
sudo lsof -i :3000
sudo lsof -i :4000
sudo lsof -i :8080
curl -I http://localhost:3000/
curl -I http://localhost:4000/
curl -I http://localhost:8080/blog/
curl -I http://localhost:8080/dev-blog/
docker-compose up -d --build
cd /var/www/html
curl -I http://localhost:3000/
curl -I http://localhost:8080/blog/
curl -I http://localhost:8080/dev-blog/
curl -I http://localhost:4000/pixelgrid/
tail -n 40 /var/log/nginx/pixelgrid_error.log
docker logs apache_wordpress
docker-compose up -d --build
sudo lsof -i :4000
docker-compose down -v
docker ps -a
docker rm <container_id>
66/json: Not Found ("No such image: sha256:3a6437433812303e1cb2db46dae37c595edabac8cc1931bd5f4622d3a7d1a766")
During handling of the above exception, another exception occurred:
Traceback (most recent call last):
KeyError: 'ContainerConfig'
root@ubuntu:/var/www/html# 
docker ps -a
docker rm <container_id>
docker images -a
docker rm mysql:8.0
docker rm 3cba6806e715
docker ps -a
docker images -a
docker ps -a
docker rm 62e8158a8a37
docker image prune -a -f
docker-compose up -d --build
docker ps
sudo lsof -i :3000
sudo lsof -i :4000
sudo lsof -i :8080
curl -I http://localhost:3000/
curl -I http://localhost:4000/
curl -I http://localhost:8080/blog/
curl -I http://localhost:8080/dev-blog/
docker-compose up -d --build
cd /var/www/html
docker-compose down -v
docker-compose up -d --build
docker logs apache_wordpress
sudo cat /etc/nginx/sites-available/default | grep -A 5 "location /"
head -50 /usr/share/nginx/html/index.html | grep -i "designing\|promoting\|organizing"
head -50 /var/www/evepanzarino/homepage/index.html | grep -i "designing\|promoting\|organizing"
head -50 /usr/share/nginx/html/index.html | grep -i "designing\|promoting\|organizing"
head -50 /var/www/evepanzarino/homepage/index.html | grep -i "designing\|promoting\|organizing"
head -30 /usr/share/nginx/html/index.html
head -30 /var/www/evepanzarino/homepage/index.html
sudo rsync -av --delete /var/www/evepanzarino/homepage/ /usr/share/nginx/html/
sudo nginx -t && sudo systemctl reload nginx
sudo rsync -av --delete /var/www/evepanzarino/homepage/ /usr/share/nginx/html/
sudo nginx -t && sudo systemctl reload nginx
head -60 /usr/share/nginx/html/index.html | tail -20
grep -A 10 "div class=\"homepage\"" /usr/share/nginx/html/index.html
curl -I https://evepanzarino.com
sudo cat /etc/nginx/sites-available/default | head -20
sudo nano /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl reload nginx
sudo nano /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl reload nginx
sudo cat /etc/nginx/sites-available/default | head -10
sudo sed -i '5,9d' /etc/nginx/sites-available/default
sudo cat /etc/nginx/sites-available/default | head -15
sudo nginx -t && sudo systemctl reload nginx
sudo sed -i '5i\    location / {\n        root /usr/share/nginx/html;\n        try_files $uri $uri/ =404;\n    }' /etc/nginx/sites-available/default
sudo cat /etc/nginx/sites-available/default | head -15
sudo nginx -t && sudo systemctl reload nginx
curl -s https://evepanzarino.com | grep -A 5 "div class=\"homepage\""
sudo lsof -i :3000
sudo cat /etc/nginx/sites-available/default | grep -A 3 "location /"
sudo systemctl restart nginx
sudo systemctl status nginx
curl -s https://evepanzarino.com | grep -A 5 "div class=\"homepage\""
sudo systemctl restart nginx
sudo systemctl status nginx
curl -s https://evepanzarino.com | grep -A 5 "div class=\"homepage\""
q
sudo nginx -T | grep "http {" -A 20
q
sudo nginx -T | grep "http {" -A 20
sudo nginx -T | grep "sites-available"
ls -la /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
curl -s https://evepanzarino.com | grep -A 5 "div class=\"homepage\""
ls -la /usr/share/nginx/html/
sudo find /etc/nginx -type f -name "*.conf"
sudo find /etc -type f -name "default"
ps aux | grep nginx
grep root /etc/nginx/sites-available/default
grep root /etc/nginx/nginx.conf
ls -l [the_path_you_found]/index.html
sudo nano /etc/nginx/sites-available/default
sudo grep -r "root " /etc/nginx/
ls -l /usr/share/nginx/html/index.html
ls -l /var/www/html/index.html
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'build' ~/Documents/GitHub/pixelgrid/homepage/ root@evepanzarino.com:/usr/share/nginx/html/
sudo chown -R root:root /usr/share/nginx/html
sudo chmod -R 755 /usr/share/nginx/html
sudo lsof -nP | grep nginx | grep index.html
ls -l /var/www/
ls -l /var/www/html/
ls -l /usr/share/nginx/html/
cat /etc/nginx/sites-available/default
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000
sudo docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}"
sudo nano /etc/nginx/sites-available/default
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak && sudo cat /etc/nginx/sites-available/default
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak && sudo sed -i '/location \/ {/,/}/{/proxy_pass http:\/\/127.0.0.1:3000;/c\        root /usr/share/nginx/html;\        try_files $uri $uri/ =404;\    }' /etc/nginx/sites-available/default && sudo nginx -t && sudo systemctl reload nginx
sudo sed -i '/location \/ {/,/proxy_set_header X-Forwarded-Proto \$scheme;/c\    location / {\        root /usr/share/nginx/html;\        try_files $uri $uri/ =404;\    }' /etc/nginx/sites-available/default && sudo nginx -t && sudo systemctl reload nginx
sudo nginx -t && sudo systemctl reload nginx
sudo rsync -av ~/Documents/GitHub/pixelgrid/homepage/ /usr/share/nginx/html/
cd /var/www
ls
cd /pixelgrid
cd pixelgrid
ls
cd/
cd /var/www
ls
cd html
ls
cd /var/html/evepanzarino
cd
cd var/www
cd /var/www
cd evepanzarino
ls
rsync -av ~/Documents/GitHub/pixelgrid/homepage/ youruser@yourserver:/usr/share/nginx/html/
rsync -av ~/Documents/GitHub/pixelgrid/homepage/ eve@123.45.67.89:/usr/share/nginx/html/
rsync -av ~/Documents/GitHub/pixelgrid/homepage/ root@evepanzarino.com:/root/share/nginx/html/
rsync -av ~/Documents/GitHub/pixelgrid/homepage/ root@evepanzarino.com:/usr/share/nginx/html/
ssh exit
ls -l /usr/share/nginx/html/
ls -l /usr/share/nginx/html/index.html
ls -l /usr/share/nginx/html/homepage/
head -20 /usr/share/nginx/html/index.html
curl -I https://evepanzarino.com
curl https://evepanzarino.com | head -20
sudo rsync -av --delete /var/www/evepanzarino/homepage/ /usr/share/nginx/html/
sudo nginx -t && sudo systemctl reload nginx
ls
cd /var/www/html
ls
cd /
rsync -av --delete ~/Documents/GitHub/pixelgrid/ root@evepanzarino.com:/var/www/evepanzarino/
sudo rsync -av --delete /var/www/evepanzarino/homepage/ /usr/share/nginx/html/
sudo nginx -t && sudo systemctl reload nginx
rsync -av --delete ~/Documents/GitHub/pixelgrid/ root@evepanzarino.com:/var/www/evepanzarino/
sudo rsync -av --delete /var/www/evepanzarino/homepage/ /usr/share/nginx/html/
sudo nginx -t && sudo systemctl reload nginx
sudo rsync -av --delete /var/www/evepanzarino/homepage/ /usr/share/nginx/html/
sudo nginx -t && sudo systemctl reload nginx
done
sudo rsync -av --delete /var/www/evepanzarino/homepage/ /usr/share/nginx/html/
sudo nginx -t && sudo systemctl reload nginx
sudo rsync -av --delete /var/www/evepanzarino/homepage/ /usr/share/nginx/html/
sudo nginx -t && sudo systemctl reload nginx
head -40 /usr/share/nginx/html/index.html
cd /var
ls
cd /www
cd /var/www
ls
cd evepanzarino
ls
cd /belonging
cd belonging
ls
# Deploy to the correct VPS directory
cd /Users/evepanzarino/Documents/GitHub/pixelgrid/belonging
scp -r . root@evepanzarino.com:/var/www/evepanzarino/belonging/
# SSH into VPS and start the deployment
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose up -d --build
docker compose ps
EOF

# Deploy client src directory with images
cd /Users/evepanzarino/Documents/GitHub/pixelgrid/belonging/client
scp -r src/ root@evepanzarino.com:/var/www/evepanzarino/belonging/client/
# Rebuild the Docker image to pick up changes
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose up -d --build
docker compose ps
EOF

# Deploy client directory with all images
cd /Users/evepanzarino/Documents/GitHub/pixelgrid/belonging
scp -r client/ root@evepanzarino.com:/var/www/evepanzarino/belonging/
# Rebuild and restart the client container
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose up -d --build client
docker compose ps
EOF

# Deploy all changes to evepanzarino.com/belonging
cd /Users/evepanzarino/Documents/GitHub/pixelgrid/belonging
scp -r . root@evepanzarino.com:/var/www/evepanzarino/belonging/
# Rebuild and restart all services
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose down
docker compose up -d --build
docker compose ps
EOF

# Force remove old containers and volumes
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose down -v
rm -rf ./*
EOF

# Deploy all files fresh
cd /Users/evepanzarino/Documents/GitHub/pixelgrid/belonging
scp -r . root@evepanzarino.com:/var/www/evepanzarino/belonging/
# Build and start from scratch
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose up -d --build
docker compose ps
docker compose logs
EOF

# Check container status and logs
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose ps
docker compose logs
EOF

# Check the docker-compose file and build with more verbosity
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
cat docker-compose.yml
docker compose up --build
EOF

# Check the docker-compose file and build with more verbosity
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
cat docker-compose.yml
docker compose up --build
EOF

# Check the docker-compose file and build with more verbosity
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
cat docker-compose.yml
docker compose up --build
EOF

# Remove conflicting containers and rebuild
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose down --remove-orphans
docker container rm -f app_mysql 2>/dev/null || true
docker compose up -d --build
docker compose ps
EOF

ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose down -v
docker container rm -f $(docker container ls -aq --filter "name=pixelgrid_server|app_mysql|apache_wordpress|app_server") 2>/dev/null || true
sleep 2
docker compose up -d --build
docker compose ps
EOF

ssh root@evepanzarino.com << 'EOF'
# Check what's using port 3306
sudo lsof -i :3306
# Or try killing any lingering MySQL processes
sudo killall mysqld 2>/dev/null || true
sleep 2

# Now restart docker compose
cd /var/www/evepanzarino/belonging
docker compose up -d
docker compose ps
EOF

ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose logs app_server
docker compose logs pixelgrid_server
EOF

ssh root@evepanzarino.com "cd /var/www/evepanzarino/belonging && docker compose logs app_server"
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
echo "=== App Server Logs ==="
docker compose logs app_server | tail -50
echo ""
echo "=== Pixelgrid Server Logs ==="
docker compose logs pixelgrid_server | tail -50
echo ""
echo "=== Container Status ==="
docker compose ps
EOF

ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose logs app_server | tail -50
EOF

ssh root@evepanzarino.com "cd /var/www/evepanzarino/belonging && docker compose logs --tail=100"
ssh root@evepanzarino.com "cd /var/www/evepanzarino/belonging && docker compose logs --tail=50"
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
echo "=== Current docker-compose.yml ==="
cat docker-compose.yml | head -30
echo ""
echo "=== Running containers ==="
docker compose ps -a
echo ""
echo "=== Check if correct belonging services exist ==="
docker ps | grep belonging
EOF

ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose down
docker compose -f docker-compose.yml up -d --build
docker compose ps
EOF

ssh root@evepanzarino.com << 'EOF'
# Stop all services
cd /var/www/evepanzarino/belonging
docker compose down

# Remove conflicting containers from parent directory
docker stop $(docker ps -q --filter "name=apache_wordpress|app_server|pixelgrid_server|app_mysql") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=apache_wordpress|app_server|pixelgrid_server|app_mysql") 2>/dev/null || true

# Restart the belonging services
docker compose up -d --build

# Wait for services to stabilize
sleep 5

# Check status
docker compose ps
EOF

ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
echo "=== Container Status ==="
docker compose ps
echo ""
echo "=== Server Logs ==="
docker compose logs server | tail -30
echo ""
echo "=== Client Logs ==="
docker compose logs client | tail -30
EOF

ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging

# Check if client is building correctly
docker compose logs client 2>&1 | grep -i "error\|fail\|exit" | head -20

# Check server startup
docker compose logs server 2>&1 | head -50
EOF

# Redeploy belonging files to the correct location
cd /Users/evepanzarino/Documents/GitHub/pixelgrid/belonging
scp -r . root@evepanzarino.com:/var/www/evepanzarino/belonging/
# Verify docker-compose.yml is there
ssh root@evepanzarino.com "ls -la /var/www/evepanzarino/belonging/docker-compose.yml"
# Now restart with the correct compose file
ssh root@evepanzarino.com << 'EOF'
cd /var/www/evepanzarino/belonging
docker compose down
docker compose up -d --build
docker compose ps
EOF

ssh root@evepanzarino.com "mkdir -p /var/www/evepanzarino.com" && cd /Users/evepanzarino/Documents/GitHub/pixelgrid/homepage && scp -r . root@evepanzarino.com:/var/www/evepanzarino.com/ && ssh root@evepanzarino.com "ls -la /var/www/evepanzarino.com/"
ssh root@evepanzarino.com "mkdir -p /var/www/evepanzarino.com" && cd /Users/evepanzarino/Documents/GitHub/pixelgrid/homepage && scp -r . root@evepanzarino.com:/var/www/evepanzarino.com/ && ssh root@evepanzarino.com "ls -la /var/www/evepanzarino.com/ | head -20"
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo tail -30 /var/log/nginx/error.log
curl http://localhost:3000
sudo systemctl reload nginx
sudo nginx -t
ps aux | grep nginx
sudo nginx -T | grep belonging
sudo tail -30 /var/log/nginx/error.log
cd var/www/evepanzarino
cd /var
ls
cd www
ls
cd evepanzarino
ls
cd belonging
ls
sudo nginx -s reload
cd /var/www/evepanzarino
sudo nginx -s reload
docker compose -f /Users/evepanzarino/Desktop/www/evepanzarino/belonging/docker-compose.yml up -d --build
docker compose -f /Users/evepanzarino/Desktop/www/evepanzarino/docker-compose.yml up -d --build
