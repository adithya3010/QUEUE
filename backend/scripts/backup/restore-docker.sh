#!/bin/bash

################################################################################
# Smart Queue Docker MongoDB Restore Script
#
# This script restores a MongoDB backup to Docker container
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

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_prompt() { echo -e "${BLUE}[INPUT]${NC} $1"; }

check_docker() {
    if ! docker ps | grep -q "${CONTAINER_NAME}"; then
        log_error "MongoDB container '${CONTAINER_NAME}' is not running."
        exit 1
    fi
}

list_backups() {
    log_info "Available backups:"
    echo ""
    local backups=($(ls -t "${BACKUP_DIR}"/smartqueue_backup_*.tar.gz 2>/dev/null))

    if [ ${#backups[@]} -eq 0 ]; then
        log_error "No backups found."
        exit 1
    fi

    local index=1
    for backup in "${backups[@]}"; then
        echo "${index}. $(basename "$backup") ($(du -sh "$backup" | cut -f1))"
        ((index++))
    done
    echo ""
}

select_backup() {
    list_backups

    local backups=($(ls -t "${BACKUP_DIR}"/smartqueue_backup_*.tar.gz))
    log_prompt "Enter backup number: "
    read selection

    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
        log_error "Invalid selection."
        exit 1
    fi

    BACKUP_FILE="${backups[$((selection-1))]}"
    log_info "Selected: $(basename ${BACKUP_FILE})"
}

confirm_restore() {
    log_warning "WARNING: This will replace the current database!"
    log_prompt "Type 'yes' to confirm: "
    read confirmation

    if [ "$confirmation" != "yes" ]; then
        log_info "Cancelled."
        exit 0
    fi
}

perform_restore() {
    log_info "Extracting backup..."
    local temp_dir="${BACKUP_DIR}/restore_temp"
    rm -rf "${temp_dir}"
    mkdir -p "${temp_dir}"
    tar -xzf "${BACKUP_FILE}" -C "${temp_dir}"

    local extracted=$(find "${temp_dir}" -type d -name "smartqueue_backup_*" | head -n 1)

    log_info "Copying backup to container..."
    docker cp "${extracted}" "${CONTAINER_NAME}:/data/restore_temp"

    log_info "Restoring database..."
    docker exec "${CONTAINER_NAME}" mongorestore \
        --uri="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@localhost:27017/${MONGO_DB}?authSource=admin" \
        --drop \
        --gzip \
        --dir="/data/restore_temp/$(basename ${extracted})/${MONGO_DB}"

    if [ $? -eq 0 ]; then
        log_info "Restore completed!"

        # Cleanup
        docker exec "${CONTAINER_NAME}" rm -rf "/data/restore_temp"
        rm -rf "${temp_dir}"
    else
        log_error "Restore failed!"
        exit 1
    fi
}

main() {
    log_info "=== Docker MongoDB Restore ==="
    check_docker
    select_backup
    confirm_restore
    perform_restore
    log_info "=== Restore Completed ==="
}

main
