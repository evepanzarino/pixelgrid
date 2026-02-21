#!/bin/bash
# Deploy React build files to VPS web root

set -e

# Build React client locally
cd client
npm run build
cd ..

# Copy build files to VPS (replace USER and SERVER with your actual values)
scp -r client/build/* root@evepanzarino.com:/var/www/html/

# Optionally fix permissions on the server (run this on VPS)
# ssh root@evepanzarino.com "sudo chown -R www-data:www-data /var/www/html"

echo "Deployment complete. Your site should be live on evepanzarino.com."
