FROM php:8.2-apache

# Install mysqli extension for WordPress
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable Apache mod_rewrite for WordPress permalinks
RUN a2enmod rewrite

# Set ServerName to suppress warning
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf
