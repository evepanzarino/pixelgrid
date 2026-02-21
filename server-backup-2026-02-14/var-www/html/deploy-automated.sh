#!/bin/bash
# Automated deployment script for PixelGrid

set -e

# 1. Commit and push local changes (run this on your local machine)
echo "[Local] Committing and pushing changes..."
git add .
git commit -m "Automated deploy: update code and client build" || echo "No changes to commit."
git push origin main

echo "[Local] Changes pushed to remote."

echo "[Server] Logging into server and pulling latest changes..."
# 2. SSH into server and pull latest changes (replace USER and SERVER with your actual values)
ssh USER@SERVER << 'ENDSSH'
  set -e
  cd ~/pixelgrid
  git pull origin main
  echo "[Server] Pulled latest code."
  echo "[Server] Rebuilding and restarting Docker containers..."
  docker compose -f docker-compose.prod.yml down -v
  docker system prune -af -f
  docker compose -f docker-compose.prod.yml up --build -d
  echo "[Server] Deployment complete."
ENDSSH

echo "Deployment finished!"
