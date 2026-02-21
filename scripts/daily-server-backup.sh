#!/bin/bash
# Daily Server Backup Script
# Backs up the VPS (74.208.250.31) to OneDrive daily at 4am
# Folder format: MM/DD/YYYY

set -e

# Configuration
SERVER="root@74.208.250.31"
SERVER_PASS="qcSnLl1B"
ONEDRIVE_BASE="/Users/evepanzarino/Library/CloudStorage/OneDrive-FullSailUniversity/Server Backups"
DATE_FOLDER=$(date +"%m-%d-%Y")
BACKUP_DIR="${ONEDRIVE_BASE}/${DATE_FOLDER}"
LOG_FILE="/Users/evepanzarino/Desktop/www/evepanzarino/scripts/backup.log"

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log "=== Starting daily backup to ${BACKUP_DIR} ==="

# Create backup directories
mkdir -p "${BACKUP_DIR}/etc-nginx"
mkdir -p "${BACKUP_DIR}/root"
mkdir -p "${BACKUP_DIR}/var-www"
mkdir -p "${BACKUP_DIR}/databases"

# ===========================================
# MySQL Database Dumps (via docker exec)
# ===========================================

# 1. app_database (portfolio, pixelgrid) — container: app_mysql
log "Dumping app_database..."
expect -c "
set timeout 300
spawn ssh ${SERVER} \"docker exec app_mysql mysqldump -u root -p'TrueLove25320664!' --single-transaction --routines --triggers app_database\"
expect \"password:\"
send \"${SERVER_PASS}\r\"
expect eof
" > "${BACKUP_DIR}/databases/app_database.sql" 2>> "$LOG_FILE"
log "app_database dump complete."

# 2. belonging — container: belonging-mysql
log "Dumping belonging database..."
expect -c "
set timeout 300
spawn ssh ${SERVER} \"docker exec belonging-mysql mysqldump -u evepanzarino -p'TrueLove25320664!' --single-transaction --routines --triggers belonging\"
expect \"password:\"
send \"${SERVER_PASS}\r\"
expect eof
" > "${BACKUP_DIR}/databases/belonging.sql" 2>> "$LOG_FILE"
log "belonging database dump complete."

# 3. timeline_db — container: timeline-mysql
log "Dumping timeline_db..."
expect -c "
set timeout 300
spawn ssh ${SERVER} \"docker exec timeline-mysql mysqldump -u root -p'timeline_password' --single-transaction --routines --triggers timeline_db\"
expect \"password:\"
send \"${SERVER_PASS}\r\"
expect eof
" > "${BACKUP_DIR}/databases/timeline_db.sql" 2>> "$LOG_FILE"
log "timeline_db dump complete."

# Backup /etc/nginx/
log "Backing up /etc/nginx/..."
expect -c "
set timeout 600
spawn rsync -avz --progress -e ssh ${SERVER}:/etc/nginx/ \"${BACKUP_DIR}/etc-nginx/\"
expect \"password:\"
send \"${SERVER_PASS}\r\"
expect eof
" >> "$LOG_FILE" 2>&1
log "/etc/nginx/ backup complete."

# Backup /root/ (excluding cache and npm)
log "Backing up /root/..."
expect -c "
set timeout 7200
spawn rsync -avz --progress --exclude=.cache --exclude=.npm --exclude=snap -e ssh ${SERVER}:/root/ \"${BACKUP_DIR}/root/\"
expect \"password:\"
send \"${SERVER_PASS}\r\"
expect eof
" >> "$LOG_FILE" 2>&1
log "/root/ backup complete."

# Backup /var/www/ (excluding node_modules and .git)
log "Backing up /var/www/..."
expect -c "
set timeout 7200
spawn rsync -avz --progress --exclude=node_modules --exclude=.git -e ssh ${SERVER}:/var/www/ \"${BACKUP_DIR}/var-www/\"
expect \"password:\"
send \"${SERVER_PASS}\r\"
expect eof
" >> "$LOG_FILE" 2>&1
log "/var/www/ backup complete."

# Calculate total size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log "=== Backup complete! Total size: ${TOTAL_SIZE} ==="
