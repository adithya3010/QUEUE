#!/bin/bash

################################################################################
# Smart Queue Docker MongoDB Backup Script
#
# This script creates a backup of MongoDB running in Docker container
################################################################################

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${MONGO_CONTAINER:-smart-queue-mongodb}"
MONGO_DB="${MONGO_DB_NAME:-smartqueue}"
MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_PASSWORD="${MONGO_ROOT_PASSWORD}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="smartqueue_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

check_docker() {
    log_info "Checking Docker environment..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH."
        exit 1
    fi

    if ! docker ps | grep -q "${CONTAINER_NAME}"; then
        log_error "MongoDB container '${CONTAINER_NAME}' is not running."
        log_info "Start it with: docker-compose up -d mongodb"
        exit 1
    fi

    log_info "Docker check passed."
}

create_backup() {
    log_info "Creating backup directory: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"

    log_info "Starting backup of database: ${MONGO_DB}"

    # Execute mongodump inside container
    docker exec "${CONTAINER_NAME}" mongodump \
        --uri="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@localhost:27017/${MONGO_DB}?authSource=admin" \
        --out="/data/backup/${BACKUP_NAME}" \
        --gzip

    if [ $? -eq 0 ]; then
        log_info "Backup completed in container."

        # Copy backup from container to host
        log_info "Copying backup to host..."
        docker cp "${CONTAINER_NAME}:/data/backup/${BACKUP_NAME}" "${BACKUP_PATH}"

        # Clean up backup in container
        docker exec "${CONTAINER_NAME}" rm -rf "/data/backup/${BACKUP_NAME}"

        log_info "Backup saved to: ${BACKUP_PATH}"

        # Create manifest
        cat > "${BACKUP_PATH}/backup_manifest.txt" << EOF
Backup Name: ${BACKUP_NAME}
Database: ${MONGO_DB}
Timestamp: ${TIMESTAMP}
Date: $(date)
Container: ${CONTAINER_NAME}
Size: $(du -sh "${BACKUP_PATH}" | cut -f1)
EOF
    else
        log_error "Backup failed!"
        exit 1
    fi
}

compress_backup() {
    log_info "Compressing backup..."

    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

    if [ $? -eq 0 ]; then
        rm -rf "${BACKUP_NAME}"
        log_info "Compressed backup: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
        log_info "Size: $(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)"
    else
        log_error "Compression failed!"
        exit 1
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "smartqueue_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
    log_info "Cleanup completed."
}

main() {
    log_info "=== Docker MongoDB Backup ==="
    check_docker
    create_backup
    compress_backup
    cleanup_old_backups
    log_info "=== Backup Completed ==="
    log_info "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
}

main
