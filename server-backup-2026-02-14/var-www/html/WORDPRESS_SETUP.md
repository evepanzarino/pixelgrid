# WordPress Installation Guide

Two separate WordPress installations have been set up:
- `/Blog` - Main blog
- `/dev-blog` - Development blog

## Server Setup Instructions

### 1. Upload WordPress Files to Server

```bash
# Upload Blog
cd ~/Documents/GitHub/pixelgrid
scp -r Blog/* root@74.208.250.31:/var/www/html/Blog/

# Upload dev-blog
scp -r dev-blog/* root@74.208.250.31:/var/www/html/dev-blog/
```

### 2. Create MySQL Databases on Server

SSH into your server and create two databases:

```bash
ssh root@74.208.250.31
mysql -u root -p
```

Then run these SQL commands:

```sql
-- For main Blog
CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_1';
GRANT ALL PRIVILEGES ON blog_db.* TO 'blog_user'@'localhost';

-- For dev-blog
CREATE DATABASE devblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'devblog_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_2';
GRANT ALL PRIVILEGES ON devblog_db.* TO 'devblog_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### 3. Set Correct Permissions on Server

```bash
cd /var/www/html
chown -R www-data:www-data Blog dev-blog
chmod -R 755 Blog dev-blog
```

### 4. Complete WordPress Installation

Visit these URLs in your browser to complete the WordPress installation wizard:

- **Main Blog**: https://evepanzarino.com/Blog/
- **Dev Blog**: https://evepanzarino.com/dev-blog/

For each installation, you'll need to provide:
- Database Name: `blog_db` or `devblog_db`
- Username: `blog_user` or `devblog_user`
- Password: The passwords you created in step 2
- Database Host: `localhost`
- Table Prefix: `wp_` (default, or customize)

### 5. Security Recommendations

After installation:

1. **Delete installation files** (WordPress will prompt you)
2. **Update wp-config.php security keys**: Visit https://api.wordpress.org/secret-key/1.1/salt/
3. **Set up SSL** if not already configured
4. **Install security plugins** like Wordfence or Sucuri
5. **Keep WordPress, themes, and plugins updated**
6. **Set up regular backups**

### Optional: .htaccess Configuration

If you need pretty permalinks, ensure Apache mod_rewrite is enabled and create/update `.htaccess` in each WordPress directory:

```apache
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /Blog/
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /Blog/index.php [L]
</IfModule>
# END WordPress
```

(Adjust `RewriteBase` for dev-blog accordingly)

## Troubleshooting

- **500 Error**: Check PHP error logs, verify database credentials
- **Permission Issues**: Ensure www-data owns the files
- **Can't upload files**: Check `upload_max_filesize` and `post_max_size` in php.ini
- **White screen**: Enable WP_DEBUG in wp-config.php to see errors
